export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const icao = decodeURIComponent(url.pathname.split('/').pop())
  const start = Date.now()

  console.log(`[audit:api] AviationWeather/METAR → icao=${icao}`)

  try {
    const upstream = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    const body = await response.text()
    const ms = Date.now() - start

    console.log(`[audit:api] AviationWeather/METAR ← HTTP ${response.status} +${ms}ms  icao=${icao}`)

    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[audit:api] AviationWeather/METAR ✗ ERROR +${ms}ms  icao=${icao}  error=${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
