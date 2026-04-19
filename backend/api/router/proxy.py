import httpx

from fastapi import APIRouter, Query

router = APIRouter(prefix="/proxy", tags=["proxy"])

_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
}


@router.get("/metar/{icao}")
async def proxy_metar(icao: str):
    """Proxy METAR data from aviationweather.gov (browser can't set User-Agent)."""
    url = f"https://aviationweather.gov/api/data/metar?ids={icao.upper()}&format=json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url, headers=_BROWSER_HEADERS, follow_redirects=True
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"METAR fetch error for {icao}: {e}")
        return []


@router.get("/aircraft/positions")
async def proxy_aircraft(
    lat: float = Query(...),
    lon: float = Query(...),
    dist: float = Query(default=20),  # nautical miles
):
    """Proxy ADS-B Exchange (adsb.lol) positions — no auth, no rate-limit."""
    url = f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{int(dist)}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url, headers=_BROWSER_HEADERS, follow_redirects=True
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"ADS-B fetch error: {e}")
        return {"ac": []}
