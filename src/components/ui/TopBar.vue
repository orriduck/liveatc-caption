<template>
  <div
    class="grid items-center px-7 py-[18px] border-b border-atc-line bg-atc-bg"
    :style="{
      'grid-template-columns': '1fr auto 1fr',
      ...(isElectron ? {
        'padding-left': '88px',
        '-webkit-app-region': 'drag',
        'user-select': 'none',
      } : {})
    }"
  >
    <!-- Left -->
    <div class="flex items-center" style="-webkit-app-region:no-drag">
      <button v-if="onBack" @click="onBack"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-atc-card border border-atc-line text-atc-text font-sans text-[13px] font-medium cursor-pointer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>
      <Wordmark v-else />
    </div>

    <!-- Center breadcrumb -->
    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-atc-card border border-atc-line rounded-full font-mono text-[11px] tracking-[0.3px] text-atc-dim"
         style="-webkit-app-region:no-drag">
      <span class="w-1.5 h-1.5 rounded-full bg-atc-orange flex-shrink-0" />
      {{ screen }}
    </div>

    <!-- Right -->
    <div class="flex items-center justify-end gap-3" style="-webkit-app-region:no-drag">
      <span class="font-mono text-[12px] text-atc-dim tracking-[0.5px]">{{ zuluTime }}</span>
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-atc-card border border-atc-line rounded-full text-[12px] text-atc-text font-medium">
        <span class="w-[7px] h-[7px] rounded-full bg-atc-mint flex-shrink-0" style="box-shadow:0 0 6px #34d399;animation:pulseDot 1.6s ease-in-out infinite" />
        Connected
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Wordmark from './Wordmark.vue'

const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')

defineProps({
  screen: { type: String, default: '' },
  onBack: { type: Function, default: null },
})

const zuluTime = ref('')
let timer

const update = () => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  zuluTime.value = `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

onMounted(() => { update(); timer = setInterval(update, 1000) })
onUnmounted(() => clearInterval(timer))
</script>
