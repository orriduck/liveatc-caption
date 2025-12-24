<template>
  <div class="flex-1 flex flex-col h-screen overflow-hidden relative bg-base-100">
    <div v-if="!activeChannel" class="hero min-h-screen bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md opacity-20">
          <Radio class="w-24 h-24 mx-auto mb-6" />
          <h1 class="text-2xl font-black uppercase tracking-widest">Select Frequency</h1>
          <p class="py-2 text-sm italic">Transmission captions will appear here in real-time</p>
        </div>
      </div>
    </div>
    
    <div v-else class="flex-1 flex flex-col min-h-0">
      <LiveCaptionScreen
        v-if="isConnected"
        :channel="activeChannel"
        :captions="captions"
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
  connect
} = inject('liveATC')
</script>
