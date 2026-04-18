<template>
  <div class="min-h-screen bg-atc-bg text-atc-text">
    <router-view v-slot="{ Component }">
      <transition name="screen" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Global error toast -->
    <div v-if="error" class="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl bg-atc-elev border border-atc-red text-atc-text shadow-xl">
      <span class="text-[13px] font-sans">{{ error }}</span>
      <button @click="error = null" class="text-atc-faint hover:text-atc-text text-lg leading-none cursor-pointer bg-transparent border-none">×</button>
    </div>
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useLiveATC } from './composables/useLiveATC'

const liveATC = useLiveATC()
const { error } = liveATC

provide('liveATC', liveATC)
</script>
