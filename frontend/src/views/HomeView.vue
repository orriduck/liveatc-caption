<template>
  <transition name="screen" mode="out-in">
    <!-- SEARCH screen -->
    <SearchScreen
      v-if="screen === 'search'"
      key="search"
      :loading="loading"
      :error="error"
      @open-airport="handleOpenAirport"
    />

    <!-- UNIFIED airport + caption screen -->
    <AirportCaptionScreen
      v-else-if="screen === 'station'"
      key="station"
      :icao="currentIcao"
      :airport="data?.airport"
      :channels="data?.channels"
      :active-feed-id="activeChannel?.id"
      :captions="captions"
      :connection-state="connectionState"
      :is-playing="isPlaying"
      :analyser="analyserRef"
      @back="handleBack"
      @select-feed="handleSelectFeed"
      @toggle-play="handleStart"
      @stop="handleStop"
    />
  </transition>
</template>

<script setup>
import { ref, inject, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SearchScreen         from '../components/screens/SearchScreen.vue'
import AirportCaptionScreen from '../components/screens/AirportCaptionScreen.vue'

const router = useRouter()
const route  = useRoute()

const {
  data,
  loading,
  error,
  activeChannel,
  isConnected,
  analyserRef,
  connectionState,
  isPlaying,
  captions,
  handleSearch,
  connect,
  disconnect,
} = inject('liveATC')

const currentIcao = ref('')

// Derive screen from route — no extra state needed
const screen = computed(() => route.params.icao ? 'station' : 'search')

// ── Navigation helpers ────────────────────────────────────────────────────

const handleOpenAirport = async (airport) => {
  currentIcao.value = airport.code
  router.push({ name: 'airport', params: { icao: airport.code } })
  await handleSearch(airport.code)
}

const handleSelectFeed = async (channel) => {
  if (activeChannel.value?.id === channel.id) return
  disconnect()
  activeChannel.value = channel
  isConnected.value   = false
  router.push({ name: 'channel', params: { icao: currentIcao.value, channel: channel.id } })
  await connect()
}

const handleStop = () => {
  disconnect()
}

const handleStart = async () => {
  if (!activeChannel.value) return
  disconnect()
  await connect()
}

const handleBack = () => {
  disconnect()
  router.push({ name: 'home' })
}

// ── Restore state from URL on load / navigation ───────────────────────────

const restoreFromRoute = async (icao, channelId) => {
  if (!icao) return
  currentIcao.value = icao.toUpperCase()
  await handleSearch(icao)
  if (channelId && data.value?.channels) {
    const ch = data.value.channels.find(c => c.id === channelId)
    if (ch) {
      activeChannel.value = ch
      await connect()
    }
  }
}

// On first load, restore from URL params
onMounted(() => {
  const { icao, channel } = route.params
  if (icao) restoreFromRoute(icao, channel)
})

// If the user navigates back/forward with browser buttons, re-sync
watch(() => route.params, ({ icao, channel }) => {
  if (icao && icao !== currentIcao.value) {
    restoreFromRoute(icao, channel)
  } else if (!icao && currentIcao.value) {
    // Navigated back to home via browser button
    disconnect()
    currentIcao.value = ''
  }
})

</script>
