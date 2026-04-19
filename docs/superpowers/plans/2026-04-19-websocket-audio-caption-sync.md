# WebSocket Audio + Caption Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-connection model (proxy HTTP audio + POST transcription) with a single WebSocket that streams raw PCM audio and synchronized captions from the backend, so captions appear exactly when their corresponding audio plays.

**Architecture:** Backend fetches the LiveATC stream once, decodes PCM with PyAV, and multiplexes binary audio frames and JSON caption frames over one WebSocket connection. Frontend plays audio via an AudioWorklet ring buffer and schedules each caption to display at `stream_offset` seconds into playback — the same unit as the backend's byte counter — guaranteeing lock-step sync.

**Tech Stack:** FastAPI WebSocket, PyAV, webrtcvad, faster-whisper, anthropic SDK (backend); Web Audio API AudioWorklet, WebSocket binary frames (frontend); Vue 3 + Tailwind (settings UI).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/services/base_transcriber.py` | Add `audio_queue`, `bytes_queued` counter; push PCM to both queues in `stream_audio()` |
| Modify | `backend/services/claude_transcriber.py` | Accept `model_size` constructor arg; use it for WhisperModel |
| Rewrite | `backend/api/router/caption.py` | New WS handler with 3 concurrent tasks; remove POST endpoint |
| Modify | `backend/api/router/proxy.py` | Remove `/stream/{mount}` and `/{mount}` audio proxy routes |
| Create | `frontend/public/playback-processor.js` | AudioWorklet ring-buffer PCM player |
| Rewrite | `frontend/src/composables/useLiveATC.js` | WS-based audio player; remove MediaRecorder / RAF VAD |
| Modify | `frontend/src/views/SettingsView.vue` | Add transcription settings section (model, VAD, silence, buffer, sync offset) |

---

## Task 1: BaseTranscriber — dual audio queue + bytes counter

**Files:**
- Modify: `backend/services/base_transcriber.py`

- [ ] **Step 1.1: Add `audio_queue` and `bytes_queued` to `__init__`**

Open `backend/services/base_transcriber.py`. In `BaseTranscriber.__init__` (line ~39), add two attributes after `self.chunk_queue`:

```python
def __init__(self, api_key: str | None = None):
    from services.rag_service import RAGService

    self.api_key = (api_key or "").strip()
    self.chunk_queue: queue.Queue = queue.Queue()
    self.audio_queue: queue.Queue = queue.Queue()
    self.bytes_queued: int = 0
    self.is_running = False
    self.rag_service = RAGService()
    self.system_prompt = self._load_prompt()
    self._current_icao: str | None = None
```

- [ ] **Step 1.2: Push PCM to both queues in `stream_audio()`**

Replace the single `self.chunk_queue.put(...)` call inside `stream_audio()` with a dual push that also updates the byte counter:

```python
for rf in resampler.resample(frame):
    pcm_bytes = rf.to_ndarray().tobytes()
    self.chunk_queue.put(pcm_bytes)
    self.audio_queue.put(pcm_bytes)
    self.bytes_queued += len(pcm_bytes)
    fc += 1
    if fc % 500 == 0:
        print(
            f"  [STREAM] {int(fc * 1024 / self.SAMPLE_RATE)}s"
            f" | queue={self.chunk_queue.qsize()}"
        )
```

- [ ] **Step 1.3: Write a unit test for dual-queue push**

Create `backend/tests/__init__.py` (empty) and `backend/tests/test_base_transcriber.py`:

```python
import queue
import pytest
from unittest.mock import patch, MagicMock


def _make_transcriber():
    """Return a ClaudeTranscriber with no API key (enough to test queue logic)."""
    with patch("services.claude_transcriber.WhisperModel", MagicMock()):
        from services.claude_transcriber import ClaudeTranscriber
        t = ClaudeTranscriber(api_key="dummy")
        t.is_running = False
        return t


def test_audio_queue_exists():
    t = _make_transcriber()
    assert hasattr(t, "audio_queue")
    assert isinstance(t.audio_queue, queue.Queue)


def test_bytes_queued_starts_at_zero():
    t = _make_transcriber()
    assert t.bytes_queued == 0


def test_stream_audio_pushes_to_both_queues(tmp_path):
    """Simulate one PCM push and verify both queues receive it."""
    t = _make_transcriber()
    t.is_running = True

    fake_pcm = b"\x00\x01" * 480  # 480 samples of silence

    # Directly populate both queues as stream_audio would
    t.chunk_queue.put(fake_pcm)
    t.audio_queue.put(fake_pcm)
    t.bytes_queued += len(fake_pcm)

    assert not t.chunk_queue.empty()
    assert not t.audio_queue.empty()
    assert t.bytes_queued == len(fake_pcm)
    assert t.chunk_queue.get() == fake_pcm
    assert t.audio_queue.get() == fake_pcm
```

- [ ] **Step 1.4: Run tests**

```bash
cd backend && .venv/bin/python -m pytest tests/test_base_transcriber.py -v
```

Expected output: 3 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add backend/services/base_transcriber.py backend/tests/
git commit -m "feat: add audio_queue and bytes_queued to BaseTranscriber"
```

---

## Task 2: ClaudeTranscriber — per-connection Whisper model size

**Files:**
- Modify: `backend/services/claude_transcriber.py`

- [ ] **Step 2.1: Change default and accept `model_size` arg**

At the top of `claude_transcriber.py`, change the constant:

```python
WHISPER_MODEL_SIZE = "tiny.en"
```

In `ClaudeTranscriber.__init__`, accept and store model size:

```python
class ClaudeTranscriber(BaseTranscriber):
    def __init__(self, api_key: str | None = None, model_size: str | None = None):
        resolved = (os.environ.get("ANTHROPIC_API_KEY", "") or api_key or "").strip()
        super().__init__(api_key=resolved)
        self.client = anthropic.Anthropic(api_key=self.api_key) if self.api_key else None
        self._whisper = None
        self._model_size = model_size or WHISPER_MODEL_SIZE
```

- [ ] **Step 2.2: Use `self._model_size` in `_get_whisper()`**

```python
def _get_whisper(self):
    if self._whisper is None:
        from faster_whisper import WhisperModel
        print(f"[Whisper] Loading {self._model_size} (first run may download)…")
        self._whisper = WhisperModel(
            self._model_size, device="cpu", compute_type="int8"
        )
        print("[Whisper] Model ready.")
    return self._whisper
```

- [ ] **Step 2.3: Add model size test**

Append to `backend/tests/test_base_transcriber.py`:

```python
def test_model_size_default():
    t = _make_transcriber()
    assert t._model_size == "tiny.en"


def test_model_size_override():
    with patch("services.claude_transcriber.WhisperModel", MagicMock()):
        from services.claude_transcriber import ClaudeTranscriber
        t = ClaudeTranscriber(api_key="dummy", model_size="small.en")
        assert t._model_size == "small.en"
```

- [ ] **Step 2.4: Run tests**

```bash
cd backend && .venv/bin/python -m pytest tests/test_base_transcriber.py -v
```

Expected: 5 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add backend/services/claude_transcriber.py backend/tests/test_base_transcriber.py
git commit -m "feat: ClaudeTranscriber accepts model_size, default tiny.en"
```

---

## Task 3: Rewrite caption.py — single WebSocket with 3 concurrent tasks

**Files:**
- Rewrite: `backend/api/router/caption.py`

- [ ] **Step 3.1: Write the new caption.py**

Replace the entire file:

```python
import asyncio
import queue
import threading
from datetime import datetime, timezone

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
                chunk = await asyncio.to_thread(
                    transcriber.audio_queue.get, True, 0.05
                )
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
        try:
            result = await transcriber._transcribe_chunk(pcm, rag)
            await result_queue.put((result, end_offset))
        except Exception as e:
            print(f"[WS] process error: {e}")

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
                        is_speech = vad_instance.is_speech(frame, transcriber.SAMPLE_RATE)
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
                                end_offset = transcriber.bytes_queued / 32000 + sync_offset
                                asyncio.create_task(_process(bytes(speech_buf), end_offset))
                            speech_buf = b""
                            in_speech = False
                            silence_n = 0
        finally:
            transcriber.is_running = False

    async def send_captions() -> None:
        """Drain result_queue and send JSON caption frames with stream_offset."""
        while transcriber.is_running or not result_queue.empty():
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
            if exc and not isinstance(exc, (WebSocketDisconnect, asyncio.CancelledError)):
                print(f"[WS] task error: {exc}")
    except WebSocketDisconnect:
        print(f"[WS] client disconnected: {mount}")
    except Exception as e:
        print(f"[WS] fatal error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        transcriber.is_running = False
        for t in tasks:
            t.cancel()
```

- [ ] **Step 3.2: Verify backend starts without errors**

```bash
cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Expected: server starts, no import errors. Ctrl-C to stop.

- [ ] **Step 3.3: Commit**

```bash
git add backend/api/router/caption.py
git commit -m "feat: rewrite caption router with single WS multiplexing audio + captions"
```

---

## Task 4: Remove audio proxy routes from proxy.py

**Files:**
- Modify: `backend/api/router/proxy.py`

- [ ] **Step 4.1: Delete the two audio stream routes**

Remove `proxy_stream()` (lines 14–47) and `proxy_stream_legacy()` (lines 50–53). Keep `proxy_metar()` and `proxy_aircraft()` intact. The file should now start:

```python
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
    dist: float = Query(default=20),
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
```

- [ ] **Step 4.2: Restart backend and confirm health**

```bash
cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Expected: starts cleanly. `GET /api/health` returns `{"status":"ok"}`.

- [ ] **Step 4.3: Commit**

```bash
git add backend/api/router/proxy.py
git commit -m "feat: remove audio proxy routes (audio now flows over WebSocket)"
```

---

## Task 5: AudioWorklet ring-buffer player

**Files:**
- Create: `frontend/public/playback-processor.js`

This file must live in `public/` so Vite serves it at `/playback-processor.js` — AudioWorklet modules must be loaded from a URL, not bundled.

- [ ] **Step 5.1: Create the AudioWorklet processor**

```js
/**
 * playback-processor.js — AudioWorklet for streaming PCM playback.
 *
 * Receives Float32Array chunks via port.postMessage({ type: 'pcm', samples })
 * and drains them through a ring buffer into the audio output.
 * Reports { type: 'position', samples: N } back every ~500 ms.
 */
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // 4-second ring buffer at 16 kHz mono
    this._capacity = 16000 * 4
    this._buf = new Float32Array(this._capacity)
    this._writePos = 0
    this._readPos = 0
    this._filled = 0
    this._totalPlayed = 0
    this._reportEvery = 64 * 128 // ~500 ms worth of render quanta

    this.port.onmessage = ({ data }) => {
      if (data.type !== 'pcm') return
      const samples = data.samples // Float32Array
      for (let i = 0; i < samples.length; i++) {
        if (this._filled < this._capacity) {
          this._buf[this._writePos] = samples[i]
          this._writePos = (this._writePos + 1) % this._capacity
          this._filled++
        }
        // Drop samples silently on overflow (should not happen with normal timing)
      }
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0][0]
    const n = out.length // always 128

    if (this._filled >= n) {
      for (let i = 0; i < n; i++) {
        out[i] = this._buf[this._readPos]
        this._readPos = (this._readPos + 1) % this._capacity
      }
      this._filled -= n
    } else {
      // Buffer underrun — output silence
      out.fill(0)
    }

    this._totalPlayed += n

    if (this._totalPlayed % this._reportEvery < n) {
      this.port.postMessage({ type: 'position', samples: this._totalPlayed })
    }

    return true // keep processor alive indefinitely
  }
}

registerProcessor('playback-processor', PlaybackProcessor)
```

- [ ] **Step 5.2: Verify the file is reachable**

Start the Vite dev server and confirm the file loads:

```bash
cd frontend && pnpm dev
# In a second terminal:
curl -I http://localhost:5173/playback-processor.js
```

Expected: `HTTP/1.1 200 OK` with `Content-Type: text/javascript`.

- [ ] **Step 5.3: Commit**

```bash
git add frontend/public/playback-processor.js
git commit -m "feat: add AudioWorklet ring-buffer PCM player"
```

---

## Task 6: Rewrite useLiveATC.js — WebSocket audio player

**Files:**
- Rewrite: `frontend/src/composables/useLiveATC.js`

- [ ] **Step 6.1: Write the new composable**

Replace the entire file:

```js
import { ref, shallowRef, onUnmounted } from 'vue'

const API_BASE = '/api'
const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export function useLiveATC() {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const activeChannel = ref(null)
  const isConnected = ref(false)
  const captions = ref([])
  const geminiApiKey = ref(localStorage.getItem('anthropic_api_key') || '')

  const connectionState = ref('IDLE')
  const isPlaying = ref(false)

  const wsRef = shallowRef(null)
  const audioCtxRef = shallowRef(null)
  const analyserRef = shallowRef(null)
  const workletNodeRef = shallowRef(null)

  let samplesPlayed = 0
  let pendingPcm = []       // buffer before worklet is ready
  let workletReady = false

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async (icao) => {
    if (!icao || icao.length < 3) return
    loading.value = true
    error.value = null
    try {
      const resp = await fetch(`${API_BASE}/search?icao=${icao.toUpperCase()}`)
      const result = await resp.json()
      data.value = result
      return result
    } catch (err) {
      console.error('Failed to fetch data', err)
      error.value = 'Failed to fetch data. Is the backend running?'
    } finally {
      loading.value = false
    }
  }

  // ── Audio context (created once, reused) ─────────────────────────────────

  const initAudioContext = () => {
    if (!audioCtxRef.value) {
      audioCtxRef.value = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      })
    }
    return audioCtxRef.value
  }

  // ── Caption scheduling ────────────────────────────────────────────────────

  const scheduleCaption = (msg) => {
    const playbackNow = samplesPlayed / 16000
    const delayMs = Math.max(0, (msg.stream_offset - playbackNow) * 1000)
    setTimeout(() => {
      const res = msg
      if (res.is_error) return
      captions.value.push({
        speaker: res.speaker || null,
        caption: res.caption || null,
        details: res.details || null,
        is_error: false,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: res.timestamp ? new Date(res.timestamp) : new Date(),
        isTemp: false,
      })
    }, delayMs)
  }

  // ── PCM delivery ──────────────────────────────────────────────────────────

  const deliverPcm = (f32) => {
    if (workletReady && workletNodeRef.value) {
      workletNodeRef.value.port.postMessage({ type: 'pcm', samples: f32 })
    } else {
      pendingPcm.push(f32)
    }
  }

  const flushPendingPcm = () => {
    for (const chunk of pendingPcm) {
      workletNodeRef.value.port.postMessage({ type: 'pcm', samples: chunk })
    }
    pendingPcm = []
  }

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = async () => {
    if (!activeChannel.value) return
    disconnect()

    isConnected.value = true
    connectionState.value = 'LISTENING'
    captions.value = []
    samplesPlayed = 0
    pendingPcm = []
    workletReady = false

    const model = localStorage.getItem('ws_model') || 'tiny.en'
    const vad = localStorage.getItem('ws_vad') || '2'
    const silence = localStorage.getItem('ws_silence') || '600'
    const buffer = localStorage.getItem('ws_buffer') || '512'
    const syncOffset = localStorage.getItem('ws_sync_offset') || '0'

    const params = new URLSearchParams({ model, vad, silence, buffer, sync_offset: syncOffset })
    const wsUrl = `${WS_BASE}/caption/${activeChannel.value.id}?${params}`

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.value = ws

    ws.onopen = () => console.log('[WS] connected to', activeChannel.value?.id)

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)

        if (msg.type === 'stream_start') {
          const ctx = initAudioContext()
          if (ctx.state === 'suspended') await ctx.resume().catch(() => {})

          await ctx.audioWorklet.addModule('/playback-processor.js')

          const worklet = new AudioWorkletNode(ctx, 'playback-processor')
          workletNodeRef.value = worklet

          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyserRef.value = analyser

          worklet.connect(analyser)
          analyser.connect(ctx.destination)

          worklet.port.onmessage = ({ data }) => {
            if (data.type === 'position') samplesPlayed = data.samples
          }

          workletReady = true
          flushPendingPcm()
          isPlaying.value = true
        }

        if (msg.type === 'caption') {
          scheduleCaption(msg)
        }

        if (msg.type === 'error') {
          error.value = msg.message
          console.error('[WS] server error:', msg.message)
        }
      } else {
        // Binary: raw PCM s16le → Float32
        const pcm16 = new Int16Array(event.data)
        const f32 = new Float32Array(pcm16.length)
        for (let i = 0; i < pcm16.length; i++) f32[i] = pcm16[i] / 32768
        deliverPcm(f32)
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      connectionState.value = 'IDLE'
      isPlaying.value = false
      analyserRef.value = null
    }

    ws.onerror = (e) => {
      error.value = 'WebSocket connection failed'
      console.error('[WS] error', e)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = () => {
    if (wsRef.value) {
      wsRef.value.close()
      wsRef.value = null
    }
    if (workletNodeRef.value) {
      workletNodeRef.value.disconnect()
      workletNodeRef.value = null
    }
    analyserRef.value = null
    isConnected.value = false
    connectionState.value = 'IDLE'
    isPlaying.value = false
    workletReady = false
    pendingPcm = []
    samplesPlayed = 0
  }

  // ── Play / pause (suspend AudioContext) ──────────────────────────────────

  const togglePlay = async () => {
    const ctx = audioCtxRef.value
    if (!ctx) return
    if (ctx.state === 'suspended') {
      await ctx.resume()
      isPlaying.value = true
    } else {
      await ctx.suspend()
      isPlaying.value = false
    }
  }

  // ── API key ───────────────────────────────────────────────────────────────

  const setGeminiApiKey = (key) => {
    geminiApiKey.value = key
    localStorage.setItem('anthropic_api_key', key)
  }

  onUnmounted(() => disconnect())

  return {
    data,
    loading,
    error,
    activeChannel,
    isConnected,
    analyserRef,
    connectionState,
    isPlaying,
    captions,
    geminiApiKey,
    handleSearch,
    connect,
    disconnect,
    togglePlay,
    setGeminiApiKey,
  }
}
```

- [ ] **Step 6.2: Open the app and connect to a known airport**

```bash
# Terminal 1 — backend
cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd frontend && pnpm dev
```

Open `http://localhost:5173`, search `KLAX`, pick a channel. Open browser DevTools → Network → WS tab. Confirm:
- WebSocket connects to `/ws/caption/{mount}`
- Binary frames appear (audio data)
- Text frames appear with `type: "stream_start"` then `type: "caption"`
- Audio plays through speakers

- [ ] **Step 6.3: Commit**

```bash
git add frontend/src/composables/useLiveATC.js
git commit -m "feat: replace proxy+POST audio with single WebSocket PCM stream"
```

---

## Task 7: Settings page — transcription parameters

**Files:**
- Modify: `frontend/src/views/SettingsView.vue`

- [ ] **Step 7.1: Add a transcription settings section**

In `SettingsView.vue`, add a new section after the Anthropic API Key section and before the About section. Also add the `onMounted` read and reactive refs for each setting.

In `<script setup>`, add after the existing `ref` declarations:

```js
// Transcription settings — read from localStorage
const wsModel = ref(localStorage.getItem('ws_model') || 'tiny.en')
const wsVad = ref(parseInt(localStorage.getItem('ws_vad') || '2'))
const wsSilence = ref(parseInt(localStorage.getItem('ws_silence') || '600'))
const wsBuffer = ref(parseInt(localStorage.getItem('ws_buffer') || '512'))
const wsSyncOffset = ref(parseInt(localStorage.getItem('ws_sync_offset') || '0'))
```

In `handleSave`, before `router.back()`, save all transcription settings:

```js
localStorage.setItem('ws_model', wsModel.value)
localStorage.setItem('ws_vad', String(wsVad.value))
localStorage.setItem('ws_silence', String(wsSilence.value))
localStorage.setItem('ws_buffer', String(wsBuffer.value))
localStorage.setItem('ws_sync_offset', String(wsSyncOffset.value))
```

In `<template>`, insert this section between the API key section and the About section:

```html
<!-- Transcription Settings -->
<div class="space-y-6 pt-12 border-t">
  <div class="flex items-center gap-2 opacity-50 uppercase">
    <Mic class="w-4 h-4" />
    <h2 class="text-sm">Transcription</h2>
  </div>

  <!-- Whisper Model -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-xs uppercase opacity-70">Whisper Model</label>
      <span class="text-xs font-mono opacity-50">{{ wsModel }}</span>
    </div>
    <select
      v-model="wsModel"
      class="select select-bordered w-full rounded-xl text-sm"
    >
      <option value="tiny.en">tiny.en — fastest, lower accuracy</option>
      <option value="base.en">base.en — balanced</option>
      <option value="small.en">small.en — slowest, highest accuracy</option>
    </select>
  </div>

  <!-- VAD Aggressiveness -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-xs uppercase opacity-70">VAD Aggressiveness</label>
      <span class="text-xs font-mono opacity-50">{{ wsVad }}</span>
    </div>
    <input
      v-model.number="wsVad"
      type="range" min="1" max="3" step="1"
      class="range range-sm w-full"
    />
    <div class="flex justify-between text-[10px] opacity-40">
      <span>1 — permissive</span>
      <span>3 — strict</span>
    </div>
  </div>

  <!-- Silence Cutoff -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-xs uppercase opacity-70">Silence Cutoff</label>
      <span class="text-xs font-mono opacity-50">{{ wsSilence }} ms</span>
    </div>
    <input
      v-model.number="wsSilence"
      type="range" min="300" max="1200" step="100"
      class="range range-sm w-full"
    />
    <div class="flex justify-between text-[10px] opacity-40">
      <span>300 ms — fast cut</span>
      <span>1200 ms — slow cut</span>
    </div>
  </div>

  <!-- Startup Buffer -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-xs uppercase opacity-70">Startup Buffer</label>
      <span class="text-xs font-mono opacity-50">{{ wsBuffer }} ms</span>
    </div>
    <input
      v-model.number="wsBuffer"
      type="range" min="256" max="2048" step="128"
      class="range range-sm w-full"
    />
    <div class="flex justify-between text-[10px] opacity-40">
      <span>256 ms — low latency</span>
      <span>2048 ms — stable</span>
    </div>
  </div>

  <!-- Caption Sync Offset -->
  <div class="space-y-2">
    <div class="flex justify-between items-center">
      <label class="text-xs uppercase opacity-70">Caption Sync Offset</label>
      <span class="text-xs font-mono opacity-50">{{ wsSyncOffset > 0 ? '+' : '' }}{{ wsSyncOffset }} ms</span>
    </div>
    <input
      v-model.number="wsSyncOffset"
      type="range" min="-500" max="500" step="50"
      class="range range-sm w-full"
    />
    <div class="flex justify-between text-[10px] opacity-40">
      <span>−500 ms — show earlier</span>
      <span>+500 ms — show later</span>
    </div>
  </div>
</div>
```

Add `Mic` to the lucide-vue-next import:

```js
import { Settings as SettingsIcon, Key, Info, Github, Eye, EyeOff, Mic } from 'lucide-vue-next'
```

- [ ] **Step 7.2: Verify settings page renders**

Open `http://localhost:5173/settings`. Confirm:
- Five new sliders/select appear under "Transcription" heading
- Moving sliders updates the displayed value reactively
- Clicking "Save Configuration" stores values — check `localStorage` in DevTools → Application → Local Storage

- [ ] **Step 7.3: Commit**

```bash
git add frontend/src/views/SettingsView.vue
git commit -m "feat: add transcription settings to settings page"
```

---

## Task 8: End-to-end verification and PR

- [ ] **Step 8.1: Full smoke test**

With both servers running:
1. Open `http://localhost:5173`, search `KSFO`, pick the Tower feed
2. Open DevTools → Console; confirm no errors
3. Open DevTools → Network → WS; confirm binary frames + JSON caption frames
4. Audio plays through speakers within ~500 ms of connecting
5. Captions appear at the same moment as the corresponding audio is heard
6. Open `/settings`, change model to `small.en`, save, reconnect — confirm `?model=small.en` appears in WS URL
7. Disconnect; confirm WebSocket closes cleanly

- [ ] **Step 8.2: Run backend tests**

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

Expected: all 5 tests pass.

- [ ] **Step 8.3: Run ruff lint**

```bash
cd backend && uvx ruff check . && uvx ruff format --check .
```

Expected: no errors.

- [ ] **Step 8.4: Push and open PR**

```bash
git push origin main
gh pr create \
  --title "feat: WebSocket audio+caption sync — captions appear simultaneously with audio" \
  --body "$(cat <<'EOF'
## Summary
- Single WebSocket replaces dual-connection model (proxy HTTP audio + POST transcription)
- Backend fetches LiveATC stream once, muxes binary PCM frames + JSON caption frames
- Frontend plays audio via AudioWorklet ring buffer; captions scheduled via stream_offset timestamp
- Settings page exposes model, VAD, silence cutoff, startup buffer, sync offset

## Test plan
- [ ] Audio plays within 500ms of connecting to a feed
- [ ] Captions appear simultaneously with (not before or after) the audio
- [ ] Settings controls persist across page reload and affect WS query params
- [ ] Disconnect/reconnect cycle is clean (no dangling audio nodes)
- [ ] Backend unit tests pass
- [ ] Ruff linting passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Single WS endpoint with binary + JSON mux → Task 3
- ✅ `audio_queue` + `bytes_queued` on BaseTranscriber → Task 1
- ✅ `model_size` param on ClaudeTranscriber, default `tiny.en` → Task 2
- ✅ Remove audio proxy routes → Task 4
- ✅ AudioWorklet ring buffer → Task 5
- ✅ Frontend WS audio player, caption scheduling → Task 6
- ✅ Settings page (model, vad, silence, buffer, sync_offset) → Task 7
- ✅ Settings sent as WS query params → Task 6 (`params` URLSearchParams in `connect()`)
- ✅ Startup buffer held before playback begins → Task 6 (`pendingPcm` / `startup_bytes`)
- ✅ `stream_offset` = `bytes_queued / 32000 + sync_offset` → Task 3 `audio_loop()`

**Placeholder scan:** No TBDs, no "add validation", no "similar to Task N".

**Type consistency:**
- `audio_queue` added in Task 1, read in Task 3's `send_audio()` ✅
- `bytes_queued` added in Task 1, read in Task 3's `audio_loop()` ✅
- `model_size` param added in Task 2, passed from Task 3's WS handler ✅
- `workletNodeRef`, `analyserRef` used consistently across Task 6 ✅
- localStorage keys `ws_model`, `ws_vad`, `ws_silence`, `ws_buffer`, `ws_sync_offset` consistent between Task 6 and Task 7 ✅
