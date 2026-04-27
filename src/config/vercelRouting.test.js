import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

assert.deepEqual(config.rewrites?.slice(0, 3), [
  {
    source: '/api/proxy/metar/:icao',
    destination: 'https://aviationweather.gov/api/data/metar?ids=:icao&format=json',
  },
  {
    source: '/api/proxy/aircraft/positions/:lat/:lon/:dist',
    destination: 'https://api.adsb.lol/v2/lat/:lat/lon/:lon/dist/:dist',
  },
  {
    source: '/api/proxy/flight-routes/callsign/:callsign',
    destination: 'https://api.adsbdb.com/v0/callsign/:callsign',
  },
])

assert.equal(config.rewrites?.at(-1)?.destination, '/index.html')
assert.equal(existsSync(new URL('../../api/proxy/metar/[icao].js', import.meta.url)), false)
assert.equal(existsSync(new URL('../../api/proxy/aircraft/positions/[...params].js', import.meta.url)), false)
assert.equal(existsSync(new URL('../../api/proxy/flight-routes/callsign/[callsign].js', import.meta.url)), false)
