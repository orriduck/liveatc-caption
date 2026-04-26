const env = import.meta.env ?? {}

export const DEFAULT_AIRCRAFT_POLL_MS = 15_000
export const DEFAULT_AIRCRAFT_DIST_NM = 20

const DEFAULT_METAR_BASE = '/api/proxy/metar'
const DEFAULT_AIRCRAFT_POSITIONS_BASE = '/api/proxy/aircraft/positions'

const createTimeoutSignal = (timeoutMs) => (
  typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined
)

const fetchJson = async (fetchImpl, url, { timeoutMs = 14_000 } = {}) => {
  const response = await fetchImpl(url, {
    signal: createTimeoutSignal(timeoutMs),
    headers: {
      Accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export const createMetarClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.VITE_METAR_PROXY_BASE || DEFAULT_METAR_BASE,
} = {}) => {
  if (!fetchImpl) throw new Error('METAR client requires fetch support')

  return {
    fetchMetar(icao) {
      const normalized = String(icao || '').trim().toUpperCase()
      if (!normalized) return []
      return fetchJson(fetchImpl, `${baseUrl}/${encodeURIComponent(normalized)}`, {
        timeoutMs: 10_000,
      })
    },
  }
}

export const createAircraftPositionClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.VITE_AIRCRAFT_POSITIONS_BASE || DEFAULT_AIRCRAFT_POSITIONS_BASE,
} = {}) => {
  if (!fetchImpl) throw new Error('Aircraft position client requires fetch support')

  return {
    fetchNearbyAircraft({ lat, lon, distNm = DEFAULT_AIRCRAFT_DIST_NM }) {
      const encodedLat = encodeURIComponent(String(lat))
      const encodedLon = encodeURIComponent(String(lon))
      const encodedDist = encodeURIComponent(String(distNm))
      return fetchJson(fetchImpl, `${baseUrl}/${encodedLat}/${encodedLon}/${encodedDist}`, {
        timeoutMs: 14_000,
      })
    },
  }
}

export const metarClient = createMetarClient()
export const aircraftPositionClient = createAircraftPositionClient()
