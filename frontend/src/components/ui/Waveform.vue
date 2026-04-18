<template>
  <div class="flex gap-[2px] items-center w-full" :style="`height:${height}px`">
    <span
      v-for="(env, i) in bars"
      :key="i"
      class="flex-1 rounded-sm"
      :style="{
        height: `${env * 100}%`,
        background: i > bars.length - 18 ? 'var(--atc-orange)' : 'rgba(255,255,255,0.3)',
        animation: playing
          ? `wv ${0.5 + (i % 7) * 0.08}s ease-in-out ${i * 0.015}s infinite alternate`
          : 'none',
        transformOrigin: 'bottom',
      }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  playing: { type: Boolean, default: false },
  bars:    { type: Number,  default: 80 },
  height:  { type: Number,  default: 36 },
})

const bars = computed(() => {
  return Array.from({ length: props.bars }, (_, i) => {
    return 0.2 + Math.abs(Math.sin(i * 0.22) + Math.sin(i * 0.41) * 0.5) * 0.8
  })
})
</script>
