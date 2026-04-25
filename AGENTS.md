# LiveATC Caption — Codex Guide

## Dev environment

Start backend + frontend together:

```bash
make dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`. Ctrl-C stops both.

## Stack

- **Backend**: FastAPI + uvicorn, managed by `uv`. Entry point: `backend/main.py`.
- **Frontend**: Vue 3 + Vite + Tailwind + DaisyUI, managed by `pnpm` (installed via Homebrew).
- **Audio pipeline**: PyAV decodes the LiveATC stream → webrtcvad VAD → faster-whisper STT → Codex Haiku parsing. All runs server-side; PCM audio and captions flow over a single WebSocket to the browser.

## Key paths

| Path | What |
|---|---|
| `backend/api/router/caption.py` | WebSocket endpoint — multiplexes PCM audio + JSON captions |
| `backend/services/base_transcriber.py` | Shared VAD loop, audio queues, stream_audio() |
| `backend/services/claude_transcriber.py` | Whisper STT + Codex Haiku parsing |
| `backend/services/rag_service.py` | Airport context: runways, callsigns, METAR |
| `frontend/src/composables/useLiveATC.js` | All audio/WebSocket/caption state |
| `frontend/public/playback-processor.js` | AudioWorklet ring-buffer PCM player |
| `frontend/src/views/SettingsView.vue` | Settings: API key + transcription params |

## Linting

```bash
cd backend && uvx ruff check . && uvx ruff format --check .
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

## API key

Set `ANTHROPIC_API_KEY` in `backend/.env`. The env var always wins over any frontend-passed key.
