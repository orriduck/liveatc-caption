import assert from 'node:assert/strict'

import { createAirportDirectoryClient } from './airportDirectory.js'

const createMemoryStorage = () => {
  const store = new Map()
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }
}

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload
  },
})

const makeRecord = (code, overrides = {}) => ({
  id: code,
  type: 'airports',
  attributes: {
    name: overrides.name || `${code} Airport`,
    code,
    type: overrides.type || 'large_airport',
    latitude: overrides.latitude ?? 42.0,
    longitude: overrides.longitude ?? -71.0,
    gps_code: overrides.gps_code ?? code,
    icao_code: overrides.icao_code ?? code,
    iata_code: overrides.iata_code ?? code.slice(-3),
    local_code: overrides.local_code ?? null,
    municipality: overrides.municipality ?? '',
    country_code: overrides.country_code ?? 'US',
  },
})

{
  const storage = createMemoryStorage()
  const calls = []
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url)
      return createJsonResponse({
        data: [makeRecord('KBOS', { name: 'Boston Logan International Airport', municipality: 'Boston' })],
        links: [],
      })
    },
    storage,
    now: () => 1_000,
  })

  const first = await client.loadAirports({ country: 'US', kind: 'large_airport', limit: 10 })
  const second = await client.loadAirports({ country: 'US', kind: 'large_airport', limit: 10 })

  assert.equal(calls.length, 1)
  assert.match(calls[0], /\/api\/countries\/US\/airports\?/)
  assert.match(calls[0], /filter%5Btype%5D=large_airport/)
  assert.equal(first.source, 'airportsapi.com')
  assert.equal(first.cache, 'miss')
  assert.equal(second.cache, 'hit')
  assert.equal(first.airports[0].icao, 'KBOS')
  assert.equal(first.airports[0].city, 'Boston')
}

{
  const storage = createMemoryStorage()
  const calls = []
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      calls.push(url)
      if (url.includes('/api/airports/KBOS')) {
        return createJsonResponse({ data: makeRecord('KBOS', { name: 'Boston Logan International Airport', municipality: 'Boston' }) })
      }
      if (url.includes('filter%5Bcode%5D=KBOS')) {
        return createJsonResponse({ data: [makeRecord('KBOS', { name: 'Boston Logan International Airport', municipality: 'Boston' })] })
      }
      if (url.includes('filter%5Bname%5D=KBOS')) {
        return createJsonResponse({ data: [makeRecord('KBOS', { name: 'Boston Logan International Airport', municipality: 'Boston' })] })
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
    storage,
    now: () => 2_000,
  })

  const result = await client.loadAirports({ query: 'KBOS', limit: 10 })

  assert.equal(calls.length, 3)
  assert.equal(result.airports.length, 1)
  assert.equal(result.airports[0].icao, 'KBOS')
}

{
  const storage = createMemoryStorage()
  const client = createAirportDirectoryClient({
    fetchImpl: async (url) => {
      if (url.includes('/api/countries/US/airports')) {
        return createJsonResponse({
          data: [
            makeRecord('KBOS', { name: 'Logan International Airport', municipality: 'Boston' }),
            makeRecord('KJFK', { name: 'John F Kennedy International Airport', municipality: 'New York' }),
          ],
          links: [],
        })
      }
      if (url.includes('filter%5Bcode%5D=Boston')) {
        return createJsonResponse({ data: [] })
      }
      if (url.includes('filter%5Bname%5D=Boston')) {
        return createJsonResponse({ data: [] })
      }
      return createJsonResponse({}, 404)
    },
    storage,
    now: () => 3_000,
  })

  await client.loadAirports({ country: 'US', kind: 'all', limit: 10 })
  const result = await client.loadAirports({ query: 'Boston', country: 'US', kind: 'all', limit: 10 })

  assert.equal(result.airports.length, 1)
  assert.equal(result.airports[0].city, 'Boston')
}
