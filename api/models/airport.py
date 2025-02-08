from pydantic import BaseModel
from typing import List, Optional
from .audio_channel import AudioChannel

class Airport(BaseModel):
    """Model for airport information"""
    icao: str
    name: str
    iata: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metar: Optional[str] = None
    audio_channels: List[AudioChannel] = [] 