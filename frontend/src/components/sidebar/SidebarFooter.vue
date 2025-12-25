<template>
  <div class="p-4 border-t flex flex-col gap-1 shrink-0">
    <button
      @click="$emit('openSettings')"
      class="btn btn-block justify-between normal-case h-10 min-h-0 px-2 hover:bg-base-200"
    >
      <div class="flex items-center gap-3">
        <Settings class="w-4 h-4 opacity-70" />
        <span class="text-xs font-medium">Settings</span>
      </div>
    </button>
    <button
      @click="$emit('openAbout')"
      class="btn btn-block justify-between normal-case h-10 min-h-0 px-2 hover:bg-base-200"
    >
      <div class="flex items-center gap-3">
        <Info class="w-4 h-4 opacity-70" />
        <span class="text-xs font-medium">About</span>
      </div>
      <span class="badge badge-ghost badge-sm font-mono opacity-50">v0.1.0</span>
    </button>
    <ThemeSwitcher />
  </div>
</template>

<script setup>
import { Settings, Info } from 'lucide-vue-next'
import ThemeSwitcher from '../ThemeSwitcher.vue'

defineEmits(['openSettings', 'openAbout'])
</script>
