export const config = { runtime: 'edge' }

export default async function handler(request) {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const [lat, lon, dist] = segments.slice(-3).map(decodeURIComponent)
  const start = Date.now()

  try {
    const upstream = `https://api.adsb.lol/v2/lat/${encodeURIComponent(lat)}/lon/${encodeURIComponent(lon)}/dist/${encodeURIComponent(dist)}`
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(14_000),
    })
    const body = await response.text()
    console.log(`[audit:api] adsb.lol/Aircraft {"lat":"${lat}","lon":"${lon}","distNm":"${dist}"} → HTTP ${response.status} +${Date.now() - start}ms`)
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.log(`[audit:api] adsb.lol/Aircraft {"lat":"${lat}","lon":"${lon}","distNm":"${dist}"} → ERROR ${err.message} +${Date.now() - start}ms`)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
