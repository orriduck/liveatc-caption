<template>
  <div class="relative">
    <button
      type="button"
      tabindex="0"
      class="btn h-10 min-h-0 rounded-full border-atc-line bg-atc-card/90 px-3 font-sans normal-case text-atc-text shadow-[0_12px_34px_rgba(0,0,0,0.18)] backdrop-blur hover:border-atc-line-strong hover:bg-atc-elev"
      aria-label="Theme"
      :aria-expanded="menuOpen"
      @click.stop="menuOpen = !menuOpen"
    >
      <div class="flex items-center gap-3">
        <Sun v-if="currentPreference === 'light'" class="h-4 w-4 opacity-70" />
        <Moon v-else-if="currentPreference === 'dark'" class="h-4 w-4 opacity-70" />
        <Monitor v-else class="h-4 w-4 opacity-70" />
        <span class="hidden text-xs capitalize sm:inline">{{ currentPreference }}</span>
      </div>
      <ChevronDown class="h-4 w-4 opacity-35" />
    </button>
    <ul
      v-if="menuOpen"
      tabindex="0"
      class="menu absolute right-0 z-50 mt-2 w-40 rounded-xl border border-atc-line bg-atc-card p-2 text-atc-text shadow-xl"
    >
      <li v-for="option in themeOptions" :key="option.id">
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg py-2 text-xs"
          :class="{ 'bg-atc-orange-soft text-atc-orange': currentPreference === option.id }"
          @click="setTheme(option.id)"
        >
          <component :is="option.icon" class="h-4 w-4" />
          {{ option.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, Monitor, Moon, Sun } from 'lucide-vue-next'
import {
  applyThemePreference,
  getInitialThemePreference,
  THEME_PREFERENCES,
} from '../utils/theme.js'

const themeOptions = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

const currentPreference = ref('system')
const menuOpen = ref(false)
let systemMedia = null
let removeSystemListener = null

const setTheme = (theme) => {
  if (!THEME_PREFERENCES.includes(theme)) return
  currentPreference.value = applyThemePreference(theme, { systemMedia }).preference
  menuOpen.value = false
}

const syncSystemTheme = () => {
  if (currentPreference.value === 'system') {
    applyThemePreference('system', { systemMedia })
  }
}

onMounted(() => {
  systemMedia = window.matchMedia('(prefers-color-scheme: dark)')
  currentPreference.value = getInitialThemePreference()
  applyThemePreference(currentPreference.value, { systemMedia })

  systemMedia.addEventListener?.('change', syncSystemTheme)
  removeSystemListener = () => systemMedia?.removeEventListener?.('change', syncSystemTheme)

  document.addEventListener('click', closeMenu)
})

onBeforeUnmount(() => {
  removeSystemListener?.()
  document.removeEventListener('click', closeMenu)
})

const closeMenu = () => {
  menuOpen.value = false
}
</script>
