<template>
  <div class="home-shell">
    <main class="home-main">
      <section class="search-console">
        <div class="home-mark">
          <span class="home-brand">ADSBao</span>
          <span class="home-divider">/</span>
          <span>Airport search</span>
        </div>

        <label class="search-box" :class="{ 'search-box-active': focused }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="q"
            autofocus
            @focus="focused = true"
            @blur="focused = false"
            @keydown.enter="doSearch"
            placeholder="Search by ICAO, IATA, city, or airport name"
          />
          <span class="search-key">{{ searchLoading ? '...' : 'enter' }}</span>
        </label>

        <div v-if="q.trim()" class="results-panel">
          <div class="section-label">
            <span>Search results</span>
            <span>{{ resultCountLabel }}</span>
          </div>

          <div v-if="searchLoading && !searchRows.length" class="empty-state">Searching airports...</div>
          <div v-else-if="searchError" class="empty-state">{{ searchError }}</div>
          <div v-else-if="!searchRows.length" class="empty-state">No airport matched "{{ q.trim() }}".</div>
          <div v-else class="airport-list">
            <button
              v-for="airport in searchRows"
              :key="airport.icao || airport.code || airport.name"
              class="airport-row"
              @click="openAirport(airport)"
            >
              <span class="airport-row-code">{{ airport.iata || airport.icao || airport.code }}</span>
              <span class="airport-row-main">
                <strong>{{ airport.name }}</strong>
                <small>{{ airportSubtitle(airport) }}</small>
              </span>
              <span class="airport-row-meta">{{ airport.icao || airport.code || '—' }}</span>
            </button>
          </div>
        </div>

        <div v-else class="featured-panel">
          <div class="section-label">
            <span>Featured airports</span>
            <span>{{ featuredAirports.length }}</span>
          </div>

          <div class="airport-list">
            <button
              v-for="airport in featuredAirports"
              :key="airport.icao"
              class="airport-row featured-row"
              @click="openAirport(airport)"
            >
              <span class="airport-row-code">{{ airport.iata }}</span>
              <span class="airport-row-main">
                <strong>{{ airport.name }}</strong>
                <small>{{ airport.city }} · {{ airport.country }}</small>
              </span>
              <span class="airport-row-meta">{{ airport.icao }}</span>
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

const airportSubtitle = (airport) => {
  if (airport.city && airport.country) return `${airport.city} · ${airport.country}`
  if (airport.city) return airport.city
  if (airport.country) return airport.country
  return airport.type_label || airport.type || 'Airport'
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

<style scoped>
.home-shell {
  background:
    radial-gradient(circle at 22% 12%, rgba(255, 90, 31, 0.22), transparent 32%),
    radial-gradient(circle at 78% 80%, rgba(255, 255, 255, 0.045), transparent 34%),
    linear-gradient(135deg, rgba(255, 90, 31, 0.08), transparent 38%),
    var(--atc-bg);
  color: var(--atc-text);
  min-height: 100vh;
}

.home-main {
  display: grid;
  min-height: 100vh;
  padding: clamp(22px, 4vw, 58px);
  place-items: center;
}

.search-console {
  max-width: 860px;
  width: min(100%, 860px);
}

.home-mark,
.section-label,
.search-key,
.airport-row-meta {
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
}

.home-mark {
  align-items: center;
  color: var(--atc-dim);
  display: flex;
  font-size: 11px;
  gap: 10px;
  letter-spacing: 1.4px;
  margin-bottom: 18px;
}

.home-brand {
  color: var(--atc-text);
}

.home-divider {
  color: var(--atc-orange);
}

.search-box {
  align-items: center;
  background: linear-gradient(145deg, rgba(38, 40, 46, 0.9), rgba(17, 18, 22, 0.84));
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 26px;
  box-shadow: 0 26px 90px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 14px;
  padding: clamp(16px, 2.4vw, 23px);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.search-box-active {
  border-color: rgba(255, 90, 31, 0.7);
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 90, 31, 0.18) inset;
}

.search-box svg {
  color: var(--atc-orange);
  flex-shrink: 0;
}

.search-box input {
  background: transparent;
  border: 0;
  color: var(--atc-text);
  flex: 1;
  font: inherit;
  font-size: clamp(20px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.04em;
  min-width: 0;
  outline: none;
}

.search-box input::placeholder {
  color: var(--atc-dim);
}

.search-key {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: var(--atc-dim);
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 1px;
  padding: 6px 10px;
}

.featured-panel,
.results-panel {
  margin-top: 22px;
}

.section-label {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--atc-dim);
  display: flex;
  font-size: 10px;
  justify-content: space-between;
  letter-spacing: 1.5px;
  padding-bottom: 10px;
}

.airport-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.airport-row {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 18px;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 16px;
  grid-template-columns: 86px minmax(0, 1fr) auto;
  padding: 14px 16px;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.airport-row:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 90, 31, 0.42);
  transform: translateY(-1px);
}

.featured-row:first-child {
  background: linear-gradient(100deg, rgba(255, 90, 31, 0.16), rgba(255, 255, 255, 0.065));
}

.airport-row-code {
  color: var(--atc-orange);
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  font-style: italic;
  line-height: 0.8;
}

.airport-row-main {
  min-width: 0;
}

.airport-row-main strong,
.airport-row-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.airport-row-main strong {
  color: var(--atc-text);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.airport-row-main small {
  color: var(--atc-dim);
  font-size: 13px;
  margin-top: 2px;
}

.airport-row-meta {
  color: var(--atc-dim);
  font-size: 11px;
  letter-spacing: 1.2px;
}

.empty-state {
  color: var(--atc-dim);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.6px;
  padding: 28px 0;
  text-align: center;
}

@media (max-width: 620px) {
  .home-main {
    align-items: start;
    padding: 22px;
  }

  .search-key {
    display: none;
  }

  .airport-row {
    grid-template-columns: 62px minmax(0, 1fr);
  }

  .airport-row-meta {
    display: none;
  }

  .airport-row-code {
    font-size: 32px;
  }
}
</style>
