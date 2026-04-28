<template>
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle v-if="theme === 'light'" cx="10" cy="10" r="3.1" fill="currentColor" />
    <g v-if="theme === 'light'" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <line x1="10" y1="2.3" x2="10" y2="4.3" />
      <line x1="10" y1="15.7" x2="10" y2="17.7" />
      <line x1="2.3" y1="10" x2="4.3" y2="10" />
      <line x1="15.7" y1="10" x2="17.7" y2="10" />
      <line x1="4.4" y1="4.4" x2="5.8" y2="5.8" />
      <line x1="14.2" y1="14.2" x2="15.6" y2="15.6" />
      <line x1="14.2" y1="5.8" x2="15.6" y2="4.4" />
      <line x1="4.4" y1="15.6" x2="5.8" y2="14.2" />
    </g>
    <path v-else-if="theme === 'dark'" d="M13.6 2.7A6.8 6.8 0 1 0 17.3 10a7.1 7.1 0 0 1-3.7-7.3z" fill="currentColor" />
    <g v-else stroke="currentColor" stroke-width="1.2" fill="none">
      <rect x="3" y="4.2" width="14" height="9.2" rx="1.3" />
      <line x1="7.2" y1="16.4" x2="12.8" y2="16.4" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  theme: { type: String, default: 'system' },
})
</script>
