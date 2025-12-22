from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.gemini_transcriber import GeminiTranscriber
import asyncio
import json

router = APIRouter(prefix="/caption", tags=["caption"])

# We'll share a transcriber or create one per connection?
# For now, one per connection is safer but heavy.
# Better to have a pool if many users, but for a standalone app, one is fine.

@router.websocket("/{mount}")
async def websocket_caption(websocket: WebSocket, mount: str, api_key: str = None):
    await websocket.accept()
    
    # Construct stream URL
    # Use the balancer URL which is more robust
    stream_url = f"https://d.liveatc.net/{mount}"
    
    transcriber = GeminiTranscriber(api_key=api_key)
    
    try:
        # We run the transcription generator in a separate thread or use an async approach
        # Since transcribe_gen is blocking, we use asyncio.to_thread if needed,
        # but here we'll just iterate over it.
        
        print(f"WS Started for {mount}")
        
        # Generator loop
        async for result_data in transcriber.transcribe_gen(stream_url):
            try:
                # result_data is now a dict from model_dump()
                await websocket.send_json({
                    **result_data,
                    "type": "caption",
                    "timestamp": asyncio.get_event_loop().time() 
                })
            except Exception as e:
                print(f"Error forwarding caption: {e}")
                # If socket is closed, stop transcription
                break
            # Check for disconnect? 
            # await asyncio.sleep(0.01) 
            
    except WebSocketDisconnect:
        print(f"WS Disconnected for {mount}")
    except Exception as e:
        print(f"WS Error for {mount}: {e}")
        # Only try to send if not a disconnect/closed socket
        try:
            await websocket.send_json({"error": str(e), "type": "error"})
        except Exception as send_err:
            print(f"Could not send error to {mount}: {send_err}")
    finally:
        transcriber.is_running = False
        try:
            await websocket.close()
        except:
            pass
