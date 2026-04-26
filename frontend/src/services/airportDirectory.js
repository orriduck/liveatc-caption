const API_BASE_URL = 'https://airportsapi.com/api'
const CACHE_PREFIX = 'adsbao:airport-directory:v1:'
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000
const API_PAGE_SIZE = 30

const TYPE_RANK = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  heliport: 3,
}

const ALL_KIND_SEQUENCE = [
  'large_airport',
  'medium_airport',
  'small_airport',
  'heliport',
]

const memoryCache = new Map()

const toFiniteNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const normalizeAirport = (record) => {
  const attrs = record?.attributes || record || {}
  const code = attrs.icao_code || attrs.gps_code || attrs.code || attrs.local_code || ''
  const type = attrs.type || ''

  return {
    icao: code,
    iata: attrs.iata_code || attrs.local_code || '',
    name: attrs.name || code,
    city: attrs.municipality || '',
    country: attrs.country_code || attrs.iso_country || '',
    lat: toFiniteNumber(attrs.latitude),
    lon: toFiniteNumber(attrs.longitude),
    type,
    type_label: type ? type.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '',
    code: attrs.code || code,
    source: 'airportsapi.com',
  }
}

const makeAirportKey = (airport) => (
  String(airport.icao || airport.code || airport.name || '').trim().toUpperCase()
)

const dedupeAirports = (airports) => {
  const seen = new Set()
  return airports.filter((airport) => {
    const key = makeAirportKey(airport)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const matchesKind = (airport, kind) => kind === 'all' || !kind || airport.type === kind

const matchesCountry = (airport, country) => !country || String(airport.country || '').toUpperCase() === country

const matchesQuery = (airport, query) => {
  const normalizedQuery = query.trim().toUpperCase()
  if (!normalizedQuery) return true

  const haystack = [
    airport.icao,
    airport.iata,
    airport.code,
    airport.name,
    airport.city,
    airport.country,
  ].join(' ').toUpperCase()

  return haystack.includes(normalizedQuery)
}

const browseScore = (airport) => ([
  TYPE_RANK[airport.type] ?? 9,
  airport.iata ? 0 : 1,
  String(airport.name || ''),
])

const queryScore = (airport, query) => {
  const normalizedQuery = query.trim().toUpperCase()
  const code = String(airport.icao || airport.code || '').toUpperCase()
  const iata = String(airport.iata || '').toUpperCase()
  const name = String(airport.name || '').toUpperCase()
  const city = String(airport.city || '').toUpperCase()

  if (code === normalizedQuery || iata === normalizedQuery) return [0, browseScore(airport)]
  if (code.startsWith(normalizedQuery) || iata.startsWith(normalizedQuery)) return [1, browseScore(airport)]
  if (name.startsWith(normalizedQuery) || city.startsWith(normalizedQuery)) return [2, browseScore(airport)]
  if (name.includes(normalizedQuery) || city.includes(normalizedQuery)) return [3, browseScore(airport)]
  return [9, browseScore(airport)]
}

const resolveStorage = (storage) => {
  if (storage) return storage
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  return null
}

const safeParse = (rawValue) => {
  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

const getNextLink = (payload) => {
  const links = payload?.links
  if (!links) return null
  if (typeof links.next === 'string') return links.next
  if (links.next?.href) return links.next.href
  return null
}

const buildEndpoint = ({ country, queryType, queryValue, kind, cursor }) => {
  const baseUrl = country
    ? `${API_BASE_URL}/countries/${country}/airports`
    : `${API_BASE_URL}/airports`
  const url = new URL(baseUrl)
  if (queryType && queryValue) url.searchParams.set(`filter[${queryType}]`, queryValue)
  if (kind && kind !== 'all') url.searchParams.set('filter[type]', kind)
  if (cursor) url.searchParams.set('page[cursor]', cursor)
  return url.toString()
}

export const createAirportDirectoryClient = ({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  storage,
  now = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
} = {}) => {
  if (!fetchImpl) {
    throw new Error('Airport directory client requires fetch support')
  }

  const resolvedStorage = resolveStorage(storage)

  const getCached = (cacheKey) => {
    const memoryEntry = memoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expiresAt > now()) {
      return { ...memoryEntry.payload, cache: 'hit' }
    }
    if (memoryEntry) {
      memoryCache.delete(cacheKey)
    }

    if (!resolvedStorage) return null

    const parsed = safeParse(resolvedStorage.getItem(`${CACHE_PREFIX}${cacheKey}`))
    if (!parsed || parsed.expiresAt <= now()) {
      resolvedStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`)
      return null
    }

    memoryCache.set(cacheKey, parsed)
    return { ...parsed.payload, cache: 'hit' }
  }

  const setCached = (cacheKey, payload) => {
    const entry = {
      expiresAt: now() + ttlMs,
      payload,
    }
    memoryCache.set(cacheKey, entry)
    if (resolvedStorage) {
      resolvedStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry))
    }
    return { ...payload, cache: 'miss' }
  }

  const fetchJson = async (url, { allow404 = false } = {}) => {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json, application/vnd.api+json',
      },
    })

    if (allow404 && response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Airport directory request failed (${response.status})`)
    }
    return response.json()
  }

  const fetchPagedAirports = async ({ country = '', kind = 'all', limit = 60, queryType = '', queryValue = '' }) => {
    const airports = []
    let cursor = null

    while (airports.length < limit) {
      const payload = await fetchJson(buildEndpoint({
        country,
        kind,
        queryType,
        queryValue,
        cursor,
      }))
      airports.push(
        ...(payload?.data || [])
          .map(normalizeAirport)
          .filter((airport) => airport.icao || airport.code || airport.name),
      )

      const nextLink = getNextLink(payload)
      if (!nextLink) break

      const nextUrl = new URL(nextLink)
      cursor = nextUrl.searchParams.get('page[cursor]')
      if (!cursor) break
    }

    return airports
  }

  const loadBrowseAirports = async ({ country = '', kind = 'all', limit = 60 }) => {
    const normalizedCountry = String(country || '').trim().toUpperCase()
    const normalizedKind = kind || 'all'
    const cacheKey = `browse:${normalizedCountry}:${normalizedKind}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const kindsToLoad = normalizedKind === 'all' ? ALL_KIND_SEQUENCE : [normalizedKind]
    const collected = []

    for (const nextKind of kindsToLoad) {
      const remaining = Math.max(limit - collected.length, API_PAGE_SIZE)
      const airports = await fetchPagedAirports({
        country: normalizedCountry,
        kind: nextKind,
        limit: remaining,
      })
      collected.push(...airports)
      if (dedupeAirports(collected).length >= limit) break
    }

    const airports = dedupeAirports(collected)
      .filter((airport) => matchesCountry(airport, normalizedCountry) && matchesKind(airport, normalizedKind))
      .sort((left, right) => {
        const [leftType, leftIata, leftName] = browseScore(left)
        const [rightType, rightIata, rightName] = browseScore(right)
        return leftType - rightType || leftIata - rightIata || leftName.localeCompare(rightName)
      })
      .slice(0, limit)

    return setCached(cacheKey, {
      airports,
      source: 'airportsapi.com',
    })
  }

  const searchAirports = async ({ query, country = '', kind = 'all', limit = 60 }) => {
    const trimmed = String(query || '').trim()
    const normalizedCountry = String(country || '').trim().toUpperCase()
    const normalizedKind = kind || 'all'
    const cacheKey = `search:${trimmed}:${normalizedCountry}:${normalizedKind}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const upper = trimmed.toUpperCase()
    const candidates = []

    if (/^[A-Z0-9]{4}$/.test(upper)) {
      const exactPayload = await fetchJson(`${API_BASE_URL}/airports/${upper}`, { allow404: true })
      if (exactPayload?.data) {
        candidates.push(normalizeAirport(exactPayload.data))
      }
    }

    const [codeMatches, nameMatches] = await Promise.all([
      fetchPagedAirports({
        country: normalizedCountry,
        kind: normalizedKind === 'all' ? 'all' : normalizedKind,
        limit,
        queryType: 'code',
        queryValue: upper,
      }),
      fetchPagedAirports({
        country: normalizedCountry,
        kind: normalizedKind === 'all' ? 'all' : normalizedKind,
        limit,
        queryType: 'name',
        queryValue: trimmed,
      }),
    ])

    candidates.push(...codeMatches, ...nameMatches)

    if (normalizedCountry) {
      const browseMatches = await loadBrowseAirports({
        country: normalizedCountry,
        kind: normalizedKind,
        limit: Math.max(limit, 60),
      })
      candidates.push(...browseMatches.airports.filter((airport) => matchesQuery(airport, trimmed)))
    }

    const airports = dedupeAirports(candidates)
      .filter((airport) => (
        matchesCountry(airport, normalizedCountry)
        && matchesKind(airport, normalizedKind)
        && matchesQuery(airport, trimmed)
      ))
      .sort((left, right) => {
        const [leftRank, leftBrowse] = queryScore(left, trimmed)
        const [rightRank, rightBrowse] = queryScore(right, trimmed)
        return leftRank - rightRank
          || leftBrowse[0] - rightBrowse[0]
          || leftBrowse[1] - rightBrowse[1]
          || leftBrowse[2].localeCompare(rightBrowse[2])
      })
      .slice(0, limit)

    return setCached(cacheKey, {
      airports,
      source: 'airportsapi.com',
    })
  }

  return {
    async loadAirports({ query = '', country = '', kind = 'all', limit = 60 } = {}) {
      if (String(query || '').trim()) {
        return searchAirports({ query, country, kind, limit })
      }
      return loadBrowseAirports({ country, kind, limit })
    },
  }
}

export const airportDirectoryClient = createAirportDirectoryClient()
