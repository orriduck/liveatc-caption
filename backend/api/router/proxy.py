import httpx

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/proxy", tags=["proxy"])

_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
}


@router.get("/stream/{mount}")
async def proxy_stream(mount: str):
    """Proxy a live Icecast/MP3 audio stream from LiveATC."""
    stream_url = f"https://d.liveatc.net/{mount}"

    async def stream_generator():
        try:
            # No read timeout — live streams can have gaps between chunks
            timeout = httpx.Timeout(connect=10.0, read=None, write=None, pool=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "GET",
                    stream_url,
                    headers=_BROWSER_HEADERS,
                    follow_redirects=True,
                ) as response:
                    if response.status_code != 200:
                        print(f"Proxy stream failed: {response.status_code}")
                        yield b""
                        return
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except Exception as e:
            print(f"Proxy stream error for {mount}: {e}")

    return StreamingResponse(
        stream_generator(),
        media_type="audio/mpeg",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# Keep old path working for backwards compat
@router.get("/{mount}")
async def proxy_stream_legacy(mount: str):
    return await proxy_stream(mount)


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
    lamin: float = Query(...),
    lamax: float = Query(...),
    lomin: float = Query(...),
    lomax: float = Query(...),
):
    """Proxy OpenSky Network ADS-B positions (CORS-blocked from browsers)."""
    url = (
        f"https://opensky-network.org/api/states/all"
        f"?lamin={lamin}&lamax={lamax}&lomin={lomin}&lomax={lomax}"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url, headers=_BROWSER_HEADERS, follow_redirects=True
            )
            if resp.status_code == 429:
                return {"states": [], "error": "rate_limited"}
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"OpenSky fetch error: {e}")
        return {"states": []}
