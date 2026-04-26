import assert from 'node:assert/strict'

import {
  HOME_AIRPORT_COUNTRY,
  HOME_AIRPORT_KIND_OPTIONS,
  buildHomeAirportBrowseTitle,
} from './homeAirportDirectory.js'

assert.equal(HOME_AIRPORT_COUNTRY, 'US')

assert.deepEqual(
  HOME_AIRPORT_KIND_OPTIONS.map((option) => option.id),
  ['all', 'large_airport', 'medium_airport', 'small_airport', 'heliport'],
)

assert.deepEqual(
  HOME_AIRPORT_KIND_OPTIONS.map((option) => option.label),
  ['All US airports', 'Major hubs', 'Regional', 'Local fields', 'Heliports'],
)

assert.equal(buildHomeAirportBrowseTitle('all'), 'All US airports')
assert.equal(buildHomeAirportBrowseTitle('large_airport'), 'Major hubs · United States')
assert.equal(buildHomeAirportBrowseTitle('heliport'), 'Heliports · United States')
