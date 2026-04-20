<template>
  <div class="flex flex-col min-h-screen bg-atc-bg text-atc-text font-sans overflow-y-auto">
    <TopBar :screen="`AIRPORT · ${airport?.icao || icao}`" :on-back="() => $emit('back')" />

    <!-- MASTHEAD: info left, map right -->
    <section class="grid gap-12 items-start px-14 pt-12 pb-9 border-b border-atc-line"
             style="grid-template-columns:1fr auto;background:radial-gradient(ellipse at 90% 0%, rgba(255,90,31,0.08), transparent 50%), #0a0a0b">
      <!-- Left -->
      <div class="min-w-0">
        <div class="flex gap-2.5 items-center font-mono text-[13px] text-atc-dim tracking-[0.5px] uppercase mb-5">
          <span class="cursor-pointer hover:text-atc-text transition-colors" @click="$emit('back')">Airports</span>
          <span class="text-atc-faint">/</span>
          <span>{{ airport?.country || '—' }}</span>
          <span class="text-atc-faint">/</span>
          <span class="text-atc-orange">{{ airport?.icao || icao }}</span>
        </div>

        <h1 class="flex items-baseline gap-4 m-0 leading-none">
          <span class="font-display italic text-atc-orange" style="font-size:120px;letter-spacing:-3px;line-height:1">
            {{ airport?.iata || icao }}
          </span>
          <span class="font-sans font-bold text-[48px] text-atc-text" style="letter-spacing:-1.5px">
            {{ airport?.name || 'Loading…' }}
          </span>
        </h1>
        <div class="mt-4 font-mono text-[14px] text-atc-dim tracking-[0.3px]">
          {{ airport?.city }}<span v-if="airport?.country"> · {{ airport.country }}</span>
          <span v-if="airport?.lat"> · {{ airport.lat }}</span>
          <span v-if="airport?.lon"> / {{ airport.lon }}</span>
        </div>

        <!-- KPI strip -->
        <div class="mt-8 grid border border-atc-line rounded-xl overflow-hidden"
             style="grid-template-columns:repeat(6,1fr);gap:1px;background:rgba(255,255,255,0.08)">
          <!-- WIND: animate speed number -->
          <KPICell label="WIND">
            <div class="font-mono text-[13px] font-semibold text-atc-text" style="letter-spacing:-0.1px">
              <template v-if="metar?.rawWspd != null">
                {{ metar.rawWvrb ? 'VRB' : String(metar.rawWdir ?? 0).padStart(3,'0') + '°' }} /
                <NumberFlow :value="metar.rawWspd" suffix=" kt" />
                <template v-if="metar.rawWgst"> G<NumberFlow :value="metar.rawWgst" suffix="kt" /></template>
              </template>
              <template v-else>{{ metar?.wind || '—' }}</template>
            </div>
          </KPICell>
          <!-- VIS: animate number -->
          <KPICell label="VIS">
            <div class="font-mono text-[13px] font-semibold text-atc-text" style="letter-spacing:-0.1px">
              <NumberFlow v-if="metar?.rawVisib != null" :value="metar.rawVisib" suffix=" SM" />
              <span v-else>{{ metar?.vis || '—' }}</span>
            </div>
          </KPICell>
          <KPICell label="CEILING"   :value="metar?.ceiling || '—'" />
          <!-- TEMP · DEW: animate both numbers -->
          <KPICell label="TEMP · DEW">
            <div class="font-mono text-[13px] font-semibold text-atc-text" style="letter-spacing:-0.1px">
              <template v-if="metar?.rawTemp != null">
                <NumberFlow :value="metar.rawTemp" suffix="°C" />
                <span class="text-atc-faint"> / </span>
                <NumberFlow :value="metar.rawDewp ?? 0" suffix="°C" />
              </template>
              <span v-else>{{ metar ? `${metar.temp} / ${metar.dew}` : '—' }}</span>
            </div>
          </KPICell>
          <!-- ALTIM: animate decimal number -->
          <KPICell label="ALTIM">
            <div class="font-mono text-[13px] font-semibold text-atc-text" style="letter-spacing:-0.1px">
              <NumberFlow v-if="metar?.rawAltim != null" :value="metar.rawAltim" :format="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" suffix=" inHg" />
              <span v-else>{{ metar?.altim || '—' }}</span>
            </div>
          </KPICell>
          <KPICell label="STATUS"    :value="channels?.length ? `${channels.length} feeds` : '—'" accent />
        </div>
      </div>

      <!-- Right: Map -->
      <div class="w-[580px] flex-shrink-0 p-2.5 bg-atc-card border border-atc-line rounded-2xl">
        <div class="flex items-center justify-between px-2.5 pb-3.5">
          <div class="inline-flex items-center gap-2 font-mono text-[11px] tracking-[1.5px] text-atc-dim uppercase">
            <span class="w-1.5 h-1.5 rounded-full bg-atc-orange flex-shrink-0" style="box-shadow:0 0 8px #FF5A1F" />
            MAP · {{ airport?.icao || icao }}
          </div>
          <div class="flex gap-0.5 bg-atc-elev p-0.5 rounded-lg border border-atc-line">
            <button v-for="tab in ['Airport','Approach','Region']" :key="tab"
              class="px-3 py-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer"
              :class="mapTab === tab ? 'bg-atc-high text-atc-text' : 'bg-transparent text-atc-dim hover:text-atc-text'"
              @click="mapTab = tab">{{ tab }}</button>
          </div>
        </div>
        <AirportMap
          :icao="airport?.icao || icao"
          :lat="airportLat"
          :lon="airportLon"
          :height="340"
          accent="#FF5A1F"
          :aircraft="aircraft"
        />
        <div class="flex items-center gap-2 pt-3 px-2.5 pb-1 font-mono text-[11px] text-atc-dim tracking-[0.3px]">
          <span>{{ aircraft.length }} aircraft on frequency</span>
          <span class="text-atc-faint">·</span>
          <span>Zoom 13</span>
          <span v-if="airportLat" class="text-atc-faint">· {{ airportLat.toFixed(2) }}°N {{ Math.abs(airportLon).toFixed(2) }}°W</span>
          <span class="flex-1" />
          <button class="w-6 h-6 rounded bg-atc-elev border border-atc-line text-atc-text text-sm cursor-pointer grid place-items-center">+</button>
          <button class="w-6 h-6 rounded bg-atc-elev border border-atc-line text-atc-text text-sm cursor-pointer grid place-items-center">−</button>
        </div>
      </div>
    </section>

    <!-- METAR strip -->
    <section class="flex items-center gap-4 px-14 py-3.5 bg-atc-card border-b border-atc-line">
      <div class="inline-flex items-center gap-2 font-mono text-[11px] text-atc-dim tracking-[1px] uppercase flex-shrink-0">
        <span class="w-[7px] h-[7px] rounded-full bg-atc-orange flex-shrink-0" style="box-shadow:0 0 8px #FF5A1F" />
        METAR
      </div>
      <div v-if="metarLoading" class="flex-1 font-mono text-[13px] text-atc-faint animate-pulse tracking-[0.4px]">
        Fetching weather data…
      </div>
      <div v-else class="flex-1 font-mono text-[13px] text-atc-text tracking-[0.4px] truncate">
        {{ rawMetar || 'No METAR available' }}
      </div>
      <button class="px-3.5 py-1.5 rounded-full border border-atc-line-strong text-atc-text text-[12px] cursor-pointer bg-transparent hover:bg-atc-high transition-colors font-sans">
        Decode
      </button>
    </section>

    <!-- BODY: full-width feed list -->
    <section class="px-14 py-12">
      <div class="flex justify-between items-end mb-5 pb-4 border-b border-atc-line">
        <div>
          <div class="font-mono text-[11px] text-atc-faint tracking-[1.5px] uppercase mb-2">
            ATC FREQUENCIES · {{ channels?.length || 0 }}
          </div>
          <h2 class="text-[32px] font-bold m-0" style="letter-spacing:-0.8px">
            Active <em class="font-display italic font-normal text-atc-orange not-italic" style="letter-spacing:-0.3px">feeds</em>
            at {{ airport?.icao || icao }}
          </h2>
        </div>
        <div class="flex gap-1 bg-atc-card p-1 rounded-xl border border-atc-line">
          <button v-for="t in feedTabs" :key="t"
            @click="feedFilter = t"
            class="px-3.5 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors"
            :class="feedFilter === t ? 'bg-atc-high text-atc-text' : 'bg-transparent text-atc-dim'">
            {{ t }}
          </button>
        </div>
      </div>

      <div v-if="!channels?.length" class="flex items-center justify-center py-16">
        <div class="font-mono text-[12px] text-atc-faint text-center">
          <div class="animate-pulse mb-2">LOADING FEEDS…</div>
          <div class="text-[10px] tracking-widest">Connecting to LiveATC</div>
        </div>
      </div>

      <div v-else class="flex flex-col gap-1.5">
        <FeedRow
          v-for="(ch, i) in filteredChannels"
          :key="ch.id"
          :feed="ch"
          :index="i"
          :selected="ch.id === selectedFeedId"
          @select="selectedFeedId = ch.id"
          @listen="openTranscript(ch)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import NumberFlow from '@number-flow/vue'
import TopBar from '../ui/TopBar.vue'
import AirportMap from '../map/AirportMap.vue'
import FeedRow from '../ui/FeedRow.vue'
import KPICell from '../ui/KPICell.vue'
import { useMetar } from '../../composables/useMetar.js'
import { useAircraftPositions } from '../../composables/useAircraftPositions.js'

const props = defineProps({
  icao:            { type: String, default: '' },
  airport:         { type: Object, default: null },
  channels:        { type: Array,  default: () => [] },
  activeChannelId: { type: String, default: null },
})

const emit = defineEmits(['back', 'open-transcript'])

const selectedFeedId = ref(props.channels?.[0]?.id || null)
const mapTab   = ref('Airport')
const feedTabs = ['All', 'Tower', 'Ground', 'Approach', 'Center']
const feedFilter = ref('All')

const filteredChannels = computed(() => {
  if (feedFilter.value === 'All') return props.channels
  const kw = feedFilter.value.toLowerCase()
  return props.channels.filter(c => c.name?.toLowerCase().includes(kw))
})

// METAR
const icaoRef = computed(() => props.icao)
const { raw: rawMetar, parsed: metar, loading: metarLoading } = useMetar(icaoRef)

// Known coords lookup
const COORDS = {
  KLAX: [33.9425, -118.4081], KJFK: [40.6413, -73.7781], KORD: [41.9742, -87.9073],
  KATL: [33.6407, -84.4277],  KDFW: [32.8998, -97.0403], KSFO: [37.6213, -122.379],
  KBOS: [42.3656, -71.0096],  KSEA: [47.4502, -122.3088], EGLL: [51.4775, -0.4614],
  LFPG: [49.0097, 2.5479],    EDDF: [50.0379, 8.5622],   RJTT: [35.5494, 139.7798],
}
const airportLat = computed(() => COORDS[props.icao]?.[0] || props.airport?.lat || 0)
const airportLon = computed(() => COORDS[props.icao]?.[1] || props.airport?.lon || 0)

// Aircraft positions
const latRef = computed(() => airportLat.value)
const lonRef = computed(() => airportLon.value)
const { aircraft } = useAircraftPositions(icaoRef, latRef, lonRef)

const openTranscript = (ch) => emit('open-transcript', ch)
</script>
