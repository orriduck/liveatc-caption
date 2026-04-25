import { ref, watch, onUnmounted } from 'vue'
import { parseAdsbPositionTime } from '../utils/aircraftMotion'

// Proxied through backend — adsb.lol has no CORS headers for browser requests
const API = '/api/proxy/aircraft/positions'
const POLL_MS = 3_000
const DIST_NM = 20  // nautical miles radius (~37 km) — catches approach traffic too

export function useAircraftPositions(icaoRef, latRef, lonRef) {
  const aircraft    = ref([])
  const loading     = ref(false)
  const lastUpdated = ref(null)
  let timer = null

  const poll = async () => {
    const lat = latRef?.value
    const lon = lonRef?.value
    if (!lat || !lon) return

    loading.value = true
    try {
      const url = `${API}?lat=${lat}&lon=${lon}&dist=${DIST_NM}`
      const res = await fetch(url, { signal: AbortSignal.timeout(14_000) })
      if (!res.ok) throw new Error(`ADS-B HTTP ${res.status}`)
      const json = await res.json()
      const receiveTime = Date.now()

      // adsb.lol response: { ac: [{ hex, flight, lat, lon, alt_baro, gs, track, gnd, ... }] }
      aircraft.value = (json.ac || [])
        .filter(a => a.lat != null && a.lon != null)
        .map(a => ({
          icao24:   a.hex || '',
          callsign: (a.flight || a.r || '').trim(),
          lat:      a.lat,
          lon:      a.lon,
          altitude: a.alt_baro ?? a.alt_geom ?? null,
          onGround: a.gnd ?? false,
          velocity: a.gs ?? null,
          track:    a.track ?? 0,
          positionTime: parseAdsbPositionTime(a, json.now, receiveTime),
          receiveTime,
        }))
      lastUpdated.value = new Date()
    } catch (e) {
      console.warn('ADS-B fetch failed:', e.message)
    } finally {
      loading.value = false
    }
  }

  const start = () => {
    stop()
    poll()
    timer = setInterval(poll, POLL_MS)
  }

  const stop = () => {
    if (timer) { clearInterval(timer); timer = null }
    aircraft.value = []
  }

  watch(icaoRef, (v) => { if (v) start(); else stop() }, { immediate: true })
  onUnmounted(stop)

  return { aircraft, loading, lastUpdated }
}
