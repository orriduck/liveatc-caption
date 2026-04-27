# ADSBao — Claude Code Guide

## Dev environment

Start the frontend:

```bash
make dev
```

Frontend runs on `http://localhost:5173`.

## Stack

- **Frontend**: Vue 3 + Vite + Tailwind + DaisyUI, managed by `pnpm` (installed via Homebrew).
- **Airport data**: Airport directory and route lookup are fetched live from airportsapi.com with frontend caching.
- **Weather/traffic data**: Web deployment uses minimal Vercel external rewrites under `api/proxy/*` because AviationWeather and adsb.lol do not expose browser CORS headers. Local Vite dev uses equivalent proxy rules.
- **Removed scope**: Live audio/transcription and Python backend code are no longer part of this repository.

## Key paths

| Path | What |
|---|---|
| `vercel.json` | Vercel build/output config and external rewrites |
| `vite.config.js` | Local dev proxy rules matching the Vercel data paths |
| `src/views/HomeView.vue` | Search-to-airport route flow |
| `src/components/screens/SearchScreen.vue` | Live airport directory UI backed by airportsapi.com + frontend cache |
| `src/components/screens/AirportCaptionScreen.vue` | Airport explorer map + METAR screen |
| `src/services/aviationData.js` | Frontend-owned METAR and ADS-B data access clients |
| `src/constants/aircraft.js` | Shared aircraft color and threshold constants |
| `src/utils/math.js` | Shared numeric helpers (`toFiniteNumber`) |
| `src/utils/airport.js` | Shared airport display helpers (`airportSubtitle`) |
| `src/data/airportFallbacks.js` | Fallback airport metadata and coordinates |
| `docs/frontend-vercel-migration.md` | Endpoint inventory, CORS findings, and Vercel deployment notes |

## Build

```bash
pnpm build
```

## Tests

```bash
pnpm test:home-airport-directory && pnpm test:airport-directory && pnpm test:aviation-data && pnpm test:vercel-routing && pnpm test:airport-wiki && pnpm test:metar && pnpm test:aircraft-motion && pnpm test:aircraft-traffic-intent
```

## Runtime config

There is no Python backend runtime config, frontend settings page, or `/api/config` flow.
