<template>
  <div class="flex flex-col h-screen bg-atc-bg text-atc-text font-sans overflow-hidden">

    <!-- ─── MASTHEAD ─────────────────────────────────────────────────────── -->
    <section
      class="flex-shrink-0 px-10 pt-7 pb-5 border-b border-atc-line"
      style="background:radial-gradient(ellipse at 90% 0%, rgba(255,90,31,0.07), transparent 45%), #0a0a0b"
    >
      <!-- Breadcrumb / back -->
      <div class="flex gap-2.5 items-center font-mono text-[12px] text-atc-dim tracking-[0.5px] uppercase mb-4">
        <button
          class="flex items-center gap-1.5 hover:text-atc-text transition-colors cursor-pointer bg-transparent border-none p-0 font-mono text-[12px] tracking-[0.5px] uppercase text-atc-dim"
          @click="$emit('back')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Airports
        </button>
        <span class="text-atc-faint">/</span>
        <span>{{ airport?.country || '—' }}</span>
        <span class="text-atc-faint">/</span>
        <span class="text-atc-orange">{{ airport?.icao || icao }}</span>
      </div>

      <!-- Airport title row -->
      <div class="flex items-baseline gap-4 leading-none mb-1.5">
        <span class="font-display italic text-atc-orange flex-shrink-0" style="font-size:76px;letter-spacing:-2px;line-height:1">
          {{ airport?.iata || icao }}
        </span>
        <span class="font-sans font-bold text-atc-text" style="font-size:34px;letter-spacing:-1px">
          {{ airport?.name || 'Loading…' }}
        </span>
      </div>
      <div class="font-mono text-[13px] text-atc-dim tracking-[0.3px] mb-5">
        {{ airport?.city }}<span v-if="airport?.country"> · {{ airport.country }}</span>
      </div>

      <!-- KPI strip -->
      <div
        class="grid border border-atc-line rounded-xl overflow-hidden"
        style="grid-template-columns:repeat(6,1fr);gap:1px;background:rgba(255,255,255,0.07)"
      >
        <KPICell label="WIND"       :value="metar?.wind    || '—'" />
        <KPICell label="VIS"        :value="metar?.vis     || '—'" />
        <KPICell label="CEILING"    :value="metar?.ceiling || '—'" />
        <KPICell label="TEMP · DEW" :value="metar ? `${metar.temp} / ${metar.dew}` : '—'" />
        <KPICell label="ALTIM"      :value="metar?.altim   || '—'" />
        <KPICell
          label="STATUS"
          :value="activeFeed ? activeFeed.name : (channels?.length ? `${channels.length} feeds` : '—')"
          accent
        />
      </div>
    </section>

    <!-- ─── BODY: full-canvas map + floating panels ───────────────────────── -->
    <div ref="mapContainerEl" class="flex-1 min-h-0 relative overflow-hidden">

      <!-- Map fills entire area -->
      <AirportMap
        :icao="airport?.icao || icao"
        :lat="airportLat"
        :lon="airportLon"
        :height="mapHeight"
        accent="#FF5A1F"
        :aircraft="aircraft"
        class="absolute inset-0 w-full"
      />

      <!-- Map view tabs (top-center) -->
      <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-0.5 p-0.5 rounded-lg border border-white/10" style="background:rgba(10,10,11,0.75);backdrop-filter:blur(12px)">
        <button
          v-for="tab in ['Airport','Approach','Region']" :key="tab"
          @click="mapTab = tab"
          class="px-3 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border-none"
          :class="mapTab === tab ? 'bg-white/10 text-atc-text' : 'bg-transparent text-atc-dim hover:text-atc-text'"
        >{{ tab }}</button>
      </div>

      <!-- Aircraft count (bottom-left) -->
      <div class="absolute bottom-3 left-3 z-20 flex items-center gap-2 font-mono text-[11px] text-atc-dim pointer-events-none" style="text-shadow:0 0 8px #0a0a0b">
        <span class="w-1.5 h-1.5 rounded-full bg-atc-orange flex-shrink-0" style="box-shadow:0 0 6px #FF5A1F" />
        {{ aircraft.length }} aircraft in range
        <span v-if="airportLat" class="text-atc-faint">· {{ airportLat.toFixed(2) }}°N {{ Math.abs(airportLon).toFixed(2) }}°W</span>
      </div>

      <!-- ── LEFT FLOAT: Feed selector ──────────────────────────────────── -->
      <div
        class="absolute top-3 left-3 z-30 flex flex-col rounded-2xl border border-white/10 overflow-hidden"
        style="width:236px;max-height:calc(100% - 24px);background:rgba(10,10,11,0.82);backdrop-filter:blur(16px)"
      >
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/8">
          <span class="font-mono text-[9px] text-atc-faint tracking-[1.5px] uppercase">
            ATC FEEDS · {{ channels?.length || 0 }}
          </span>
          <!-- Filter tabs -->
          <div class="flex gap-0.5">
            <button
              v-for="t in feedTabs" :key="t"
              @click="feedFilter = t"
              class="px-1.5 py-0.5 rounded text-[9px] font-medium cursor-pointer transition-colors border-none"
              :class="feedFilter === t ? 'bg-white/10 text-atc-text' : 'bg-transparent text-atc-dim hover:text-atc-text'"
            >{{ t }}</button>
          </div>
        </div>

        <!-- Feed list -->
        <div class="flex-1 overflow-y-auto flex flex-col gap-px p-1.5 min-h-0">
          <div v-if="!channels?.length" class="flex items-center justify-center py-6">
            <div class="font-mono text-[10px] text-atc-faint animate-pulse">LOADING FEEDS…</div>
          </div>

          <button
            v-for="ch in filteredChannels"
            :key="ch.id"
            @click="selectFeed(ch)"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition-all font-sans w-full"
            :class="ch.id === activeFeedId
              ? 'border-atc-orange/30 bg-atc-orange/8'
              : 'border-transparent bg-transparent hover:bg-white/5'"
          >
            <div class="flex-1 min-w-0">
              <div class="text-[12px] font-semibold truncate" style="letter-spacing:-0.1px">{{ ch.name }}</div>
              <div class="font-mono text-[10px] text-atc-dim tracking-[0.3px]">
                {{ ch.freq || '' }}{{ ch.freq ? ' · ' : '' }}{{ ch.listeners }}L
              </div>
            </div>
            <div v-if="ch.id === activeFeedId" class="flex gap-0.5 items-end h-3 flex-shrink-0">
              <span
                v-for="(h, i) in [0.5, 0.9, 0.7]" :key="i"
                class="w-[2px] rounded-sm bg-atc-orange"
                :style="{ height:`${h*12}px`, animation:`eqBar ${0.6+i*0.15}s ease-in-out ${i*0.1}s infinite alternate` }"
              />
            </div>
            <span v-else class="w-1.5 h-1.5 rounded-full bg-atc-mint flex-shrink-0" style="box-shadow:0 0 5px #34d399;opacity:0.7" />
          </button>
        </div>
      </div>

      <!-- ── RIGHT FLOAT: Player + Captions ─────────────────────────────── -->
      <div
        class="absolute top-3 right-3 z-30 flex flex-col rounded-2xl border border-white/10 overflow-hidden"
        style="width:320px;max-height:calc(100% - 24px);background:rgba(10,10,11,0.82);backdrop-filter:blur(16px)"
      >
        <!-- Player card -->
        <div class="flex-shrink-0 p-4 border-b border-white/8">
          <!-- No feed selected -->
          <div v-if="!activeFeedId" class="flex flex-col items-center justify-center py-4 text-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" class="text-atc-faint opacity-40"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            <div class="text-atc-faint font-mono text-[9px] tracking-widest uppercase">No feed selected</div>
            <div class="text-atc-dim text-[11px]">Pick a feed on the left</div>
          </div>

          <!-- Active player -->
          <template v-else>
            <div class="flex items-center gap-3 mb-3">
              <button
                @click="$emit('toggle-play')"
                class="w-10 h-10 rounded-full bg-atc-orange text-atc-bg border-none grid place-items-center cursor-pointer flex-shrink-0"
              >
                <svg v-if="isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>
                <svg v-else          width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              </button>
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-bold truncate" style="letter-spacing:-0.2px">{{ activeFeed?.name }}</div>
                <div class="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-atc-dim">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-bold tracking-[1.2px]" style="border-color:rgba(255,59,48,0.4);color:#ff6b62">
                    <span class="w-1 h-1 rounded-full bg-red-500 animate-pulse-dot" />
                    LIVE
                  </span>
                  <span v-if="activeFeed?.freq">{{ activeFeed.freq }} MHz</span>
                  <span class="text-atc-faint">·</span>
                  <span>{{ sessionElapsed }}</span>
                </div>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button @click="$emit('download')" class="w-7 h-7 rounded-full bg-white/8 border border-white/10 text-atc-text cursor-pointer grid place-items-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button @click="$emit('stop')" class="w-7 h-7 rounded-full bg-atc-red border-none text-white cursor-pointer grid place-items-center">
                  <span class="w-2 h-2 bg-white inline-block" />
                </button>
              </div>
            </div>

            <!-- Waveform -->
            <Waveform :playing="isPlaying" :bars="50" :height="24" :analyser="analyser" />

            <!-- State row -->
            <div class="flex items-center justify-between mt-2">
              <span class="flex items-center gap-1.5 font-mono text-[9px] text-atc-mint tracking-[0.5px]">
                <span class="w-1.5 h-1.5 rounded-full bg-atc-mint animate-pulse-dot" style="box-shadow:0 0 5px #34d399" />
                {{ connectionStateLabel }}
              </span>
              <span class="font-mono text-[9px] text-atc-faint">{{ activeFeed?.listeners || 0 }} listening</span>
            </div>
          </template>
        </div>

        <!-- Captions header -->
        <div class="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/8">
          <span class="font-mono text-[9px] text-atc-faint tracking-[1.5px] uppercase">TRANSCRIPT</span>
          <div class="flex gap-2.5 font-mono text-[10px] text-atc-dim">
            <span><b class="text-atc-text">{{ counts.atc }}</b> twr</span>
            <span><b class="text-atc-text">{{ counts.plane }}</b> acft</span>
          </div>
        </div>

        <!-- Caption stream -->
        <div ref="streamEl" class="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-4">
          <div
            v-for="(cap, i) in visible"
            :key="cap.id"
            style="animation:capIn 0.4s cubic-bezier(0.2,0.6,0.2,1)"
            :class="cap.isTemp ? 'opacity-40' : ''"
          >
            <div class="flex items-center gap-2 font-mono text-[9px] mb-1">
              <span class="inline-flex px-1.5 py-0.5 rounded-full border font-bold tracking-[1.2px]" :style="speakerStyle(cap.speaker)">
                {{ speakerMeta(cap.speaker).label }}
              </span>
              <span class="text-atc-faint">{{ fmtZulu(cap.timestamp) }}</span>
              <span class="text-atc-faint">{{ Math.round((cap.confidence || 0.85) * 100) }}%</span>
              <template v-if="parseCallsign(cap.caption)">
                <span class="text-atc-faint">·</span>
                <span class="font-semibold" :style="{ color: speakerMeta(cap.speaker).color }">{{ parseCallsign(cap.caption) }}</span>
              </template>
            </div>
            <div
              class="font-sans font-semibold leading-snug"
              style="font-size:18px;letter-spacing:-0.3px"
              :style="{
                color: cap.speaker === 'unknown' ? 'var(--atc-dim)' : 'var(--atc-text)',
                fontStyle: cap.speaker === 'unknown' ? 'italic' : 'normal',
              }"
            >
              <template v-if="cap.isTemp">
                <span class="animate-pulse text-atc-faint text-[12px]">Transcribing…</span>
              </template>
              <template v-else>
                {{ i === visible.length - 1 ? displayedText : (cap.caption || cap.details || 'UNINTELLIGIBLE') }}
                <span v-if="i === visible.length - 1 && typing" class="inline-block ml-0.5 text-atc-orange animate-caret">▍</span>
              </template>
            </div>
          </div>

          <!-- Speaking indicator -->
          <div v-if="connectionState === 'SPEAKING'" class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-500 font-mono text-[9px] font-bold uppercase tracking-wider">
              <div class="flex gap-0.5 items-end h-2">
                <div v-for="j in 3" :key="j" class="w-0.5 bg-current rounded-full" :style="`height:${[8,5,7][j-1]}px;animation:eqBar ${[1,1.2,0.8][j-1]}s infinite alternate`" />
              </div>
              Speaking
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="visible.length === 0 && connectionState !== 'SPEAKING' && activeFeedId" class="flex flex-col items-center justify-center py-8 opacity-20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mb-2 animate-pulse"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p class="font-sans italic text-[12px]">Awaiting Transmission</p>
          </div>

          <div ref="streamEnd" />
        </div>
      </div>

    </div><!-- end body -->
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import KPICell from '../ui/KPICell.vue'
import AirportMap from '../map/AirportMap.vue'
import Waveform from '../ui/Waveform.vue'
import { useMetar } from '../../composables/useMetar.js'
import { useAircraftPositions } from '../../composables/useAircraftPositions.js'

const props = defineProps({
  icao:            { type: String,  default: '' },
  airport:         { type: Object,  default: null },
  channels:        { type: Array,   default: () => [] },
  activeFeedId:    { type: String,  default: null },
  captions:        { type: Array,   default: () => [] },
  connectionState: { type: String,  default: 'IDLE' },
  isPlaying:       { type: Boolean, default: false },
  analyser:        { type: Object,  default: null },
})

const emit = defineEmits(['back', 'select-feed', 'toggle-play', 'stop', 'download'])

// ── Feed filter ────────────────────────────────────────────────────────────
const feedTabs   = ['All', 'Twr', 'Gnd', 'App', 'Ctr']
const feedFilter = ref('All')
const mapTab     = ref('Airport')

const filteredChannels = computed(() => {
  if (feedFilter.value === 'All') return props.channels
  const map = { Twr: 'tower', Gnd: 'ground', App: 'approach', Ctr: 'center' }
  const kw = map[feedFilter.value] || feedFilter.value.toLowerCase()
  return props.channels.filter(c => c.name?.toLowerCase().includes(kw))
})

const activeFeed = computed(() => props.channels?.find(c => c.id === props.activeFeedId) || null)
const selectFeed = (ch) => emit('select-feed', ch)

// ── METAR ──────────────────────────────────────────────────────────────────
const icaoRef = computed(() => props.icao)
const { parsed: metar } = useMetar(icaoRef)

// ── Airport coordinates ────────────────────────────────────────────────────
const COORDS = {
  KLAX: [33.9425, -118.4081], KJFK: [40.6413, -73.7781], KORD: [41.9742, -87.9073],
  KATL: [33.6407, -84.4277],  KDFW: [32.8998, -97.0403], KSFO: [37.6213, -122.379],
  KBOS: [42.3656, -71.0096],  KSEA: [47.4502, -122.3088], EGLL: [51.4775, -0.4614],
  LFPG: [49.0097, 2.5479],    EDDF: [50.0379, 8.5622],   RJTT: [35.5494, 139.7798],
}
const airportLat = computed(() => COORDS[props.icao]?.[0] || props.airport?.lat || 0)
const airportLon = computed(() => COORDS[props.icao]?.[1] || props.airport?.lon || 0)

// ── Aircraft positions ─────────────────────────────────────────────────────
const latRef = computed(() => airportLat.value)
const lonRef = computed(() => airportLon.value)
const { aircraft } = useAircraftPositions(icaoRef, latRef, lonRef)

// ── Map height via ResizeObserver ──────────────────────────────────────────
const mapContainerEl = ref(null)
const mapHeight      = ref(400)
let resizeObs = null

onMounted(() => {
  if (!mapContainerEl.value) return
  resizeObs = new ResizeObserver(([e]) => {
    mapHeight.value = Math.round(e.contentRect.height) || 400
  })
  resizeObs.observe(mapContainerEl.value)
})

// ── Speaker metadata ───────────────────────────────────────────────────────
const SPEAKERS = {
  atc:     { label: 'ATC',  color: '#FF5A1F' },
  ATC:     { label: 'ATC',  color: '#FF5A1F' },
  plane:   { label: 'ACFT', color: '#34d399' },
  PLANE:   { label: 'ACFT', color: '#34d399' },
  unknown: { label: 'UNK',  color: '#8aa0b4' },
}
const speakerMeta  = (s) => SPEAKERS[s] || SPEAKERS.unknown
const speakerStyle = (s) => {
  const c = speakerMeta(s).color
  return { color: c, borderColor: `${c}55`, background: `${c}10` }
}

const connectionStateLabel = computed(() => ({
  IDLE: 'Idle', LISTENING: 'Streaming', SPEAKING: 'Speaking', TRANSCRIBING: 'Transcribing…',
}[props.connectionState] || 'Connecting…'))

// ── Captions ───────────────────────────────────────────────────────────────
const realCaptions = computed(() => props.captions || [])
const visible      = computed(() => realCaptions.value)

const counts = computed(() => ({
  all:   realCaptions.value.length,
  atc:   realCaptions.value.filter(c => ['atc','ATC'].includes(c.speaker)).length,
  plane: realCaptions.value.filter(c => ['plane','PLANE'].includes(c.speaker)).length,
}))

// ── Callsign parser ────────────────────────────────────────────────────────
const AIRLINES = ['DELTA','UNITED','SOUTHWEST','AMERICAN','ALASKA','JETBLUE','FEDEX','UPS','HAWAIIAN','CACTUS','SKYWEST']
const parseCallsign = (text) => {
  if (!text) return null
  const m = text.match(new RegExp(`\\b(${AIRLINES.join('|')})\\b\\s+([0-9A-Z]+)`, 'i'))
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null
}

// ── Typewriter effect ──────────────────────────────────────────────────────
const streamEl      = ref(null)
const streamEnd     = ref(null)
const displayedText = ref('')
const typing        = ref(false)
let typeTimer = null

watch(visible, async (newCaps) => {
  const last = newCaps[newCaps.length - 1]
  if (!last || last.isTemp) return
  const text = last.caption || last.details || ''
  if (!text) return
  clearInterval(typeTimer)
  displayedText.value = ''
  typing.value = true
  let i = 0
  typeTimer = setInterval(() => {
    i++
    displayedText.value = text.slice(0, i)
    if (i >= text.length) { clearInterval(typeTimer); typing.value = false }
  }, 18)
  await nextTick()
  streamEnd.value?.scrollIntoView({ behavior: 'smooth' })
}, { deep: true })

// ── Session timer ──────────────────────────────────────────────────────────
const sessionElapsed = ref('00:00')
const sessionStart   = ref(Date.now())
let sessionTimer = null

const tickSession = () => {
  const s = Math.floor((Date.now() - sessionStart.value) / 1000)
  sessionElapsed.value = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

watch(() => props.activeFeedId, () => { sessionStart.value = Date.now(); sessionElapsed.value = '00:00' })

onMounted(() => { tickSession(); sessionTimer = setInterval(tickSession, 1000) })
onUnmounted(() => {
  clearInterval(sessionTimer)
  clearInterval(typeTimer)
  resizeObs?.disconnect()
})

// ── Zulu time formatter ────────────────────────────────────────────────────
const fmtZulu = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
</script>
