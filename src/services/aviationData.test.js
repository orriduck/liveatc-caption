import assert from 'node:assert/strict'

import {
  createAircraftPositionClient,
  createFlightRouteClient,
  createMetarClient,
  DEFAULT_AIRCRAFT_POLL_MS,
  normalizeFlightRoute,
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
  const route = normalizeFlightRoute({
    response: {
      flightroute: {
        callsign: 'DAL123',
        callsign_icao: 'DAL123',
        callsign_iata: 'DL123',
        airline: {
          name: 'Delta Air Lines',
          icao: 'DAL',
          iata: 'DL',
        },
        origin: {
          icao_code: 'EGPH',
          iata_code: 'EDI',
          name: 'Edinburgh Airport',
          municipality: 'Edinburgh',
          country_name: 'United Kingdom',
          latitude: 55.950145,
          longitude: -3.372288,
        },
        destination: {
          icao_code: 'KBOS',
          iata_code: 'BOS',
          name: 'Logan International Airport',
          municipality: 'Boston',
          country_name: 'United States',
          latitude: 42.3643,
          longitude: -71.005203,
        },
      },
    },
  })

  assert.equal(route.callsign, 'DAL123')
  assert.equal(route.airlineName, 'Delta Air Lines')
  assert.equal(route.origin.icao, 'EGPH')
  assert.equal(route.destination.iata, 'BOS')
}

{
  const calls = []
  const client = createFlightRouteClient({
    fetchImpl: async (url) => {
      calls.push(url)
      return createJsonResponse({
        response: {
          flightroute: {
            callsign: 'BAW213',
            origin: {
              icao_code: 'EGLL',
              iata_code: 'LHR',
              name: 'Heathrow Airport',
              latitude: 51.4706,
              longitude: -0.461941,
            },
            destination: {
              icao_code: 'KBOS',
              iata_code: 'BOS',
              name: 'Logan International Airport',
              latitude: 42.3643,
              longitude: -71.005203,
            },
          },
        },
      })
    },
  })

  const route = await client.fetchFlightRoute(' baw213 ')

  assert.equal(calls.length, 1)
  assert.equal(calls[0], '/api/proxy/flight-routes/callsign/BAW213')
  assert.equal(route.origin.iata, 'LHR')
  assert.equal(route.destination.icao, 'KBOS')
}

{
  const client = createFlightRouteClient({
    fetchImpl: async () => createJsonResponse({ response: 'unknown callsign' }, 404),
  })

  assert.equal(await client.fetchFlightRoute('NOPE123'), null)
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
