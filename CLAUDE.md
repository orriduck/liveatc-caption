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
| `vercel.json` | Vercel Git integration build/output config and external rewrites |
| `frontend/vercel.json` | Equivalent frontend-directory Vercel config for manual deploys from `frontend/` |
| `frontend/vite.config.js` | Local dev proxy rules matching the Vercel data paths |
| `frontend/src/views/HomeView.vue` | Search-to-airport route flow |
| `frontend/src/components/screens/SearchScreen.vue` | Live airport directory UI backed by airportsapi.com + frontend cache |
| `frontend/src/components/screens/AirportCaptionScreen.vue` | Airport explorer map + METAR screen |
| `frontend/src/services/aviationData.js` | Frontend-owned METAR and ADS-B data access clients |
| `docs/frontend-vercel-migration.md` | Endpoint inventory, CORS findings, and Vercel deployment notes |

## Build

```bash
pnpm --dir frontend build
```

## Tests

```bash
pnpm --dir frontend test:home-airport-directory && pnpm --dir frontend test:airport-directory && pnpm --dir frontend test:aviation-data && pnpm --dir frontend test:airport-wiki && pnpm --dir frontend test:metar && pnpm --dir frontend test:aircraft-motion && pnpm --dir frontend test:aircraft-traffic-intent
```

## Runtime config

There is no Python backend runtime config, frontend settings page, or `/api/config` flow.
