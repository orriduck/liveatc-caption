<template>
  <div v-if="airport" class="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded uppercase tracking-wider border border-blue-500/20">
          Airport
        </span>
        <h2 class="text-xs font-black tracking-widest text-zinc-400 uppercase">
          {{ airport.icao }}
        </h2>
      </div>
      <MapPin class="w-3 h-3 text-zinc-600" />
    </div>

    <div>
      <h3 class="text-sm font-bold text-white leading-tight mb-1">
        {{ airport.name }}
      </h3>
      <p class="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
        {{ airport.city }}, {{ airport.state || airport.country }}
      </p>
    </div>

    <div v-if="airport.metar" class="pt-3 border-t border-zinc-800/50 space-y-2">
      <div class="flex items-center gap-2">
        <Wind class="w-3 h-3 text-zinc-600" />
        <span class="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Metar</span>
      </div>
      <div class="bg-black/40 p-3 rounded-xl border border-zinc-800/30">
        <code class="text-[10px] text-zinc-400 leading-relaxed block overflow-x-auto whitespace-pre-wrap font-mono uppercase">
          {{ airport.metar }}
        </code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MapPin, Wind } from 'lucide-vue-next'

defineProps({
  airport: Object
})
</script>
