import os
import threading
import queue
import av
import json
import asyncio
from datetime import datetime, timezone
from google import genai
from google.genai import types
from dotenv import load_dotenv
from models.transcription import TranscriptionResponse, ATCCaptionResult
from services.rag_service import RAGService

# Configure your model here
MODEL_NAME = "gemini-2.0-flash-exp"


class GeminiTranscriber:
    def __init__(self, api_key=None):
        load_dotenv()
        self.api_key = (api_key or os.environ.get("GEMINI_API_KEY", "")).strip()
        if self.api_key:
            print(
                f"DEBUG: Using API key: ...{self.api_key[-4:] if len(self.api_key) > 4 else '****'}"
            )
            self.client = genai.Client(api_key=self.api_key)
        else:
            print("DEBUG: No API key provided or found in ENV")
            self.client = None
        self.chunk_queue = queue.Queue()
        self.is_running = False
        self.system_prompt = self._load_prompt("transcription_system.txt")
        self.rag_service = RAGService()

    def _load_prompt(self, filename):
        try:
            prompt_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "prompts", filename
            )
            with open(prompt_path, "r") as f:
                return f.read().strip()
        except Exception as e:
            print(f"Error loading prompt {filename}: {e}")
            return "Transcribe the following ATC audio precisely."

    def stream_audio(self, url):
        """
        Fetches audio from URL and queues it as raw bytes.
        """
        try:
            container = av.open(url, mode="r", options={"timeout": "10000000"})
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)

            frame_count = 0
            for frame in container.decode(audio=0):
                if not self.is_running:
                    break

                resampled_frames = resampler.resample(frame)
                for resampled_frame in resampled_frames:
                    data = resampled_frame.to_ndarray().tobytes()
                    self.chunk_queue.put(data)
                    frame_count += 1
                    if frame_count % 500 == 0:
                        elapsed_sec = (frame_count * 1024) / 16000
                        qsize = self.chunk_queue.qsize()
                        print(
                            f"  [STREAM] {int(elapsed_sec)}s captured | Queue: {qsize} frames"
                        )

        except Exception as e:
            print(f"Streaming error: {e}")
        finally:
            self.is_running = False
            print(f"Stream thread stopped for {url}")

    def _create_wav_header(self, pcm_data: bytes, sample_rate=16000) -> bytes:
        import struct

        num_channels = 1
        bits_per_sample = 16
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8
        data_size = len(pcm_data)

        header = b"RIFF"
        header += struct.pack("<I", 36 + data_size)
        header += b"WAVEfmt "
        header += struct.pack("<I", 16)
        header += struct.pack("<H", 1)
        header += struct.pack("<H", num_channels)
        header += struct.pack("<I", sample_rate)
        header += struct.pack("<I", byte_rate)
        header += struct.pack("<H", block_align)
        header += struct.pack("<H", bits_per_sample)
        header += b"data"
        header += struct.pack("<I", data_size)

        return header + pcm_data

    async def transcribe_gen(self, url):
        """
        Async generator that yields transcription results using Gemini.
        """
        if not self.api_key:
            yield {
                "results": [
                    {
                        "speaker": None,
                        "caption": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "error_type": "CONFIG_ERROR",
                        "details": "GEMINI_API_KEY not configured",
                    }
                ]
            }
            return

        self.is_running = True
        result_queue = asyncio.Queue()

        sample_rate = 16000
        frame_duration_ms = 30
        frame_size_bytes = int(sample_rate * (frame_duration_ms / 1000.0) * 2)
        min_silence_frames_to_stop = 12  # ~360ms
        max_speech_bytes = sample_rate * 2 * 15  # 15s max

        stream_thread = threading.Thread(target=self.stream_audio, args=(url,))
        stream_thread.daemon = True
        stream_thread.start()

        async def _call_gemini(pcm_data):
            try:
                wav_data = self._create_wav_header(pcm_data)

                # Extract mount from URL to get airport context
                mount = url.split("/")[-1] if url else None

                # Get RAG context
                rag_context = self.rag_service.get_context(mount=mount)
                full_system_prompt = (
                    f"{self.system_prompt}\n\n# RAG CONTEXT\n{rag_context}"
                )

                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=MODEL_NAME,
                    config=types.GenerateContentConfig(
                        system_instruction=full_system_prompt,
                        response_mime_type="application/json",
                        response_schema=TranscriptionResponse,
                        temperature=0.1,
                    ),
                    contents=[
                        types.Part.from_bytes(data=wav_data, mime_type="audio/wav")
                    ],
                )

                if response.text:
                    try:
                        data = json.loads(response.text)
                        # The schema is TranscriptionResponse (list of results)
                        await result_queue.put(data)
                        print(
                            f"  [RESULT] Processed {len(data.get('results', []))} items"
                        )
                    except Exception as e:
                        print(f"JSON Error: {e} | Raw: {response.text}")
            except Exception as e:
                print(f"Gemini API Error: {e}")

        async def _audio_loop():
            import webrtcvad

            vad = webrtcvad.Vad(2)
            buffer = b""
            speech_buffer = b""
            is_speech_active = False
            silence_frames = 0

            print(f"DEBUG: Audio processing loop started for {url}")

            try:
                while self.is_running:
                    try:
                        chunk = await asyncio.to_thread(
                            self.chunk_queue.get, timeout=0.05
                        )
                        buffer += chunk
                        while not self.chunk_queue.empty():
                            buffer += self.chunk_queue.get_nowait()
                    except queue.Empty:
                        if not self.is_running:
                            break
                        continue

                    while len(buffer) >= frame_size_bytes:
                        frame = buffer[:frame_size_bytes]
                        buffer = buffer[frame_size_bytes:]

                        try:
                            is_speech = vad.is_speech(frame, sample_rate)
                        except Exception:
                            is_speech = False

                        if is_speech:
                            if not is_speech_active:
                                is_speech_active = True
                                print("  >>> [SPEECH DETECTED]")
                            silence_frames = 0
                            speech_buffer += frame
                        else:
                            if is_speech_active:
                                speech_buffer += frame
                                silence_frames += 1
                                if (
                                    silence_frames >= min_silence_frames_to_stop
                                    or len(speech_buffer) >= max_speech_bytes
                                ):
                                    if len(speech_buffer) > sample_rate * 2 * 0.5:
                                        print(f"  <<< [SPEECH ENDED] Transcribing...")
                                        asyncio.create_task(_call_gemini(speech_buffer))

                                    speech_buffer = b""
                                    is_speech_active = False
                                    silence_frames = 0
            finally:
                print("DEBUG: Audio processing loop terminated")
                self.is_running = False

        processor_task = asyncio.create_task(_audio_loop())

        try:
            while self.is_running or not result_queue.empty():
                try:
                    result = await asyncio.wait_for(result_queue.get(), timeout=1.0)
                    yield result
                except asyncio.TimeoutError:
                    continue
        finally:
            self.is_running = False
            processor_task.cancel()

    def transcribe_segment(self, audio_data: bytes) -> dict:
        """
        Transcribes a single segment of audio data (bytes).
        """
        if not self.api_key:
            return {
                "results": [
                    {
                        "speaker": None,
                        "caption": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "error_type": "CONFIG_ERROR",
                        "details": "GEMINI_API_KEY not configured",
                    }
                ]
            }

        if not self.client:
            self.client = genai.Client(api_key=self.api_key)

        try:
            # Get RAG context (no mount for segment usually, but can be added if needed)
            rag_context = self.rag_service.get_context()
            full_system_prompt = f"{self.system_prompt}\n\n# RAG CONTEXT\n{rag_context}"

            response = self.client.models.generate_content(
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=full_system_prompt,
                    response_mime_type="application/json",
                    response_schema=TranscriptionResponse,
                    temperature=0.1,
                ),
                contents=[
                    types.Part.from_bytes(data=audio_data, mime_type="audio/wav")
                ],
            )

            if response.text:
                return json.loads(response.text)

            return {"results": []}

        except Exception as e:
            print(f"Segment Transcription Error: {e}")
            return {
                "results": [
                    {
                        "speaker": None,
                        "caption": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "error_type": "API_ERROR",
                        "details": str(e),
                    }
                ]
            }
