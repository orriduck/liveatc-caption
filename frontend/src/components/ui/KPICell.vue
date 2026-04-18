<template>
  <div class="px-4 py-4 bg-atc-card">
    <div class="font-mono text-[10px] text-atc-faint tracking-[1.5px] uppercase mb-2">{{ label }}</div>
    <div class="font-mono text-[18px] font-semibold" :class="accent ? 'text-atc-orange' : 'text-atc-text'" style="letter-spacing:-0.2px">{{ value }}</div>
  </div>
</template>

<script setup>
defineProps({
  label:  { type: String,  required: true },
  value:  { type: String,  default: '—'   },
  accent: { type: Boolean, default: false },
})
</script>
