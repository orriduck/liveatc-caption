from pydantic import BaseModel
from typing import List
from .airport import Airport

class SearchResult(BaseModel):
    """Model for search results"""
    query: str
    results: List[Airport] = []
    total_count: int = 0 