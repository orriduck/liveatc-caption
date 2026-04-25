# ADSBao — Claude Code Guide

## Dev environment

Start backend + frontend together:

```bash
make dev
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`. Ctrl-C stops both.

## Stack

- **Backend**: FastAPI + uvicorn, managed by `uv`. Entry point: `backend/main.py`.
- **Frontend**: Vue 3 + Vite + Tailwind + DaisyUI, managed by `pnpm` (installed via Homebrew).
- **Airport data**: OurAirports-backed airport catalog, AviationWeather METAR proxy, and ADS-B position proxy.
- **Live audio**: Streaming/transcription has been removed from this build; the caption WebSocket only returns a disabled-streaming error.

## Key paths

| Path | What |
|---|---|
| `backend/api/router/airport_catalog.py` | OurAirports CSV catalog loading, TTL cache, search ranking |
| `backend/api/router/search.py` | Airport search/lookup API and preview channel metadata |
| `backend/api/router/proxy.py` | METAR and nearby aircraft proxy endpoints |
| `backend/api/router/caption.py` | Disabled live-streaming WebSocket response |
| `frontend/src/views/HomeView.vue` | Search-to-airport route flow |
| `frontend/src/components/screens/SearchScreen.vue` | Browseable airport catalog UI |
| `frontend/src/components/screens/AirportCaptionScreen.vue` | Airport explorer map + METAR screen |

## Linting

```bash
cd backend && uvx ruff check . && uvx ruff format --check .
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

## Runtime config

Runtime config is backend-only. There is no frontend settings page or `/api/config` flow.
