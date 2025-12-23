from fastapi import APIRouter, HTTPException, Query
from services.scraper import search_channels
from models.search import SearchResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(icao: str = Query(..., min_length=3, max_length=10)):
    """
    Search for LiveATC channels by ICAO code (e.g., KBOS).
    """
    try:
        results = search_channels(icao)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
