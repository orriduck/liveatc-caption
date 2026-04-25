<template>
  <transition name="screen" mode="out-in">
    <SearchScreen
      v-if="screen === 'search'"
      key="search"
      :loading="loading"
      :error="error"
      @open-airport="handleOpenAirport"
    />

    <AirportCaptionScreen
      v-else
      key="airport"
      :icao="currentIcao"
      :airport="airport"
      :loading="loading"
      :error="error"
      @back="handleBack"
    />
  </transition>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AirportCaptionScreen from '../components/screens/AirportCaptionScreen.vue'
import SearchScreen from '../components/screens/SearchScreen.vue'

const route = useRoute()
const router = useRouter()

const airport = ref(null)
const currentIcao = ref('')
const loading = ref(false)
const error = ref(null)

const screen = computed(() => (route.params.icao ? 'airport' : 'search'))

const loadAirport = async (icao) => {
  if (!icao || icao.length < 3) return
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/search?icao=${encodeURIComponent(icao.trim())}`)
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Airport not found' : 'Airport lookup is unavailable right now')
    }

    const payload = await response.json()
    airport.value = payload.airport || null
    currentIcao.value = String(payload.airport?.icao || icao).toUpperCase()
  } catch (err) {
    console.error('Failed to load airport', err)
    airport.value = null
    error.value = err?.message || 'Failed to load airport'
  } finally {
    loading.value = false
  }
}

const handleOpenAirport = async (selectedAirport) => {
  const nextIcao = String(selectedAirport.icao || selectedAirport.code || '').toUpperCase()
  if (!nextIcao) return

  currentIcao.value = nextIcao
  router.push({ name: 'airport', params: { icao: nextIcao } })
  await loadAirport(nextIcao)
}

const handleBack = () => {
  airport.value = null
  error.value = null
  currentIcao.value = ''
  router.push({ name: 'home' })
}

onMounted(() => {
  const { icao } = route.params
  if (icao) {
    loadAirport(String(icao))
  }
})

watch(
  () => route.params.icao,
  (icao) => {
    if (icao && String(icao).toUpperCase() !== currentIcao.value) {
      loadAirport(String(icao))
      return
    }

    if (!icao && currentIcao.value) {
      airport.value = null
      error.value = null
      currentIcao.value = ''
    }
  },
)
</script>
