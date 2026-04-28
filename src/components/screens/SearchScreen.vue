<template>
  <div class="min-h-screen bg-atc-bg bg-[radial-gradient(circle_at_22%_12%,rgba(255,90,31,0.22),transparent_32%),radial-gradient(circle_at_78%_80%,rgba(255,255,255,0.045),transparent_34%),linear-gradient(135deg,rgba(255,90,31,0.08),transparent_38%)] text-atc-text">
    <main class="grid min-h-screen place-items-start px-5 py-6 sm:place-items-center sm:p-10 lg:p-14">
      <section class="w-full max-w-[860px]">
        <div class="mb-4 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[1.4px] text-atc-dim">
          <span class="text-atc-text">ADSBao</span>
          <span class="text-atc-orange">/</span>
          <span>Airport search</span>
        </div>

        <label
          class="input flex h-auto w-full items-center gap-3 rounded-[26px] border-white/20 bg-[linear-gradient(145deg,rgba(38,40,46,0.9),rgba(17,18,22,0.84))] px-4 py-4 text-atc-text shadow-[0_26px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,box-shadow] duration-150 sm:gap-3.5 sm:px-5 sm:py-5"
          :class="{ 'border-atc-orange/70 shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,90,31,0.18)_inset]': focused }"
        >
          <svg class="shrink-0 text-atc-orange" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="q"
            autofocus
            @focus="focused = true"
            @blur="focused = false"
            @keydown.enter="doSearch"
            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-extrabold tracking-normal text-atc-text outline-none placeholder:text-atc-dim sm:text-3xl"
            placeholder="Search by ICAO, IATA, city, or airport name"
          />
          <kbd class="kbd hidden shrink-0 border-white/10 bg-transparent font-mono text-[10px] uppercase tracking-[1px] text-atc-dim sm:inline-flex">
            {{ searchLoading ? '...' : 'enter' }}
          </kbd>
        </label>

        <div v-if="q.trim()" class="mt-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-[10px] uppercase tracking-[1.5px] text-atc-dim">
            <span>Search results</span>
            <span>{{ resultCountLabel }}</span>
          </div>

          <div v-if="searchLoading && !searchRows.length" class="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">Searching airports...</div>
          <div v-else-if="searchError" class="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">{{ searchError }}</div>
          <div v-else-if="!searchRows.length" class="py-7 text-center font-mono text-xs tracking-[0.6px] text-atc-dim">No airport matched "{{ q.trim() }}".</div>
          <div v-else class="mt-2.5 grid gap-2">
            <button
              v-for="airport in searchRows"
              :key="airport.icao || airport.code || airport.name"
              class="btn grid h-auto min-h-0 w-full grid-cols-[62px_minmax(0,1fr)] items-center justify-start gap-4 rounded-[18px] border-white/15 bg-white/[0.06] px-4 py-3.5 text-left font-sans normal-case text-atc-text hover:-translate-y-px hover:border-atc-orange/40 hover:bg-white/[0.09] sm:grid-cols-[86px_minmax(0,1fr)_auto]"
              @click="openAirport(airport)"
            >
              <span class="font-display text-[32px] italic leading-[0.8] text-atc-orange sm:text-[38px]">{{ airport.iata || airport.icao || airport.code }}</span>
              <span class="min-w-0">
                <strong class="block truncate text-[17px] font-extrabold tracking-normal text-atc-text">{{ airport.name }}</strong>
                <small class="mt-0.5 block truncate text-[13px] text-atc-dim">{{ airportSubtitle(airport) }}</small>
              </span>
              <span class="badge hidden border-0 bg-transparent font-mono text-[11px] uppercase tracking-[1.2px] text-atc-dim sm:inline-flex">{{ airport.icao || airport.code || '—' }}</span>
            </button>
          </div>
        </div>

        <div v-else class="mt-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-[10px] uppercase tracking-[1.5px] text-atc-dim">
            <span>Featured airports</span>
            <span>{{ featuredAirports.length }}</span>
          </div>

          <div class="mt-2.5 grid gap-2">
            <button
              v-for="airport in featuredAirports"
              :key="airport.icao"
              class="btn grid h-auto min-h-0 w-full grid-cols-[62px_minmax(0,1fr)] items-center justify-start gap-4 rounded-[18px] border-white/15 bg-white/[0.06] px-4 py-3.5 text-left font-sans normal-case text-atc-text first:bg-[linear-gradient(100deg,rgba(255,90,31,0.16),rgba(255,255,255,0.065))] hover:-translate-y-px hover:border-atc-orange/40 hover:bg-white/[0.09] sm:grid-cols-[86px_minmax(0,1fr)_auto]"
              @click="openAirport(airport)"
            >
              <span class="font-display text-[32px] italic leading-[0.8] text-atc-orange sm:text-[38px]">{{ airport.iata }}</span>
              <span class="min-w-0">
                <strong class="block truncate text-[17px] font-extrabold tracking-normal text-atc-text">{{ airport.name }}</strong>
                <small class="mt-0.5 block truncate text-[13px] text-atc-dim">{{ airport.city }} · {{ airport.country }}</small>
              </span>
              <span class="badge hidden border-0 bg-transparent font-mono text-[11px] uppercase tracking-[1.2px] text-atc-dim sm:inline-flex">{{ airport.icao }}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { airportDirectoryClient } from '../../services/airportDirectory.js'
import { HOME_AIRPORT_COUNTRY } from '../../config/homeAirportDirectory.js'
import { airportSubtitle } from '../../utils/airport.js'

const emit = defineEmits(['open-airport'])

const q = ref('')
const focused = ref(false)
const results = ref([])
const searchLoading = ref(false)
const searchError = ref(null)

const featuredAirports = [
  {
    icao: 'KBOS',
    iata: 'BOS',
    name: 'Boston Logan International Airport',
    city: 'Boston',
    country: 'US',
    lat: 42.3656,
    lon: -71.0096,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
  {
    icao: 'KLAX',
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'US',
    lat: 33.9425,
    lon: -118.4081,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
  {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'US',
    lat: 40.6413,
    lon: -73.7781,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
  {
    icao: 'KORD',
    iata: 'ORD',
    name: "Chicago O'Hare International Airport",
    city: 'Chicago',
    country: 'US',
    lat: 41.9742,
    lon: -87.9073,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
  {
    icao: 'KSFO',
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    country: 'US',
    lat: 37.6213,
    lon: -122.379,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
  {
    icao: 'KSEA',
    iata: 'SEA',
    name: 'Seattle-Tacoma International Airport',
    city: 'Seattle',
    country: 'US',
    lat: 47.4502,
    lon: -122.3088,
    type: 'large_airport',
    type_label: 'Large Airport',
  },
]

let searchTimer = null
let activeRequestId = 0

const searchRows = computed(() => {
  const query = q.value.trim().toUpperCase()
  if (!query) return []

  const matchesFeatured = featuredAirports.filter((airport) => {
    const haystack = [
      airport.icao,
      airport.iata,
      airport.name,
      airport.city,
      airport.country,
    ].join(' ').toUpperCase()
    return haystack.includes(query)
  })

  const seen = new Set()
  return [...matchesFeatured, ...results.value].filter((airport) => {
    const key = String(airport.icao || airport.code || airport.name || '').toUpperCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const resultCountLabel = computed(() => {
  if (searchLoading.value) return 'loading'
  return `${searchRows.value.length} result${searchRows.value.length === 1 ? '' : 's'}`
})

const loadAirports = async (query) => {
  const trimmed = String(query || '').trim()
  const requestId = ++activeRequestId

  if (!trimmed) {
    results.value = []
    searchLoading.value = false
    searchError.value = null
    return
  }

  searchLoading.value = true
  searchError.value = null
  try {
    const payload = await airportDirectoryClient.loadAirports({
      query: trimmed,
      country: HOME_AIRPORT_COUNTRY,
      kind: 'all',
      limit: 12,
    })
    if (requestId !== activeRequestId) return
    results.value = payload.airports || []
  } catch (err) {
    if (requestId !== activeRequestId) return
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
  const normalized = q.value.trim().toUpperCase()
  if (!normalized) return

  const exact = [...searchRows.value, ...featuredAirports].find((airport) => {
    const icao = String(airport.icao || '').toUpperCase()
    const iata = String(airport.iata || '').toUpperCase()
    const code = String(airport.code || '').toUpperCase()
    return normalized === icao || normalized === iata || normalized === code
  })

  if (exact) {
    openAirport(exact)
    return
  }

  if (searchRows.value[0]) {
    openAirport(searchRows.value[0])
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
  }, value.trim() ? 220 : 0)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>
