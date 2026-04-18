# LiveATC Caption

A modern, real-time transcription HUD for LiveATC audio feeds, powered by Google's Gemini AI.

![Live App Screenshot](screenshot.png)

## Overview
LiveATC Caption captures live air traffic control audio streams and provides real-time, HUD-style transcriptions. It uses Voice Activity Detection (VAD) to identify speech and sends filtered audio segments to Gemini for high-accuracy aviation transcription.

## Tech Stack
- **AI**: Google Gemini (3.0 Flash Preview) and Anthropic Claude
- **Backend**: FastAPI (Python), `uv`, `PyAV` (Audio Streaming), `webrtcvad`.
- **Frontend**: Vue 3 (Vite), Tailwind CSS, DaisyUI, Lucide Icons.
- **Real-time**: WebSockets for low-latency caption delivery.
- **Typography**: Google Sans Flex & Google Sans Code.

## Installation (macOS)
You can install LiveATC Caption directly via Homebrew:

```bash
brew install --cask https://raw.githubusercontent.com/orriduck/liveatc-caption/main/Casks/liveatc-caption.rb
```

Alternatively, you can download the latest `.dmg` or `.app.zip` from the [Releases](https://github.com/orriduck/liveatc-caption/releases) page.

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ & [pnpm](https://pnpm.io/installation)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- A [Gemini API Key](https://aistudio.google.com/) and/or an [Anthropic API Key](https://console.anthropic.com/)

### 1. Backend Setup
```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs on `http://localhost:8000`.

API keys (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY`) can be set via the in-app settings UI at runtime, or supplied upfront via a `.env` file in the `backend/` directory:

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install
pnpm run dev
```

The dev server starts on `http://localhost:5173`.

Open [http://localhost:5173](http://localhost:5173) to start listening.

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
git clone https://github.com/orriduck/liveatc-caption.git
cd liveatc-caption
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

Create `backend/.env` with your API key(s) — at least one is required for transcription to work:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/)) |
| `ANTHROPIC_API_KEY` | Anthropic API key (from [Anthropic Console](https://console.anthropic.com/)) |

Keys can also be entered through the in-app Settings panel without restarting the server.

### Project structure
```
liveatc-caption/
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
