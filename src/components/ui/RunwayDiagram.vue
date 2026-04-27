<template>
  <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size">
    <!-- Range rings -->
    <circle :cx="c" :cy="c" :r="c*0.88" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.4" />
    <circle :cx="c" :cy="c" :r="c*0.64" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.3" stroke-dasharray="1.5 2" />

    <!-- Runways group, rotated -12° around center -->
    <g :transform="`translate(${c*1.04} ${c}) rotate(-12)`">
      <g v-for="(r, i) in runways" :key="i">
        <rect
          :x="-r.len/2" :y="r.y - r.w/2" :width="r.len" :height="r.w"
          :fill="r.active ? accent : '#404048'"
          :fill-opacity="r.active ? 0.9 : 0.5"
          :stroke="r.active ? accent : '#505058'"
          stroke-width="0.4"
        />
        <line
          :x1="-r.len/2+4" :y1="r.y" :x2="r.len/2-4" :y2="r.y"
          stroke="#fff" :stroke-opacity="r.active ? 0.6 : 0.25" stroke-width="0.4" stroke-dasharray="2.5 2.5"
        />
        <text :x="-r.len/2-2" :y="r.y+1.6" :fill="r.active ? accent : 'rgba(245,245,247,0.38)'"
          font-size="3.8" font-family="'JetBrains Mono',monospace" font-weight="600" text-anchor="end">{{ r.id1 }}</text>
        <text :x="r.len/2+2" :y="r.y+1.6" :fill="r.active ? accent : 'rgba(245,245,247,0.38)'"
          font-size="3.8" font-family="'JetBrains Mono',monospace" font-weight="600">{{ r.id2 }}</text>
      </g>
      <!-- Terminal buildings -->
      <g fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="0.3">
        <rect x="-16" y="-2.4" width="32" height="4.8" rx="0.8" />
        <rect x="-8" y="-1.6" width="5" height="3.2" rx="0.8" />
        <rect x="3"  y="-1.6" width="5" height="3.2" rx="0.8" />
      </g>
    </g>

    <!-- Aircraft blips -->
    <circle cx="30%" cy="62%" r="1.8" :fill="accent" />
    <circle cx="30%" cy="62%" r="4.5" fill="none" :stroke="accent" stroke-opacity="0.4" stroke-width="0.3">
      <animate attributeName="r" from="1.8" to="7" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="70%" cy="40%" r="1.8" fill="#34d399" />

    <!-- North arrow -->
    <g :transform="`translate(${size*0.86} ${size*0.13})`">
      <path d="M0 -6 L3.5 5.5 L0 2.5 L-3.5 5.5Z" fill="rgba(245,245,247,0.85)" />
      <text x="0" y="12" fill="rgba(245,245,247,0.85)" font-size="5" font-family="'Inter',sans-serif" font-weight="700" text-anchor="middle">N</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size:   { type: Number, default: 240 },
  accent: { type: String, default: '#FF5A1F' },
})

const c = computed(() => props.size / 2)

const runways = [
  { y: -20, w: 3.8, id1: '06L', id2: '24R', len: 110 },
  { y: -7,  w: 3.8, id1: '06R', id2: '24L', len: 104 },
  { y: 7,   w: 3.8, id1: '07L', id2: '25R', len: 120, active: true },
  { y: 20,  w: 3.8, id1: '07R', id2: '25L', len: 92,  active: true },
]
</script>
