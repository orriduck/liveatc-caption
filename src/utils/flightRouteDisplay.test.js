import assert from 'node:assert/strict'

import {
  formatFlightRouteLabel,
  formatLocalFlightRouteLabel,
} from './flightRouteDisplay.js'
import { ARRIVAL, DEPARTURE, UNKNOWN } from './aircraftMovement.js'

{
  const label = formatFlightRouteLabel({
    origin: { iata: 'JFK', icao: 'KJFK' },
    destination: { iata: 'LHR', icao: 'EGLL' },
  })

  assert.equal(label, 'JFK -> LHR')
}

{
  const label = formatFlightRouteLabel({
    origin: { icao: 'KBOS' },
    destination: { icao: 'KSFO' },
  })

  assert.equal(label, 'KBOS -> KSFO')
}

{
  assert.equal(formatFlightRouteLabel(null), '')
  assert.equal(formatFlightRouteLabel({ origin: { iata: 'BOS' } }), '')
}

{
  const route = {
    origin: { iata: 'LAX', icao: 'KLAX' },
    destination: { iata: 'BOS', icao: 'KBOS' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, ARRIVAL),
    'LAX -> BOS',
  )
  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, DEPARTURE),
    '',
  )
}

{
  const route = {
    origin: { iata: 'BOS', icao: 'KBOS' },
    destination: { iata: 'ATL', icao: 'KATL' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, DEPARTURE),
    'BOS -> ATL',
  )
  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, ARRIVAL),
    '',
  )
}

{
  const route = {
    origin: { iata: 'PHX', icao: 'KPHX' },
    destination: { iata: 'MIA', icao: 'KMIA' },
  }

  assert.equal(
    formatLocalFlightRouteLabel(route, { iata: 'BOS', icao: 'KBOS' }, UNKNOWN),
    '',
  )
}
