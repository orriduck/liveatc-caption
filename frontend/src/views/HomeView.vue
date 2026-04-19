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
      @toggle-play="togglePlay"
      @stop="handleStop"
      @download="handleDownload"
    />
  </transition>
</template>

<script setup>
import { ref, inject } from 'vue'
import SearchScreen         from '../components/screens/SearchScreen.vue'
import AirportCaptionScreen from '../components/screens/AirportCaptionScreen.vue'

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
  togglePlay,
} = inject('liveATC')

const screen      = ref('search')
const currentIcao = ref('')

// Open airport: fetch data, go to unified station screen
const handleOpenAirport = async (airport) => {
  currentIcao.value = airport.code
  screen.value = 'station'
  await handleSearch(airport.code)
}

// Select (or switch) a feed from the station screen
const handleSelectFeed = async (channel) => {
  if (activeChannel.value?.id === channel.id) return
  disconnect()
  activeChannel.value = channel
  isConnected.value   = false
  await connect()
}

// Stop audio but stay on the station screen
const handleStop = () => {
  disconnect()
}

// Back: disconnect and return to search
const handleBack = () => {
  disconnect()
  screen.value = 'search'
}

const handleDownload = () => {
  if (!captions.value?.length) return
  const lines = captions.value
    .filter(c => !c.isTemp && (c.caption || c.details))
    .map(c => {
      const ts     = new Date(c.timestamp).toISOString()
      const speaker = c.speaker || 'UNK'
      const text   = c.caption || c.details || ''
      return `[${ts}] ${speaker}: ${text}`
    })
    .join('\n')

  const blob = new Blob([lines], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${currentIcao.value}_captions_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
