<template>
  <div class="p-4 border-t flex flex-col gap-1 shrink-0">
    <button
      @click="$emit('openSettings')"
      class="btn btn-ghost btn-block justify-between normal-case"
    >
      <div class="flex items-center gap-2">
        <Settings class="w-4 h-4" />
        <span>Settings</span>
      </div>
    </button>
    <button
      @click="$emit('openAbout')"
      class="btn btn-ghost btn-block justify-between normal-case"
    >
      <div class="flex items-center gap-2">
        <Info class="w-4 h-4" />
        <span>About</span>
      </div>
      <span class="badge badge-sm badge-ghost">v0.1.0</span>
    </button>
  </div>
</template>

<script setup>
import { Settings, Info } from 'lucide-vue-next'

defineEmits(['openSettings', 'openAbout'])
</script>
