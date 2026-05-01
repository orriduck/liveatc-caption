# Changelog

ADSBao uses product releases for user-visible milestones. Vercel deployments happen on every push to `main`, but a deployment is not automatically a product release.

## v0.8.0 — Next.js Vercel refactor

### Changed
- Rebuilt the web app from Vue 3/Vite to React on Next.js App Router.
- Kept Tailwind CSS v4 and DaisyUI as the styling foundation.
- Switched Vercel Analytics and Speed Insights to their Next.js integrations.
- Replaced VueBits-derived UI code with React component equivalents.

### Moved
- Moved the FlightAware route lookup from a root Vercel function to a Next.js Route Handler under `src/app/api`.
- Moved Vue composables to React hooks while preserving the existing data clients and pure utility tests.

## v0.7.1 — Map and mobile polish

### Fixed
- Start aircraft polling only after airport coordinates are available.
- Refine the mobile airport card sheet.
- Improve close-range and wide-range ADS-B merge behavior.

## v0.7.0 — Flight route and traffic context

### Added
- Airport-aware flight route labels.
- FlightAware-backed route lookup through a Vercel serverless function.
- Dual-range ADS-B polling with wide 20 NM context and close 3 NM airport vicinity.
- Airport context overlays and ground filtering.

### Changed
- Replaced the older adsbdb route path with a Vercel-hosted FlightAware route lookup.
- Removed the static route database and OpenFlights preprocessing.

## v0.6.0 — Vercel observability and production routing

### Added
- Vercel Web Analytics.
- Vercel Speed Insights.
- Runtime logging coverage for upstream data requests.

### Fixed
- Restored production-safe Vercel proxy rewrites.
- Hardened proxy response parsing so upstream HTML/error responses do not break unrelated polling.

## v0.5.0 — Vercel-first web architecture

### Added
- Vercel deployment configuration.
- Browser-first airport directory lookup with client caching.
- Same-origin proxy paths for browser-blocked METAR and ADS-B upstreams.

### Changed
- Flattened the frontend app into the repository root.
- Moved shared constants, airport helpers, math helpers, and fallback airport metadata into reusable modules.
- Removed redundant CI once Vercel became the deployment gate.

### Removed
- Electron desktop packaging.
- Homebrew cask release pipeline.
- One-time migration docs and stale desktop build scripts.

## v0.4.0 — ADSBao web pivot

### Breaking
- Renamed the project to ADSBao.
- Removed the legacy LiveATC frontend UI.
- Removed the LiveATC player, feed selector, and transcription presentation from the product scope.
- Removed legacy backend dependencies.

### Changed
- Repositioned the app as an airport explorer focused on airport lookup, weather context, and nearby traffic visualization.

## v0.3.x and earlier — Legacy LiveATC Caption desktop app

Archived release line for the previous desktop app distributed through Electron and Homebrew cask.
These releases are retained for historical reference only and do not represent the current ADSBao web app.
