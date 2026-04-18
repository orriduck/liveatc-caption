import os
import io
import json
import re
import queue
import threading
import asyncio
from datetime import datetime, timezone

import anthropic
import av

from services.rag_service import RAGService

CLAUDE_MODEL = "claude-haiku-4-5-20251001"
WHISPER_MODEL_SIZE = "small.en"

# Vocabulary hint given to Whisper's decoder to bias toward aviation terminology.
# This dramatically improves recognition of callsigns, phonetic alphabet, and ATC
# phraseology without changing the model weights.
_ATC_INITIAL_PROMPT = (
    "Aviation radio communication. Aircraft callsigns, N-numbers, and phonetic "
    "alphabet are common: Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India "
    "Juliet Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform "
    "Victor Whiskey X-ray Yankee Zulu. "
    "ATC phraseology: runway, heading, altitude, knots, squawk, cleared, contact, "
    "frequency, wilco, roger, affirmative, negative, ident, traffic, radar contact, "
    "hold short, line up and wait, cleared for takeoff, cleared to land, go around, "
    "approach, departure, tower, center, ground, ATIS, QNH, ILS, visual approach."
)


def _ERR(msg):
    return {
        "results": [
            {
                "is_error": True,
                "speaker": None,
                "caption": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error_type": "CONFIG_ERROR",
                "details": msg,
            }
        ]
    }


class ClaudeTranscriber:
    def __init__(self, api_key=None):
        self.api_key = (api_key or os.environ.get("ANTHROPIC_API_KEY", "")).strip()
        self.client = (
            anthropic.Anthropic(api_key=self.api_key) if self.api_key else None
        )
        self._whisper = None
        self.chunk_queue = queue.Queue()
        self.is_running = False
        self.rag_service = RAGService()
        self.system_prompt = self._load_prompt()

    def _load_prompt(self):
        try:
            path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "prompts",
                "transcription_system.txt",
            )
            with open(path) as f:
                return f.read().strip()
        except Exception:
            return "Transcribe ATC audio precisely."

    def _get_whisper(self):
        if self._whisper is None:
            from faster_whisper import WhisperModel

            print(
                f"[Whisper] Loading {WHISPER_MODEL_SIZE} model (first run may download)..."
            )
            self._whisper = WhisperModel(
                WHISPER_MODEL_SIZE, device="cpu", compute_type="int8"
            )
            print("[Whisper] Model ready.")
        return self._whisper

    def _create_wav_header(self, pcm_data: bytes, sample_rate=16000) -> bytes:
        import struct

        nc, bps = 1, 16
        br = sample_rate * nc * bps // 8
        ba = nc * bps // 8
        ds = len(pcm_data)
        h = b"RIFF" + struct.pack("<I", 36 + ds) + b"WAVEfmt "
        h += struct.pack("<IHHIIHH", 16, 1, nc, sample_rate, br, ba, bps)
        h += b"data" + struct.pack("<I", ds)
        return h + pcm_data

    def _stt(self, audio_bytes: bytes) -> str:
        """Speech-to-text via faster-whisper. Accepts WAV or webm bytes."""
        whisper = self._get_whisper()
        segments, _ = whisper.transcribe(
            io.BytesIO(audio_bytes),
            beam_size=5,
            language="en",
            initial_prompt=_ATC_INITIAL_PROMPT,
            vad_filter=True,  # silero-VAD skips silence, reducing hallucinations
            condition_on_previous_text=False,  # each segment is independent
        )
        return " ".join(s.text.strip() for s in segments).strip()

    def _parse_with_claude(self, raw_text: str, rag_context: str = "") -> dict:
        """Structure raw STT text into ATC JSON using Claude."""
        if not self.client:
            return {"results": []}

        now = datetime.now(timezone.utc).isoformat()
        system = self.system_prompt
        if rag_context:
            system += f"\n\n# RAG CONTEXT\n{rag_context}"

        prompt = f"""Parse this raw ATC audio transcription into structured JSON.

Raw transcription:
{raw_text}

Return ONLY a JSON object with a "results" array. Each item:
{{
  "is_error": false,
  "speaker": "ATC" or "PLANE",
  "caption": "FORMATTED TEXT IN ALL-CAPS",
  "timestamp": "{now}",
  "error_type": null,
  "details": null
}}

If empty or noise only, return one result with is_error=true, speaker=null, caption=null."""

        resp = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {"results": []}

    # ── WebSocket streaming path ─────────────────────────────────────────────

    def stream_audio(self, url: str):
        """Fetch live stream and push PCM frames to chunk_queue."""
        try:
            container = av.open(url, mode="r", options={"timeout": "10000000"})
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            fc = 0
            for frame in container.decode(audio=0):
                if not self.is_running:
                    break
                for rf in resampler.resample(frame):
                    self.chunk_queue.put(rf.to_ndarray().tobytes())
                    fc += 1
                    if fc % 500 == 0:
                        print(
                            f"  [STREAM] {int(fc * 1024 / 16000)}s | queue={self.chunk_queue.qsize()}"
                        )
        except Exception as e:
            print(f"Streaming error: {e}")
        finally:
            self.is_running = False

    async def transcribe_gen(self, url: str):
        """Async generator yielding transcription dicts (same interface as GeminiTranscriber)."""
        if not self.api_key:
            yield _ERR("ANTHROPIC_API_KEY not configured")
            return

        self.is_running = True
        result_queue: asyncio.Queue = asyncio.Queue()

        sample_rate = 16000
        frame_bytes = int(sample_rate * 0.03 * 2)  # 30ms frames
        min_silence = 12  # ~360ms
        max_speech = sample_rate * 2 * 15  # 15s cap

        thread = threading.Thread(target=self.stream_audio, args=(url,), daemon=True)
        thread.start()

        mount = url.split("/")[-1] if url else None
        rag = self.rag_service.get_context(mount=mount)

        async def _process(pcm: bytes):
            try:
                wav = self._create_wav_header(pcm)
                raw = await asyncio.to_thread(self._stt, wav)
                if raw:
                    print(f"  [STT] {raw[:80]}")
                    result = await asyncio.to_thread(self._parse_with_claude, raw, rag)
                    await result_queue.put(result)
            except Exception as e:
                print(f"Process error: {e}")

        async def _audio_loop():
            import webrtcvad

            vad = webrtcvad.Vad(2)
            buf = b""
            speech_buf = b""
            in_speech = False
            silence_n = 0

            try:
                while self.is_running:
                    try:
                        chunk = await asyncio.to_thread(
                            self.chunk_queue.get, timeout=0.05
                        )
                        buf += chunk
                        while not self.chunk_queue.empty():
                            buf += self.chunk_queue.get_nowait()
                    except queue.Empty:
                        if not self.is_running:
                            break
                        continue

                    while len(buf) >= frame_bytes:
                        frame, buf = buf[:frame_bytes], buf[frame_bytes:]
                        try:
                            is_speech = vad.is_speech(frame, sample_rate)
                        except Exception:
                            is_speech = False

                        if is_speech:
                            if not in_speech:
                                in_speech = True
                                print("  >>> [SPEECH]")
                            silence_n = 0
                            speech_buf += frame
                        elif in_speech:
                            speech_buf += frame
                            silence_n += 1
                            if (
                                silence_n >= min_silence
                                or len(speech_buf) >= max_speech
                            ):
                                if len(speech_buf) > sample_rate * 2 * 0.5:
                                    print("  <<< [TRANSCRIBING]")
                                    asyncio.create_task(_process(speech_buf))
                                speech_buf = b""
                                in_speech = False
                                silence_n = 0
            finally:
                self.is_running = False

        task = asyncio.create_task(_audio_loop())
        try:
            while self.is_running or not result_queue.empty():
                try:
                    yield await asyncio.wait_for(result_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
        finally:
            self.is_running = False
            task.cancel()

    # ── HTTP POST path ───────────────────────────────────────────────────────

    def transcribe_segment(self, audio_data: bytes) -> dict:
        """Transcribe a single webm/wav audio blob (called from HTTP POST endpoint)."""
        if not self.api_key:
            return _ERR("ANTHROPIC_API_KEY not configured")
        if not self.client:
            self.client = anthropic.Anthropic(api_key=self.api_key)

        try:
            raw = self._stt(audio_data)
            if not raw:
                return {
                    "results": [
                        {
                            "is_error": True,
                            "speaker": None,
                            "caption": None,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "error_type": "NO_SPEECH",
                            "details": "No speech detected",
                        }
                    ]
                }
            rag = self.rag_service.get_context()
            return self._parse_with_claude(raw, rag)
        except Exception as e:
            print(f"Segment error: {e}")
            return {
                "results": [
                    {
                        "is_error": True,
                        "speaker": None,
                        "caption": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "error_type": "API_ERROR",
                        "details": str(e),
                    }
                ]
            }
