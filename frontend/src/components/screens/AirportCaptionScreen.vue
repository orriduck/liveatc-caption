<template>
  <div class="relative flex h-screen flex-col overflow-hidden bg-atc-bg font-sans text-atc-text">
    <section
      class="absolute inset-x-0 top-0 z-20 px-10 pt-4 pb-10 pointer-events-none"
      style="background:linear-gradient(to bottom, rgba(10,10,11,0.98) 0%, rgba(10,10,11,0.88) 58%, rgba(10,10,11,0) 100%)"
    >
      <div class="mb-3 flex items-center gap-4 pointer-events-auto">
        <button
          class="flex flex-shrink-0 items-center gap-1.5 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[0.5px] text-atc-dim transition-colors hover:text-atc-text"
          @click="$emit('back')"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Airports
        </button>
        <span class="font-mono text-[11px] text-atc-faint">/</span>
        <span class="font-mono text-[11px] uppercase tracking-[0.5px] text-atc-dim">{{ airport?.country || '—' }}</span>
        <span class="font-mono text-[11px] text-atc-faint">/</span>
        <span class="font-mono text-[11px] uppercase tracking-[0.5px] text-atc-orange">{{ airport?.icao || icao }}</span>

        <div class="ml-2 flex min-w-0 flex-1 items-baseline gap-3">
          <span class="font-display italic text-atc-orange flex-shrink-0" style="font-size:44px;letter-spacing:-1.5px;line-height:1">
            {{ airportCodeLabel }}
          </span>
          <span class="truncate font-sans text-[22px] font-bold text-atc-text" style="letter-spacing:-0.5px">
            {{ airportName }}
          </span>
          <span class="flex-shrink-0 font-mono text-[12px] tracking-[0.3px] text-atc-dim">
            {{ airportLocation }}<span v-if="airportLocation && airportCountry"> · {{ airportCountry }}</span>
          </span>
        </div>
      </div>

      <div
        class="grid overflow-hidden rounded-xl border border-atc-line pointer-events-auto"
        style="grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(255,255,255,0.07)"
      >
        <KPICell label="WIND">
          <div class="kpi-value">
            <template v-if="metar?.rawWspd != null">
              <NumberFlow
                v-if="metar.rawWdir != null"
                class="kpi-number-flow"
                :value="metar.rawWdir"
                :format="{ minimumIntegerDigits: 3 }"
                suffix="°"
              />
              <span v-else class="kpi-unit">VRB</span>
              <span class="kpi-unit px-1.5">/</span>
              <NumberFlow class="kpi-number-flow" :value="metar.rawWspd" suffix=" kt" />
              <template v-if="metar.rawWgst">
                <span class="kpi-unit pl-1">G</span>
                <NumberFlow class="kpi-number-flow" :value="metar.rawWgst" suffix="kt" />
              </template>
            </template>
            <template v-else>{{ metar?.wind || '—' }}</template>
          </div>
        </KPICell>
        <KPICell label="VIS">
          <div class="kpi-value">
            <template v-if="visInfo">
              <NumberFlow class="kpi-number-flow" :value="visInfo.value" :suffix="visInfo.plus ? '+' : ''" />
              <span class="kpi-unit pl-1.5">SM</span>
            </template>
            <span v-else>{{ metar?.vis || '—' }}</span>
          </div>
        </KPICell>
        <KPICell label="CEILING">
          <div class="kpi-value">
            <template v-if="ceilingInfo">
              <span class="kpi-unit pr-1.5">{{ ceilingInfo.cover }}</span>
              <NumberFlow
                class="kpi-number-flow"
                :value="ceilingInfo.base"
                :format="{ maximumFractionDigits: 0 }"
                suffix=" ft"
              />
            </template>
            <span v-else>{{ metar?.ceiling || '—' }}</span>
          </div>
        </KPICell>
        <KPICell label="TEMP · DEW">
          <div class="kpi-value">
            <template v-if="metar?.rawTemp != null">
              <NumberFlow class="kpi-number-flow" :value="metar.rawTemp" suffix="°C" />
              <span class="kpi-unit px-1.5">/</span>
              <NumberFlow class="kpi-number-flow" :value="metar.rawDewp ?? 0" suffix="°C" />
            </template>
            <span v-else>{{ metar ? `${metar.temp} / ${metar.dew}` : '—' }}</span>
          </div>
        </KPICell>
        <KPICell label="ALTIM">
          <div class="kpi-value">
            <NumberFlow
              v-if="metar?.rawAltim != null"
              class="kpi-number-flow"
              :value="metar.rawAltim"
              :format="{ maximumFractionDigits: 0 }"
              suffix=" inHg"
            />
            <span v-else>{{ metar?.altim || '—' }}</span>
          </div>
        </KPICell>
      </div>
    </section>

    <div class="relative flex-1 min-h-0">
      <div class="absolute inset-0" style="z-index:0">
        <AirportMap
          :icao="airport?.icao || icao"
          :lat="airportLat"
          :lon="airportLon"
          accent="#FF5A1F"
          :aircraft="aircraft"
        />
      </div>

      <div class="absolute bottom-8 left-1/2 z-10 w-[min(88vw,780px)] -translate-x-1/2">
        <div
          v-if="loading || error"
          class="mb-3 rounded-2xl border px-4 py-3 backdrop-blur-xl"
          :class="error ? 'border-atc-red/40 bg-[#251011]/85' : 'border-white/10 bg-[#111214]/82'"
        >
          <div class="font-mono text-[10px] uppercase tracking-[1.4px]" :class="error ? 'text-atc-red' : 'text-atc-faint'">
            {{ error ? 'Airport lookup error' : 'Refreshing airport data' }}
          </div>
          <div class="mt-1 text-[13px] font-semibold text-atc-text">
            {{ error || 'Loading airport context…' }}
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.9fr)]">
          <section class="rounded-[28px] border border-white/10 bg-[#101113]/82 px-5 py-4 backdrop-blur-xl shadow-2xl">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint">Airport Explorer</div>
                <div class="mt-1 text-[18px] font-bold text-atc-text">{{ airportName }}</div>
              </div>
              <div class="text-right font-mono text-[11px] text-atc-dim">
                <div>{{ aircraft.length }} aircraft</div>
                <div class="mt-1">Updated {{ fmtUpdated(lastUpdated) }}</div>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                <div class="font-mono text-[10px] uppercase tracking-[1.4px] text-atc-faint">ICAO</div>
                <div class="mt-1 text-[16px] font-bold">{{ airport?.icao || icao || '—' }}</div>
              </div>
              <div class="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                <div class="font-mono text-[10px] uppercase tracking-[1.4px] text-atc-faint">City</div>
                <div class="mt-1 text-[16px] font-bold">{{ airportLocation || '—' }}</div>
              </div>
              <div class="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                <div class="font-mono text-[10px] uppercase tracking-[1.4px] text-atc-faint">Country</div>
                <div class="mt-1 text-[16px] font-bold">{{ airportCountry || '—' }}</div>
              </div>
            </div>
          </section>

          <section class="rounded-[28px] border border-white/10 bg-[#101113]/82 px-5 py-4 backdrop-blur-xl shadow-2xl">
            <div class="font-mono text-[10px] uppercase tracking-[1.6px] text-atc-faint">Map Context</div>
            <p class="mt-2 text-[13px] leading-relaxed text-atc-dim">
              This view now focuses on airport weather and nearby traffic. Live audio, feed presets, and automatic
              caption playback have been removed from the frontend.
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[1.2px] text-atc-dim">
              <span class="rounded-full border border-white/10 px-3 py-1">METAR</span>
              <span class="rounded-full border border-white/10 px-3 py-1">Traffic map</span>
              <span class="rounded-full border border-white/10 px-3 py-1">Airport reference</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import NumberFlow from '@number-flow/vue'
import AirportMap from '../map/AirportMap.vue'
import KPICell from '../ui/KPICell.vue'
import { useAircraftPositions } from '../../composables/useAircraftPositions.js'
import { useMetar } from '../../composables/useMetar.js'

const props = defineProps({
  icao: { type: String, default: '' },
  airport: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
})

defineEmits(['back'])

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
const { parsed: metar } = useMetar(icaoRef)

const airportLat = computed(() => COORDS[props.icao]?.[0] || props.airport?.lat || 0)
const airportLon = computed(() => COORDS[props.icao]?.[1] || props.airport?.lon || 0)

const latRef = computed(() => airportLat.value)
const lonRef = computed(() => airportLon.value)
const { aircraft, lastUpdated } = useAircraftPositions(icaoRef, latRef, lonRef)

const fmtUpdated = (date) => {
  if (!date) return '—'
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const ceilingInfo = computed(() => {
  const match = metar.value?.ceiling?.match(/^([A-Z]+)\s+([\d,]+)\s+ft$/)
  if (!match) return null

  return {
    cover: match[1],
    base: Number(match[2].replaceAll(',', '')),
  }
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
</script>

<style scoped>
.kpi-value {
  align-items: baseline;
  color: var(--atc-text);
  display: flex;
  flex-wrap: wrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.05;
  min-width: 0;
}

.kpi-number-flow {
  font-variant-numeric: tabular-nums;
  line-height: 0.9;
}

.kpi-number-flow::part(suffix),
.kpi-unit {
  color: var(--atc-dim);
  font-size: 0.58em;
  font-weight: 700;
  line-height: 1;
}
</style>
