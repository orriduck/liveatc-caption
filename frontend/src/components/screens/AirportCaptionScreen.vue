<template>
  <div class="flex flex-col h-screen bg-atc-bg text-atc-text font-sans overflow-hidden">

    <!-- ─── MASTHEAD ─────────────────────────────────────────────────────── -->
    <section
      class="flex-shrink-0 px-10 py-4 border-b border-atc-line"
      style="background:radial-gradient(ellipse at 90% 0%, rgba(255,90,31,0.07), transparent 45%), #0a0a0b"
    >
      <!-- Breadcrumb / back + title on one line -->
      <div class="flex items-center gap-4 mb-3">
        <button
          class="flex items-center gap-1.5 hover:text-atc-text transition-colors cursor-pointer bg-transparent border-none p-0 font-mono text-[11px] tracking-[0.5px] uppercase text-atc-dim flex-shrink-0"
          @click="$emit('back')"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Airports
        </button>
        <span class="text-atc-faint font-mono text-[11px]">/</span>
        <span class="font-mono text-[11px] text-atc-dim tracking-[0.5px] uppercase">{{ airport?.country || '—' }}</span>
        <span class="text-atc-faint font-mono text-[11px]">/</span>
        <span class="font-mono text-[11px] text-atc-orange tracking-[0.5px] uppercase">{{ airport?.icao || icao }}</span>

        <!-- Airport title inline -->
        <div class="flex items-baseline gap-3 ml-2 min-w-0 flex-1">
          <span class="font-display italic text-atc-orange flex-shrink-0" style="font-size:44px;letter-spacing:-1.5px;line-height:1">
            {{ airport?.iata || icao }}
          </span>
          <span class="font-sans font-bold text-atc-text truncate" style="font-size:22px;letter-spacing:-0.5px">
            {{ airport?.name || 'Loading…' }}
          </span>
          <span class="font-mono text-[12px] text-atc-dim tracking-[0.3px] flex-shrink-0">
            {{ airport?.city }}<span v-if="airport?.country"> · {{ airport.country }}</span>
          </span>
        </div>
      </div>

      <!-- KPI strip -->
      <div
        class="grid border border-atc-line rounded-xl overflow-hidden"
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

    <!-- ─── BODY: full-canvas map + floating panels ───────────────────────── -->
    <div ref="mapContainerEl" class="flex-1 min-h-0 relative">

      <!-- Map wrapper: z-0 creates a stacking context that contains Leaflet's
           internal z-indices (200–700), so our floating panels can sit above -->
      <div class="absolute inset-0" style="z-index:0">
        <AirportMap
          :icao="airport?.icao || icao"
          :lat="airportLat"
          :lon="airportLon"
          accent="#FF5A1F"
          :aircraft="aircraft"
        />
      </div>

      <!-- Aircraft count (above bottom dock) -->
      <div class="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 font-mono text-[11px] text-atc-dim pointer-events-none whitespace-nowrap" style="text-shadow:0 0 8px #0a0a0b">
        <span class="w-1.5 h-1.5 rounded-full bg-atc-orange flex-shrink-0" style="box-shadow:0 0 6px #FF5A1F" />
        {{ aircraft.length }} aircraft in range
        <span class="text-atc-faint">·</span>
        <span class="text-atc-faint">Updated {{ fmtUpdated(lastUpdated) }}</span>
      </div>

      <!-- ── BOTTOM DOCK: compact mobile-friendly controls ──────────────── -->
      <div class="absolute inset-x-3 bottom-3 z-20 sm:inset-x-4">
        <Transition name="feed-dropup">
          <div
            v-if="feedMenuOpen"
            class="absolute bottom-[calc(100%+10px)] left-0 right-0 max-h-[min(62vh,420px)] overflow-hidden rounded-[24px] border border-white/15 shadow-2xl sm:right-auto sm:w-[380px]"
            style="background:rgba(10,10,11,0.94);backdrop-filter:blur(22px);box-shadow:0 22px 70px rgba(0,0,0,0.55)"
          >
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <div class="min-w-0">
              <div class="font-mono text-[9px] text-atc-faint tracking-[1.5px] uppercase">Feed selector</div>
              <div class="text-[12px] font-bold truncate">{{ activeFeed?.name || 'Choose a frequency' }}</div>
            </div>
            <select
              v-model="feedFilter"
              class="h-9 w-28 rounded-full px-3 font-mono text-[10px] text-atc-text border border-white/10 cursor-pointer appearance-none"
              style="background:rgba(255,255,255,0.07);outline:none"
            >
              <option v-for="t in feedTabs" :key="t" :value="t">{{ t === 'All' ? 'All' : feedTabLabels[t] }}</option>
            </select>
          </div>

          <div class="max-h-[calc(min(62vh,420px)-86px)] overflow-y-auto px-2 py-2">
            <div v-if="!channels?.length" class="flex items-center justify-center py-8">
              <div class="font-mono text-[10px] text-atc-faint animate-pulse">LOADING FEEDS…</div>
            </div>

            <button
              v-for="ch in filteredChannels"
              :key="ch.id"
              @click="selectFeed(ch)"
              class="flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left font-sans transition-all"
              :class="ch.id === activeFeedId
                ? 'border-atc-orange/35 bg-atc-orange/10 text-atc-text'
                : 'border-transparent bg-transparent text-atc-dim hover:bg-white/6 hover:text-atc-text'"
            >
              <span
                class="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                :class="ch.id === activeFeedId
                  ? 'bg-atc-mint animate-flash-dot'
                  : 'bg-white/20'"
              />
              <span class="flex-1 min-w-0 text-[13px] font-semibold truncate">{{ ch.name }}</span>
              <span class="font-mono text-[10px] text-atc-faint tabular-nums">{{ ch.listeners || 0 }}</span>
            </button>
          </div>

          <div class="px-4 py-2 border-t border-white/8 flex items-center justify-between font-mono text-[9px] text-atc-dim">
            <span><b class="text-atc-text">{{ channels?.filter(c => c.is_up !== false).length || 0 }}</b> live</span>
            <span><b class="text-atc-text">{{ totalListeners }}</b> listening</span>
          </div>
          </div>
        </Transition>

        <div
          class="bottom-dock flex min-h-[68px] flex-row items-center gap-2 rounded-[26px] border border-white/15 p-2 shadow-2xl"
          style="background:rgba(10,10,11,0.91);backdrop-filter:blur(22px);box-shadow:0 18px 58px rgba(0,0,0,0.52)"
        >
          <button
            class="bottom-dock-feed flex min-h-11 items-center gap-2.5 rounded-[20px] border border-white/10 bg-white/[0.045] px-3 text-left transition-colors hover:bg-white/8"
            :aria-expanded="feedMenuOpen"
            @click="feedMenuOpen = !feedMenuOpen"
          >
            <ListFilter class="w-4 h-4 text-atc-orange flex-shrink-0" :stroke-width="2" />
            <span class="min-w-0 flex-1">
              <span class="block font-mono text-[9px] tracking-[1.4px] uppercase text-atc-faint">Feed</span>
              <span class="block truncate text-[13px] font-bold">{{ activeFeed?.name || 'Choose feed' }}</span>
            </span>
            <ChevronDown
              class="w-4 h-4 text-atc-dim transition-transform"
              :class="feedMenuOpen ? 'rotate-180' : ''"
              :stroke-width="2"
            />
          </button>

          <div class="bottom-dock-transcript flex min-h-11 min-w-0 items-center gap-2.5 rounded-[20px] border border-white/10 bg-white/[0.03] px-3">
            <button
              @click="toggleCaption"
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-colors"
              :class="captionEnabled
                ? 'border-atc-mint/35 bg-atc-mint/10 text-atc-mint'
                : 'border-white/15 bg-transparent text-atc-dim'"
              :title="captionEnabled ? 'Disable captions' : 'Enable captions'"
            >
              <MessageSquare v-if="captionEnabled" class="w-4 h-4" :stroke-width="2" />
              <MessageSquareOff v-else class="w-4 h-4" :stroke-width="2" />
            </button>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 font-mono text-[9px] tracking-[1.4px] uppercase text-atc-faint">
                <span>Transcript</span>
                <span class="text-atc-dim">{{ counts.atc }} twr</span>
                <span class="text-atc-dim">{{ counts.plane }} acft</span>
              </div>
              <div class="truncate text-[13px] font-semibold text-atc-text">
                {{ transcriptPreview }}
              </div>
            </div>
          </div>

          <section class="bottom-dock-player flex min-h-11 items-center gap-2.5 rounded-[20px] border border-white/10 bg-white/[0.045] px-2.5">
            <div class="player-copy min-w-0 flex-1">
              <div class="truncate text-[13px] font-bold">{{ activeFeed?.name || 'No feed selected' }}</div>
              <div class="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-atc-dim">
                <span class="inline-flex items-center gap-1 text-atc-mint">
                  <span class="w-1.5 h-1.5 rounded-full bg-atc-mint animate-pulse-dot" />
                  {{ connectionStateLabel }}
                </span>
                <span class="player-time inline-flex items-baseline justify-end tabular-nums">
                  <NumberFlow
                    class="player-time-flow"
                    :value="sessionMinutes"
                    :format="{ minimumIntegerDigits: 2, maximumFractionDigits: 0 }"
                  /><span class="player-time-separator">:</span><NumberFlow
                    class="player-time-flow"
                    :value="sessionSeconds"
                    :format="{ minimumIntegerDigits: 2, maximumFractionDigits: 0 }"
                  />
                </span>
              </div>
            </div>

            <div class="flex flex-shrink-0 gap-1">
              <button
                @click="togglePlayback"
                class="transport-button grid h-9 w-9 place-items-center rounded-full shadow-lg disabled:cursor-default disabled:opacity-50"
                :class="isPlaying ? 'transport-button--stop' : 'transport-button--play'"
                :disabled="!isPlaying && !activeFeed"
                :title="isPlaying ? 'Stop audio' : 'Start audio'"
              >
                <Transition name="transport-icon" mode="out-in">
                  <Square v-if="isPlaying" key="stop" class="w-3 h-3 fill-current" :stroke-width="0" />
                  <Play v-else key="play" class="w-4 h-4 fill-current" :stroke-width="0" />
                </Transition>
              </button>
            </div>
          </section>
        </div>
      </div>

    </div><!-- end body -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronDown, ListFilter, MessageSquare, MessageSquareOff, Play, Square } from 'lucide-vue-next'
import NumberFlow from '@number-flow/vue'
import KPICell from '../ui/KPICell.vue'
import AirportMap from '../map/AirportMap.vue'
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

const emit = defineEmits(['back', 'select-feed', 'toggle-play', 'stop'])

// ── Feed filter ────────────────────────────────────────────────────────────
const feedTabs      = ['All', 'Twr', 'Gnd', 'App', 'Ctr']
const feedTabLabels = { Twr: 'Tower', Gnd: 'Ground', App: 'Approach', Ctr: 'Center' }
const feedFilter    = ref('All')
const feedMenuOpen  = ref(false)

const filteredChannels = computed(() => {
  if (feedFilter.value === 'All') return props.channels
  const map = { Twr: 'tower', Gnd: 'ground', App: 'approach', Ctr: 'center' }
  const kw = map[feedFilter.value] || feedFilter.value.toLowerCase()
  return props.channels.filter(c => c.name?.toLowerCase().includes(kw))
})

const totalListeners = computed(() =>
  (props.channels || []).reduce((s, c) => s + (c.listeners || 0), 0)
)

const isHighTraffic = (ch) => {
  const total = totalListeners.value
  return total > 0 && (ch.listeners || 0) / total > 0.2
}

const activeFeed = computed(() => props.channels?.find(c => c.id === props.activeFeedId) || null)
const selectFeed = (ch) => {
  feedMenuOpen.value = false
  emit('select-feed', ch)
}

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
const { aircraft, lastUpdated } = useAircraftPositions(icaoRef, latRef, lonRef)

const fmtUpdated = (d) => {
  if (!d) return '—'
  return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const mapContainerEl = ref(null)

const connectionStateLabel = computed(() => ({
  IDLE: 'Idle', LISTENING: 'Streaming', SPEAKING: 'Speaking', TRANSCRIBING: 'Transcribing…',
}[props.connectionState] || 'Connecting…'))

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

// ── Caption toggle ──────────────────────────────────────────────────────────
const captionEnabled = ref(localStorage.getItem('caption_enabled') !== 'false')
const toggleCaption = () => {
  captionEnabled.value = !captionEnabled.value
  localStorage.setItem('caption_enabled', captionEnabled.value)
}

// ── Captions ───────────────────────────────────────────────────────────────
const realCaptions = computed(() => props.captions || [])
const visible      = computed(() => captionEnabled.value ? realCaptions.value : [])

const latestCaption = computed(() => visible.value[visible.value.length - 1] || null)
const transcriptPreview = computed(() => {
  if (!captionEnabled.value) return 'Captions off'
  if (props.connectionState === 'SPEAKING') return 'Speaking...'
  if (props.connectionState === 'TRANSCRIBING') return 'Transcribing...'
  const cap = latestCaption.value
  if (!cap) return activeFeed.value ? 'Awaiting transmission' : 'Select a feed to begin'
  if (cap.isTemp) return 'Transcribing...'
  return displayedText.value || cap.caption || cap.details || 'Unintelligible'
})

const counts = computed(() => ({
  all:   realCaptions.value.length,
  atc:   realCaptions.value.filter(c => ['atc','ATC'].includes(c.speaker)).length,
  plane: realCaptions.value.filter(c => ['plane','PLANE'].includes(c.speaker)).length,
}))

// ── Typewriter preview ─────────────────────────────────────────────────────
const displayedText = ref('')
let typeTimer = null

watch(visible, (newCaps) => {
  const last = newCaps[newCaps.length - 1]
  if (!last || last.isTemp) return
  const text = last.caption || last.details || ''
  if (!text) return
  clearInterval(typeTimer)
  displayedText.value = ''
  let i = 0
  typeTimer = setInterval(() => {
    i++
    displayedText.value = text.slice(0, i)
    if (i >= text.length) clearInterval(typeTimer)
  }, 18)
}, { deep: true })

// ── Session timer ──────────────────────────────────────────────────────────
const sessionElapsedSeconds = ref(0)
const sessionStart          = ref(Date.now())
let sessionTimer = null

const tickSession = () => {
  if (!props.isPlaying) return
  sessionElapsedSeconds.value = Math.floor((Date.now() - sessionStart.value) / 1000)
}

const sessionMinutes = computed(() => Math.floor(sessionElapsedSeconds.value / 60))
const sessionSeconds = computed(() => sessionElapsedSeconds.value % 60)

const resetSessionTimer = () => {
  sessionStart.value = Date.now()
  sessionElapsedSeconds.value = 0
}

const startPlayback = () => {
  if (props.isPlaying) return
  resetSessionTimer()
  emit('toggle-play')
}

const stopPlayback = () => {
  resetSessionTimer()
  emit('stop')
}

const togglePlayback = () => {
  if (props.isPlaying) {
    stopPlayback()
    return
  }
  startPlayback()
}

watch(() => props.activeFeedId, () => {
  resetSessionTimer()
})

watch(() => props.isPlaying, (playing, wasPlaying) => {
  if (playing && !wasPlaying) {
    sessionStart.value = Date.now() - sessionElapsedSeconds.value * 1000
    tickSession()
  }
  if (!playing && wasPlaying) {
    resetSessionTimer()
  }
})

onMounted(() => { tickSession(); sessionTimer = setInterval(tickSession, 1000) })
onUnmounted(() => {
  clearInterval(sessionTimer)
  clearInterval(typeTimer)
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

.bottom-dock-feed {
  flex: 1 1 210px;
  min-width: 132px;
  max-width: 245px;
}

.bottom-dock-transcript {
  flex: 2 2 260px;
  min-width: 142px;
}

.bottom-dock-player {
  flex: 1 1 285px;
  min-width: 224px;
}

.player-time {
  min-width: 4.4ch;
}

.player-time-flow {
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.player-time-separator {
  color: var(--atc-faint);
  padding: 0 0.5px;
}

.kpi-number-flow::part(suffix),
.kpi-unit {
  color: var(--atc-dim);
  font-size: 0.58em;
  font-weight: 700;
  line-height: 1;
}

.player-time-flow::part(suffix) {
  display: none;
}

.transport-button {
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 140ms cubic-bezier(0.25, 1, 0.5, 1);
}

.transport-button:not(:disabled):active {
  transform: scale(0.94);
}

.transport-button--play {
  background: rgba(250, 250, 250, 0.96);
  box-shadow: 0 10px 28px rgba(255, 255, 255, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  color: #0a0a0b;
}

.transport-button--play:not(:disabled):hover {
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(255, 255, 255, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.7) inset;
}

.transport-button--play:disabled {
  background: rgba(250, 250, 250, 0.9);
  color: #0a0a0b;
  opacity: 0.72;
}

.transport-button--stop {
  background: var(--atc-red);
  box-shadow: 0 10px 28px rgba(255, 59, 48, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
  color: #ffffff;
}

.transport-button--stop:hover {
  box-shadow: 0 12px 34px rgba(255, 59, 48, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  filter: brightness(1.06);
}

.transport-icon-enter-active,
.transport-icon-leave-active {
  transition:
    opacity 120ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
}

.transport-icon-enter-from {
  opacity: 0;
  transform: scale(0.72) rotate(-18deg);
}

.transport-icon-leave-to {
  opacity: 0;
  transform: scale(0.72) rotate(18deg);
}

.feed-dropup-enter-active,
.feed-dropup-leave-active {
  transition:
    opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: bottom left;
}

.feed-dropup-enter-from,
.feed-dropup-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .feed-dropup-enter-active,
  .feed-dropup-leave-active,
  .transport-button,
  .transport-icon-enter-active,
  .transport-icon-leave-active {
    transition-duration: 1ms;
  }
}

@media (max-width: 940px) {
  .bottom-dock {
    gap: 6px;
    padding: 6px;
  }

  .bottom-dock-feed {
    flex-basis: 150px;
    max-width: 210px;
  }

  .bottom-dock-transcript {
    flex-basis: 170px;
    flex-shrink: 3;
  }

  .bottom-dock-player {
    flex-basis: 230px;
    min-width: 196px;
  }
}

@media (max-width: 720px) {
  .bottom-dock {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .bottom-dock-feed,
  .bottom-dock-transcript,
  .bottom-dock-player {
    max-width: none;
  }

  .bottom-dock-feed {
    flex: 1 1 128px;
  }

  .bottom-dock-transcript {
    flex: 999 1 190px;
    order: 3;
    width: 100%;
  }

  .bottom-dock-player {
    flex: 1 1 210px;
  }
}

@media (max-width: 520px) {
  .player-copy > div:first-child,
  .player-copy .text-atc-mint {
    display: none;
  }

  .bottom-dock-player {
    min-width: 168px;
  }
}
</style>
