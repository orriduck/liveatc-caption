# ADSBao Architecture

ADSBao is a Vercel-first web app for airport lookup, weather context, nearby aircraft visualization, and airport-aware route labels.

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

The route lookup path resolves to `api/proxy/flight-routes/callsign/[callsign].js`. The function returns a frontend-compatible route response so UI code can stay focused on display and normalization.

## Local development

```bash
pnpm install
pnpm run dev
```

Local Vite proxy rules mirror the production data paths where possible. For local execution of the route function, run Vercel's local dev server. Otherwise set `VITE_FLIGHT_ROUTE_PROXY` to point at a deployed ADSBao URL.

## Release line

The current ADSBao web line starts at `v0.4.0`.

| Version | Meaning |
|---|---|
| `v0.4.0` | Breaking ADSBao web pivot |
| `v0.5.0` | Vercel-first web architecture |
| `v0.6.0` | Vercel observability and production routing |
| `v0.7.0` | Flight route and traffic context |
| `v0.7.1` | Map and mobile polish |

`v0.3.x` and earlier are legacy desktop-app history and should not be used as the current ADSBao web product line.
