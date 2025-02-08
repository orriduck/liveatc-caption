from pydantic import BaseModel
from typing import Optional, List

class AudioChannel(BaseModel):
    name: str
    frequency: Optional[str]
    url: str

class Airport(BaseModel):
    icao: str
    iata: Optional[str]
    name: str
    city: Optional[str]
    country: Optional[str]
    audio_channels: List[AudioChannel] = [] 