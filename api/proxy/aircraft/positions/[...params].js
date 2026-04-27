export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  // pathname: /api/proxy/aircraft/positions/{lat}/{lon}/{dist}
  const segments = url.pathname.split('/').filter(Boolean)
  const [lat, lon, dist] = segments.slice(-3).map(decodeURIComponent)
  const start = Date.now()

  console.log(`[audit:api] adsb.lol/Aircraft → lat=${lat} lon=${lon} distNm=${dist}`)

  try {
    const upstream = `https://api.adsb.lol/v2/lat/${encodeURIComponent(lat)}/lon/${encodeURIComponent(lon)}/dist/${encodeURIComponent(dist)}`
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(14_000),
    })
    const body = await response.text()
    const ms = Date.now() - start

    console.log(`[audit:api] adsb.lol/Aircraft ← HTTP ${response.status} +${ms}ms  lat=${lat} lon=${lon} distNm=${dist}`)

    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[audit:api] adsb.lol/Aircraft ✗ ERROR +${ms}ms  lat=${lat} lon=${lon} distNm=${dist}  error=${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
