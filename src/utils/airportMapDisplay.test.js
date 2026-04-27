import assert from 'node:assert/strict'

import { countGroundAircraft, shouldShowAirportArea } from './airportMapDisplay.js'

assert.equal(shouldShowAirportArea(10), false)
assert.equal(shouldShowAirportArea(13), true)
assert.equal(shouldShowAirportArea(14), true)

assert.equal(
  countGroundAircraft([
    { onGround: true },
    { onGround: false },
    { onGround: true },
    {},
  ]),
  2,
)
