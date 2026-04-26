<template>
  <div class="flex flex-col min-h-screen bg-atc-bg text-atc-text font-sans">
    <TopBar screen="SEARCH · AIRPORTS" />

    <section
      class="relative px-6 md:px-14 pt-[72px] pb-14 border-b border-atc-line overflow-hidden"
      style="background:radial-gradient(ellipse at 85% 20%, rgba(255,90,31,0.16), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(255,90,31,0.08), transparent 50%), #0a0a0b"
    >
      <div class="max-w-3xl relative z-10">
        <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-atc-line bg-atc-card font-mono text-[11px] tracking-[0.5px] text-atc-dim mb-7">
          <span class="w-1.5 h-1.5 rounded-full bg-atc-mint flex-shrink-0 animate-pulse-dot" style="box-shadow:0 0 8px #34d399" />
          US AIRPORT DIRECTORY · {{ catalogLabel }}
        </div>

        <h1 class="font-sans text-[clamp(54px,9vw,88px)] leading-[0.95] font-bold text-atc-text m-0" style="letter-spacing:-3.2px">
          Browse airport<br />
          <span class="font-display italic font-normal text-atc-orange" style="letter-spacing:-2px">traffic</span> fast.
        </h1>
        <p class="mt-6 text-lg leading-relaxed text-atc-dim max-w-xl font-normal">
          Search U.S. airports on airportsapi.com by ICAO, IATA, city, or airport name.
          The homepage is now filtered to United States airports only and cached in the browser for faster follow-up lookups.
        </p>

        <div
          class="mt-9 flex items-center gap-3.5 px-5 py-4 bg-atc-card border border-atc-line-strong rounded-2xl max-w-2xl"
          :class="{ 'border-atc-orange': focused }"
          style="transition:border-color 0.15s"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-atc-dim flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="q"
            @focus="focused = true"
            @blur="focused = false"
            @keydown.enter="doSearch"
            placeholder="KJFK, KLAX, Boston, JFK…"
            class="flex-1 bg-transparent border-none outline-none text-atc-text text-[17px] font-medium placeholder:text-atc-faint font-sans"
          />
          <button v-if="searchLoading" class="font-mono text-[11px] text-atc-dim tracking-widest">…</button>
          <kbd v-else class="font-mono text-[11px] px-2 py-1 rounded-md bg-atc-high text-atc-dim border border-atc-line">↵</kbd>
        </div>

        <div class="flex gap-2 mt-4 flex-wrap">
          <button
            v-for="option in kindOptions"
            :key="option.id"
            @click="kind = option.id"
            class="px-4 py-2 rounded-full border text-[13px] font-medium cursor-pointer transition-all"
            :class="kind === option.id
              ? 'bg-atc-text text-atc-bg border-atc-text'
              : 'bg-transparent border-atc-line text-atc-dim hover:border-atc-line-strong'"
          >{{ option.label }}</button>
        </div>
      </div>

      <div class="hidden lg:block absolute top-14 right-14 text-right pointer-events-none">
        <div
          class="font-display italic text-transparent leading-[0.9] select-none"
          style="font-size:140px;font-weight:700;letter-spacing:-6px;-webkit-text-stroke:1px #FF5A1F"
        >
          {{ String(filtered.length).padStart(3, '0') }}
        </div>
        <div class="font-mono text-[11px] text-atc-orange tracking-[2px] mt-2">{{ q ? 'MATCHES' : 'BROWSE SET' }}</div>
      </div>
    </section>

    <section class="px-6 md:px-14 py-12 flex-1">
      <div class="flex flex-col lg:flex-row lg:items-baseline justify-between gap-4 mb-6 pb-4 border-b border-atc-line">
        <div class="flex items-baseline gap-3 text-[26px] font-semibold" style="letter-spacing:-0.5px">
          {{ q ? `Results for "${q}"` : browseTitle }}
          <span class="font-mono text-[13px] text-atc-faint tracking-[0.5px]">{{ filtered.length }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[12px]">
          <span class="text-atc-faint uppercase tracking-[1px]">Primary source</span>
          <button class="px-3.5 py-2 rounded-lg bg-atc-card border border-atc-line text-atc-text text-[13px] cursor-pointer font-sans">
            {{ sourceLabel }}
          </button>
          <span class="text-atc-faint">{{ cacheStatusLabel }}</span>
        </div>
      </div>

      <div v-if="searchLoading" class="flex items-center justify-center py-24">
        <div class="font-mono text-[11px] text-atc-faint tracking-widest animate-pulse">SEARCHING…</div>
      </div>

      <div v-else-if="searchError" class="flex items-center justify-center py-24">
        <div class="font-mono text-[12px] text-atc-dim">{{ searchError }}</div>
      </div>

      <div v-else-if="!filtered.length" class="flex items-center justify-center py-24">
        <div class="font-mono text-[12px] text-atc-dim">No airports matched the current search.</div>
      </div>

      <div v-else class="grid gap-3.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <AirportCard
          v-for="(a, i) in filtered"
          :key="a.icao || a.code || a.name"
          :a="a"
          :highlight="i === 0 && !q"
          @click="openAirport(a)"
        />
      </div>
    </section>

    <footer class="flex flex-col md:flex-row gap-4 md:justify-between md:items-center px-6 md:px-14 py-5 border-t border-atc-line">
      <div class="flex items-center gap-3.5">
        <Wordmark />
        <span class="text-[12px] text-atc-faint">v0.4.0 · ADSBao preview</span>
      </div>
      <div class="flex gap-6 text-[13px] text-atc-dim">
        <span class="cursor-pointer hover:text-atc-text transition-colors">About</span>
        <span class="cursor-pointer hover:text-atc-text transition-colors">airportsapi.com</span>
        <span class="cursor-pointer hover:text-atc-text transition-colors">US airport directory</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import TopBar from '../ui/TopBar.vue'
import Wordmark from '../ui/Wordmark.vue'
import AirportCard from '../ui/AirportCard.vue'
import { airportDirectoryClient } from '../../services/airportDirectory.js'
import {
  HOME_AIRPORT_COUNTRY,
  HOME_AIRPORT_KIND_OPTIONS,
  buildHomeAirportBrowseTitle,
} from '../../config/homeAirportDirectory.js'

const emit = defineEmits(['open-airport'])

const q = ref('')
const kind = ref('all')
const focused = ref(false)
const results = ref([])
const searchLoading = ref(false)
const searchError = ref(null)
const cacheState = ref('cold')

const kindOptions = HOME_AIRPORT_KIND_OPTIONS

let searchTimer = null
let activeRequestId = 0

const filtered = computed(() => results.value)

const catalogLabel = computed(() => (
  cacheState.value === 'hit'
    ? `${results.value.length.toLocaleString()} cached locally`
    : `${results.value.length.toLocaleString()} live results`
))

const sourceLabel = computed(() => (
  cacheState.value === 'hit' ? 'airportsapi.com · cached' : 'airportsapi.com · live'
))

const cacheStatusLabel = computed(() => (
  cacheState.value === 'hit' ? 'frontend cache hit' : 'frontend cache warming'
))

const browseTitle = computed(() => buildHomeAirportBrowseTitle(kind.value))

const loadAirports = async (query = '') => {
  const requestId = ++activeRequestId
  searchLoading.value = true
  searchError.value = null
  try {
    const payload = await airportDirectoryClient.loadAirports({
      query,
      kind: kind.value,
      country: HOME_AIRPORT_COUNTRY,
      limit: 60,
    })
    if (requestId !== activeRequestId) {
      return
    }
    results.value = payload.airports || []
    cacheState.value = payload.cache || 'miss'
  } catch (err) {
    if (requestId !== activeRequestId) {
      return
    }
    console.error('Airport search failed', err)
    results.value = []
    searchError.value = err?.message || 'Airport directory is unavailable right now'
  } finally {
    if (requestId === activeRequestId) {
      searchLoading.value = false
    }
  }
}

const doSearch = () => {
  if (!q.value.trim()) return
  const normalized = q.value.trim().toUpperCase()
  const exact = results.value.find((airport) => {
    const icao = String(airport.icao || '').toUpperCase()
    const iata = String(airport.iata || '').toUpperCase()
    const code = String(airport.code || '').toUpperCase()
    return normalized === icao || normalized === iata || normalized === code
  })
  if (exact) {
    openAirport(exact)
    return
  }
  if (results.value[0]) {
    openAirport(results.value[0])
  }
}

const openAirport = (airport) => {
  emit('open-airport', {
    code: airport.icao || airport.code,
    icao: airport.icao || airport.code,
    iata: airport.iata || airport.code,
    name: airport.name || airport.code,
    city: airport.city || '',
    country: airport.country || '',
    lat: airport.lat ?? null,
    lon: airport.lon ?? null,
    type: airport.type || '',
    type_label: airport.type_label || '',
  })
}

watch(q, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadAirports(value)
  }, value.trim() ? 250 : 0)
})

watch(kind, () => {
  loadAirports(q.value)
})

onMounted(() => {
  loadAirports()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>
