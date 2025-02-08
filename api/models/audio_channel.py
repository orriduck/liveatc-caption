from typing import List, Optional

from pydantic import BaseModel


class Frequency(BaseModel):
    facility: str  # e.g., "Boston Approach (Final One)"
    frequency: str  # e.g., "126.500"


class AudioChannel(BaseModel):
    """Model for an audio channel from LiveATC"""

    name: str  # e.g., "KBOS App (Final Vector)"
    airport_icao: str  # e.g., "KBOS"
    feed_status: bool = True  # UP/DOWN status
    frequencies: List[Frequency] = []  # List of frequencies
    mp3_url: Optional[str] = None  # MP3 stream URL (optional)
