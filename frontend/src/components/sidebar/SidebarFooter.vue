<template>
  <div class="p-2 pt-0 pb-4 flex flex-col gap-0.5 shrink-0">
    <button
      @click="$emit('openSettings')"
      class="btn btn-block justify-start normal-case h-10 min-h-0 px-3 bg-transparent border-0 shadow-none hover:bg-current/5"
    >
      <div class="flex items-center gap-3">
        <Settings class="w-4 h-4 opacity-70" />
        <span class="text-xs font-medium">Settings</span>
      </div>
    </button>
    <button
      @click="$emit('openAbout')"
      class="btn btn-block justify-between normal-case h-10 min-h-0 px-3 bg-transparent border-0 shadow-none hover:bg-current/5"
    >
      <div class="flex items-center gap-3">
        <Info class="w-4 h-4 opacity-70" />
        <span class="text-xs font-medium">About</span>
      </div>
      <span class="text-[10px] font-google-sans-code opacity-40">v0.3.0</span>
    </button>
    <ThemeSwitcher />
  </div>
</template>

<script setup>
import { Settings, Info } from 'lucide-vue-next'
import ThemeSwitcher from '../ThemeSwitcher.vue'

defineEmits(['openSettings', 'openAbout'])
</script>
