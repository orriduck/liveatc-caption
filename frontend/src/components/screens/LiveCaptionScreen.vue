<template>
  <div class="flex-1 overflow-y-auto p-6 md:p-12 pt-24 pb-32 flex flex-col min-h-0">
    <div class="flex-1" /> <!-- Spacer to push content to bottom when few items -->
    <div class="space-y-6">
      <div v-if="visibleCaptions.length > 0">
        <div
          v-for="(cap, i) in visibleCaptions"
          :key="cap.id"
          class="flex flex-col gap-2 transition-all duration-700 ease-out mb-10"
          :class="[
            i === captions.length - 1 ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-2',
            cap.isTemp ? 'animate-pulse' : ''
          ]"
        >
          <div class="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase opacity-30">
            <div class="flex items-center gap-1.5 leading-none">
              <TowerControl v-if="cap.speaker === 'ATC'" class="w-3.5 h-3.5" />
              <Plane v-else-if="cap.speaker === 'PLANE'" class="w-3.5 h-3.5" />
              <AlertCircle v-else class="w-3.5 h-3.5 text-error" />
              <span>{{ cap.speaker || 'SYSTEM' }}</span>
            </div>
            <div class="flex items-center gap-1.5 ml-4">
              <Clock class="w-3 h-3" />
              <span class="font-google-sans-code font-normal">{{ formatTime(cap.timestamp) }}</span>
            </div>
          </div>

          <div class="mt-1">
            <DecryptedText 
              :text="cap.caption || cap.details || 'UNINTELLIGIBLE'"
              animate-on="view"
              reveal-direction="start"
              :speed="30"
              :max-iterations="15"
              class="text-lg md:text-1xl lg:text-2xl font-black leading-[1.05] uppercase tracking-tight antialiased"
              :class="[
                cap.speaker === 'PLANE' ? 'text-base-content' : 'text-base-content/60',
                !cap.caption ? 'text-error/40 italic text-2xl md:text-3xl lg:text-4xl' : ''
              ]"
            />
          </div>
        </div>
      </div>

      <!-- Speaking Placeholder -->
      <div v-if="connectionState === 'SPEAKING'" class="flex flex-col gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div class="flex items-center gap-2">
           <div class="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
              <div class="flex gap-0.5 items-end h-2.5 w-max">
                <div class="w-0.5 bg-current animate-[bounce_1s_infinite] h-2.5 rounded-full"></div>
                <div class="w-0.5 bg-current animate-[bounce_1.2s_infinite] h-1.5 rounded-full"></div>
                <div class="w-0.5 bg-current animate-[bounce_0.8s_infinite] h-2 rounded-full"></div>
              </div>
              Speaking
           </div>
        </div>
      </div>

      <!-- Transcribing Placeholder -->
      <div v-if="hasPendingTranscription" class="flex flex-col gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
        <div class="flex items-center gap-2">
           <div class="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
              <div class="flex gap-0.5 items-end h-2.5 w-max">
                <div class="w-0.5 bg-current animate-[pulse_1s_infinite] h-2.5 rounded-full opacity-60"></div>
                <div class="w-0.5 bg-current animate-[pulse_1.2s_infinite] h-1.5 rounded-full opacity-60"></div>
                <div class="w-0.5 bg-current animate-[pulse_0.8s_infinite] h-2 rounded-full opacity-60"></div>
              </div>
              Transcribing
           </div>
        </div>
      </div>
      <div v-if="visibleCaptions.length === 0 && connectionState !== 'SPEAKING' && !hasPendingTranscription" class="h-[60vh] flex flex-col items-center justify-center opacity-10 pb-24">
        <MessageSquare class="w-20 h-20 mb-4 animate-pulse" />
        <h2 class="text-2xl italic uppercase">Awaiting Transmission</h2>
      </div>
      <div ref="msgEnd" class="h-4" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { MessageSquare, Plane, TowerControl, Clock, AlertCircle } from 'lucide-vue-next'
import DecryptedText from '../ui/DecryptedText.vue'

const props = defineProps({
  captions: {
    type: Array,
    required: true
  },
  connectionState: {
    type: String,
    default: 'IDLE'
  }
})

const msgEnd = ref(null)

const visibleCaptions = computed(() => {
    return props.captions.filter(c => !c.isTemp)
})

const hasPendingTranscription = computed(() => {
    return props.captions.some(c => c.isTemp) || props.connectionState === 'TRANSCRIBING'
})

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
