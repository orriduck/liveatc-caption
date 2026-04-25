import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const source = readFileSync(resolve(here, './AirportCaptionScreen.vue'), 'utf8')

assert.ok(
  !source.includes('bottom-dock'),
  'airport explorer view should not render the old bottom dock',
)

assert.ok(
  !source.includes('caption-overlay'),
  'airport explorer view should not render caption overlays',
)

assert.ok(
  !source.includes('select-feed'),
  'airport explorer view should not expose feed selection events',
)

assert.ok(
  !source.includes('toggle-play'),
  'airport explorer view should not expose playback controls',
)

assert.ok(
  !source.includes('props.channels'),
  'airport explorer view should not depend on channel data',
)

assert.ok(
  !source.includes('props.captions'),
  'airport explorer view should not depend on caption data',
)

assert.ok(
  source.includes('aircraft.length'),
  'airport explorer view should still surface aircraft traffic context',
)
