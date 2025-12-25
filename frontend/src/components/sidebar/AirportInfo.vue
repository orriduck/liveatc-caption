<template>
  <div v-if="airport" class="p-4 border rounded-2xl space-y-3 bg-base-100">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 text-[10px] rounded uppercase border">
          Airport
        </span>
        <h2 class="text-xs uppercase font-google-sans-code">
          {{ airport.icao }}
        </h2>
      </div>
      <MapPin class="w-3 h-3" />
    </div>

    <div>
      <h3 class="text-sm leading-tight mb-1">
        {{ airport.name }}
      </h3>
      <p class="text-[10px] flex items-center gap-1">
        {{ airport.city }}, {{ airport.state || airport.country }}
      </p>
    </div>

    <div v-if="airport.metar" class="pt-3 border-t space-y-2">
      <div class="flex items-center gap-2">
        <Wind class="w-3 h-3" />
        <span class="text-[10px] uppercase">Metar</span>
      </div>
      <div class="p-3 rounded-xl border">
        <code class="text-[10px] leading-relaxed block overflow-x-auto whitespace-pre-wrap font-google-sans-code uppercase">
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
