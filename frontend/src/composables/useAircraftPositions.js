import { ref, watch, onUnmounted } from 'vue'

// OpenSky Network — no auth for anonymous tier (limited rate)
// Returns aircraft in a lat/lon bounding box
const OPENSKY = 'https://opensky-network.org/api/states/all'
const POLL_MS = 15_000

// Known airport bounding boxes: [lamin, lamax, lomin, lomax]
const AIRPORT_BOUNDS = {
  KLAX: [33.88, 34.00, -118.47, -118.36],
  KJFK: [40.60, 40.70, -73.84, -73.73],
  KORD: [41.94, 42.01, -87.96, -87.86],
  KATL: [33.61, 33.68, -84.46, -84.40],
  KDFW: [32.86, 32.94, -97.06, -96.97],
  KSFO: [37.59, 37.66, -122.42, -122.35],
  KBOS: [42.33, 42.40, -71.05, -70.96],
  KSEA: [47.42, 47.48, -122.34, -122.28],
  EGLL: [51.45, 51.51, -0.50,  -0.43],
  LFPG: [48.98, 49.04,  2.51,   2.58],
  EDDF: [50.01, 50.06,  8.54,   8.60],
  RJTT: [35.53, 35.57,139.76, 139.80],
}

const DEFAULT_DELTA = 0.07 // ~7 km radius for unknown airports

export function useAircraftPositions(icaoRef, latRef, lonRef) {
  const aircraft = ref([])
  const loading  = ref(false)
  let timer = null

  const getBounds = (icao, lat, lon) => {
    if (AIRPORT_BOUNDS[icao]) return AIRPORT_BOUNDS[icao]
    if (lat && lon) return [lat - DEFAULT_DELTA, lat + DEFAULT_DELTA, lon - DEFAULT_DELTA, lon + DEFAULT_DELTA]
    return null
  }

  const poll = async () => {
    const icao = icaoRef?.value
    const lat  = latRef?.value
    const lon  = lonRef?.value
    const bounds = getBounds(icao, lat, lon)
    if (!bounds) return

    loading.value = true
    try {
      const [lamin, lamax, lomin, lomax] = bounds
      const url = `${OPENSKY}?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`)
      const json = await res.json()

      // State vector: [icao24, callsign, origin_country, time_pos, last_contact,
      //                lon, lat, baro_alt, on_ground, velocity, true_track, ...]
      aircraft.value = (json.states || [])
        .filter(s => s[6] != null && s[5] != null)
        .map(s => ({
          icao24:   s[0],
          callsign: (s[1] || '').trim(),
          lat:      s[6],
          lon:      s[5],
          altitude: s[7],
          onGround: s[8],
          velocity: s[9],
          track:    s[10],
        }))
    } catch (e) {
      // OpenSky rate-limits anonymous requests; silently ignore
      console.warn('OpenSky fetch failed:', e.message)
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

  return { aircraft, loading }
}
