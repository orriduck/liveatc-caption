<template>
  <div class="p-4 pb-2 flex flex-col gap-6">
    <div class="flex items-center gap-3 px-2 py-2">
      <button 
        @click="$emit('goHome')"
        class="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div 
          class="p-2 bg-base-200 rounded-lg flex items-center justify-center transition-all duration-300"
          :class="isMac ? 'w-10 h-10' : 'w-12 h-12'"
        >
          <Radio 
            class="text-primary animate-pulse"
            :class="isMac ? 'w-5 h-5' : 'w-6 h-6'"
          />
        </div>
        <div>
          <h1 
            class="font-black tracking-tighter italic leading-none text-base-content text-left"
            :class="isMac ? 'text-lg' : 'text-xl'"
          >
            LIVE<span class="text-primary">ATC</span>
          </h1>
          <span class="text-[10px] font-bold tracking-[0.3em] text-base-content/40 ml-0.5 block text-left">CAPTION</span>
        </div>
      </button>

      <button
        @click="$emit('toggle')"
        class="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content ml-auto"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
    </div>

    <form @submit.prevent="$emit('search', localIcao)" class="px-1">
      <div class="relative group">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
        <input
          v-model="localIcao"
          type="text"
          placeholder="Enter ICAO (e.g. KBOS)"
          class="w-full bg-zinc-800 border border-zinc-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-xs text-white"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search, Radio, ChevronLeft } from 'lucide-vue-next'

const props = defineProps({
  icaoInput: String,
  isMac: Boolean
})

const emit = defineEmits(['search', 'toggle', 'goHome', 'update:icaoInput'])

const localIcao = ref(props.icaoInput)

watch(() => props.icaoInput, (newVal) => {
  localIcao.value = newVal
})

watch(localIcao, (newVal) => {
  emit('update:icaoInput', newVal)
})
</script>
