from pydantic import BaseModel
from typing import List, Optional


class Frequency(BaseModel):
    facility: str
    frequency: str


class Channel(BaseModel):
    name: str
    id: str
    status: str
    is_up: bool
    listeners: int
    data_source: Optional[str] = None  # 'local' or 'remote'
    stream_url: Optional[str] = None
    frequencies: List[Frequency]


class AirportInfo(BaseModel):
    icao: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    metar: Optional[str] = None


class SearchResponse(BaseModel):
    airport: AirportInfo = AirportInfo()
    channels: List[Channel] = []
