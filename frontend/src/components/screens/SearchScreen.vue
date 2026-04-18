<template>
  <div class="flex flex-col min-h-screen bg-atc-bg text-atc-text font-sans">
    <TopBar screen="SEARCH · AIRPORTS" />

    <!-- HERO -->
    <section class="relative px-14 pt-[72px] pb-14 border-b border-atc-line overflow-hidden"
             style="background:radial-gradient(ellipse at 85% 20%, rgba(255,90,31,0.16), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(255,90,31,0.08), transparent 50%), #0a0a0b">
      <div class="max-w-3xl relative z-10">
        <!-- Live eyebrow -->
        <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-atc-line bg-atc-card font-mono text-[11px] tracking-[0.5px] text-atc-dim mb-7">
          <span class="w-1.5 h-1.5 rounded-full bg-atc-mint flex-shrink-0 animate-pulse-dot" style="box-shadow:0 0 8px #34d399" />
          LIVEATC · {{ totalFeeds }} feeds · {{ totalListeners }} listening now
        </div>

        <h1 class="font-sans text-[88px] leading-[0.95] font-bold text-atc-text m-0" style="letter-spacing:-3.2px">
          Listen to any<br />
          <span class="font-display italic font-normal text-atc-orange" style="letter-spacing:-2px">tower</span> in the world.
        </h1>
        <p class="mt-6 text-lg leading-relaxed text-atc-dim max-w-xl font-normal">
          Real-time AI transcription of live air traffic control audio.
          Search an airport, pick a feed, read the conversation as it happens.
        </p>

        <!-- Search -->
        <div class="mt-9 flex items-center gap-3.5 px-5 py-4 bg-atc-card border border-atc-line-strong rounded-2xl max-w-2xl"
             :class="{ 'border-atc-orange': focused }"
             style="transition:border-color 0.15s">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-atc-dim flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="q"
            @focus="focused = true"
            @blur="focused = false"
            @keydown.enter="doSearch"
            placeholder="KLAX, JFK, London Heathrow…"
            class="flex-1 bg-transparent border-none outline-none text-atc-text text-[17px] font-medium placeholder:text-atc-faint font-sans"
          />
          <button v-if="loading" class="font-mono text-[11px] text-atc-dim tracking-widest">…</button>
          <kbd v-else class="font-mono text-[11px] px-2 py-1 rounded-md bg-atc-high text-atc-dim border border-atc-line">↵</kbd>
        </div>

        <!-- Region chips -->
        <div class="flex gap-2 mt-4 flex-wrap">
          <button
            v-for="r in regions"
            :key="r.id"
            @click="region = r.id"
            class="px-4 py-2 rounded-full border text-[13px] font-medium cursor-pointer transition-all"
            :class="region === r.id
              ? 'bg-atc-text text-atc-bg border-atc-text'
              : 'bg-transparent border-atc-line text-atc-dim hover:border-atc-line-strong'"
          >{{ r.label }}</button>
        </div>
      </div>

      <!-- Accent number -->
      <div class="absolute top-14 right-14 text-right pointer-events-none">
        <div class="font-display italic text-transparent leading-[0.9] select-none"
             style="font-size:140px;font-weight:700;letter-spacing:-6px;-webkit-text-stroke:1px #FF5A1F">
          {{ String(AIRPORTS.length).padStart(3,'0') }}
        </div>
        <div class="font-mono text-[11px] text-atc-orange tracking-[2px] mt-2">AIRPORTS ONLINE</div>
      </div>
    </section>

    <!-- RESULTS GRID -->
    <section class="px-14 py-12 flex-1">
      <div class="flex items-baseline justify-between mb-6 pb-4 border-b border-atc-line">
        <div class="flex items-baseline gap-3 text-[26px] font-semibold" style="letter-spacing:-0.5px">
          {{ q ? `Results for "${q}"` : 'Popular airports' }}
          <span class="font-mono text-[13px] text-atc-faint tracking-[0.5px]">{{ filtered.length }}</span>
        </div>
        <div class="flex items-center gap-2 text-[12px]">
          <span class="text-atc-faint uppercase tracking-[1px]">Sort</span>
          <button class="px-3.5 py-2 rounded-lg bg-atc-card border border-atc-line text-atc-text text-[13px] cursor-pointer font-sans">
            By listeners ↓
          </button>
        </div>
      </div>

      <div v-if="loading && q" class="flex items-center justify-center py-24">
        <div class="font-mono text-[11px] text-atc-faint tracking-widest animate-pulse">SEARCHING…</div>
      </div>

      <div v-else-if="error && q" class="flex items-center justify-center py-24">
        <div class="font-mono text-[12px] text-atc-dim">No results for "{{ q }}" — check the ICAO code and try again.</div>
      </div>

      <div v-else class="grid gap-3.5" style="grid-template-columns:repeat(3,1fr)">
        <AirportCard
          v-for="(a, i) in filtered"
          :key="a.code"
          :a="a"
          :highlight="i === 0 && !q"
          @click="openAirport(a)"
        />
      </div>
    </section>

    <!-- Footer -->
    <footer class="flex justify-between items-center px-14 py-5 border-t border-atc-line">
      <div class="flex items-center gap-3.5">
        <Wordmark />
        <span class="text-[12px] text-atc-faint">v2.4 · Gemini 3.0 Flash Preview</span>
      </div>
      <div class="flex gap-6 text-[13px] text-atc-dim">
        <span class="cursor-pointer hover:text-atc-text transition-colors">About</span>
        <span class="cursor-pointer hover:text-atc-text transition-colors">API</span>
        <span class="cursor-pointer hover:text-atc-text transition-colors">LiveATC.net ↗</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TopBar from '../ui/TopBar.vue'
import Wordmark from '../ui/Wordmark.vue'
import AirportCard from '../ui/AirportCard.vue'

const emit = defineEmits(['open-airport'])

const props = defineProps({
  loading: { type: Boolean, default: false },
  error:   { type: String,  default: null  },
})

const q       = ref('')
const region  = ref('all')
const focused = ref(false)

// Static popular airports list for the hero grid
// Supplemented by real search results
const AIRPORTS = [
  { code: 'KLAX', iata: 'LAX', name: 'Los Angeles Intl',       city: 'Los Angeles',    country: 'US', feeds: 10, listeners: 62 },
  { code: 'KJFK', iata: 'JFK', name: 'John F. Kennedy Intl',   city: 'New York',       country: 'US', feeds: 12, listeners: 88 },
  { code: 'KORD', iata: 'ORD', name: "Chicago O'Hare",          city: 'Chicago',        country: 'US', feeds: 14, listeners: 54 },
  { code: 'KATL', iata: 'ATL', name: 'Hartsfield-Jackson',      city: 'Atlanta',        country: 'US', feeds: 9,  listeners: 41 },
  { code: 'KDFW', iata: 'DFW', name: 'Dallas / Fort Worth',     city: 'Dallas',         country: 'US', feeds: 11, listeners: 37 },
  { code: 'KSFO', iata: 'SFO', name: 'San Francisco Intl',      city: 'San Francisco',  country: 'US', feeds: 8,  listeners: 46 },
  { code: 'KBOS', iata: 'BOS', name: 'Boston Logan',            city: 'Boston',         country: 'US', feeds: 7,  listeners: 22 },
  { code: 'KSEA', iata: 'SEA', name: 'Seattle-Tacoma',          city: 'Seattle',        country: 'US', feeds: 8,  listeners: 29 },
  { code: 'EGLL', iata: 'LHR', name: 'London Heathrow',         city: 'London',         country: 'UK', feeds: 9,  listeners: 73 },
  { code: 'LFPG', iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris',          country: 'FR', feeds: 6,  listeners: 18 },
  { code: 'EDDF', iata: 'FRA', name: 'Frankfurt Main',          city: 'Frankfurt',      country: 'DE', feeds: 7,  listeners: 24 },
  { code: 'RJTT', iata: 'HND', name: 'Tokyo Haneda',            city: 'Tokyo',          country: 'JP', feeds: 5,  listeners: 16 },
]

const regions = [
  { id: 'all', label: 'All regions'    },
  { id: 'US',  label: 'North America'  },
  { id: 'EU',  label: 'Europe'         },
  { id: 'AP',  label: 'Asia Pacific'   },
]

const totalFeeds     = computed(() => AIRPORTS.reduce((s, a) => s + a.feeds, 0))
const totalListeners = computed(() => AIRPORTS.reduce((s, a) => s + a.listeners, 0))

const filtered = computed(() => {
  return AIRPORTS.filter(a => {
    const matchQ = !q.value
      || a.code.toLowerCase().includes(q.value.toLowerCase())
      || a.iata.toLowerCase().includes(q.value.toLowerCase())
      || a.name.toLowerCase().includes(q.value.toLowerCase())
      || a.city.toLowerCase().includes(q.value.toLowerCase())
    const matchR = region.value === 'all'
      || (region.value === 'EU' ? ['UK','FR','DE'].includes(a.country) : false)
      || (region.value === 'AP' ? ['JP'].includes(a.country) : false)
      || (region.value === 'US' ? a.country === 'US' : false)
    return matchQ && matchR
  })
})

const doSearch = () => {
  if (!q.value.trim()) return
  // Try to find in our list first
  const found = AIRPORTS.find(a =>
    a.code.toLowerCase() === q.value.toLowerCase() ||
    a.iata.toLowerCase() === q.value.toLowerCase()
  )
  if (found) {
    openAirport(found)
  } else {
    // Search by ICAO — the HomeView will handle the API call
    emit('open-airport', { code: q.value.toUpperCase(), iata: q.value.toUpperCase(), name: '', city: '', country: '' })
  }
}

const openAirport = (a) => {
  emit('open-airport', a)
}
</script>
