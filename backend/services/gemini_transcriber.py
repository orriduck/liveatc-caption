import asyncio
import json
import os


from google import genai
from google.genai import types

from models.transcription import TranscriptionResponse
from services.base_transcriber import BaseTranscriber, make_error_result

MODEL_NAME = "gemini-2.0-flash-exp"


class GeminiTranscriber(BaseTranscriber):
    def __init__(self, api_key: str | None = None):
        resolved = (api_key or os.environ.get("GEMINI_API_KEY", "")).strip()
        super().__init__(api_key=resolved)
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def _build_system(self, rag_context: str) -> str:
        if rag_context:
            return f"{self.system_prompt}\n\n# RAG CONTEXT\n{rag_context}"
        return self.system_prompt

    # ── BaseTranscriber interface ─────────────────────────────────────────────

    async def _transcribe_chunk(self, pcm: bytes, rag_context: str) -> dict:
        wav_data = self._create_wav_header(pcm)
        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=self._build_system(rag_context),
                    response_mime_type="application/json",
                    response_schema=TranscriptionResponse,
                    temperature=0.1,
                ),
                contents=[
                    types.Part.from_bytes(data=wav_data, mime_type="audio/wav")
                ],
            )
            if response.text:
                data = json.loads(response.text)
                print(f"  [RESULT] {len(data.get('results', []))} items")
                return data
            return {"results": []}
        except Exception as e:
            print(f"Gemini API error: {e}")
            return make_error_result("API_ERROR", str(e))

    def transcribe_segment(self, audio_data: bytes) -> dict:
        """HTTP POST path — blocking, no VAD."""
        if not self.api_key:
            return make_error_result("CONFIG_ERROR", "GEMINI_API_KEY not configured")
        if not self.client:
            self.client = genai.Client(api_key=self.api_key)

        try:
            rag_context = self.rag_service.get_context()
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=self._build_system(rag_context),
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
            print(f"Segment transcription error: {e}")
            return make_error_result("API_ERROR", str(e))
