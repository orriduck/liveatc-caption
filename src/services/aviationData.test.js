import assert from 'node:assert/strict'

import {
  createAircraftPositionClient,
  createMetarClient,
  DEFAULT_AIRCRAFT_POLL_MS,
} from './aviationData.js'

const createJsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Map([['content-type', 'application/json']]),
  async json() {
    return payload
  },
  async text() {
    return JSON.stringify(payload)
  },
})

const createTextResponse = (payload, status = 200, contentType = 'text/html') => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Map([['content-type', contentType]]),
  async text() {
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

{
  const metarClient = createMetarClient({
    fetchImpl: async () => createTextResponse('<!doctype html><html></html>'),
  })
  const aircraftClient = createAircraftPositionClient({
    fetchImpl: async () => createJsonResponse({ ac: [{ hex: 'def456', lat: 33, lon: -118 }] }),
  })

  await assert.rejects(
    () => metarClient.fetchMetar('klax'),
    /Expected JSON from \/api\/proxy\/metar\/KLAX/,
  )

  const aircraft = await aircraftClient.fetchNearbyAircraft({
    lat: 33.9425,
    lon: -118.4081,
    distNm: 20,
  })
  assert.equal(aircraft.ac[0].hex, 'def456')
}
