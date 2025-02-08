from pydantic import BaseModel
from typing import List, Optional

class AudioChannel(BaseModel):
    """Model for an audio channel from LiveATC"""
    name: str
    url: str
    description: Optional[str] = None
    feed_type: Optional[str] = None
    quality: Optional[str] = None

class Airport(BaseModel):
    """Model for airport information"""
    icao: str
    name: str
    channels: List[AudioChannel] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    region: Optional[str] = None

class SearchResult(BaseModel):
    """Model for search results"""
    query: str
    results: List[Airport] = []
    total_count: int = 0