<template>
  <div class="flex-1 flex flex-col h-full bg-base-100 backdrop-blur-md animate-in fade-in duration-300">
    <div class="max-w-xl w-full mx-auto mt-20 p-8">
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <div class="p-3 border rounded-2xl shadow-2xl">
            <SettingsIcon class="w-6 h-6" />
          </div>
          <h1 class="text-3xl font-black uppercase tracking-tighter">Settings</h1>
        </div>
        <button
          @click="$router.back()"
          class="p-2 border rounded-full transition-all hover:bg-current/10"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="space-y-12">
        <!-- Gemini API Key Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-2 opacity-50 font-black uppercase tracking-widest">
            <Key class="w-4 h-4" />
            <h2 class="text-sm">Gemini API Key</h2>
          </div>
          <p class="text-xs opacity-50 leading-relaxed max-w-sm mb-4">
            Enter your Google Gemini API key to enable high-quality transcriptions.
            Your key is stored locally on this device.
          </p>
          <div class="relative group">
            <input
              :type="showApiKey ? 'text' : 'password'"
              :placeholder="hasEnvKey ? 'Using environment variable...' : 'Paste your API key here...'"
              class="w-full border rounded-2xl py-4 pl-6 pr-12 focus:outline-none focus:ring-2 transition-all font-mono text-sm"
              v-model="apiKey"
            />
            <button
              type="button"
              @click="showApiKey = !showApiKey"
              class="absolute right-4 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100 transition-opacity"
            >
              <Eye v-if="!showApiKey" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>

          <div class="flex flex-wrap gap-2 mt-4">
            <div 
              v-if="hasEnvKey" 
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full" 
              title="Provided via .env file on the server"
            >
              <div class="w-1.5 h-1.5 border rounded-full animate-pulse"></div>
              <span class="text-[10px] font-black uppercase tracking-widest">Environment Env Set</span>
            </div>
            <div 
              v-if="apiKey" 
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full" 
              title="Typed key takes precedence over environment variable"
            >
              <div class="w-1.5 h-1.5 border rounded-full"></div>
              <span class="text-[10px] font-black uppercase tracking-widest">Local Key Active</span>
            </div>
            <div 
              v-if="!hasEnvKey && !apiKey" 
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full opacity-50"
            >
              <div class="w-1.5 h-1.5 border rounded-full"></div>
              <span class="text-[10px] font-black uppercase tracking-widest">Key Missing</span>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="pt-12 border-t space-y-6">
          <div class="flex items-center gap-2 opacity-50">
            <Info class="w-4 h-4" />
            <h2 class="text-sm font-bold uppercase tracking-widest">About</h2>
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="text-2xl font-black px-2 py-0.5 border rounded">0.1.0</span>
              <span class="opacity-50 font-bold uppercase tracking-widest text-xs">Stable Release</span>
            </div>
            <p class="text-sm opacity-50 leading-relaxed italic">
              Real-time ATC communication captioning powered by AI.
            </p>
          </div>

          <div class="flex items-center gap-6 pt-4">
            <a
              href="https://github.com/orriduck/liveatc-caption"
              target="_blank"
              rel="noreferrer"
              class="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-colors uppercase tracking-wider"
            >
              <Github class="w-4 h-4" />
              GitHub Repository
            </a>
          </div>
        </div>
      </div>

      <div class="mt-16">
        <button
          @click="handleSave"
          class="w-full border font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest"
        >
          Save Configuration
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { Settings as SettingsIcon, X, Key, Info, Github, Eye, EyeOff } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const { geminiApiKey, setGeminiApiKey } = inject('liveATC')

const apiKey = ref(geminiApiKey.value)
const showApiKey = ref(false)
const hasEnvKey = ref(false)

onMounted(async () => {
  try {
    const resp = await fetch('http://localhost:8000/api/config')
    const data = await resp.json()
    if (data.has_env_key) hasEnvKey.value = true
  } catch (err) {
    console.error("Failed to fetch backend config", err)
  }
})

const handleSave = () => {
  setGeminiApiKey(apiKey.value?.trim() || "")
  router.back()
}
</script>
