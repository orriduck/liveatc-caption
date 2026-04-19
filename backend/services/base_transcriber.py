"""
BaseTranscriber — shared audio streaming, VAD, and prompt loading.

Both ClaudeTranscriber and GeminiTranscriber extend this class and only need
to implement _transcribe_chunk() and transcribe_segment().
"""
import os
import queue
import threading
import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone

import av


def make_error_result(error_type: str, details: str) -> dict:
    return {
        "results": [
            {
                "is_error": True,
                "speaker": None,
                "caption": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error_type": error_type,
                "details": details,
            }
        ]
    }


class BaseTranscriber(ABC):
    SAMPLE_RATE = 16000
    FRAME_MS = 30  # webrtcvad requires 10/20/30ms frames
    MIN_SILENCE_FRAMES = 12  # ~360 ms of silence ends an utterance
    MAX_SPEECH_BYTES = 16000 * 2 * 15  # hard cap: 15 s
    MIN_SPEECH_BYTES = int(16000 * 2 * 0.5)  # ignore clips < 0.5 s

    def __init__(self, api_key: str | None = None):
        from services.rag_service import RAGService

        self.api_key = (api_key or "").strip()
        self.chunk_queue: queue.Queue = queue.Queue()
        self.audio_queue: queue.Queue = queue.Queue()
        self.bytes_queued: int = 0
        self.is_running = False
        self.rag_service = RAGService()
        self.system_prompt = self._load_prompt()
        self._current_icao: str | None = None

    # ── Prompt ───────────────────────────────────────────────────────────────

    def _load_prompt(self) -> str:
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

    # ── Audio helpers ─────────────────────────────────────────────────────────

    def _create_wav_header(self, pcm_data: bytes, sample_rate: int = 16000) -> bytes:
        import struct

        nc, bps = 1, 16
        br = sample_rate * nc * bps // 8
        ba = nc * bps // 8
        ds = len(pcm_data)
        h = b"RIFF" + struct.pack("<I", 36 + ds) + b"WAVEfmt "
        h += struct.pack("<IHHIIHH", 16, 1, nc, sample_rate, br, ba, bps)
        h += b"data" + struct.pack("<I", ds)
        return h + pcm_data

    def stream_audio(self, url: str) -> None:
        """Fetch live stream in a thread and push PCM frames to chunk_queue and audio_queue."""
        try:
            container = av.open(url, mode="r", options={"timeout": "10000000"})
            resampler = av.AudioResampler(
                format="s16", layout="mono", rate=self.SAMPLE_RATE
            )
            fc = 0
            for frame in container.decode(audio=0):
                if not self.is_running:
                    break
                for rf in resampler.resample(frame):
                    pcm_bytes = rf.to_ndarray().tobytes()
                    self.chunk_queue.put(pcm_bytes)
                    self.audio_queue.put(pcm_bytes)
                    self.bytes_queued += len(pcm_bytes)
                    fc += 1
                    if fc % 500 == 0:
                        print(
                            f"  [STREAM] {int(fc * 1024 / self.SAMPLE_RATE)}s"
                            f" | queue={self.chunk_queue.qsize()}"
                        )
        except Exception as e:
            print(f"Streaming error: {e}")
        finally:
            self.is_running = False

    # ── Abstract interface ────────────────────────────────────────────────────

    @abstractmethod
    async def _transcribe_chunk(self, pcm: bytes, rag_context: str) -> dict:
        """Transcribe one VAD-segmented PCM chunk; return structured dict."""
        ...

    @abstractmethod
    def transcribe_segment(self, audio_data: bytes) -> dict:
        """Transcribe a single audio blob (HTTP POST path, blocking)."""
        ...

    # ── WebSocket streaming (shared) ──────────────────────────────────────────

    async def transcribe_gen(self, url: str):
        """Async generator: stream → VAD → _transcribe_chunk → yield results."""
        if not self.api_key:
            yield make_error_result(
                "CONFIG_ERROR", f"{type(self).__name__}: API key not configured"
            )
            return

        self.is_running = True
        result_queue: asyncio.Queue = asyncio.Queue()
        frame_bytes = int(self.SAMPLE_RATE * self.FRAME_MS / 1000 * 2)

        # Derive ICAO and pre-fetch airport context before the audio loop starts.
        mount = url.split("/")[-1] if url else None
        if mount:
            self._current_icao = mount.split("_")[0].upper()
            await asyncio.to_thread(
                self.rag_service.prefetch_airport, self._current_icao
            )

        rag = self.rag_service.get_context(mount=mount)

        thread = threading.Thread(target=self.stream_audio, args=(url,), daemon=True)
        thread.start()

        async def _process(pcm: bytes) -> None:
            try:
                result = await self._transcribe_chunk(pcm, rag)
                await result_queue.put(result)
            except Exception as e:
                print(f"Process error: {e}")

        async def _audio_loop() -> None:
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
                            is_speech = vad.is_speech(frame, self.SAMPLE_RATE)
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
                                silence_n >= self.MIN_SILENCE_FRAMES
                                or len(speech_buf) >= self.MAX_SPEECH_BYTES
                            ):
                                if len(speech_buf) > self.MIN_SPEECH_BYTES:
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
