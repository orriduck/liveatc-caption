<template>
  <div class="pb-2 flex flex-col gap-6">
    <div class="flex items-center gap-3 px-2 py-2">
      <button 
        @click="$emit('goHome')"
        class="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div 
          class="p-2 border rounded-lg flex items-center justify-center transition-all duration-300"
          :class="isMac ? 'w-10 h-10' : 'w-12 h-12'"
        >
          <Radio 
            class="animate-pulse"
            :class="isMac ? 'w-5 h-5' : 'w-6 h-6'"
          />
        </div>
        <div>
          <h1 
            class="italic leading-none text-left"
            :class="isMac ? 'text-lg' : 'text-xl'"
          >
            LIVE<span class="opacity-50">ATC</span>
          </h1>
          <span class="text-[10px] opacity-40 ml-0.5 block text-left">CAPTION</span>
        </div>
      </button>

      <button
        @click="$emit('toggle')"
        class="btn btn-ghost btn-xs btn-square opacity-40 hover:opacity-100 ml-auto lg:hidden"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
    </div>

    <form @submit.prevent="$emit('search', localIcao)">
      <div class="relative group">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 transition-colors z-10 pointer-events-none" />
        <input
          v-model="localIcao"
          type="text"
          placeholder="Enter ICAO (e.g. KBOS)"
          class="input border w-full pl-10 text-xs h-10 rounded-xl"
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
