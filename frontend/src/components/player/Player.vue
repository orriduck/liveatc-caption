<template>
  <div class="absolute bottom-0 left-0 right-0 z-[70] animate-in slide-in-from-bottom-8 duration-700 ease-out">
    <div class="bg-base-100/30 backdrop-blur-3xl border-t px-8 py-4 flex items-center justify-between shadow-2xl overflow-hidden group">
      <!-- Left: Channel Info -->
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-10 h-10 rounded-xl border bg-base-100/50 flex items-center justify-center relative">
          <AudioLines class="w-5 h-5 opacity-40" />
        </div>
        <div class="flex flex-col">
          <h4 class="text-xs font-bold uppercase tracking-tight">
            {{ channel?.name }}
          </h4>
          <div class="flex items-center gap-1.5 mt-0.5">
            <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            <span class="text-[9px] font-bold uppercase tracking-widest text-emerald-600/80">Live</span>
          </div>
        </div>
      </div>

      <!-- Right: Timer & Control -->
      <div class="flex items-center gap-8 relative z-10">
        <div class="flex flex-col items-end">
          <span class="text-[8px] font-bold uppercase mb-0.5 opacity-30 tracking-widest">Connection Time</span>
          <span class="text-sm font-google-sans-code tabular-nums font-medium">
            {{ formattedTime }}
          </span>
        </div>

        <button
          @click="$emit('stop')"
          class="flex items-center gap-3 border shadow-sm bg-base-100 hover:bg-base-200 transition-colors px-5 py-2 rounded-full active:scale-95 group/stop"
        >
          <Square class="w-3 h-3 fill-current group-hover/stop:scale-110 transition-transform" />
          <span class="text-[10px] font-bold uppercase tracking-widest">Stop</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { AudioLines, Square } from 'lucide-vue-next'

defineProps({
  channel: Object
})

defineEmits(['stop'])

const duration = ref(0)
let timer = null

const formattedTime = computed(() => {
  const seconds = duration.value
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  
  const hStr = h > 0 ? `${h}:` : ''
  const mStr = (h > 0 ? m.toString().padStart(2, '0') : m.toString())
  const sStr = s.toString().padStart(2, '0')
  
  return `${hStr}${mStr}:${sStr}`
})

onMounted(() => {
  timer = setInterval(() => {
    duration.value++
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
