<template>
  <div class="flex flex-col min-h-screen bg-atc-bg text-atc-text font-sans overflow-y-auto">
    <TopBar :screen="`AIRPORT · ${airport?.icao || icao}`" :on-back="() => $emit('back')" />

    <!-- MASTHEAD -->
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
          {{ airport?.city }} · {{ airport?.country }}
          <span v-if="airport?.lat"> · {{ airport.lat }}</span>
          <span v-if="airport?.lon"> / {{ airport.lon }}</span>
        </div>

        <!-- KPI strip -->
        <div class="mt-8 grid border border-atc-line rounded-xl overflow-hidden"
             style="grid-template-columns:repeat(6,1fr);gap:1px;background:rgba(255,255,255,0.08)">
          <KPICell label="WIND"      :value="metar?.wind    || '—'" />
          <KPICell label="VIS"       :value="metar?.vis     || '—'" />
          <KPICell label="CEILING"   :value="metar?.ceiling || '—'" />
          <KPICell label="TEMP · DEW" :value="metar ? `${metar.temp} / ${metar.dew}` : '—'" />
          <KPICell label="ALTIM"     :value="metar?.altim   || '—'" />
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

    <!-- BODY: feeds + sidebar -->
    <section class="grid gap-8 px-14 py-12" style="grid-template-columns:1fr 360px">
      <!-- Feed list -->
      <div>
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
      </div>

      <!-- Sidebar -->
      <aside class="flex flex-col gap-3.5">
        <!-- In-place player card -->
        <div class="p-6 rounded-2xl relative overflow-hidden text-white"
             style="background:linear-gradient(160deg, #FF5A1F 0%, #c23a0a 70%, #8a2a06 100%)">
          <div class="inline-flex items-center gap-2 font-mono text-[11px] tracking-[1.5px] uppercase opacity-80 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot" />
            {{ selectedChannel?.id === activeChannelId ? 'NOW PLAYING' : 'SELECTED FEED' }}
          </div>
          <div class="text-[22px] font-semibold leading-tight mb-4" style="letter-spacing:-0.4px">
            {{ selectedChannel?.name || 'Select a feed' }}
          </div>
          <div class="font-display italic text-[56px] leading-none flex items-baseline gap-2.5 mb-4" style="letter-spacing:-1px">
            {{ selectedChannel?.freq || '—' }}
            <span class="font-mono text-[14px] not-italic tracking-[2px] opacity-80">MHz</span>
          </div>

          <!-- Mini waveform -->
          <div class="flex gap-[2px] items-center h-11 mb-3">
            <span v-for="(env, i) in waveEnv" :key="i"
              class="flex-1 rounded-sm"
              :style="{
                height: `${env * 100}%`,
                background: 'rgba(10,10,11,0.35)',
                animation: isPlaying ? `wv ${0.5 + (i % 7) * 0.08}s ease-in-out ${i * 0.015}s infinite alternate` : 'none',
                transformOrigin: 'bottom',
              }"
            />
          </div>

          <!-- Transport -->
          <div class="flex items-center gap-3.5 pb-4 border-b border-white/20 mb-4">
            <button @click="$emit('toggle-play')"
              class="w-12 h-12 rounded-full bg-atc-bg text-white border-none grid place-items-center cursor-pointer">
              <svg v-if="isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </button>
            <div class="font-mono text-white">
              <div class="text-[18px] font-semibold">{{ elapsed }}</div>
              <div class="text-[10px] tracking-[1.5px] opacity-70">ELAPSED</div>
            </div>
            <div class="flex-1" />
            <button class="w-8 h-8 rounded-full bg-black/25 border border-white/25 grid place-items-center cursor-pointer text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            </button>
          </div>

          <!-- Meta grid -->
          <div class="grid grid-cols-2 gap-2.5 font-mono text-[12px] tracking-[0.3px] mb-5">
            <div><span class="opacity-60 block text-[10px] uppercase tracking-[1px] mb-0.5">LISTENERS</span><b>{{ selectedChannel?.listeners || 0 }}</b></div>
            <div><span class="opacity-60 block text-[10px] uppercase tracking-[1px] mb-0.5">BITRATE</span><b>24 kbps</b></div>
            <div><span class="opacity-60 block text-[10px] uppercase tracking-[1px] mb-0.5">CODEC</span><b>MP3</b></div>
            <div><span class="opacity-60 block text-[10px] uppercase tracking-[1px] mb-0.5">STATUS</span><b>{{ selectedChannel?.status || 'UP' }}</b></div>
          </div>

          <button @click="selectedChannel && openTranscript(selectedChannel)"
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-atc-bg text-white border-none text-[14px] font-semibold cursor-pointer font-sans">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h16"/></svg>
            Open with captions
          </button>
        </div>

        <!-- Traffic summary -->
        <div class="p-5 rounded-2xl bg-atc-card border border-atc-line">
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-2">TRAFFIC · LAST 30 MIN</div>
          <div class="font-display italic text-[44px] leading-none mb-4" style="letter-spacing:-1px">
            {{ aircraft.length + 12 }} <span class="font-sans not-italic text-[13px] text-atc-dim font-medium" style="letter-spacing:0">movements</span>
          </div>
          <div class="flex gap-0.5 h-14 items-end">
            <span v-for="(v, i) in trafficBars" :key="i"
              class="flex-1 rounded-sm"
              :style="{ height:`${v*100}%`, background: i > 10 ? 'var(--atc-orange)' : 'rgba(255,255,255,0.3)' }"
            />
          </div>
          <div class="flex justify-between font-mono text-[10px] text-atc-faint tracking-[0.5px] mt-2.5">
            <span>−30m</span><span>now</span>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TopBar from '../ui/TopBar.vue'
import AirportMap from '../map/AirportMap.vue'
import FeedRow from '../ui/FeedRow.vue'
import KPICell from '../ui/KPICell.vue'
import { useMetar } from '../../composables/useMetar.js'
import { useAircraftPositions } from '../../composables/useAircraftPositions.js'

const props = defineProps({
  icao:          { type: String, default: '' },
  airport:       { type: Object, default: null },
  channels:      { type: Array,  default: () => [] },
  activeChannelId: { type: String, default: null },
  isPlaying:     { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'open-transcript', 'toggle-play'])

const selectedFeedId = ref(props.channels?.[0]?.id || null)
const mapTab   = ref('Airport')
const feedTabs = ['All', 'Tower', 'Ground', 'Approach', 'Center']
const feedFilter = ref('All')

const selectedChannel = computed(() =>
  props.channels?.find(c => c.id === selectedFeedId.value) || props.channels?.[0] || null
)

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
  KBOS: [42.3656, -71.0096],  KSEA: [47.4502, -122.3088],EGLL: [51.4775, -0.4614],
  LFPG: [49.0097, 2.5479],    EDDF: [50.0379, 8.5622],   RJTT: [35.5494, 139.7798],
}
const airportLat = computed(() => COORDS[props.icao]?.[0] || props.airport?.lat || 0)
const airportLon = computed(() => COORDS[props.icao]?.[1] || props.airport?.lon || 0)

// Aircraft positions
const latRef = computed(() => airportLat.value)
const lonRef = computed(() => airportLon.value)
const { aircraft } = useAircraftPositions(icaoRef, latRef, lonRef)

// Elapsed timer
const elapsed = ref('00:00')
let elapsedTimer = null
const startMs = ref(Date.now())
watch(() => props.isPlaying, (v) => {
  if (v) { startMs.value = Date.now(); elapsedTimer = setInterval(tick, 1000) }
  else   { clearInterval(elapsedTimer); elapsed.value = '00:00' }
})
const tick = () => {
  const s = Math.floor((Date.now() - startMs.value) / 1000)
  const m = Math.floor(s / 60)
  elapsed.value = `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

// Static decoration data
const waveEnv = Array.from({ length: 48 }, (_, i) =>
  0.2 + Math.abs(Math.sin(i * 0.3) + Math.sin(i * 0.55) * 0.4) * 0.8
)
const trafficBars = [0.4,0.6,0.3,0.8,0.9,0.7,1.0,0.8,0.6,0.9,0.7,0.5,0.8,1.0,0.9]

const openTranscript = (ch) => emit('open-transcript', ch)
</script>
