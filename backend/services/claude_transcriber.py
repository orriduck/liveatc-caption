import io
import json
import os
import re
import asyncio
from datetime import datetime, timezone

import anthropic

from services.base_transcriber import BaseTranscriber, make_error_result

CLAUDE_MODEL = "claude-haiku-4-5-20251001"
WHISPER_MODEL_SIZE = "tiny.en"

# Expanded ICAO phraseology prompt fed to Whisper's decoder.
# Covers number pronunciation, callsign patterns, standard phrases, and
# the phonetic alphabet so the beam search stays in the aviation domain.
_ATC_INITIAL_PROMPT = (
    "ATC radio communication. ICAO standard phraseology throughout. "
    # Number pronunciation variants Whisper must recognize:
    "Numbers spoken digit by digit: zero one two tree four fife six seven eight niner. "
    "Nine is always 'niner', five is 'fife', three is 'tree'. "
    # Callsign patterns:
    "Commercial callsigns: airline name + flight number digit by digit "
    "(e.g. 'United two seven six', 'Delta one two three', 'Southwest four niner eight'). "
    "General aviation: 'November' prefix or manufacturer + digits "
    "(e.g. 'November five three four alpha bravo', 'Cessna seven two seven'). "
    "Abbreviated after first call to last three characters. "
    "Military: Reach, Evac, Venus, Cope, Knife. "
    # Standard instructions:
    "Cleared for takeoff, cleared to land, line up and wait, hold short of, "
    "cross runway, go around, contact departure on, radar contact, traffic in sight, "
    "descend and maintain, climb and maintain, fly heading, reduce speed to, "
    "expect ILS approach runway, cleared visual approach, report field in sight, "
    "squawk, ident, say again, stand by, wilco, roger, affirmative, negative. "
    # Airspace/facility names:
    "Tower, ground, approach, departure, center, clearance delivery, ATIS, UNICOM. "
    # Weather/altimetry:
    "Altimeter two niner niner two. Wind calm. Ceiling. Visibility. "
    "QNH, QFE, temperature dewpoint. "
    # Phonetic alphabet (biases the decoder toward these words):
    "Alpha Bravo Charlie Delta Echo Foxtrot Golf Hotel India "
    "Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo "
    "Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu."
)


class ClaudeTranscriber(BaseTranscriber):
    def __init__(self, api_key: str | None = None, model_size: str | None = None):
        # Env var always wins; frontend-passed key is only a fallback for
        # cases where no server-side key is configured (e.g. personal dev setup).
        resolved = (os.environ.get("ANTHROPIC_API_KEY", "") or api_key or "").strip()
        super().__init__(api_key=resolved)
        self.client = anthropic.Anthropic(api_key=self.api_key) if self.api_key else None
        self._whisper = None
        self._model_size = model_size or WHISPER_MODEL_SIZE

    # ── Whisper ───────────────────────────────────────────────────────────────

    def _get_whisper(self):
        if self._whisper is None:
            from faster_whisper import WhisperModel

            print(f"[Whisper] Loading {self._model_size} (first run may download)…")
            self._whisper = WhisperModel(
                self._model_size, device="cpu", compute_type="int8"
            )
            print("[Whisper] Model ready.")
        return self._whisper

    def _stt(self, audio_bytes: bytes, hotwords: list[str] | None = None) -> str:
        """Speech-to-text via faster-whisper. Accepts WAV bytes."""
        whisper = self._get_whisper()
        kwargs: dict = dict(
            beam_size=5,
            language="en",
            initial_prompt=_ATC_INITIAL_PROMPT,
            condition_on_previous_text=False,
        )
        if hotwords:
            # faster-whisper ≥ 1.1 accepts a hotwords string to bias the decoder.
            kwargs["hotwords"] = " ".join(hotwords)
        segments, _ = whisper.transcribe(io.BytesIO(audio_bytes), **kwargs)
        return " ".join(s.text.strip() for s in segments).strip()

    # ── Claude ────────────────────────────────────────────────────────────────

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

    # ── BaseTranscriber interface ─────────────────────────────────────────────

    async def _transcribe_chunk(self, pcm: bytes, rag_context: str) -> dict:
        hotwords = self.rag_service.get_hotwords(self._current_icao)
        wav = self._create_wav_header(pcm)
        raw = await asyncio.to_thread(self._stt, wav, hotwords)
        if not raw:
            return make_error_result("NO_SPEECH", "No speech detected")
        print(f"  [STT] {raw[:80]}")
        return await asyncio.to_thread(self._parse_with_claude, raw, rag_context)

    def transcribe_segment(self, audio_data: bytes) -> dict:
        """HTTP POST path — blocking, no VAD."""
        if not self.api_key:
            return make_error_result("CONFIG_ERROR", "ANTHROPIC_API_KEY not configured")
        try:
            hotwords = self.rag_service.get_hotwords(self._current_icao)
            raw = self._stt(audio_data, hotwords)
            if not raw:
                return make_error_result("NO_SPEECH", "No speech detected")
            rag = self.rag_service.get_context()
            return self._parse_with_claude(raw, rag)
        except Exception as e:
            print(f"Segment error: {e}")
            return make_error_result("API_ERROR", str(e))
