import json
import os
from services.scraper import search_channels


class RAGService:
    def __init__(self):
        self.kb_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "knowledge_base",
            "atc_phraseology.json",
        )
        self.data = self._load_kb()
        self.airport_cache = {}  # icao -> context_str

    def _load_kb(self):
        try:
            if os.path.exists(self.kb_path):
                with open(self.kb_path, "r") as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            return {}

    def fetch_airport_context(self, icao: str):
        """Fetches and caches info for a specific airport."""
        if icao in self.airport_cache:
            return

        try:
            print(f"DEBUG: Fetching dynamic RAG context for {icao}")
            data = search_channels(icao)
            airport = data.get("airport", {})
            channels = data.get("channels", [])

            context_parts = []
            if airport.get("name"):
                context_parts.append(f"AIRPORT: {airport['name']} ({icao})")
            if airport.get("metar"):
                context_parts.append(f"CURRENT METAR: {airport['metar']}")

            if channels:
                freqs = []
                for c in channels:
                    for f in c.get("frequencies", []):
                        freqs.append(f"{f['facility']}: {f['frequency']}")
                if freqs:
                    context_parts.append(
                        f"FREQUENCIES AT THIS AIRPORT: {', '.join(set(freqs))}"
                    )

            self.airport_cache[icao] = "\n".join(context_parts)
        except Exception as e:
            print(f"Error fetching airport context for {icao}: {e}")

    def get_context(self, text_hint: str = "", mount: str = None) -> str:
        """
        Returns relevant context based on keywords and/or the mount point.
        """
        context_parts = []

        # Dynamic Airport Context
        if mount:
            # mount is like 'kjfk_twr', first part is usually icao
            icao = mount.split("_")[0].upper()
            if icao not in self.airport_cache:
                # We can't await here easily, but we can trigger it or assume it was done
                self.fetch_airport_context(icao)

            airport_ctx = self.airport_cache.get(icao)
            if airport_ctx:
                context_parts.append(
                    f"### DYNAMIC AIRPORT CONTEXT ({icao})\n{airport_ctx}"
                )

        # Static Rules
        context_parts.append("### GENERAL ATC RULES")
        if "runway_rules" in self.data:
            context_parts.append(
                f"RUNWAY RULES: {self.data['runway_rules']['description']}"
            )
            for p in self.data["runway_rules"]["patterns"]:
                context_parts.append(f"- {p['instruction']}")

        if "tail_number_rules" in self.data:
            context_parts.append(
                f"AIRCRAFT ID RULES: {self.data['tail_number_rules']['description']}"
            )
            for p in self.data["tail_number_rules"]["patterns"]:
                if "instruction" in p:
                    context_parts.append(f"- {p['instruction']}")

        # Waypoints
        if "waypoint_rules" in self.data:
            synonyms = self.data["waypoint_rules"].get("synonyms", [])
            is_waypoint_related = (
                any(s.lower() in text_hint.lower() for s in synonyms)
                if text_hint
                else True
            )
            if is_waypoint_related:
                context_parts.append(
                    f"WAYPOINT/REPORTING RULES: {self.data['waypoint_rules']['description']}"
                )
                for p in self.data["waypoint_rules"]["patterns"]:
                    if "instruction" in p:
                        context_parts.append(f"- {p['instruction']}")
                    elif "reporting" in p:
                        context_parts.append(f"- {p['reporting']}")

        # Phonetics
        if "number_pronunciation_variations" in self.data:
            vars_str = ", ".join(
                [
                    f"{k}: {v}"
                    for k, v in self.data["number_pronunciation_variations"].items()
                ]
            )
            context_parts.append(
                f"PRONUNCIATION VARIATIONS (Recognize these as numbers): {vars_str}"
            )

        if "standard_output_mapping" in self.data:
            mapping_str = ", ".join(
                [f"{k} -> {v}" for k, v in self.data["standard_output_mapping"].items()]
            )
            context_parts.append(f"STANDARD OUTPUT MAPPING: {mapping_str}")

        return "\n".join(context_parts)
