# Frontend-Only and Vercel Migration Record

## Decision Summary

ADSBao now runs as a web-first Vite app with frontend-managed airport lookup and minimal same-origin Vercel external rewrites for upstream sources that block browser CORS. The FastAPI backend has been removed.

## Endpoint Inventory

| Current endpoint | Decision | Notes |
| --- | --- | --- |
| `GET /api/search/airports` | Move to frontend | `frontend/src/services/airportDirectory.js` loads airports directly from airportsapi.com with six-hour browser caching. |
| `GET /api/search?icao=...` | Move to frontend | `airportDirectoryClient.resolveAirport()` now resolves route airport codes directly from airportsapi.com. |
| `GET /api/proxy/metar/{icao}` | Replace with minimal Vercel external rewrite | AviationWeather returns useful JSON but no `access-control-allow-origin` header in the checked response, so `frontend/vercel.json` rewrites this same-origin path to AviationWeather. Local Vite dev has a matching proxy rule. |
| `GET /api/proxy/aircraft/positions/{lat}/{lon}/{dist}` | Replace with minimal Vercel external rewrite | adsb.lol returns useful JSON but no `access-control-allow-origin` header in the checked response, so `frontend/vercel.json` rewrites this same-origin path to adsb.lol. Local Vite dev has a matching proxy rule. |
| `WS /ws/caption/{mount}` | Delete | Live audio/captioning has been removed from the product direction. The disabled WebSocket route and backend code were removed. |
| `GET /api/health` | Delete | It only reported FastAPI process health and is no longer relevant. |
| Static SPA serving from FastAPI | Delete | Vercel serves `frontend/dist` for web, and Electron loads the built frontend directly. |

## CORS Findings

Checked on 2026-04-26:

| Source | Browser access decision | Evidence |
| --- | --- | --- |
| `https://airportsapi.com/api/airports/KBOS` | Direct browser access | Response included `access-control-allow-origin: *`. |
| `https://aviationweather.gov/api/data/metar?ids=KBOS&format=json` | Same-origin external rewrite required | Response did not include `access-control-allow-origin`. |
| `https://api.adsb.lol/v2/lat/42.3656/lon/-71.0096/dist/20` | Same-origin external rewrite required | Response did not include `access-control-allow-origin`. |

## Rate-Conscious Behavior

- Airport directory results are cached in memory and `localStorage` for six hours.
- Aircraft position polling is 15 seconds by default through `DEFAULT_AIRCRAFT_POLL_MS`.
- METAR responses keep the upstream 90-second cache window observed in response headers.
- ADS-B position responses use `no-store` because stale aircraft positions are misleading.

## Vercel Path

`vercel.json` defines the Git-triggered web deployment, and `frontend/vercel.json` mirrors it for manual deploys from `frontend/`:

- build command: `pnpm build` at the repo root, which installs/builds `frontend/` and copies `frontend/dist` to root `dist`
- output directory: `dist`
- SPA rewrite for non-API routes
- external rewrites for METAR and ADS-B paths before the SPA fallback

No Vercel Serverless function or Python backend is currently required.

The frontend data clients default to same-origin proxy paths:

- `/api/proxy/metar/:icao`
- `/api/proxy/aircraft/positions/:lat/:lon/:dist`

Those defaults work on Vercel and through the equivalent Vite dev proxy rules.

## Deployment Test

Tested on 2026-04-26 with frontend-only Vercel production deployment `dpl_EQBX5AbSZhTwUVWdKE7dWMZu9gZV` at `https://adsbao-frontend-82ve516bh-orri-duck-day.vercel.app`.

Verified:

- `/` returns the built Vite app.
- `/airport/KBOS` returns the built Vite app through the SPA fallback.
- `/api/proxy/metar/KBOS` returns AviationWeather JSON through the same-origin Vercel rewrite.
- `/api/proxy/aircraft/positions/42.3656/-71.0096/5` returns adsb.lol JSON through the same-origin Vercel rewrite.
- The deployed app was opened in the in-app browser; `/KBOS` rendered Boston Logan airport content with no console errors.
