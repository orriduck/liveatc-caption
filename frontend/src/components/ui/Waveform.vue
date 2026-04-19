<template>
  <div class="flex gap-[2px] items-end w-full" :style="`height:${height}px`">
    <span
      v-for="(env, i) in displayBars"
      :key="i"
      class="flex-1 rounded-sm"
      :style="{
        height: `${Math.max(env * 100, 2)}%`,
        background: i > displayBars.length - 18
          ? 'var(--atc-orange)'
          : 'rgba(255,255,255,0.28)',
        animation: !hasLiveData && playing
          ? `wv ${0.5 + (i % 7) * 0.08}s ease-in-out ${i * 0.015}s infinite alternate`
          : 'none',
        transformOrigin: 'bottom',
        transition: hasLiveData ? 'height 0.05s linear' : 'none',
      }"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  playing:  { type: Boolean, default: false },
  bars:     { type: Number,  default: 80 },
  height:   { type: Number,  default: 36 },
  analyser: { type: Object,  default: null },  // Web Audio AnalyserNode
})

// ── Real FFT data loop ────────────────────────────────────────────────────
const liveData   = ref(/** @type {number[]|null} */ null)
const hasLiveData = computed(() => liveData.value !== null && liveData.value.length > 0)
let rafId    = null
let dataArr  = null

const startLoop = (analyser) => {
  stopLoop()
  dataArr = new Uint8Array(analyser.frequencyBinCount)
  const tick = () => {
    analyser.getByteFrequencyData(dataArr)
    // Copy to plain array so Vue tracks the change
    liveData.value = Array.from(dataArr)
    rafId = requestAnimationFrame(tick)
  }
  tick()
}

const stopLoop = () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  dataArr = null
  liveData.value = null
}

watch(() => props.analyser, (node) => {
  if (node) startLoop(node)
  else stopLoop()
}, { immediate: true })

onUnmounted(stopLoop)

// ── Fallback: static sine-wave shape ─────────────────────────────────────
const fakeBars = computed(() =>
  Array.from({ length: props.bars }, (_, i) =>
    0.15 + Math.abs(Math.sin(i * 0.22) + Math.sin(i * 0.41) * 0.5) * 0.85
  )
)

// ── Downsample FFT bins → N bars ─────────────────────────────────────────
const displayBars = computed(() => {
  if (hasLiveData.value) {
    const data = liveData.value
    const step = data.length / props.bars
    return Array.from({ length: props.bars }, (_, i) => {
      const start = Math.floor(i * step)
      const end   = Math.max(Math.floor((i + 1) * step), start + 1)
      let sum = 0
      for (let j = start; j < end; j++) sum += data[j] ?? 0
      return (sum / (end - start)) / 255
    })
  }
  return fakeBars.value
})
</script>
