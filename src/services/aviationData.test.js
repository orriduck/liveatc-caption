import assert from 'node:assert/strict'

import {
  createAircraftPositionClient,
  createMetarClient,
  DEFAULT_AIRCRAFT_POLL_MS,
} from './aviationData.js'

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload
  },
})

{
  const calls = []
  const client = createMetarClient({
    fetchImpl: async (url) => {
      calls.push(url)
      return createJsonResponse([{ rawOb: 'KBOS 261254Z 27008KT 10SM CLR 12/02 A3001' }])
    },
  })

  const payload = await client.fetchMetar('kbos')

  assert.equal(calls.length, 1)
  assert.equal(calls[0], '/api/proxy/metar/KBOS')
  assert.equal(payload[0].rawOb, 'KBOS 261254Z 27008KT 10SM CLR 12/02 A3001')
}

{
  const calls = []
  const client = createAircraftPositionClient({
    fetchImpl: async (url) => {
      calls.push(url)
      return createJsonResponse({ ac: [{ hex: 'a1b2c3', lat: 42, lon: -71 }] })
    },
  })

  const payload = await client.fetchNearbyAircraft({ lat: 42.3656, lon: -71.0096, distNm: 15 })

  assert.equal(calls.length, 1)
  assert.equal(calls[0], '/api/proxy/aircraft/positions/42.3656/-71.0096/15')
  assert.equal(payload.ac[0].hex, 'a1b2c3')
}

{
  assert.equal(DEFAULT_AIRCRAFT_POLL_MS, 3_000)
}
