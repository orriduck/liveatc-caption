# WebSocket Audio + Caption Sync — Design Spec
Date: 2026-04-19

## Problem

Captions currently appear 4–10 seconds after the audio has already played. The pipeline is:
browser VAD (600ms silence) → MediaRecorder blob → HTTP POST → Whisper (2–3s) → Claude (500ms) → response → display.
The user wants captions to appear simultaneously with the audio they describe — no earlier, no later.

## Solution Summary

Replace the dual-connection model (proxy HTTP audio + POST transcription) with a **single WebSocket connection** where the backend:
1. Fetches the LiveATC stream once
2. Sends raw PCM audio as binary WebSocket frames to the frontend
3. Concurrently runs VAD → Whisper → Claude and sends captions as JSON frames with a `stream_offset` timestamp

Because both audio and captions share the same byte stream, the frontend's playback clock and the backend's caption clock are identical — enabling exact display scheduling with no drift.

---

## WebSocket Protocol

**Endpoint:** `ws://{host}/ws/caption/{mount}?model=tiny.en&vad=2&silence=600&buffer=512&sync_offset=0`

### Binary frames
Raw PCM audio: 16-bit signed little-endian, 16 kHz, mono.
Sent immediately as PyAV decodes each frame. No container wrapping.

### Text frames (JSON)

```json
// Stream ready
{ "type": "stream_start" }

// Caption result
{
  "type": "caption",
  "stream_offset": 5.234,
  "results": [
    { "speaker": "ATC", "caption": "UNITED TWO SEVEN SIX CLEARED TO LAND RUNWAY TWO SEVEN LEFT", "timestamp": "...", "is_error": false }
  ]
}

// Error
{ "type": "error", "message": "..." }
```

`stream_offset` is computed as `total_pcm_bytes_sent / 32000` (32000 = 16000 Hz × 2 bytes/sample). This is the exact number of seconds of audio the frontend has received when the captioned utterance ended.

---

## Backend Changes

### `base_transcriber.py`

- Add `audio_queue: asyncio.Queue` alongside `chunk_queue`
- `stream_audio()` pushes each decoded PCM chunk to **both** queues simultaneously
- Add `bytes_sent: int` counter incremented as audio is queued
- Accept per-connection settings: `model`, `vad_aggressiveness`, `silence_ms` passed in constructor

### `caption.py` WebSocket handler

Three concurrent async tasks per connection:

| Task | Responsibility |
|---|---|
| `_audio_loop()` | Existing VAD loop (reads `chunk_queue`), fires `_transcribe_chunk` tasks |
| `_send_audio()` | Drains `audio_queue`, sends binary WS frames, updates `bytes_sent` |
| `_send_captions()` | Drains `result_queue`, attaches `stream_offset`, sends JSON WS frames |

Query parameters read per-connection:
- `model` → passed to `ClaudeTranscriber` (selects Whisper model size)
- `vad` → `webrtcvad.Vad(aggressiveness)`
- `silence` → `MIN_SILENCE_FRAMES = silence_ms / FRAME_MS`
- `buffer` → sent in `stream_start` message so frontend knows when to begin playback
- `sync_offset` → added to `stream_offset` in caption frames

Remove: `@router.post("/caption/transcribe")` endpoint.

### `claude_transcriber.py`

- Default Whisper model changes from `small.en` to `tiny.en`
- Model size overridable via constructor arg (from query param)

### `proxy.py`

- Remove the audio proxy route `/proxy/{channel_id}` (audio now flows over WebSocket)
- Keep `/proxy/aircraft/positions` unchanged

---

## Frontend Changes

### New: `public/playback-processor.js` (AudioWorklet)

Ring-buffer-based PCM player. Receives `Float32Array` chunks via `port.postMessage`, outputs to `process()` on each 128-sample render quantum (~8ms at 16kHz). Reports `samplesPlayed` back via port for caption scheduling.

```
WebSocket binary → Uint8Array → Float32Array (÷32768) → port → ring buffer → process() → speakers
```

Ring buffer capacity: 16000 × 2 = 2s of audio. Underrun: output silence, log warning.

### `useLiveATC.js` — rewrite connect/disconnect

**Remove:**
- `<Audio>` element usage in `connect()`
- `MediaRecorder`, `startRecording()`, `stopRecordingAndTranscribe()`, `sendToTranscribe()`
- `processAudioVolume()` RAF loop (browser-side VAD)
- `mediaSourceRef`, `recorderRef`, `processorRef`, `mediaStreamDestRef`

**Add:**
- `connect()` opens WebSocket with settings as query params
- On `stream_start`: add AudioWorklet module, create `AudioWorkletNode`, connect to analyser → destination
- On binary frame: decode PCM, post to worklet after startup buffer is filled
- On JSON caption frame: schedule display (see below)
- `disconnect()` closes WebSocket, stops worklet

**Keep:**
- `analyserRef` (waveform visualizer — connect worklet output through it)
- `togglePlay()` (suspend/resume AudioContext)
- `isPlaying`, `connectionState`, `captions`

### Caption scheduling

```js
function schedulecaption(msg) {
  const playbackNow = samplesPlayed / 16000
  const delay = Math.max(0, msg.stream_offset - playbackNow) * 1000
  setTimeout(() => captions.value.push(...msg.results), delay)
}
```

If the caption arrives before the audio has played to that offset (normal case with tiny.en), it waits. If it arrives late (network spike, slow inference), it displays immediately.

### New: `src/views/SettingsView.vue`

Settings route already scaffolded. Populate with:

| Setting | Control | Default | Stored in |
|---|---|---|---|
| Whisper model | Select: tiny.en / base.en / small.en | tiny.en | localStorage |
| VAD aggressiveness | Slider 1–3 | 2 | localStorage |
| VAD silence cutoff | Slider 300–1200ms step 100 | 600ms | localStorage |
| Startup buffer | Slider 256–2048ms step 128 | 512ms | localStorage |
| Caption sync offset | Slider −500–+500ms step 50 | 0ms | localStorage |
| Anthropic API key | Password input | (env) | localStorage |

Settings are read by `useLiveATC.js` at `connect()` time and appended as query params to the WebSocket URL.

---

## Timestamp Sync — Correctness Argument

- Backend sends N bytes of PCM, increments `bytes_sent` by N
- `stream_offset = bytes_sent / 32000` at the moment the captioned utterance ended
- Frontend AudioWorklet has received exactly those same N bytes (WebSocket is ordered, reliable)
- `samplesPlayed = bytes_received / 2` (2 bytes per sample)
- `playback_seconds = samplesPlayed / 16000 = bytes_received / 32000`
- Therefore `stream_offset` and `playback_seconds` are always in the same units referencing the same byte stream

The only source of drift is the AudioWorklet ring buffer depth (max ~32ms at default settings) — negligible and covered by the `sync_offset` setting.

---

## What Is Removed

| Item | Replaced by |
|---|---|
| `/api/proxy/{channel}` audio proxy route | WebSocket binary audio frames |
| `/caption/transcribe` HTTP POST endpoint | WebSocket JSON caption frames |
| `MediaRecorder` + browser VAD | Backend webrtcvad (already existed, now sole VAD) |
| `<Audio>` element + `audioRef` | AudioWorklet node |
| `processAudioVolume()` RAF loop | Removed entirely |
| `geminiApiKey` localStorage key naming | Renamed to `anthropic_api_key` (already fixed) |

---

## Out of Scope

- Multi-user / connection pooling (single user, one stream per connection)
- Seeking or pause/resume of the stream (live radio, no seeking)
- Gemini transcriber WebSocket path (Gemini remains HTTP-only for now)
