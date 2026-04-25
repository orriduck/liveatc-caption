# ADSBao

A modern airport-monitoring HUD with dynamic airport search, METAR context, and preview caption workflows.

![Live App Screenshot](screenshot.png)

## Overview
ADSBao provides a search-first airport operations view with weather context, aircraft position overlays, and preview caption workflows. Airport search results are fetched dynamically from a public airport-data service.

## Tech Stack
- **AI**: Google Gemini (3.0 Flash Preview) and Anthropic Claude
- **Backend**: FastAPI (Python), `uv`, `PyAV` (Audio Streaming), `webrtcvad`.
- **Frontend**: Vue 3 (Vite), Tailwind CSS, DaisyUI, Lucide Icons.
- **Real-time**: WebSockets for low-latency caption delivery.
- **Typography**: Google Sans Flex & Google Sans Code.

## Installation (macOS)

### Homebrew (recommended)

```bash
# Add the tap once
brew tap orriduck/adsbao https://github.com/orriduck/ADSBao

# Install
brew install --cask adsbao

# Stay up to date — run after any new release
brew upgrade --cask adsbao
```

### Direct download

Download the latest `.dmg` or `.app.zip` from the [Releases](https://github.com/orriduck/ADSBao/releases) page.

> **Note** — ADSBao is not code-signed with an Apple Developer certificate.
> On first launch macOS will show a Gatekeeper warning.
> Open **System Settings → Privacy & Security** and click **Open Anyway**, or run:
> ```bash
> xattr -dr com.apple.quarantine "/Applications/ADSBao.app"
> ```

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ & [pnpm](https://pnpm.io/installation)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)

### 1. Backend Setup
```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs on `http://localhost:8000`.

Runtime configuration is supplied through environment variables in the `backend/` directory:

```bash
# backend/.env
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install
pnpm run dev
```

The dev server starts on `http://localhost:5173`.

Open [http://localhost:5173](http://localhost:5173) to start exploring.

---

## Contributing

We welcome contributions! Here's how to set up the full development environment:

### Prerequisites
- Python 3.12+ with [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 18+ with [pnpm](https://pnpm.io/installation)
- Git

### Running locally

**1. Clone the repo**
```bash
git clone https://github.com/orriduck/ADSBao.git
cd ADSBao
```

**2. Start the backend** (from the repo root)
```bash
cd backend
uv sync                          # install Python dependencies
uv run uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload                       # hot-reload on file changes
```
Backend available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

**3. Start the frontend** (in a separate terminal)
```bash
cd frontend
pnpm install                     # install Node dependencies
pnpm run dev                     # Vite dev server with HMR
```
Frontend available at `http://localhost:5173`.

### Environment variables

Create `backend/.env` with backend-only configuration:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (from [Anthropic Console](https://console.anthropic.com/)) |

### Project structure
```
ADSBao/
├── backend/          # FastAPI app (Python)
│   ├── api/          # Route handlers
│   ├── services/     # Transcription, audio streaming
│   ├── models/       # Pydantic models
│   └── main.py       # App entry point
└── frontend/         # Vue 3 app (Vite)
    └── src/
        ├── components/
        ├── views/
        └── router/
```
