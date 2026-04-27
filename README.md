# ADSBao

A modern airport-monitoring HUD with dynamic airport search, METAR context, and nearby aircraft overlays.

![Live App Screenshot](screenshot.png)

## Overview
ADSBao provides a search-first airport operations view with weather context and aircraft position overlays. Airport search is backed by public airport directory data.

## Tech Stack
- **Frontend**: Vue 3 (Vite), Tailwind CSS, DaisyUI, Lucide Icons.
- **Data access**: Browser-managed airport directory requests to airportsapi.com, with conservative client caching.
- **Minimal proxy**: Vercel external rewrites for AviationWeather METAR and adsb.lol aircraft positions, because those upstream responses do not currently expose browser CORS headers.
- **Typography**: Google Sans Flex & Google Sans Code.

## Getting Started

### Prerequisites
- Node.js 24+ & [pnpm](https://pnpm.io/installation)

### Frontend Setup
```bash
pnpm install
pnpm run dev
```

The dev server starts on `http://localhost:5173`.

### Vercel Web Deployment
The repo includes `vercel.json` for Git-triggered Vercel builds with minimal same-origin external rewrites for browser-blocked upstream data.

```bash
vercel
```

The deployment path intentionally keeps upstream data visible: airport search goes to airportsapi.com from the browser, while `/api/proxy/metar/:icao` and `/api/proxy/aircraft/positions/:lat/:lon/:dist` exist only for sources blocked by browser CORS.

---

## Contributing

We welcome contributions! Here's how to set up the full development environment:

### Prerequisites
- Node.js 18+ with [pnpm](https://pnpm.io/installation)
- Git

### Running locally

**1. Clone the repo**
```bash
git clone https://github.com/orriduck/ADSBao.git
cd ADSBao
```

**2. Start the frontend**
```bash
pnpm install                     # install Node dependencies
pnpm run dev                     # Vite dev server with HMR
```
Frontend available at `http://localhost:5173`.

### Project structure
```
ADSBao/
├── src/
│   ├── components/
│   ├── views/
│   ├── constants/
│   └── router/
├── packaging/        # Optional Electron shell packaging
├── package.json
└── vercel.json       # Vercel deployment config
```

## External Data Use
ADSBao uses public aviation data sources and avoids intentionally high-volume polling. The aircraft overlay polls every 15 seconds by default, and airport directory results are cached in the browser for six hours. See `docs/frontend-vercel-migration.md` for endpoint decisions and CORS findings.
