<template>
  <button
    @click="$emit('click')"
    class="text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-1 cursor-pointer font-sans"
    :class="highlight
      ? 'border-atc-orange bg-gradient-to-br from-[rgba(255,90,31,0.12)] to-atc-card'
      : 'border-atc-line bg-atc-card hover:border-atc-line-strong hover:bg-atc-elev hover:-translate-y-0.5'"
    :style="highlight ? 'box-shadow:0 0 0 1px #FF5A1F inset, 0 8px 30px rgba(255,90,31,0.12)' : ''"
  >
    <div class="flex items-baseline gap-2.5 mb-2">
      <span class="font-display italic text-[42px] leading-none text-atc-text" style="letter-spacing:-1px">{{ a.iata || a.code }}</span>
      <span class="font-mono text-[11px] text-atc-faint tracking-[1px]">{{ a.icao || a.code }}</span>
    </div>
    <div class="text-[15px] font-semibold text-atc-text" style="letter-spacing:-0.2px">{{ a.name }}</div>
    <div class="text-[13px] text-atc-dim mb-4">{{ subtitle }}</div>

    <div class="mt-auto flex items-center gap-4 pt-3.5 border-t border-atc-line">
      <div class="flex flex-col gap-0.5">
        <span class="font-mono text-[16px] font-semibold">{{ a.icao || a.code }}</span>
        <span class="text-[10px] text-atc-faint uppercase tracking-[1px]">icao</span>
      </div>
      <div class="flex flex-col gap-0.5">
        <span class="font-mono text-[16px] font-semibold text-atc-mint">{{ a.country }}</span>
        <span class="text-[10px] text-atc-faint uppercase tracking-[1px]">country</span>
      </div>
      <div class="hidden sm:flex flex-col gap-0.5">
        <span class="font-mono text-[16px] font-semibold text-atc-dim">{{ typeShort }}</span>
        <span class="text-[10px] text-atc-faint uppercase tracking-[1px]">class</span>
      </div>
      <div class="ml-auto w-8 h-8 rounded-full bg-atc-high text-atc-text grid place-items-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { airportSubtitle } from '../../utils/airport.js'

const props = defineProps({
  a:         { type: Object,  required: true },
  highlight: { type: Boolean, default: false },
})
defineEmits(['click'])

const subtitle = computed(() => airportSubtitle(props.a))

const typeShort = computed(() => {
  if (props.a.type === 'large_airport') return 'L'
  if (props.a.type === 'medium_airport') return 'M'
  if (props.a.type === 'small_airport') return 'S'
  if (props.a.type === 'heliport') return 'H'
  return '—'
})
</script>
