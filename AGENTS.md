# ADSBao — Codex Guide

## Dev environment

Start backend + frontend together:

```bash
make dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`. Ctrl-C stops both.

## Stack

- **Backend**: FastAPI + uvicorn, managed by `uv`. Entry point: `backend/main.py`.
- **Frontend**: Vue 3 + Vite + Tailwind + DaisyUI, managed by `pnpm` (installed via Homebrew).
- **Audio pipeline**: Web-delivered airport metadata, METAR, and ADS-B context flow through the backend; live audio streaming is currently disabled in this build.

## Key paths

| Path | What |
|---|---|
| `backend/api/router/caption.py` | WebSocket endpoint — multiplexes PCM audio + JSON captions |
| `backend/services/base_transcriber.py` | Shared VAD loop, audio queues, stream_audio() |
| `backend/services/claude_transcriber.py` | Whisper STT + Codex Haiku parsing |
| `backend/services/rag_service.py` | Airport context: runways, callsigns, METAR |
| `frontend/src/views/HomeView.vue` | Search-to-airport route flow |
| `frontend/src/components/screens/AirportCaptionScreen.vue` | Airport explorer map + METAR screen |

## Linting

```bash
cd backend && uvx ruff check . && uvx ruff format --check .
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

## API key

Set `ANTHROPIC_API_KEY` in `backend/.env`. Runtime config is backend-only.
