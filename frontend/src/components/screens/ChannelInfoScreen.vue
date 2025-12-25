<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 backdrop-blur-sm z-20">
    <div class="w-full text-center space-y-8">
      <div class="space-y-2">
        <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/50">
          <div class="bg-gemini-base w-20 h-20 rounded-full flex items-center justify-center border shadow-inner">
            <Radio class="w-10 h-10 opacity-60" />
          </div>
        </div>
        <h2 class="text-4xl font-bold tracking-tight">{{ channel.name }}</h2>
        <p class="opacity-50 text-sm tracking-wide uppercase">
          {{ airport?.name }} <span class="font-google-sans-code">({{ airport?.icao }})</span>
        </p>
      </div>

      <div class="flex items-center justify-center gap-12 py-10 border-y border-current/5">
        <div class="text-center group">
          <p class="text-3xl font-google-sans-code mb-1 group-hover:scale-110 transition-transform cursor-default">{{ channel.listeners }}</p>
          <p class="text-[9px] uppercase tracking-widest opacity-40">Listeners</p>
        </div>
        <div class="text-center group">
          <p 
            class="text-3xl font-google-sans-code uppercase mb-1 cursor-default" 
            :class="channel.status === 'UP' ? 'text-emerald-500' : 'opacity-30'"
          >
            {{ channel.status === 'UP' ? 'ONLINE' : 'OFFLINE' }}
          </p>
          <p class="text-[9px] uppercase tracking-widest opacity-40">Status</p>
        </div>
      </div>

      <button
        @click="$emit('connect')"
        class="w-full border-2 border-white py-5 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] bg-white hover:bg-neutral-50 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-4 group"
      >
        <span class="text-sm font-bold tracking-widest">START LISTENING</span>
        <div class="w-10 h-10 rounded-full bg-gemini-base border flex items-center justify-center shadow-inner group-hover:bg-white transition-colors">
          <Volume2 class="w-5 h-5 opacity-60" />
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
