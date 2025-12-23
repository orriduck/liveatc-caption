# LiveATC Caption

A modern, real-time transcription HUD for LiveATC audio feeds, powered by Google's Gemini AI.

![Live App Screenshot](screenshot.png)

## Overview
LiveATC Caption captures live air traffic control audio streams and provides real-time, HUD-style transcriptions. It uses Voice Activity Detection (VAD) to identify speech and sends filtered audio segments to Gemini for high-accuracy aviation transcription.

## Tech Stack
- **AI**: Google Gemini Pro (3.0 Flash Preview)
- **Backend**: FastAPI (Python), `uv`, `PyAV` (Audio Streaming), `webrtcvad`.
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons.
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
- Node.js & npm
- [Gemini API Key](https://aistudio.google.com/)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env  # Add your GEMINI_API_KEY
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 3000
```

Open [http://localhost:3000](http://localhost:3000) to start listening.
