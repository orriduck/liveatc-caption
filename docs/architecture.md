# ADSBao Architecture

ADSBao is a Vercel-first web app for airport lookup, weather context, nearby aircraft visualization, and airport-aware route labels.

## Frontend stack

- React on Next.js App Router.
- Tailwind CSS v4 with DaisyUI.
- Vercel Web Analytics and Speed Insights through the Next.js integrations.
- React component equivalents for the previous VueBits-style UI effects.

## Current product scope

- Search-first airport lookup.
- METAR weather context.
- ADS-B nearby traffic visualization.
- Callsign route labels when route data can be resolved.
- Vercel web deployment.

Legacy desktop distribution, Electron packaging, Homebrew cask publishing, the previous local backend runtime, and previous transcription-oriented UI are not part of the current ADSBao web scope.

## Runtime topology

### Browser-owned airport directory

Airport directory data is requested by the browser and cached by the frontend.

### Vercel data paths

The app uses same-origin Vercel paths for upstream aviation sources that are not directly browser-friendly.

| Path | Upstream | Purpose |
|---|---|---|
| `/api/proxy/metar/:icao` | AviationWeather METAR API | Airport weather context |
| `/api/proxy/aircraft/positions/:lat/:lon/:dist` | adsb.lol | Nearby aircraft positions |
| `/api/proxy/flight-routes/callsign/:callsign` | Local Vercel function | Callsign route lookup |

The route lookup path resolves to `src/app/api/proxy/flight-routes/callsign/[callsign]/route.js`. The handler returns a frontend-compatible route response so UI code can stay focused on display and normalization.

## Local development

```bash
pnpm install
pnpm run dev
```

Next.js rewrites in `next.config.mjs` mirror the production METAR and ADS-B data paths for local development. The FlightAware route lookup runs as a local Next.js Route Handler during `pnpm run dev`.

## Release line

The current ADSBao web line starts at `v0.4.0`.

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |
| `v0.8.0` | Next.js Vercel refactor |

`v0.3.x` and earlier are legacy desktop-app history and should not be used as the current ADSBao web product line.
