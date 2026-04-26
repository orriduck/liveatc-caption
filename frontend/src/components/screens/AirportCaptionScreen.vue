<template>
  <div class="relative min-h-screen overflow-hidden bg-atc-bg font-sans text-atc-text">
    <div class="absolute inset-0 z-0">
      <AirportMap
        :icao="airport?.icao || icao"
        :lat="airportLat"
        :lon="airportLon"
        accent="#FF5A1F"
        :aircraft="aircraft"
      />
    </div>

    <div class="absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_14%,rgba(255,90,31,0.14),transparent_28%)]" />

    <div class="relative z-20 flex min-h-screen flex-col px-5 py-5 md:px-8 lg:px-10">
      <header class="airport-header">
        <div class="airport-hero">
          <nav class="airport-breadcrumb" aria-label="Airport navigation">
            <button class="airport-back" @click="$emit('back')">ADSBao</button>
            <span>/</span>
            <span class="airport-breadcrumb-current">{{ airportName }}</span>
          </nav>

          <div class="airport-title-row">
            <span class="airport-code">{{ airportCodeLabel }}</span>
            <div class="airport-title-stack">
              <h1 class="airport-title">{{ airportName }}</h1>
            </div>
          </div>
        </div>
        <div class="airport-coordinates">
          <span>{{ coordinatesLabel }}</span>
        </div>
      </header>

      <div
        v-if="loading || error"
        class="glass-panel mt-4 border px-4 py-3"
        :class="error ? 'border-atc-red/40 bg-[#251011]/75' : 'border-white/10'"
      >
        <div class="panel-kicker" :class="error ? 'text-atc-red' : 'text-atc-faint'">
          {{ error ? 'Airport lookup error' : 'Refreshing airport data' }}
        </div>
        <div class="mt-1 text-[13px] font-semibold text-atc-text">
          {{ error || 'Loading airport context...' }}
        </div>
      </div>

      <div class="dashboard-updated">Updated {{ fmtUpdated(lastUpdated) }}</div>

      <div class="dashboard-tabs" role="tablist" aria-label="Dashboard panel group">
        <button
          type="button"
          role="tab"
          :aria-selected="activeDashboardTab === 'weather'"
          :class="{ active: activeDashboardTab === 'weather' }"
          @click="activeDashboardTab = 'weather'"
        >
          Weather
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeDashboardTab === 'airport'"
          :class="{ active: activeDashboardTab === 'airport' }"
          @click="activeDashboardTab = 'airport'"
        >
          Airport
        </button>
      </div>

      <main class="airport-dashboard">
        <section
          class="glass-panel raw-metar-panel"
          data-dashboard-group="weather"
          :data-active-group="activeDashboardTab === 'weather'"
        >
          <div class="panel-heading">
            <div>
              <div class="panel-kicker">Raw METAR</div>
              <h2>Observation string</h2>
            </div>
            <span class="panel-pill">{{ formatObsTime(metar?.obsTime) }}</span>
          </div>

          <div class="metar-code">
            <span v-if="metarRaw">{{ metarRaw }}</span>
            <span v-else-if="metarLoading">Loading METAR...</span>
            <span v-else>No METAR available.</span>
          </div>
          <div v-if="metarError" class="panel-error">{{ metarError }}</div>
        </section>

        <section
          class="glass-panel weather-panel"
          data-dashboard-group="weather"
          :data-active-group="activeDashboardTab === 'weather'"
        >
          <div class="panel-heading">
            <div>
              <div class="panel-kicker">Parsed weather</div>
              <h2>{{ weatherSummary }}</h2>
            </div>
          </div>

          <dl class="weather-readout">
            <div>
              <dt>Wind</dt>
              <dd>{{ metar?.wind || '—' }}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>
                <template v-if="visInfo">
                  <NumberFlow :value="visInfo.value" :suffix="visInfo.plus ? '+ SM' : ' SM'" />
                </template>
                <template v-else>{{ metar?.vis || '—' }}</template>
              </dd>
            </div>
            <div>
              <dt>Ceiling</dt>
              <dd>{{ metar?.ceiling || '—' }}</dd>
            </div>
            <div>
              <dt>Temp / Dew</dt>
              <dd>{{ metar ? `${metar.temp} / ${metar.dew}` : '—' }}</dd>
            </div>
            <div>
              <dt>Altimeter</dt>
              <dd>{{ metar?.altim || '—' }}</dd>
            </div>
            <div>
              <dt>Weather</dt>
              <dd>{{ metar?.wxString || 'None reported' }}</dd>
            </div>
          </dl>
        </section>

        <section
          class="glass-panel traffic-panel"
          data-dashboard-group="airport"
          :data-active-group="activeDashboardTab === 'airport'"
        >
          <div class="panel-heading">
            <div>
              <div class="panel-kicker">Airport traffic</div>
              <h2>Nearby aircraft</h2>
            </div>
          </div>

          <div class="traffic-counts">
            <div>
              <span>Total</span>
              <strong><NumberFlow :value="aircraft.length" /></strong>
            </div>
            <div>
              <span>Arrivals</span>
              <strong class="text-sky-300"><NumberFlow :value="trafficCounts.arrival" /></strong>
            </div>
            <div>
              <span>Departures</span>
              <strong class="text-orange-300"><NumberFlow :value="trafficCounts.departure" /></strong>
            </div>
            <div>
              <span>Unknown</span>
              <strong class="text-slate-200"><NumberFlow :value="trafficCounts.unknown" /></strong>
            </div>
          </div>
        </section>

        <section
          class="glass-panel wiki-panel"
          data-dashboard-group="airport"
          :data-active-group="activeDashboardTab === 'airport'"
        >
          <div class="panel-heading">
            <div>
              <div class="panel-kicker">Airport wiki</div>
              <h2>{{ wikiSummary?.title || airportName }}</h2>
            </div>
            <a
              v-if="wikiSummary?.url"
              class="panel-link"
              :href="wikiSummary.url"
              target="_blank"
              rel="noreferrer"
            >
              Wikipedia
            </a>
          </div>

          <p class="wiki-copy">
            <span v-if="wikiSummary?.extract">{{ wikiSummary.extract }}</span>
            <span v-else-if="wikiLoading">Loading airport introduction...</span>
            <span v-else>
              No Wikipedia summary was found for this airport. The rest of the dashboard remains live.
            </span>
          </p>

          <div class="wiki-source">
            Source: Wikipedia summary API
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import NumberFlow from '@number-flow/vue'
import AirportMap from '../map/AirportMap.vue'
import { useAircraftPositions } from '../../composables/useAircraftPositions.js'
import { useAirportWiki } from '../../composables/useAirportWiki.js'
import { useMetar } from '../../composables/useMetar.js'

const props = defineProps({
  icao: { type: String, default: '' },
  airport: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
})

defineEmits(['back'])

const activeDashboardTab = ref('weather')

const AIRPORT_FALLBACKS = {
  KLAX: { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'US' },
  KJFK: { iata: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'US' },
  KORD: { iata: 'ORD', name: "Chicago O'Hare", city: 'Chicago', country: 'US' },
  KATL: { iata: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'US' },
  KDFW: { iata: 'DFW', name: 'Dallas / Fort Worth', city: 'Dallas', country: 'US' },
  KSFO: { iata: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'US' },
  KBOS: { iata: 'BOS', name: 'Boston Logan', city: 'Boston', country: 'US' },
  KSEA: { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'US' },
  EGLL: { iata: 'LHR', name: 'London Heathrow', city: 'London', country: 'UK' },
  LFPG: { iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR' },
  EDDF: { iata: 'FRA', name: 'Frankfurt Main', city: 'Frankfurt', country: 'DE' },
  RJTT: { iata: 'HND', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP' },
}

const COORDS = {
  KLAX: [33.9425, -118.4081],
  KJFK: [40.6413, -73.7781],
  KORD: [41.9742, -87.9073],
  KATL: [33.6407, -84.4277],
  KDFW: [32.8998, -97.0403],
  KSFO: [37.6213, -122.379],
  KBOS: [42.3656, -71.0096],
  KSEA: [47.4502, -122.3088],
  EGLL: [51.4775, -0.4614],
  LFPG: [49.0097, 2.5479],
  EDDF: [50.0379, 8.5622],
  RJTT: [35.5494, 139.7798],
}

const airportFallback = computed(() => AIRPORT_FALLBACKS[props.icao?.toUpperCase()] || null)
const airportCodeLabel = computed(() => props.airport?.iata || airportFallback.value?.iata || props.icao)
const airportName = computed(() => props.airport?.name || airportFallback.value?.name || props.icao || 'Airport')
const airportLocation = computed(() => props.airport?.city || airportFallback.value?.city || '')
const airportCountry = computed(() => props.airport?.country || airportFallback.value?.country || '')

const icaoRef = computed(() => props.icao)
const { raw: metarRaw, parsed: metar, loading: metarLoading, error: metarError } = useMetar(icaoRef)

const airportLat = computed(() => COORDS[props.icao]?.[0] || props.airport?.lat || 0)
const airportLon = computed(() => COORDS[props.icao]?.[1] || props.airport?.lon || 0)

const latRef = computed(() => airportLat.value)
const lonRef = computed(() => airportLon.value)
const { aircraft, lastUpdated } = useAircraftPositions(icaoRef, latRef, lonRef)

const wikiAirport = computed(() => ({
  name: airportName.value,
  icao: props.airport?.icao || props.icao,
  iata: airportCodeLabel.value,
}))
const { summary: wikiSummary, loading: wikiLoading } = useAirportWiki(wikiAirport)

const coordinatesLabel = computed(() => {
  if (!airportLat.value || !airportLon.value) return 'Coordinates pending'
  const lat = `${Math.abs(airportLat.value).toFixed(2)} ${airportLat.value >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(airportLon.value).toFixed(2)} ${airportLon.value >= 0 ? 'E' : 'W'}`
  return `${lat} / ${lon}`
})

const trafficCounts = computed(() => aircraft.value.reduce((counts, item) => {
  const intent = item.trafficIntent === 'arrival' || item.trafficIntent === 'departure'
    ? item.trafficIntent
    : 'unknown'
  counts[intent] += 1
  return counts
}, { arrival: 0, departure: 0, unknown: 0 }))

const weatherSummary = computed(() => {
  if (!metar.value) return 'Weather report pending'
  const category = metar.value.flightCategory || 'Observed'
  const wind = metar.value.wind && metar.value.wind !== '—' ? metar.value.wind : 'wind unavailable'
  return `${category} · ${wind}`
})

const visInfo = computed(() => {
  const raw = metar.value?.vis
  const match = raw?.match(/^(\d+(?:\.\d+)?)(\+)?\s*SM$/)
  if (!match) return null

  return {
    value: Number(match[1]),
    plus: Boolean(match[2]),
  }
})

const fmtUpdated = (date) => {
  if (!date) return '—'
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatObsTime = (value) => {
  if (!value) return 'latest'
  const date = new Date(Number(value) < 10_000_000_000 ? Number(value) * 1000 : value)
  if (Number.isNaN(date.getTime())) return 'latest'
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
}

</script>

<style scoped>
.airport-header {
  align-items: flex-start;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  min-height: clamp(170px, 22vh, 238px);
}

.airport-hero {
  min-width: 0;
  padding-top: 4px;
}

.airport-breadcrumb {
  align-items: center;
  color: var(--atc-faint);
  display: flex;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  gap: 10px;
  letter-spacing: 1.2px;
  line-height: 1;
  max-width: min(760px, 72vw);
  text-transform: uppercase;
}

.airport-back,
.airport-breadcrumb-current {
  min-width: 0;
}

.airport-back {
  background: transparent;
  border: 0;
  color: var(--atc-text);
  cursor: pointer;
  flex-shrink: 0;
  font: inherit;
  letter-spacing: inherit;
  padding: 0;
  text-transform: uppercase;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.airport-back:hover {
  color: var(--atc-orange);
}

.airport-breadcrumb-current {
  color: var(--atc-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.airport-coordinates,
.panel-kicker,
.panel-pill,
.panel-link,
.wiki-source {
  font-family: 'JetBrains Mono', monospace;
}

.airport-code {
  color: var(--atc-orange);
  flex-shrink: 0;
  font-family: 'Instrument Serif', serif;
  font-size: clamp(68px, 8.5vw, 126px);
  font-style: italic;
  line-height: 0.78;
  text-shadow: 0 24px 60px rgba(255, 90, 31, 0.24);
}

.airport-title-row {
  align-items: center;
  display: grid;
  gap: 10px 24px;
  grid-template-columns: auto minmax(0, 1fr);
  margin-top: clamp(34px, 5vh, 56px);
  max-width: min(1240px, calc(100vw - 140px));
}

.airport-title-stack {
  min-width: 0;
  position: relative;
}

.airport-title-stack::before {
  background: linear-gradient(90deg, rgba(255, 90, 31, 0.62), rgba(255, 255, 255, 0.04));
  content: '';
  height: 1px;
  left: 0;
  position: absolute;
  top: -15px;
  width: min(420px, 58vw);
}

.airport-title {
  color: var(--atc-text);
  font-size: clamp(34px, 4.7vw, 66px);
  font-weight: 800;
  letter-spacing: -0.055em;
  line-height: 0.92;
  margin: 0;
  max-width: 1120px;
  text-wrap: balance;
}

.airport-coordinates {
  color: var(--atc-dim);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  font-size: 11px;
  gap: 5px;
  letter-spacing: 0.6px;
  line-height: 1;
  padding-top: 4px;
  text-align: right;
  text-transform: uppercase;
}

.dashboard-updated {
  color: var(--atc-dim);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.4px;
  margin-top: auto;
  padding-bottom: 10px;
  text-align: center;
  text-transform: uppercase;
}

.dashboard-tabs {
  display: none;
  margin: 0 auto 10px;
  width: min(75vw, 1280px);
}

.dashboard-tabs button {
  background: rgba(14, 15, 18, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--atc-faint);
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  line-height: 1;
  min-height: 34px;
  padding: 0 14px;
  text-transform: uppercase;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.dashboard-tabs button:first-child {
  border-radius: 999px 0 0 999px;
}

.dashboard-tabs button:last-child {
  border-left: 0;
  border-radius: 0 999px 999px 0;
}

.dashboard-tabs button.active {
  background: rgba(255, 90, 31, 0.16);
  border-color: rgba(255, 90, 31, 0.42);
  color: var(--atc-text);
}

.airport-dashboard {
  align-items: stretch;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-inline: auto;
  padding-bottom: 16px;
  width: min(75vw, 1280px);
}

.glass-panel {
  background: linear-gradient(145deg, rgba(32, 34, 39, 0.78), rgba(16, 17, 21, 0.66));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  max-height: 250px;
  min-width: 0;
  overflow: hidden;
  padding: 16px;
  position: relative;
  backdrop-filter: blur(20px) saturate(145%);
  -webkit-backdrop-filter: blur(20px) saturate(145%);
}

.glass-panel::before {
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 44%);
  content: '';
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.panel-heading {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  position: relative;
}

.panel-heading h2 {
  color: var(--atc-text);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.15;
  margin: 4px 0 0;
}

.panel-kicker {
  color: var(--atc-faint);
  font-size: 10px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.panel-pill,
.panel-link {
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 999px;
  color: var(--atc-dim);
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 1px;
  padding: 5px 9px;
  text-decoration: none;
  text-transform: uppercase;
}

.metar-code {
  color: var(--atc-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(14px, 1.25vw, 20px);
  font-weight: 800;
  line-height: 1.3;
  margin-top: 16px;
  max-height: 142px;
  overflow: auto;
  white-space: pre-wrap;
}

.panel-error {
  color: var(--atc-red);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.8px;
  margin-top: 10px;
  text-transform: uppercase;
}

.weather-readout {
  display: grid;
  gap: 8px 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 16px 0 0;
}

.weather-readout div {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 9px;
}

.weather-readout dt,
.traffic-counts span {
  color: var(--atc-faint);
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.weather-readout dd {
  color: var(--atc-text);
  display: block;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.18;
  margin: 7px 0 0;
}

.traffic-counts {
  display: grid;
  gap: 12px 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 18px;
}

.traffic-counts > div {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
}

.traffic-counts strong {
  display: block;
  font-size: 30px;
  line-height: 1;
  margin-top: 9px;
}

.wiki-copy {
  color: rgba(245, 245, 247, 0.82);
  font-size: 14px;
  line-height: 1.55;
  margin: 14px 0 0;
  max-height: 132px;
  overflow: auto;
  position: relative;
}

.wiki-source {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--atc-faint);
  font-size: 10px;
  letter-spacing: 1px;
  margin-top: 20px;
  padding-top: 12px;
  text-transform: uppercase;
}

@media (max-width: 1180px) {
  .airport-dashboard {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: min(75vw, 960px);
  }

  .traffic-panel {
    display: none;
  }
}

@media (max-width: 980px) {
  .airport-header {
    flex-direction: column;
    gap: 14px;
  }

  .airport-breadcrumb {
    max-width: calc(100vw - 40px);
  }

  .airport-title-row {
    max-width: calc(100vw - 40px);
  }

  .airport-coordinates {
    flex-direction: row;
    justify-content: space-between;
    padding-top: 0;
    text-align: left;
    width: 100%;
  }

  .airport-dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 75vw;
  }

  .dashboard-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 75vw;
  }

  .airport-dashboard > [data-dashboard-group] {
    display: none;
  }

  .airport-dashboard > [data-active-group="true"] {
    display: block;
  }

  .glass-panel {
    max-height: none;
  }

  .wiki-panel,
  .weather-panel {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .airport-dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .airport-header {
    min-height: auto;
  }

  .airport-title-row {
    align-items: start;
    grid-template-columns: 1fr;
    margin-top: 28px;
  }

  .airport-code {
    font-size: 58px;
  }

  .airport-title {
    font-size: 34px;
    letter-spacing: -0.04em;
  }

  .airport-title-stack::before {
    top: -12px;
    width: 180px;
  }

  .airport-dashboard {
    grid-template-columns: 1fr;
    padding-bottom: 18px;
  }

  .wiki-panel {
    grid-column: 1;
  }

  .glass-panel {
    border-radius: 18px;
    padding: 16px;
  }

  .wiki-copy {
    max-height: 138px;
  }
}
</style>
