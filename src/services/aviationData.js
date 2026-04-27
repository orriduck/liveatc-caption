import { withAuditLogging } from '../utils/apiLogger.js'

const env = import.meta.env ?? {}

export const DEFAULT_AIRCRAFT_POLL_MS = 3_000
export const DEFAULT_AIRCRAFT_DIST_NM = 20

const DEFAULT_METAR_BASE = '/api/proxy/metar'
const DEFAULT_AIRCRAFT_POSITIONS_BASE = '/api/proxy/aircraft/positions'
const DEFAULT_FLIGHT_ROUTE_BASE = '/api/proxy/flight-routes/callsign'

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
  const body = await response.text()
  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`Expected JSON from ${url}`)
  }
}

export const createMetarClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.VITE_METAR_PROXY_BASE || DEFAULT_METAR_BASE,
} = {}) => {
  if (!fetchImpl) throw new Error('METAR client requires fetch support')

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: 'AviationWeather/METAR',
    getParams(url) {
      return { icao: decodeURIComponent(url.split('/').pop() || '') }
    },
  })

  return {
    fetchMetar(icao) {
      const normalized = String(icao || '').trim().toUpperCase()
      if (!normalized) return []
      return fetchJson(auditedFetch, `${baseUrl}/${encodeURIComponent(normalized)}`, {
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

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: 'adsb.lol/Aircraft',
    getParams(url) {
      const p = url.split('/')
      return { lat: p[p.length - 3], lon: p[p.length - 2], distNm: p[p.length - 1] }
    },
  })

  return {
    fetchNearbyAircraft({ lat, lon, distNm = DEFAULT_AIRCRAFT_DIST_NM }) {
      const encodedLat = encodeURIComponent(String(lat))
      const encodedLon = encodeURIComponent(String(lon))
      const encodedDist = encodeURIComponent(String(distNm))
      return fetchJson(auditedFetch, `${baseUrl}/${encodedLat}/${encodedLon}/${encodedDist}`, {
        timeoutMs: 14_000,
      })
    },
  }
}

const normalizeAirport = (airport) => {
  if (!airport) return null
  const lat = Number(airport.latitude)
  const lon = Number(airport.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  return {
    icao: String(airport.icao_code || '').trim().toUpperCase(),
    iata: String(airport.iata_code || '').trim().toUpperCase(),
    name: String(airport.name || '').trim(),
    municipality: String(airport.municipality || '').trim(),
    country: String(airport.country_name || '').trim(),
    lat,
    lon,
  }
}

export const normalizeFlightRoute = (payload) => {
  const route = payload?.response?.flightroute
  if (!route) return null

  const origin = normalizeAirport(route.origin)
  const destination = normalizeAirport(route.destination)
  if (!origin || !destination || !origin.icao || !destination.icao) return null

  const callsign = String(route.callsign || route.callsign_icao || '').trim().toUpperCase()
  if (!callsign) return null

  return {
    callsign,
    callsignIcao: String(route.callsign_icao || '').trim().toUpperCase(),
    callsignIata: String(route.callsign_iata || '').trim().toUpperCase(),
    airlineName: String(route.airline?.name || '').trim(),
    airlineIcao: String(route.airline?.icao || '').trim().toUpperCase(),
    airlineIata: String(route.airline?.iata || '').trim().toUpperCase(),
    origin,
    destination,
    source: 'adsbdb',
  }
}

const normalizeCallsign = (callsign) =>
  String(callsign || '').trim().toUpperCase().replace(/\s+/g, '')

export const createFlightRouteClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  baseUrl = env.VITE_FLIGHT_ROUTE_BASE || DEFAULT_FLIGHT_ROUTE_BASE,
} = {}) => {
  if (!fetchImpl) throw new Error('Flight route client requires fetch support')

  const auditedFetch = withAuditLogging(fetchImpl, {
    service: 'adsbdb/FlightRoute',
    getParams(url) {
      return { callsign: decodeURIComponent(url.split('/').pop() || '') }
    },
  })

  return {
    async fetchFlightRoute(callsign) {
      const normalized = normalizeCallsign(callsign)
      if (!normalized) return null

      const response = await auditedFetch(`${baseUrl}/${encodeURIComponent(normalized)}`, {
        signal: createTimeoutSignal(10_000),
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.status === 400 || response.status === 404) return null
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const body = await response.text()
      try {
        return normalizeFlightRoute(JSON.parse(body))
      } catch {
        throw new Error(`Expected JSON from ${baseUrl}/${normalized}`)
      }
    },
  }
}

export const metarClient = createMetarClient()
export const aircraftPositionClient = createAircraftPositionClient()
export const flightRouteClient = createFlightRouteClient()
