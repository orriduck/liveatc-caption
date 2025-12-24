<template>
  <div class="flex-1 overflow-y-auto p-6 md:p-12 pt-24 pb-32 flex flex-col justify-end min-h-0">
    <div class="space-y-6">
      <div v-if="captions.length > 0">
        <div
          v-for="(cap, i) in captions"
          :key="cap.id"
          class="flex flex-col gap-1.5 transition-all duration-700 ease-out"
          :class="i === captions.length - 1 ? 'opacity-100 translate-y-0' : 'opacity-50 -translate-y-2 scale-[0.98]'"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-6 h-6 rounded-md flex items-center justify-center shrink-0 shadow-sm border"
            >
              <TowerControl v-if="cap.speaker === 'ATC'" class="w-4 h-4" />
              <Plane v-else-if="cap.speaker === 'PLANE'" class="w-4 h-4" />
              <MessageSquare v-else class="w-4 h-4" />
            </div>

            <span 
              class="text-[11px] font-black uppercase tracking-[.2em] leading-none"
              :class="{ 'opacity-80': ['ATC', 'PLANE'].includes(cap.speaker) }"
            >
              {{ cap.speaker || 'UNKNOWN' }}
            </span>

            <div class="flex items-center gap-1.5 opacity-20 ml-auto font-mono text-[10px]">
              <Clock class="w-3 h-3" />
              <span>{{ formatTime(cap.timestamp) }}</span>
            </div>
          </div>

          <div class="pl-0.5 mt-1">
            <p 
              class="text-2xl md:text-5xl lg:text-6xl font-black italic tracking-tighter leading-[1.1] uppercase antialiased"
              :class="{ 'opacity-95': ['ATC', 'PLANE'].includes(cap.speaker) }"
            >
              {{ cap.text }}
            </p>
          </div>
        </div>
      </div>
      <div v-else class="h-[60vh] flex flex-col items-center justify-center opacity-10 pb-24">
        <MessageSquare class="w-20 h-20 mb-4 animate-pulse" />
        <h2 class="text-2xl font-black italic uppercase tracking-widest">Awaiting Transmission</h2>
      </div>
      <div ref="msgEnd" class="h-4" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { MessageSquare, Plane, TowerControl, Clock } from 'lucide-vue-next'

const props = defineProps({
  captions: {
    type: Array,
    required: true
  }
})

const msgEnd = ref(null)

const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString([], { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

watch(() => props.captions, () => {
  nextTick(() => {
    msgEnd.value?.scrollIntoView({ behavior: 'smooth' })
  })
}, { deep: true })
</script>
