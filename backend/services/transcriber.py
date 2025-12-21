import sys
import os
import requests
import numpy as np
import av
from faster_whisper import WhisperModel
import threading
import queue
import time

# Options for the model
MODEL_SIZE = "base.en" # Good balance for ATC
DEVICE = "cpu"        # Default to cpu, change to "cuda" if GPU is available
COMPUTE_TYPE = "int8"   # Optimized for CPU

class AudioTranscriber:
    def __init__(self, model_size=MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self.chunk_queue = queue.Queue()
        self.is_running = False

    def stream_audio(self, url):
        """
        Fetches audio from URL and decodes it into PCM chunks.
        """
        try:
            # Use requests to stream the audio
            # Note: verify=False for macOS SSL issues
            container = av.open(url, mode='r', options={'timeout': '10000000'})
            
            # Resample to 16kHz (Whisper requirement)
            resampler = av.AudioResampler(
                format='s16',
                layout='mono',
                rate=16000,
            )

            for frame in container.decode(audio=0):
                if not self.is_running:
                    break
                
                resampled_frames = resampler.resample(frame)
                for resampled_frame in resampled_frames:
                    # Convert to numpy and then to float32 normalized to [-1, 1]
                    audio_data = np.frombuffer(resampled_frame.to_ndarray(), dtype=np.int16).astype(np.float32) / 32768.0
                    self.chunk_queue.put(audio_data)
                    
        except Exception as e:
            print(f"Streaming error: {e}")
        finally:
            self.is_running = False

    def transcribe_gen(self, url):
        """
        Generator that yields transcription results with low latency.
        """
        self.is_running = True
        stream_thread = threading.Thread(target=self.stream_audio, args=(url,))
        stream_thread.daemon = True
        stream_thread.start()

        buffer = np.array([], dtype=np.float32)
        
        # Lower latency: 1.5 seconds is usually enough for a short ATC burst
        min_buffer_size = 16000 * 1.5 
        
        # To avoid cutting off words, we can keep a bit of the previous buffer
        overlap_size = 16000 * 0.5 

        try:
            while self.is_running or not self.chunk_queue.empty():
                try:
                    # Collect chunks until we have enough for a transcription window
                    while len(buffer) < min_buffer_size:
                        chunk = self.chunk_queue.get(timeout=0.5)
                        buffer = np.concatenate((buffer, chunk))
                except queue.Empty:
                    if not self.is_running:
                        break
                    # If empty but still running, try to transcribe what we have if any
                    if len(buffer) < 8000: # Less than 0.5s, skip
                        continue

                # Transcribe current buffer
                segments, info = self.model.transcribe(
                    buffer, 
                    beam_size=3,      # Lower beam size for speed
                    vad_filter=True,
                    vad_parameters=dict(
                        min_silence_duration_ms=300,
                        speech_pad_ms=200
                    )
                )
                
                for segment in segments:
                    if segment.text.strip():
                        # Basic filtering to avoid junk like [Music] or common hallucinations
                        text = segment.text.strip()
                        if len(text) > 1:
                            yield text
                
                # Sliding window: keep the end of the buffer to maintain context
                if len(buffer) > overlap_size:
                    buffer = buffer[-int(overlap_size):]
                else:
                    buffer = np.array([], dtype=np.float32)

        finally:
            self.is_running = False
            stream_thread.join()

if __name__ == "__main__":
    print("Transcriber module loaded. Use through AudioTranscriber().")
