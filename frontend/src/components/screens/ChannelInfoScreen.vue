<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 backdrop-blur-sm z-20">
    <div class="w-full text-center space-y-8">
      <div class="space-y-2">
        <div class="w-20 h-20 border rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <Radio class="w-10 h-10 opacity-40" />
        </div>
        <h2 class="text-3xl">{{ channel.name }}</h2>
        <p class="opacity-50 text-sm">
          {{ airport?.name }} <span class="font-google-sans-code">({{ airport?.icao }})</span>
        </p>
      </div>

      <div class="flex items-center justify-center gap-8 py-6 border-y">
        <div class="text-center">
          <p class="text-2xl font-google-sans-code">{{ channel.listeners }}</p>
          <p class="text-[10px] uppercase opacity-50">Listeners</p>
        </div>
        <div class="text-center">
          <p 
            class="text-2xl font-google-sans-code uppercase" 
            :class="channel.status === 'UP' ? 'underline' : 'opacity-50'"
          >
            {{ channel.status === 'UP' ? 'ONLINE' : 'OFFLINE' }}
          </p>
          <p class="text-[10px] uppercase opacity-50">Status</p>
        </div>
      </div>

      <button
        @click="$emit('connect')"
        class="w-full border py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
      >
        <span class="transition-all">START LISTENING</span>
        <div class="w-8 h-8 rounded-full border flex items-center justify-center">
          <Volume2 class="w-4 h-4 fill-current" />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Radio, Volume2 } from 'lucide-vue-next'

defineProps({
  channel: Object,
  airport: Object
})

defineEmits(['connect'])
</script>
