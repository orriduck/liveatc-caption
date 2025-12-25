from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Header
from fastapi import UploadFile, File
from services.gemini_transcriber import GeminiTranscriber
import asyncio
from datetime import datetime, timezone

router = APIRouter(prefix="/caption", tags=["caption"])

# We'll share a transcriber or create one per connection?
# For now, one per connection is safer but heavy.
# Better to have a pool if many users, but for a standalone app, one is fine.


@router.websocket("/{mount}")
async def websocket_caption(
    websocket: WebSocket, mount: str, api_key: str = Query(None)
):
    print(
        f"DEBUG: WS Request for {mount} | Key: ...{api_key[-4:] if api_key and len(api_key) > 4 else 'NONE'}"
    )
    await websocket.accept()

    # Construct stream URL
    stream_url = f"https://d.liveatc.net/{mount}"

    transcriber = GeminiTranscriber(api_key=api_key)

    try:
        print(f"WS Started for {mount}")

        # Generator loop
        async for result_data in transcriber.transcribe_gen(stream_url):
            try:
                # result_data is now a dict: {"results": [...]}
                results = result_data.get("results", [])
                for res in results:
                    await websocket.send_json(
                        {
                            **res,
                            "type": "caption",
                            "timestamp": res.get("timestamp")
                            or asyncio.get_event_loop().time(),
                        }
                    )
            except Exception as e:
                print(f"Error forwarding caption: {e}")
                break

    except WebSocketDisconnect:
        print(f"WS Disconnected for {mount}")
    except Exception as e:
        print(f"WS Error for {mount}: {e}")
        try:
            await websocket.send_json({"error": str(e), "type": "error"})
        except Exception:
            pass
    finally:
        transcriber.is_running = False


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    x_api_key: str = Header(None, alias="X-API-Key"),
    start_time: str = Query(None),
):
    try:
        audio_bytes = await file.read()
        transcriber = GeminiTranscriber(api_key=x_api_key)

        # Run this in a thread because it calls the blocking API
        result = await asyncio.to_thread(transcriber.transcribe_segment, audio_bytes)

        # If start_time is provided, use it for the results
        results = result.get("results", [])
        if start_time:
            for res in results:
                res["timestamp"] = start_time

        # result is {"results": [...]}
        return {
            "results": results,
            "type": "caption_list",
            "timestamp": start_time or datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"Transcription error: {e}")
        return {"error": str(e), "type": "error"}
