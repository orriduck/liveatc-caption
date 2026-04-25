from fastapi import APIRouter, WebSocket, status

router = APIRouter(prefix="/caption", tags=["caption"])


@router.websocket("/{mount}")
async def websocket_caption(
    websocket: WebSocket,
    mount: str,
):
    await websocket.accept()
    await websocket.send_json(
        {
            "type": "error",
            "message": "Live audio streaming has been removed from this build",
        }
    )
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
