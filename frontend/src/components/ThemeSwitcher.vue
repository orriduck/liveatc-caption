<template>
  <div class="dropdown dropdown-top dropdown-end w-full">
    <div tabindex="0" role="button" class="btn btn-ghost btn-block justify-between normal-case h-10 min-h-0 px-2 hover:bg-base-200">
      <div class="flex items-center gap-3">
        <Sun v-if="currentTheme === 'light'" class="w-4 h-4 opacity-70" />
        <Moon v-else-if="currentTheme === 'dark'" class="w-4 h-4 opacity-70" />
        <Monitor v-else class="w-4 h-4 opacity-70" />
        <span class="text-xs font-medium capitalize">{{ currentTheme }}</span>
      </div>
      <ChevronUp class="w-4 h-4 opacity-30" />
    </div>
    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-xl bg-base-200 rounded-xl w-full mb-2 border border-base-content/5">
      <li>
        <button @click="setTheme('light')" class="flex items-center gap-3 py-2 text-xs" :class="{ 'bg-primary/10 text-primary font-bold': currentTheme === 'light' }">
          <Sun class="w-4 h-4" /> Light
        </button>
      </li>
      <li>
        <button @click="setTheme('dark')" class="flex items-center gap-3 py-2 text-xs" :class="{ 'bg-primary/10 text-primary font-bold': currentTheme === 'dark' }">
          <Moon class="w-4 h-4" /> Dark
        </button>
      </li>
      <li>
        <button @click="setTheme('system')" class="flex items-center gap-3 py-2 text-xs" :class="{ 'bg-primary/10 text-primary font-bold': currentTheme === 'system' }">
          <Monitor class="w-4 h-4" /> System
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Sun, Moon, Monitor, ChevronUp } from 'lucide-vue-next'

const currentTheme = ref('system')

const setTheme = (theme) => {
  currentTheme.value = theme
  localStorage.setItem('theme', theme)
  
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'system'
  setTheme(savedTheme)
  
  // Listen for system theme changes if set to system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (currentTheme.value === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
  })
})
</script>
