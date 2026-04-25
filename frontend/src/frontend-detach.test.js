import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8')

const appSource = read('src/App.vue')
const homeSource = read('src/views/HomeView.vue')
const settingsSource = read('src/views/SettingsView.vue')
const aboutSource = read('src/views/AboutView.vue')
const searchSource = read('src/components/screens/SearchScreen.vue')
const packageSource = read('package.json')

assert.ok(
  !appSource.includes('useATC'),
  'app shell should not provide the ATC composable globally',
)

assert.ok(
  !homeSource.includes('inject('),
  'home view should not depend on injected ATC state',
)

assert.ok(
  !homeSource.includes('channel'),
  'home view should not manage channel routes or channel state',
)

assert.ok(
  !settingsSource.includes('Anthropic API Key'),
  'settings view should not expose provider API key fields',
)

assert.ok(
  !settingsSource.includes('/api/config'),
  'settings view should not post transcription config to the backend',
)

assert.ok(
  !settingsSource.includes('ws_model'),
  'settings view should not persist transcription tuning controls',
)

assert.ok(
  !aboutSource.includes('AI-powered transcription'),
  'about view should not describe the removed live transcription feature',
)

assert.ok(
  packageSource.includes('"version": "0.4.0"'),
  'frontend package version should be bumped to 0.4.0 for the breaking change',
)

assert.ok(
  aboutSource.includes('0.4.0'),
  'about view should display the 0.4.0 release version',
)

assert.ok(
  searchSource.includes('v0.4.0'),
  'search screen footer should advertise the 0.4.0 airport explorer preview',
)

assert.ok(
  !existsSync(resolve(root, 'src/composables/useATC.js')),
  'detached frontend should remove the ATC composable',
)

assert.ok(
  !existsSync(resolve(root, 'src/components/player/Player.vue')),
  'detached frontend should remove the player component',
)

assert.ok(
  !existsSync(resolve(root, 'public/playback-processor.js')),
  'detached frontend should remove the audio worklet asset',
)
