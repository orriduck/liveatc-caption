<template>
  <div class="flex-1 flex flex-col h-full overflow-hidden relative">
    <div v-if="!activeChannel" class="hero min-h-screen">
      <div class="hero-content text-center">
        <div class="w-full opacity-20">
          <Radio class="w-24 h-24 mx-auto mb-6" />
          <h1 class="text-2xl font-bold uppercase tracking-tight">Select Frequency</h1>
          <p class="py-2 text-sm opacity-50 uppercase tracking-widest text-[10px]">Transmission captions appear here in real-time</p>
        </div>
      </div>
    </div>
    
    <div v-else class="flex-1 flex flex-col min-h-0">
      <LiveCaptionScreen
        v-if="isConnected"
        :channel="activeChannel"
        :captions="captions"
        :connectionState="connectionState"
      />
      <ChannelInfoScreen
        v-else
        :channel="activeChannel"
        :airport="data?.airport"
        @connect="connect"
      />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { Radio } from 'lucide-vue-next'
import ChannelInfoScreen from '../components/screens/ChannelInfoScreen.vue'
import LiveCaptionScreen from '../components/screens/LiveCaptionScreen.vue'

const {
  data,
  activeChannel,
  isConnected,
  captions,
  connect,
  connectionState
} = inject('liveATC')
</script>
