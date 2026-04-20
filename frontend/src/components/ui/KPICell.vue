<template>
  <div class="px-3 py-3 bg-atc-card">
    <div class="font-mono text-[9px] text-atc-faint tracking-[1.5px] uppercase mb-1.5">{{ label }}</div>
    <slot>
      <div class="font-mono text-[13px] font-semibold" :class="accent ? 'text-atc-orange' : 'text-atc-text'" style="letter-spacing:-0.1px">{{ value }}</div>
    </slot>
  </div>
</template>

<script setup>
defineProps({
  label:  { type: String,  required: true },
  value:  { type: String,  default: '—'   },
  accent: { type: Boolean, default: false },
})
</script>
