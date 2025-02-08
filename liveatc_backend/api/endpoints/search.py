from fastapi import APIRouter, HTTPException
from ...services.liveatc import LiveATCClient
from ...models.search import SearchResult
from ...models.airport import Airport

router = APIRouter()
liveatc = LiveATCClient()

@router.get("/{query}", response_model=SearchResult)
async def search_channels(query: str):
    """Search for audio channels based on query"""
    try:
        # Search for airports matching the query
        airports = []
        if len(query) >= 3:  # Only search if query is at least 3 characters
            if query.isalpha():  # ICAO/IATA search
                airport = await liveatc.search_airport(query.upper())
                if airport:
                    airports.append(airport)
        
        return SearchResult(
            query=query,
            results=airports,
            total_count=len(airports)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching channels: {str(e)}"
        ) 