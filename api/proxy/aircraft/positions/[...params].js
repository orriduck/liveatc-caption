export const config = { runtime: 'edge' }

export default async function handler(request) {
  const requestUrl = typeof request?.url === 'string' ? request.url : ''
  const url = requestUrl.startsWith('http')
    ? new URL(requestUrl)
    : new URL(requestUrl, 'https://adsbao.vercel.app')
  const segments = url.pathname.split('/').filter(Boolean)
  const [rawLat, rawLon, rawDist] = segments.slice(-3)
  const safeDecode = (value = '') => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  const lat = safeDecode(rawLat)
  const lon = safeDecode(rawLon)
  const dist = safeDecode(rawDist)
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
