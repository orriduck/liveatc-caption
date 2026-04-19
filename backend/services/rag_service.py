"""
RAGService — builds context strings and Whisper hotword lists for a given airport.

Airport metadata pipeline (all fetched at runtime, cached per ICAO):
  1. LiveATC scraper  → airport name, METAR, ATC frequencies
  2. AviationAPI.com  → runways, lat/lon (free, no auth)
  3. adsb.lol         → nearby aircraft callsigns (requires lat/lon from step 2)

Hotwords fed to Whisper's decoder:
  • Runway identifiers (e.g. "27L", "TWO SEVEN LEFT")
  • Nearby aircraft callsigns
  • Airport ICAO code
"""

import json
import os
import re
import threading

import httpx

from services.scraper import search_channels

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}
_TIMEOUT = 10.0


class RAGService:
    def __init__(self):
        self.kb_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "knowledge_base",
            "atc_phraseology.json",
        )
        self.data = self._load_kb()

        # Per-ICAO caches
        self._airport_ctx: dict[str, str] = {}   # icao → context string
        self._runways: dict[str, list[str]] = {}  # icao → ["27L", "09R", …]
        self._coords: dict[str, tuple[float, float]] = {}  # icao → (lat, lon)
        self._callsigns: dict[str, list[str]] = {}  # icao → ["UAL276", …]
        self._lock = threading.Lock()

    # ── Knowledge-base ────────────────────────────────────────────────────────

    def _load_kb(self) -> dict:
        try:
            if os.path.exists(self.kb_path):
                with open(self.kb_path) as f:
                    return json.load(f)
        except Exception as e:
            print(f"KB load error: {e}")
        return {}

    # ── Airport metadata fetching ─────────────────────────────────────────────

    def prefetch_airport(self, icao: str) -> None:
        """
        Blocking: fetch all airport data for `icao` and populate caches.
        Safe to call from asyncio.to_thread().
        """
        with self._lock:
            already_done = icao in self._airport_ctx
        if already_done:
            return

        print(f"[RAG] Fetching airport data for {icao}…")
        self._fetch_liveatc(icao)
        self._fetch_aviationweather(icao)
        self._fetch_callsigns(icao)

    def _fetch_liveatc(self, icao: str) -> None:
        """Populate airport name, METAR, and ATC frequencies from LiveATC scraper."""
        try:
            data = search_channels(icao)
            airport = data.get("airport", {})
            channels = data.get("channels", [])

            parts = []
            if airport.get("name"):
                parts.append(f"AIRPORT: {airport['name']} ({icao})")
            if airport.get("metar"):
                parts.append(f"METAR: {airport['metar']}")

            freqs = set()
            for c in channels:
                for f in c.get("frequencies", []):
                    freqs.add(f"{f['facility']}: {f['frequency']}")
            if freqs:
                parts.append(f"ATC FREQUENCIES: {', '.join(sorted(freqs))}")

            with self._lock:
                self._airport_ctx[icao] = "\n".join(parts)
        except Exception as e:
            print(f"[RAG] LiveATC fetch error for {icao}: {e}")
            with self._lock:
                self._airport_ctx.setdefault(icao, "")

    def _fetch_aviationweather(self, icao: str) -> None:
        """
        Fetch airport coordinates and runways from aviationweather.gov (free, no auth).
        API: https://aviationweather.gov/api/data/airport?ids={ICAO}&format=json
        """
        try:
            url = f"https://aviationweather.gov/api/data/airport?ids={icao}&format=json"
            with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS) as client:
                resp = client.get(url, follow_redirects=True)
                resp.raise_for_status()
                payload = resp.json()

            if not payload:
                return

            item = payload[0]

            lat = item.get("lat")
            lon = item.get("lon")
            if lat is not None and lon is not None:
                with self._lock:
                    self._coords[icao] = (float(lat), float(lon))
                print(f"[RAG] {icao} coords: ({lat:.4f}, {lon:.4f})")

            # runways: [{'id': '06L/24R', ...}, ...]
            runway_ids: list[str] = []
            for rwy in item.get("runways", []):
                rwy_id = rwy.get("id", "")
                # Each entry is like "06L/24R" — expand both ends
                for part in rwy_id.split("/"):
                    part = part.strip().upper()
                    if part:
                        runway_ids.append(part)

            if runway_ids:
                with self._lock:
                    self._runways[icao] = runway_ids
                print(f"[RAG] {icao} runways: {runway_ids}")

        except Exception as e:
            print(f"[RAG] AviationWeather fetch error for {icao}: {e}")

    def _fetch_callsigns(self, icao: str) -> None:
        """
        Fetch nearby aircraft callsigns from adsb.lol using airport coordinates.
        Radius: 40 nm (covers approach/departure corridors).
        """
        with self._lock:
            coords = self._coords.get(icao)
        if not coords:
            return

        lat, lon = coords
        try:
            url = f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/40"
            with httpx.Client(timeout=_TIMEOUT, headers=_HEADERS) as client:
                resp = client.get(url, follow_redirects=True)
                resp.raise_for_status()
                payload = resp.json()

            callsigns: list[str] = []
            for ac in payload.get("ac", []):
                cs = ac.get("flight", "").strip()
                if cs and cs != "N/A":
                    callsigns.append(cs)

            if callsigns:
                with self._lock:
                    self._callsigns[icao] = callsigns
                print(f"[RAG] {icao}: {len(callsigns)} nearby callsigns")

        except Exception as e:
            print(f"[RAG] ADS-B fetch error for {icao}: {e}")

    # ── Public API ────────────────────────────────────────────────────────────

    def get_hotwords(self, icao: str | None) -> list[str]:
        """
        Return a list of tokens to bias Whisper's decoder toward.
        Includes: ICAO, runway ids, and nearby callsigns.
        """
        words: list[str] = []
        if not icao:
            return words

        words.append(icao)

        with self._lock:
            runways = list(self._runways.get(icao, []))
            callsigns = list(self._callsigns.get(icao, []))

        for rwy in runways:
            words.append(rwy)
            # Also add the spoken form so the decoder gets both representations.
            words.append(_runway_spoken(rwy))

        # Limit callsigns to top 30 to keep the hotwords string manageable.
        words.extend(callsigns[:30])

        return words

    def get_context(self, text_hint: str = "", mount: str | None = None) -> str:
        """
        Build the RAG context string injected into the LLM system prompt.
        """
        parts: list[str] = []

        # --- Dynamic airport context ---
        if mount:
            icao = mount.split("_")[0].upper()
            with self._lock:
                airport_ctx = self._airport_ctx.get(icao, "")
                runways = self._runways.get(icao, [])
                callsigns = self._callsigns.get(icao, [])

            if airport_ctx:
                parts.append(f"### AIRPORT ({icao})\n{airport_ctx}")

            if runways:
                spoken = [f"{r} ({_runway_spoken(r)})" for r in runways]
                parts.append(f"RUNWAYS: {', '.join(spoken)}")

            if callsigns:
                parts.append(
                    f"AIRCRAFT IN VICINITY ({len(callsigns)} total): "
                    + ", ".join(callsigns[:20])
                    + (" …" if len(callsigns) > 20 else "")
                )
                parts.append(
                    "Use these callsigns when the audio matches — they are "
                    "real flights currently near this airport."
                )

        # --- Static phraseology rules ---
        parts.append("### GENERAL ATC RULES")
        kb = self.data

        if "runway_rules" in kb:
            parts.append(f"RUNWAY RULES: {kb['runway_rules']['description']}")
            for p in kb["runway_rules"]["patterns"]:
                parts.append(f"- {p['instruction']}")

        if "tail_number_rules" in kb:
            parts.append(f"AIRCRAFT ID RULES: {kb['tail_number_rules']['description']}")
            for p in kb["tail_number_rules"]["patterns"]:
                if "instruction" in p:
                    parts.append(f"- {p['instruction']}")

        if "waypoint_rules" in kb:
            synonyms = kb["waypoint_rules"].get("synonyms", [])
            if not text_hint or any(s.lower() in text_hint.lower() for s in synonyms):
                parts.append(
                    f"WAYPOINT RULES: {kb['waypoint_rules']['description']}"
                )
                for p in kb["waypoint_rules"]["patterns"]:
                    if "instruction" in p:
                        parts.append(f"- {p['instruction']}")

        if "number_pronunciation_variations" in kb:
            vars_str = ", ".join(
                f"{k}: {v}" for k, v in kb["number_pronunciation_variations"].items()
            )
            parts.append(f"PRONUNCIATION VARIATIONS: {vars_str}")

        if "standard_output_mapping" in kb:
            mapping_str = ", ".join(
                f"{k} -> {v}" for k, v in kb["standard_output_mapping"].items()
            )
            parts.append(f"STANDARD OUTPUT MAPPING: {mapping_str}")

        return "\n".join(parts)

    # ── Legacy compatibility ──────────────────────────────────────────────────

    def fetch_airport_context(self, icao: str) -> None:
        """Kept for backwards compatibility; delegates to prefetch_airport."""
        self.prefetch_airport(icao)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _runway_spoken(rwy_id: str) -> str:
    """
    Convert a runway identifier to its spoken form.
    "27L" → "TWO SEVEN LEFT", "09" → "ZERO NINER"
    """
    _digit_map = {
        "0": "ZERO", "1": "ONE", "2": "TWO", "3": "THREE",
        "4": "FOUR", "5": "FIFE", "6": "SIX", "7": "SEVEN",
        "8": "EIGHT", "9": "NINER",
    }
    _suffix_map = {"L": "LEFT", "R": "RIGHT", "C": "CENTER"}

    rwy = rwy_id.strip().upper()
    suffix = ""
    if rwy and rwy[-1] in _suffix_map:
        suffix = " " + _suffix_map[rwy[-1]]
        rwy = rwy[:-1]

    spoken_digits = " ".join(_digit_map.get(c, c) for c in rwy if c.isdigit())
    return (spoken_digits + suffix).strip()
