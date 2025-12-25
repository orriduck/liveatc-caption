import os
import threading
import queue
import av
from google import genai
from google.genai import types
from dotenv import load_dotenv
from models.transcription import TranscriptionResult
import json

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
        Fetches audio from URL and queues it as raw bytes (PCM or MP3 chunks would be better for API).
        Gemini accepts audio files/bytes.
        For efficiency, we'll try to just grab raw audio packets and buffer them.
        """
        try:
            # We want to capture audio in a format Gemini understands (e.g., MP3, WAV, PCM).
            # Since the stream is likely MP3, we might be able to just forward chunks?
            # Accessing the raw stream bytes is easier without decoding to PCM first,
            # but PyAV gives us decoded frames.
            # Let's decode to PCM (s16le, 16kHz) to be safe and consistent,
            # then wrap in a minimal WAV container or send as raw PCM if prompt explains it.
            # Gemini typically likes standard formats.

            # Actually, sending raw PCM to Gemini via 'generate_content' is tricky without a container header.
            # So we will accumulate PCM data and wrap it in a WAV header before sending.

            container = av.open(url, mode="r", options={"timeout": "10000000"})
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)

            frame_count = 0
            for frame in container.decode(audio=0):
                if not self.is_running:
                    break

                resampled_frames = resampler.resample(frame)
                for resampled_frame in resampled_frames:
                    # Get raw bytes
                    data = resampled_frame.to_ndarray().tobytes()
                    self.chunk_queue.put(data)
                    frame_count += 1
                    if frame_count % 100 == 0:
                        # 100 frames * 30ms = 3 seconds roughly, or based on sample rate
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
        """Creates a WAV header for the given PCM data."""
        import struct

        num_channels = 1
        bits_per_sample = 16
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8
        data_size = len(pcm_data)

        header = b"RIFF"
        header += struct.pack("<I", 36 + data_size)
        header += b"WAVEfmt "
        header += struct.pack("<I", 16)  # Subchunk1Size
        header += struct.pack("<H", 1)  # AudioFormat (1=PCM)
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
        Decoupled architecture: audio processing runs in a dedicated loop,
        Gemini calls run in background tasks to prevent lag.
        """
        import asyncio

        if not self.api_key:
            yield {
                "text": "[Error: GEMINI_API_KEY not configured]",
                "speaker": "UNKNOWN",
            }
            return

        self.is_running = True
        result_queue = asyncio.Queue()

        # Audio parameters
        sample_rate = 16000
        frame_duration_ms = 30
        frame_size_bytes = int(sample_rate * (frame_duration_ms / 1000.0) * 2)
        min_silence_frames_to_stop = 12  # ~360ms
        max_speech_bytes = sample_rate * 2 * 10  # 10s max

        # Start the decoder thread
        stream_thread = threading.Thread(target=self.stream_audio, args=(url,))
        stream_thread.daemon = True
        stream_thread.start()

        async def _call_gemini(pcm_data):
            try:
                wav_data = self._create_wav_header(pcm_data)
                # Run blocking API call in thread but don't await it in the main loop
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=MODEL_NAME,
                    config=types.GenerateContentConfig(
                        system_instruction=self.system_prompt,
                        response_mime_type="application/json",
                        response_schema=TranscriptionResult,
                        temperature=0.1,
                    ),
                    contents=[
                        types.Part.from_bytes(data=wav_data, mime_type="audio/wav")
                    ],
                )

                if response.text:
                    try:
                        data = json.loads(response.text)
                        data = {k.lower(): v for k, v in data.items()}
                        # Mapping logic for consistency
                        if (
                            data.get("speaker") == "PILOT"
                            or data.get("speaker_type") == "PILOT"
                        ):
                            data["speaker"] = "PLANE"
                        elif data.get("speaker_type") == "ATC":
                            data["speaker"] = "ATC"

                        result = TranscriptionResult(**data)
                        if (
                            result.text.strip()
                            and result.text.upper() != "UNINTELLIGIBLE STATIC"
                        ):
                            print(f"  [RESULT] ({result.speaker}) {result.text}")
                            await result_queue.put(result.model_dump())
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
                    # Non-blocking get from threading.Queue
                    try:
                        chunk = await asyncio.to_thread(
                            self.chunk_queue.get, timeout=0.05
                        )
                        buffer += chunk
                        # Fast drain
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
                        except Exception as e:
                            print(f"VAD Error: {e}")
                            is_speech = False

                        if is_speech:
                            if not is_speech_active:
                                is_speech_active = True
                                print("  >>> [SPEECH DETECTED] Processing...")
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
                                    # End of utterance
                                    if len(speech_buffer) > sample_rate * 2 * 0.5:
                                        duration = len(speech_buffer) / (
                                            sample_rate * 2
                                        )
                                        print(
                                            f"  <<< [SPEECH ENDED] Transcribing {duration:.1f}s audio..."
                                        )
                                        asyncio.create_task(_call_gemini(speech_buffer))

                                    speech_buffer = b""
                                    is_speech_active = False
                                    silence_frames = 0
            finally:
                print("DEBUG: Audio processing loop terminated")
                self.is_running = False

        # Run audio processor in background
        processor_task = asyncio.create_task(_audio_loop())

        try:
            while self.is_running or not result_queue.empty():
                try:
                    # Wait for results or timeout to check if we should still be running
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
        Expected to be WAV or identifiable format.
        """
        import json

        if not self.api_key:
            return {
                "text": "[Error: GEMINI_API_KEY not configured]",
                "speaker": "UNKNOWN",
            }

        # Ensure we have a client
        if not self.client:
            self.client = genai.Client(api_key=self.api_key)

        try:
            # If the client sends raw PCM/WebM, we might need to wrap it or just send it if Gemini supports it.
            # Assuming the client sends a Blob that is a valid container (WAV/WebM).
            # If it's raw PCM, we'd need to wrap it. Let's try sending directly first.

            response = self.client.models.generate_content(
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    response_schema=TranscriptionResult,
                    temperature=0.1,
                ),
                contents=[
                    types.Part.from_bytes(
                        data=audio_data, mime_type="audio/wav"
                    )  # Optimistically assume WAV or let Gemini sniff
                ],
            )

            if response.text:
                data = json.loads(response.text)
                data = {k.lower(): v for k, v in data.items()}

                if (
                    data.get("speaker") == "PILOT"
                    or data.get("speaker_type") == "PILOT"
                ):
                    data["speaker"] = "PLANE"
                elif data.get("speaker_type") == "ATC":
                    data["speaker"] = "ATC"

                return TranscriptionResult(**data).model_dump()

            return {}

        except Exception as e:
            print(f"Segment Transcription Error: {e}")
            return {"text": f"[Error: {str(e)}]", "speaker": "SYSTEM"}
