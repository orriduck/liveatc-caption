<template>
  <div class="flex flex-col h-screen bg-atc-bg text-atc-text font-sans overflow-hidden">
    <TopBar :screen="`TRANSCRIPT · ${activeFeed?.name?.toUpperCase() || ''}`" :on-back="() => $emit('back')" />

    <div class="flex flex-1 min-h-0" style="display:grid;grid-template-columns:260px 1fr 320px">
      <!-- LEFT SIDEBAR -->
      <aside class="flex flex-col gap-5 px-5 py-6 border-r border-atc-line overflow-y-auto">
        <!-- Feed switcher -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase">FEEDS · {{ channels?.length || 0 }}</div>
            <button class="bg-transparent border border-atc-line rounded-full px-2.5 py-1 text-atc-text text-[11px] cursor-pointer font-sans">+ Add</button>
          </div>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="ch in (channels || []).slice(0, 7)"
              :key="ch.id"
              @click="$emit('switch-feed', ch)"
              class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-colors font-sans"
              :class="ch.id === activeFeedId
                ? 'bg-atc-card border-atc-line'
                : 'bg-transparent border-transparent hover:bg-atc-card'"
            >
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-semibold truncate" style="letter-spacing:-0.1px">
                  {{ ch.name }}
                </div>
                <div class="font-mono text-[11px] text-atc-dim tracking-[0.3px] mt-0.5">
                  {{ ch.freq || '' }}{{ ch.freq ? ' · ' : '' }}{{ ch.listeners }}L
                </div>
              </div>
              <!-- EQ bars when active, live dot otherwise -->
              <div v-if="ch.id === activeFeedId" class="flex gap-0.5 items-end h-3.5">
                <span v-for="(h, i) in [0.5,0.9,0.7]" :key="i"
                  class="w-[2px] rounded-sm bg-atc-orange"
                  :style="{ height:`${h*14}px`, animation:`eqBar ${0.6+i*0.15}s ease-in-out ${i*0.1}s infinite alternate`, transformOrigin:'bottom' }"
                />
              </div>
              <span v-else class="w-1.5 h-1.5 rounded-full bg-atc-mint flex-shrink-0" style="box-shadow:0 0 6px #34d399" />
            </button>
          </div>
        </div>

        <!-- Speaker filter -->
        <div>
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-2.5">FILTER</div>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="f in filters"
              :key="f.id"
              @click="filter = f.id"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[13px] cursor-pointer transition-colors font-sans"
              :class="filter === f.id ? 'bg-atc-card border-atc-line text-atc-text' : 'bg-transparent border-transparent text-atc-dim'"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: f.color }" />
              <span class="flex-1 text-left">{{ f.label }}</span>
              <span class="font-mono text-[11px] text-atc-faint">{{ counts[f.id] }}</span>
            </button>
          </div>
        </div>

        <!-- Session stats -->
        <div>
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-2.5">SESSION</div>
          <div class="grid grid-cols-2 gap-px bg-atc-line border border-atc-line rounded-lg overflow-hidden">
            <div v-for="s in sessionStats" :key="s.label" class="px-3 py-2.5 bg-atc-card font-mono text-[12px] tracking-[0.3px]">
              <div class="text-atc-faint text-[10px] uppercase tracking-[1px] mb-1">{{ s.label }}</div>
              <b :class="s.accent ? 'text-atc-mint' : 'text-atc-text'">{{ s.value }}</b>
            </div>
          </div>
        </div>
      </aside>

      <!-- CENTER: caption stream -->
      <main class="flex flex-col border-r border-atc-line min-h-0">
        <!-- Pinned header -->
        <div class="px-9 py-4 border-b border-atc-line bg-atc-bg flex-shrink-0">
          <div class="font-mono text-[11px] text-atc-faint tracking-[1.5px] uppercase mb-1.5">
            NOW · {{ activeFeed?.name || '' }}
          </div>
          <div class="flex items-center gap-4 text-[13px] text-atc-dim">
            <span><b class="text-atc-text">{{ counts.atc }}</b> tower</span>
            <span><b class="text-atc-text">{{ counts.plane }}</b> aircraft</span>
            <span><b class="text-atc-text">{{ counts.unknown }}</b> unknown</span>
            <span class="ml-auto flex items-center gap-1.5 text-atc-mint">
              <span class="w-1.5 h-1.5 rounded-full bg-atc-mint animate-pulse-dot" style="box-shadow:0 0 6px #34d399" />
              {{ connectionState === 'IDLE' ? 'Idle' : connectionState === 'SPEAKING' ? 'Speaking' : connectionState === 'TRANSCRIBING' ? 'Transcribing…' : 'Streaming' }}
            </span>
          </div>
        </div>

        <!-- Captions -->
        <div ref="streamEl" class="flex-1 min-h-0 overflow-y-auto px-9 py-8 flex flex-col gap-8">
          <div
            v-for="(cap, i) in visible"
            :key="cap.id"
            class="grid gap-5"
            style="grid-template-columns:90px 1fr;animation:capIn 0.4s cubic-bezier(0.2,0.6,0.2,1)"
            :class="cap.isTemp ? 'opacity-50 animate-pulse' : ''"
          >
            <!-- Left rail -->
            <div class="flex flex-col gap-1.5 items-start pt-1">
              <span class="inline-flex px-2 py-0.5 rounded-full border font-mono text-[10px] font-bold tracking-[1.5px]"
                    :style="speakerStyle(cap.speaker)">
                {{ speakerMeta(cap.speaker).label }}
              </span>
              <span class="font-mono text-[11px] text-atc-faint tracking-[0.3px]">{{ fmtZulu(cap.timestamp) }}</span>
              <div class="h-0.5 w-12 rounded"
                   :style="{ background: speakerMeta(cap.speaker).color, opacity: 0.2 + (cap.confidence || 0.8) * 0.8 }" />
            </div>

            <!-- Caption body -->
            <div>
              <div class="flex items-center gap-2.5 font-mono text-[12px] text-atc-dim mb-2 tracking-[0.2px]">
                <span :style="{ color: speakerMeta(cap.speaker).color, fontWeight: 600 }">
                  {{ speakerMeta(cap.speaker).tone }}
                </span>
                <template v-if="parseCallsign(cap.caption)">
                  <span class="text-atc-faint">·</span>
                  <span class="text-atc-text font-semibold">{{ parseCallsign(cap.caption) }}</span>
                </template>
                <span class="text-atc-faint">·</span>
                <span>{{ Math.round((cap.confidence || 0.85) * 100) }}%</span>
              </div>
              <div
                class="font-sans font-semibold leading-[1.22]"
                style="font-size:34px;letter-spacing:-0.8px"
                :style="{
                  color: cap.speaker === 'unknown' ? 'var(--atc-dim)' : 'var(--atc-text)',
                  fontStyle: cap.speaker === 'unknown' ? 'italic' : 'normal',
                }"
              >
                <template v-if="cap.isTemp">
                  <span class="animate-pulse text-atc-faint text-[22px]">Transcribing…</span>
                </template>
                <template v-else>
                  {{ i === visible.length - 1 ? displayedText : (cap.caption || cap.details || 'UNINTELLIGIBLE') }}
                  <span v-if="i === visible.length - 1 && typing"
                    class="inline-block ml-0.5 text-atc-orange animate-caret">▍</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Speaking indicator -->
          <div v-if="connectionState === 'SPEAKING'" class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 font-mono text-[10px] font-bold uppercase tracking-wider">
              <div class="flex gap-0.5 items-end h-2.5">
                <div v-for="i in 3" :key="i" class="w-0.5 bg-current rounded-full" :style="`height:${[10,6,8][i-1]}px;animation:eqBar ${[1,1.2,0.8][i-1]}s infinite alternate`" />
              </div>
              Speaking
            </div>
          </div>

          <div v-if="visible.length === 0 && connectionState !== 'SPEAKING'" class="flex flex-col items-center justify-center h-64 opacity-10">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mb-4 animate-pulse"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p class="font-sans italic text-[20px]">Awaiting Transmission</p>
          </div>

          <!-- Gradient end marker -->
          <div class="h-px bg-gradient-to-r from-transparent via-atc-orange to-transparent opacity-50 -mt-4" />
          <div ref="streamEnd" />
        </div>
      </main>

      <!-- RIGHT RAIL -->
      <aside class="flex flex-col gap-3.5 px-5 py-6 overflow-y-auto">
        <!-- Callsigns -->
        <div class="p-4 rounded-2xl bg-atc-card border border-atc-line">
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-3.5">RECENT CALLSIGNS</div>
          <div class="flex flex-col gap-2">
            <div v-for="(cs, i) in callsigns" :key="cs"
              class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-atc-elev">
              <span class="font-mono text-[11px] text-atc-faint w-5">{{ String(i+1).padStart(2,'0') }}</span>
              <span class="flex-1 font-mono text-[13px] font-semibold tracking-[0.3px]">{{ cs }}</span>
              <span class="font-mono text-[9px] text-atc-mint tracking-[1.2px] px-1.5 py-0.5 rounded-full border"
                    style="border-color:rgba(52,211,153,0.3);background:rgba(52,211,153,0.08)">ACTIVE</span>
            </div>
            <div v-if="callsigns.length === 0" class="text-[13px] text-atc-faint py-2">
              No callsigns detected. Listening…
            </div>
          </div>
        </div>

        <!-- Runway diagram -->
        <div class="p-4 rounded-2xl bg-atc-card border border-atc-line">
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-3.5">RUNWAY · {{ icao }}</div>
          <RunwayDiagram :size="260" accent="#FF5A1F" />
          <div class="grid grid-cols-2 gap-1.5 mt-2.5 font-mono text-[12px] tracking-[0.3px]">
            <div><span class="text-atc-faint text-[10px] block uppercase tracking-[1px] mb-0.5">ACTIVE</span><b class="text-atc-orange">25L · 25R</b></div>
            <div><span class="text-atc-faint text-[10px] block uppercase tracking-[1px] mb-0.5">WIND</span><b>{{ metar?.wind || '—' }}</b></div>
          </div>
        </div>

        <!-- Model info -->
        <div class="p-4 rounded-2xl bg-atc-card border border-atc-line">
          <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-3.5">TRANSCRIPTION MODEL</div>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                 style="background:rgba(255,90,31,0.12);border:1px solid #FF5A1F">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" stroke-width="2" stroke-linecap="round">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
              </svg>
            </div>
            <div>
              <div class="text-[15px] font-semibold" style="letter-spacing:-0.2px">Gemini 3.0 Flash</div>
              <div class="text-[11px] text-atc-dim mt-0.5">Aviation-tuned · preview</div>
            </div>
          </div>
          <p class="text-[12.5px] text-atc-dim leading-relaxed m-0">
            Voice activity detection filters silence; only speech segments are transcribed.
            Callsigns are extracted per transmission.
          </p>
        </div>
      </aside>
    </div>

    <!-- STICKY PLAYER BAR -->
    <footer class="flex items-center gap-6 px-7 py-4 bg-atc-card border-t border-atc-line-strong flex-shrink-0">
      <div class="flex items-center gap-4 min-w-[280px]">
        <button @click="$emit('toggle-play')"
          class="w-12 h-12 rounded-full bg-atc-orange text-atc-bg border-none grid place-items-center cursor-pointer flex-shrink-0">
          <svg v-if="isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
        <div>
          <div class="text-[15px] font-bold" style="letter-spacing:-0.2px">{{ activeFeed?.name || 'No feed selected' }}</div>
          <div class="flex items-center gap-2 mt-0.5 font-mono text-[12px] text-atc-dim tracking-[0.3px]">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-[1.5px]"
                  style="border-color:rgba(255,59,48,0.4);color:#ff6b62">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" style="box-shadow:0 0 6px #ff3b30" />
              LIVE
            </span>
            <span v-if="activeFeed?.freq">{{ activeFeed.freq }} MHz ·</span>
            <span>{{ activeFeed?.listeners || 0 }} listening ·</span>
            <span>{{ sessionElapsed }}</span>
          </div>
        </div>
      </div>

      <div class="flex-1 flex items-center px-2">
        <Waveform :playing="isPlaying" :bars="80" :height="36" />
      </div>

      <div class="flex items-center gap-2">
        <button class="w-9 h-9 rounded-full bg-atc-high border border-atc-line text-atc-text cursor-pointer grid place-items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
        </button>
        <button @click="$emit('download')" class="w-9 h-9 rounded-full bg-atc-high border border-atc-line text-atc-text cursor-pointer grid place-items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button @click="$emit('stop')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-atc-red text-white border-none text-[13px] font-semibold cursor-pointer font-sans">
          <span class="w-2 h-2 bg-white inline-block flex-shrink-0" />
          Stop
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import TopBar from '../ui/TopBar.vue'
import Waveform from '../ui/Waveform.vue'
import RunwayDiagram from '../ui/RunwayDiagram.vue'
import { useMetar } from '../../composables/useMetar.js'

const props = defineProps({
  icao:            { type: String,  default: '' },
  channels:        { type: Array,   default: () => [] },
  activeFeedId:    { type: String,  default: null  },
  captions:        { type: Array,   default: () => [] },
  connectionState: { type: String,  default: 'IDLE' },
  isPlaying:       { type: Boolean, default: false  },
})

const emit = defineEmits(['back', 'switch-feed', 'toggle-play', 'stop', 'download'])

const filter    = ref('all')
const streamEl  = ref(null)
const streamEnd = ref(null)

const activeFeed = computed(() => props.channels?.find(c => c.id === props.activeFeedId) || props.channels?.[0] || null)

// METAR for right rail wind
const icaoRef = computed(() => props.icao)
const { parsed: metar } = useMetar(icaoRef)

// Speaker metadata
const SPEAKERS = {
  atc:     { label: 'ATC',  tone: 'Tower',    color: '#FF5A1F' },
  ATC:     { label: 'ATC',  tone: 'Tower',    color: '#FF5A1F' },
  plane:   { label: 'ACFT', tone: 'Aircraft', color: '#34d399' },
  PLANE:   { label: 'ACFT', tone: 'Aircraft', color: '#34d399' },
  unknown: { label: 'UNK',  tone: 'Unknown',  color: '#8aa0b4' },
}
const speakerMeta = (s) => SPEAKERS[s] || SPEAKERS.unknown
const speakerStyle = (s) => {
  const c = speakerMeta(s).color
  return { color: c, borderColor: `${c}66`, background: `${c}12` }
}

// Filter
const filters = [
  { id: 'all',     label: 'All speakers', color: 'var(--atc-text)' },
  { id: 'atc',     label: 'Tower',        color: '#FF5A1F'         },
  { id: 'plane',   label: 'Aircraft',     color: '#34d399'         },
  { id: 'unknown', label: 'Unknown',      color: '#8aa0b4'         },
]

const realCaptions = computed(() => props.captions || [])

const visible = computed(() => {
  const all = realCaptions.value
  if (filter.value === 'all') return all
  return all.filter(c => {
    const s = (c.speaker || '').toLowerCase()
    if (filter.value === 'atc')     return s === 'atc'
    if (filter.value === 'plane')   return s === 'plane'
    if (filter.value === 'unknown') return s === 'unknown' || !s
    return true
  })
})

const counts = computed(() => ({
  all:     realCaptions.value.length,
  atc:     realCaptions.value.filter(c => ['atc','ATC'].includes(c.speaker)).length,
  plane:   realCaptions.value.filter(c => ['plane','PLANE'].includes(c.speaker)).length,
  unknown: realCaptions.value.filter(c => !['atc','ATC','plane','PLANE'].includes(c.speaker)).length,
}))

// Callsigns
const AIRLINES = ['DELTA','UNITED','SOUTHWEST','AMERICAN','ALASKA','JETBLUE','FEDEX','UPS','HAWAIIAN','CACTUS','SKYWEST']
const parseCallsign = (text) => {
  if (!text) return null
  const m = text.match(new RegExp(`\\b(${AIRLINES.join('|')})\\b\\s+([0-9A-Z]+)`, 'i'))
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null
}

const callsigns = computed(() => {
  const seen = new Set(), out = []
  for (let i = realCaptions.value.length - 1; i >= 0; i--) {
    const cs = parseCallsign(realCaptions.value[i].caption)
    if (cs && !seen.has(cs) && out.length < 6) { seen.add(cs); out.push(cs) }
  }
  return out
})

// Typewriter effect on newest caption
const displayedText = ref('')
const typing = ref(false)
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
    i++; displayedText.value = text.slice(0, i)
    if (i >= text.length) { clearInterval(typeTimer); typing.value = false }
  }, 18)

  await nextTick()
  streamEnd.value?.scrollIntoView({ behavior: 'smooth' })
}, { deep: true })

// Session elapsed
const sessionElapsed = ref('00:00')
const sessionStart = ref(Date.now() - 73000)
let sessionTimer = null
const tickSession = () => {
  const s = Math.floor((Date.now() - sessionStart.value) / 1000)
  const m = Math.floor(s / 60)
  sessionElapsed.value = `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}
onMounted(() => { tickSession(); sessionTimer = setInterval(tickSession, 1000) })
onUnmounted(() => { clearInterval(sessionTimer); clearInterval(typeTimer) })

const sessionStats = computed(() => [
  { label: 'UPTIME',   value: sessionElapsed.value },
  { label: 'SEGMENTS', value: counts.value.all },
  { label: 'LATENCY',  value: '184ms' },
  { label: 'VAD',      value: '82%', accent: true },
])

// Zulu time formatter
const fmtZulu = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
</script>
