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

    <!-- AIRPORT DETAIL screen -->
    <AirportScreen
      v-else-if="screen === 'airport'"
      key="airport"
      :icao="currentIcao"
      :airport="data?.airport"
      :channels="data?.channels"
      :active-channel-id="activeChannel?.id"
      @back="screen = 'search'"
      @open-transcript="handleOpenTranscript"
    />

    <!-- TRANSCRIPT screen -->
    <TranscriptScreen
      v-else-if="screen === 'transcript'"
      key="transcript"
      :icao="currentIcao"
      :channels="data?.channels"
      :active-feed-id="activeChannel?.id"
      :captions="captions"
      :connection-state="connectionState"
      :is-playing="isPlaying"
      @back="handleTranscriptBack"
      @switch-feed="handleSwitchFeed"
      @toggle-play="togglePlay"
      @stop="handleStop"
      @download="handleDownload"
    />
  </transition>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import SearchScreen    from '../components/screens/SearchScreen.vue'
import AirportScreen   from '../components/screens/AirportScreen.vue'
import TranscriptScreen from '../components/screens/TranscriptScreen.vue'

const {
  data,
  loading,
  error,
  activeChannel,
  isConnected,
  connectionState,
  isPlaying,
  captions,
  handleSearch,
  connect,
  disconnect,
  togglePlay,
} = inject('liveATC')


const screen     = ref('search')
const currentIcao = ref('')

// Open airport: fetch data, switch screen
const handleOpenAirport = async (airport) => {
  currentIcao.value = airport.code
  screen.value = 'airport'
  await handleSearch(airport.code)
}

// Open transcript: select channel, connect, switch screen
const handleOpenTranscript = async (channel) => {
  if (activeChannel.value?.id !== channel.id) {
    disconnect()
    activeChannel.value = channel
    isConnected.value = false
  }
  screen.value = 'transcript'
  if (!isConnected.value) {
    await connect()
  }
}

// Switch feed from transcript sidebar
const handleSwitchFeed = async (channel) => {
  disconnect()
  activeChannel.value = channel
  isConnected.value = false
  await connect()
}

const handleTranscriptBack = () => {
  screen.value = 'airport'
}

const handleStop = () => {
  disconnect()
  screen.value = 'airport'
}

const handleDownload = () => {
  if (!captions.value?.length) return
  const lines = captions.value
    .filter(c => !c.isTemp && (c.caption || c.details))
    .map(c => {
      const ts = new Date(c.timestamp).toISOString()
      const speaker = c.speaker || 'UNK'
      const text = c.caption || c.details || ''
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
