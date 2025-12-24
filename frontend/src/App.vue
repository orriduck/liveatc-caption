<template>
  <div class="drawer" :class="{ 'lg:drawer-open': isSidebarVisible }">
    <input
      id="main-drawer"
      type="checkbox"
      class="drawer-toggle"
      :checked="isSidebarVisible"
      @change="isSidebarVisible = $event.target.checked"
    />

    <!-- Drawer Content (Main Page) -->
    <div class="drawer-content flex flex-col h-screen overflow-hidden relative">
      <!-- Mobile Toggle Button - Visible only on small screens -->
      <div class="lg:hidden absolute top-4 left-4 z-50">
        <label for="main-drawer" class="btn btn-circle btn-ghost drawer-button">
          <Radio class="w-6 h-6" />
        </label>
      </div>

      <!-- Desktop Toggle Button - Shows when sidebar is collapsed -->
      <div v-if="!isSidebarVisible" class="hidden lg:flex absolute top-4 left-4 z-50">
        <button 
          @click="isSidebarVisible = true" 
          class="btn btn-circle btn-ghost hover:bg-base-200"
        >
          <Radio class="w-5 h-5" />
        </button>
      </div>

      <main class="flex-1 flex flex-col relative overflow-hidden h-full bg-base-100">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>

        <!-- Floating Player -->
        <Player v-if="isConnected && activeChannel" :channel="activeChannel" @stop="disconnect" />

        <!-- Error Toast -->
        <div v-if="error" class="toast toast-end z-[100]">
          <div class="alert alert-error">
            <span>{{ error }}</span>
            <button @click="error = null" class="btn btn-sm btn-ghost">✕</button>
          </div>
        </div>
      </main>
    </div>

    <!-- Drawer Side (Sidebar) -->
    <div class="drawer-side z-50">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="menu p-0 w-80 min-h-full bg-base-200 text-base-content border-r border-base-300">
        <Sidebar
          v-model:icaoInput="icaoInput"
          :data="data"
          :loading="loading"
          :currentChannelId="currentChannelId"
          :isRefreshing="isRefreshing"
          @search="handleSearch($event)"
          @refresh="handleRefresh"
          @selectChannel="selectChannel"
          @toggle="isSidebarVisible = false"
          @openSettings="$router.push('/settings')"
          @openAbout="$router.push('/about')"
          @goHome="$router.push('/')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Radio } from 'lucide-vue-next'
import { useLiveATC } from './composables/useLiveATC'
import Sidebar from './components/Sidebar.vue'
import Player from './components/player/Player.vue'

const route = useRoute()
const router = useRouter()
const {
  data,
  loading,
  error,
  activeChannel,
  isConnected,
  captions,
  handleSearch: performSearch,
  connect,
  disconnect,
  setGeminiApiKey
} = useLiveATC()

const isSidebarVisible = ref(true)
const isRefreshing = ref(false)
const icaoInput = ref('')

// Provide state for child components if needed
provide('liveATC', {
  data,
  loading,
  activeChannel,
  isConnected,
  captions,
  connect,
  disconnect,
  setGeminiApiKey
})

const currentIcao = computed(() => route.params.icao)
const currentChannelId = computed(() => route.params.channel)

// Sync icaoInput with route
watch(currentIcao, (newIcao) => {
  if (newIcao) {
    icaoInput.value = newIcao.toUpperCase()
    if (!data.value || data.value.airport?.icao !== icaoInput.value) {
      performSearch(newIcao)
    }
  }
}, { immediate: true })

// Auto-select channel based on route
watch([data, currentChannelId], ([newData, newChannelId]) => {
  if (newData && newChannelId) {
    const channel = newData.channels.find(c => c.id === newChannelId)
    if (channel && activeChannel.value?.id !== channel.id) {
      activeChannel.value = channel
      isConnected.value = false
    }
  } else if (newData && !newChannelId) {
    activeChannel.value = null
    isConnected.value = false
  }
})

const handleSearch = (icao) => {
  router.push(`/${icao.toUpperCase()}`)
}

const handleRefresh = async () => {
  if (!currentIcao.value) return
  isRefreshing.value = true
  try {
    const result = await performSearch(currentIcao.value)
    if (result && result.channels) {
      data.value = { ...data.value, channels: result.channels }
    }
  } finally {
    isRefreshing.value = false
  }
}

const selectChannel = (channel) => {
  router.push(`/${currentIcao.value}/${channel.id}`)
  if (activeChannel.value?.id !== channel.id) {
    disconnect()
  }
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
