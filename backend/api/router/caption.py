import asyncio
import queue
import threading

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from services.claude_transcriber import ClaudeTranscriber

router = APIRouter(prefix="/caption", tags=["caption"])


@router.websocket("/{mount}")
async def websocket_caption(
    websocket: WebSocket,
    mount: str,
    api_key: str = Query(None),
    model: str = Query("tiny.en"),
    vad: int = Query(2),
    silence: int = Query(600),
    buffer: int = Query(512),
    sync_offset: float = Query(0.0),
):
    await websocket.accept()

    transcriber = ClaudeTranscriber(api_key=api_key, model_size=model)
    transcriber.is_running = True
    transcriber.MIN_SILENCE_FRAMES = max(1, silence // transcriber.FRAME_MS)
    vad_aggressiveness = max(0, min(3, vad))

    # Pre-fetch airport context
    icao = mount.split("_")[0].upper()
    transcriber._current_icao = icao
    await asyncio.to_thread(transcriber.rag_service.prefetch_airport, icao)
    rag = transcriber.rag_service.get_context(mount=mount)

    # Start background audio fetch thread
    stream_url = f"https://d.liveatc.net/{mount}"
    thread = threading.Thread(
        target=transcriber.stream_audio, args=(stream_url,), daemon=True
    )
    thread.start()

    result_queue: asyncio.Queue = asyncio.Queue()
    pending_tasks: set[asyncio.Task] = set()
    frame_bytes = int(transcriber.SAMPLE_RATE * transcriber.FRAME_MS / 1000 * 2)
    startup_bytes = int(transcriber.SAMPLE_RATE * 2 * buffer / 1000)

    await websocket.send_json({"type": "stream_start", "buffer_ms": buffer})

    async def send_audio() -> None:
        """Drain audio_queue; hold first `startup_bytes` bytes before sending."""
        held: list[bytes] = []
        held_size = 0
        flushed = False

        while transcriber.is_running:
            try:
                chunk = await asyncio.to_thread(transcriber.audio_queue.get, True, 0.05)
            except queue.Empty:
                continue

            if not flushed:
                held.append(chunk)
                held_size += len(chunk)
                if held_size >= startup_bytes:
                    for c in held:
                        await websocket.send_bytes(c)
                    held = []
                    flushed = True
            else:
                await websocket.send_bytes(chunk)

    async def _process(pcm: bytes, end_offset: float) -> None:
        task = asyncio.current_task()
        pending_tasks.add(task)
        try:
            result = await transcriber._transcribe_chunk(pcm, rag)
            await result_queue.put((result, end_offset))
        except Exception as e:
            print(f"[WS] process error: {e}")
        finally:
            pending_tasks.discard(task)

    async def audio_loop() -> None:
        """VAD: read chunk_queue → detect utterances → fire transcription tasks."""
        import webrtcvad

        vad_instance = webrtcvad.Vad(vad_aggressiveness)
        buf = b""
        speech_buf = b""
        in_speech = False
        silence_n = 0

        try:
            while transcriber.is_running:
                try:
                    chunk = await asyncio.to_thread(
                        transcriber.chunk_queue.get, True, 0.05
                    )
                    buf += chunk
                    while not transcriber.chunk_queue.empty():
                        buf += transcriber.chunk_queue.get_nowait()
                except queue.Empty:
                    continue

                while len(buf) >= frame_bytes:
                    frame, buf = buf[:frame_bytes], buf[frame_bytes:]
                    try:
                        is_speech = vad_instance.is_speech(
                            frame, transcriber.SAMPLE_RATE
                        )
                    except Exception:
                        is_speech = False

                    if is_speech:
                        if not in_speech:
                            in_speech = True
                            print("  >>> [SPEECH]")
                        silence_n = 0
                        speech_buf += frame
                    elif in_speech:
                        speech_buf += frame
                        silence_n += 1
                        if (
                            silence_n >= transcriber.MIN_SILENCE_FRAMES
                            or len(speech_buf) >= transcriber.MAX_SPEECH_BYTES
                        ):
                            if len(speech_buf) > transcriber.MIN_SPEECH_BYTES:
                                print("  <<< [TRANSCRIBING]")
                                end_offset = (
                                    transcriber.bytes_queued / 32000 + sync_offset
                                )
                                asyncio.create_task(
                                    _process(bytes(speech_buf), end_offset)
                                )
                            speech_buf = b""
                            in_speech = False
                            silence_n = 0
        finally:
            transcriber.is_running = False

    async def send_captions() -> None:
        """Drain result_queue and send JSON caption frames with stream_offset."""
        while transcriber.is_running or pending_tasks or not result_queue.empty():
            try:
                result, offset = await asyncio.wait_for(result_queue.get(), timeout=1.0)
                for res in result.get("results", []):
                    await websocket.send_json(
                        {
                            "type": "caption",
                            "stream_offset": round(offset, 3),
                            **res,
                        }
                    )
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[WS] send_captions error: {e}")
                break

    tasks = [
        asyncio.create_task(send_audio()),
        asyncio.create_task(audio_loop()),
        asyncio.create_task(send_captions()),
    ]

    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_EXCEPTION)
        for t in pending:
            t.cancel()
        for t in done:
            exc = t.exception()
            if exc and not isinstance(
                exc, (WebSocketDisconnect, asyncio.CancelledError)
            ):
                print(f"[WS] task error: {exc}")
                try:
                    await websocket.send_json({"type": "error", "message": str(exc)})
                except Exception:
                    pass
    except Exception as e:
        print(f"[WS] fatal error: {e}")
    finally:
        transcriber.is_running = False
        for t in tasks:
            t.cancel()
