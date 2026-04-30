# ADSBao — Claude Code Guide

## Dev environment

Start the frontend:

```bash
pnpm run dev
```

Frontend runs on `http://localhost:5173`.

## Stack

- **Frontend**: Vue 3 + Vite + Tailwind + DaisyUI, managed by `pnpm`.
- **Airport data**: Airport directory and route lookup are fetched live from public aviation sources with frontend caching where appropriate.
- **Weather/traffic data**: Web deployment uses Vercel data paths under `/api/proxy/*` because AviationWeather, adsb.lol, and route lookups need same-origin handling for production browser use. Local Vite dev uses equivalent proxy rules where possible.
- **Removed scope**: Live audio/transcription, desktop packaging, Homebrew cask publishing, and Python backend runtime config are no longer part of this repository.

## Key paths

| Path | What |
|---|---|
| `CHANGELOG.md` | Product version history and legacy release split |
| `docs/architecture.md` | Current Vercel web architecture and data-path notes |
| `package.json` | App metadata, scripts, dependencies, and current product version |
| `vercel.json` | Vercel build/output config and production rewrites |
| `vite.config.js` | Local dev proxy rules matching the Vercel data paths |
| `api/proxy/flight-routes/callsign/[callsign].js` | Vercel serverless function for callsign route lookup |
| `src/views/HomeView.vue` | Search-to-airport route flow |
| `src/components/screens/SearchScreen.vue` | Airport directory UI backed by airportsapi.com + frontend cache |
| `src/components/screens/AirportCaptionScreen.vue` | Airport explorer map + METAR screen |
| `src/services/aviationData.js` | Frontend-owned METAR and ADS-B data access clients |
| `src/constants/aircraft.js` | Shared aircraft color and threshold constants |
| `src/utils/math.js` | Shared numeric helpers (`toFiniteNumber`) |
| `src/utils/airport.js` | Shared airport display helpers (`airportSubtitle`) |
| `src/data/airportFallbacks.js` | Fallback airport metadata and coordinates |

## Build

```bash
pnpm build
```

## Tests

```bash
pnpm test:home-airport-directory && pnpm test:airport-directory && pnpm test:aviation-data && pnpm test:vercel-routing && pnpm test:airport-wiki && pnpm test:flight-route-display && pnpm test:airport-map-display && pnpm test:metar && pnpm test:aircraft-motion && pnpm test:aircraft-traffic-intent
```

## Runtime config

There is no Python backend runtime config, frontend settings page, or `/api/config` flow.

## Version and release rules

Vercel deploys every push to `main`, but a deployment is not automatically a product release. Do not bump `package.json` or create a Git tag just because a Vercel deployment happened.

Use the current ADSBao web release line:

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |

`v0.3.x` and earlier are legacy desktop-app history. Do not use those releases as the current ADSBao web product line.

When preparing a new product release:

1. Decide the next SemVer-style version based on product meaning, not deploy count.
   - Minor: user-visible feature, architecture milestone, or substantial production behavior change.
   - Patch: bug fix, compatibility fix, or small UX correction.
   - No version bump: docs-only, screenshot-only, refactor-only, or routine dependency cleanup with no product-visible impact.
2. Update all visible version strings together:
   - `package.json`
   - `src/views/AboutView.vue`
   - `api/proxy/flight-routes/callsign/[callsign].js` User-Agent, if still present
   - `CHANGELOG.md`
   - `README.md`, only if it states the current version
3. Run `pnpm build` and the test command above before tagging.
4. Tag only after the release commit is on `main` and the Vercel production deployment is healthy.
5. Use an annotated tag for product releases:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z - Short release title"
git push origin vX.Y.Z
```

6. GitHub Release notes should summarize product changes from `CHANGELOG.md`. Do not recreate the old Homebrew cask auto-release flow.
