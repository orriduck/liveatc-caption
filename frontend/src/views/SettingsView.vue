<template>
  <div class="flex-1 flex flex-col h-full bg-gemini-base backdrop-blur-md animate-in fade-in duration-300">
    <div class="max-w-xl w-full mx-auto mt-20 p-8 bg-base-100 rounded-2xl shadow-sm">
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <div class="p-3 border rounded-2xl shadow-2xl">
            <SettingsIcon class="w-6 h-6" />
          </div>
          <h1 class="text-3xl uppercase">Settings</h1>
        </div>
      </div>

      <div class="space-y-12">
        <!-- Anthropic API Key Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-2 opacity-50 uppercase">
            <Key class="w-4 h-4" />
            <h2 class="text-sm">Anthropic API Key</h2>
          </div>
          <p class="text-xs opacity-50 leading-relaxed max-w-sm mb-4">
            Enter your Anthropic API key to enable AI-powered ATC transcriptions.
            Your key is stored locally on this device.
          </p>
          <div class="relative group">
            <input
              :type="showApiKey ? 'text' : 'password'"
              :placeholder="hasEnvKey ? 'Using environment variable...' : 'Paste your API key here...'"
              class="input input-bordered w-full rounded-2xl h-14 pl-6 pr-12 font-mono text-sm"
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
              <span class="text-[10px] uppercase">Environment Env Set</span>
            </div>
            <div 
              v-if="apiKey" 
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full" 
              title="Typed key takes precedence over environment variable"
            >
              <div class="w-1.5 h-1.5 border rounded-full"></div>
              <span class="text-[10px] uppercase">Local Key Active</span>
            </div>
            <div
              v-if="hasSavedKey && !apiKey"
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full"
              title="Key is saved on the backend server"
            >
              <div class="w-1.5 h-1.5 border rounded-full animate-pulse"></div>
              <span class="text-[10px] uppercase">Saved on Server</span>
            </div>
            <div
              v-if="!hasEnvKey && !hasSavedKey && !apiKey"
              class="flex items-center gap-2 border px-3 py-1.5 rounded-full opacity-50"
            >
              <div class="w-1.5 h-1.5 border rounded-full"></div>
              <span class="text-[10px] uppercase">Key Missing</span>
            </div>
          </div>
        </div>

        <!-- Transcription Settings -->
        <div class="space-y-6 pt-12 border-t">
          <div class="flex items-center gap-2 opacity-50 uppercase">
            <Mic class="w-4 h-4" />
            <h2 class="text-sm">Transcription</h2>
          </div>

          <!-- Whisper Model -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase opacity-70">Whisper Model</label>
              <span class="text-xs font-mono opacity-50">{{ wsModel }}</span>
            </div>
            <select
              v-model="wsModel"
              class="select select-bordered w-full rounded-xl text-sm"
            >
              <option value="tiny.en">tiny.en — fastest, lower accuracy</option>
              <option value="base.en">base.en — balanced</option>
              <option value="small.en">small.en — slowest, highest accuracy</option>
            </select>
          </div>

          <!-- VAD Aggressiveness -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase opacity-70">VAD Aggressiveness</label>
              <span class="text-xs font-mono opacity-50">{{ wsVad }}</span>
            </div>
            <input
              v-model.number="wsVad"
              type="range" min="1" max="3" step="1"
              class="range range-sm w-full"
            />
            <div class="flex justify-between text-[10px] opacity-40">
              <span>1 — permissive</span>
              <span>3 — strict</span>
            </div>
          </div>

          <!-- Silence Cutoff -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase opacity-70">Silence Cutoff</label>
              <span class="text-xs font-mono opacity-50">{{ wsSilence }} ms</span>
            </div>
            <input
              v-model.number="wsSilence"
              type="range" min="300" max="1200" step="100"
              class="range range-sm w-full"
            />
            <div class="flex justify-between text-[10px] opacity-40">
              <span>300 ms — fast cut</span>
              <span>1200 ms — slow cut</span>
            </div>
          </div>

          <!-- Startup Buffer -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase opacity-70">Startup Buffer</label>
              <span class="text-xs font-mono opacity-50">{{ wsBuffer }} ms</span>
            </div>
            <input
              v-model.number="wsBuffer"
              type="range" min="256" max="2048" step="128"
              class="range range-sm w-full"
            />
            <div class="flex justify-between text-[10px] opacity-40">
              <span>256 ms — low latency</span>
              <span>2048 ms — stable</span>
            </div>
          </div>

          <!-- Caption Sync Offset -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs uppercase opacity-70">Caption Sync Offset</label>
              <span class="text-xs font-mono opacity-50">{{ wsSyncOffset > 0 ? '+' : '' }}{{ wsSyncOffset }} ms</span>
            </div>
            <input
              v-model.number="wsSyncOffset"
              type="range" min="-500" max="500" step="50"
              class="range range-sm w-full"
            />
            <div class="flex justify-between text-[10px] opacity-40">
              <span>−500 ms — show earlier</span>
              <span>+500 ms — show later</span>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="pt-12 border-t space-y-6">
          <div class="flex items-center gap-2 opacity-50">
            <Info class="w-4 h-4" />
            <h2 class="text-sm uppercase">About</h2>
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="text-2xl px-2 py-0.5 border rounded">0.1.0</span>
              <span class="opacity-50 uppercase text-xs">Stable Release</span>
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
              class="flex items-center gap-2 text-xs opacity-50 hover:opacity-100 transition-colors uppercase"
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
          class="btn btn-outline btn-block h-14 rounded-2xl uppercase shadow-xl border-opacity-20"
        >
          {{ saving ? 'Saving…' : 'Save Configuration' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { Settings as SettingsIcon, X, Key, Info, Github, Eye, EyeOff, Mic } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const { geminiApiKey: anthropicApiKey, setGeminiApiKey: setAnthropicApiKey } = inject('liveATC')

const apiKey = ref(anthropicApiKey.value)
const showApiKey = ref(false)
const hasEnvKey = ref(false)
const hasSavedKey = ref(false)
const saving = ref(false)

// Transcription settings — read from localStorage
const wsModel = ref(localStorage.getItem('ws_model') || 'tiny.en')
const wsVad = ref(parseInt(localStorage.getItem('ws_vad') || '2'))
const wsSilence = ref(parseInt(localStorage.getItem('ws_silence') || '600'))
const wsBuffer = ref(parseInt(localStorage.getItem('ws_buffer') || '512'))
const wsSyncOffset = ref(parseInt(localStorage.getItem('ws_sync_offset') || '0'))

onMounted(async () => {
  try {
    const resp = await fetch('/api/config')
    const data = await resp.json()
    hasEnvKey.value = !!data.has_env_key
    hasSavedKey.value = !!data.has_saved_key
  } catch (err) {
    console.error("Failed to fetch backend config", err)
  }
})

const handleSave = async () => {
  const key = apiKey.value?.trim() || ""
  setAnthropicApiKey(key)
  if (key) {
    saving.value = true
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropic_api_key: key }),
      })
      hasSavedKey.value = true
    } catch (err) {
      console.error("Failed to save config to backend", err)
    } finally {
      saving.value = false
    }
  }
  localStorage.setItem('ws_model', wsModel.value)
  localStorage.setItem('ws_vad', String(wsVad.value))
  localStorage.setItem('ws_silence', String(wsSilence.value))
  localStorage.setItem('ws_buffer', String(wsBuffer.value))
  localStorage.setItem('ws_sync_offset', String(wsSyncOffset.value))
  router.back()
}
</script>
