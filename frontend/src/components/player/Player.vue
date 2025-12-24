<template>
  <div class="absolute bottom-0 left-0 right-0 z-[70] animate-in slide-in-from-bottom-8 duration-700 ease-out">
    <div class="bg-neutral-900/40 backdrop-blur-3xl border-t border-white/5 px-8 py-4 flex items-center justify-between shadow-2xl shadow-black/50 overflow-hidden group">
      <!-- Subtle background glow -->
      <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

      <!-- Left: Channel Info -->
      <div class="flex items-center gap-4 relative z-10">
        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center relative border border-white/10">
          <Activity class="w-5 h-5 text-blue-400 animate-pulse" />
          <div class="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-900 shadow-sm"></div>
        </div>
        <div class="flex flex-col">
          <h4 class="text-sm font-black text-white/90 uppercase tracking-wider">
            {{ channel?.name }}
          </h4>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] font-black text-blue-500/80 uppercase tracking-widest animate-pulse">Live</span>
          </div>
        </div>
      </div>

      <!-- Right: Timer & Control -->
      <div class="flex items-center gap-8 relative z-10">
        <div class="flex flex-col items-end">
          <span class="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-0.5 opacity-50">Connection Time</span>
          <span class="text-sm font-mono font-bold text-blue-100 tabular-nums tracking-tight">
            {{ formattedTime }}
          </span>
        </div>

        <div class="h-8 w-px bg-white/5"></div>

        <button
          @click="$emit('stop')"
          class="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl transition-all active:scale-95 group/stop"
        >
          <Square class="w-3.5 h-3.5 fill-current group-hover/stop:scale-110 transition-transform" />
          <span class="text-[10px] font-black uppercase tracking-widest">Stop</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Activity, Square } from 'lucide-vue-next'

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
