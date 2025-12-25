import httpx

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/proxy", tags=["proxy"])

@router.get("/{mount}")
async def proxy_stream(mount: str):
    """
    Proxies the audio stream from LiveATC to allow browser access (CORS).
    """
    stream_url = f"https://d.liveatc.net/{mount}"
    
    # Using httpx for async streaming
    async def stream_generator():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                async with client.stream("GET", stream_url, follow_redirects=True) as response:
                    # Pass through status if not 200
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
            "Connection": "keep-alive"
        }
    )
