<template>
  <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
    <div class="p-3 bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
      <div class="flex items-center justify-between mb-2 px-1">
        <div class="flex items-center gap-2">
          <ListFilter class="w-3 h-3 text-zinc-500" />
          <h3 class="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Feeds</h3>
        </div>
        <div class="flex items-center gap-1">
          <button 
            @click="$emit('refresh')"
            class="btn btn-ghost btn-xs btn-square text-zinc-500 hover:text-white"
            :class="{ 'animate-spin': isRefreshing }"
          >
            <RefreshCw class="w-3 h-3" />
          </button>
          <div class="dropdown dropdown-end">
            <button tabindex="0" class="btn btn-ghost btn-xs btn-square text-zinc-500 hover:text-white">
              <ArrowUpDown class="w-3 h-3" />
            </button>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-zinc-900 border border-zinc-800 rounded-xl w-40 mt-2 text-[10px] font-bold uppercase tracking-widest">
              <li><a @click="sortBy = 'listeners'" :class="{ 'text-blue-500': sortBy === 'listeners' }">Most Active</a></li>
              <li><a @click="sortBy = 'name'" :class="{ 'text-blue-500': sortBy === 'name' }">A-Z Name</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Filter channels..." 
          class="w-full bg-black/40 border border-zinc-800/50 rounded-lg py-1.5 pl-8 pr-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all text-zinc-300"
        />
      </div>
    </div>

    <div class="overflow-y-auto max-h-[400px]">
      <div v-if="filteredChannels.length === 0" class="p-8 text-center opacity-20">
        <Radio class="w-8 h-8 mx-auto mb-2" />
        <p class="text-[10px] font-bold uppercase tracking-widest">No feeds found</p>
      </div>
      <div v-else>
        <button
          v-for="channel in filteredChannels"
          :key="channel.id"
          @click="$emit('select-channel', channel)"
          class="w-full text-left p-3 flex items-center justify-between hover:bg-white/5 transition-colors group border-b border-zinc-800 last:border-0"
          :class="{ 'bg-blue-500/10': currentChannelId === channel.id }"
        >
          <div class="flex-1 min-w-0 pr-2">
            <h4 
              class="text-xs font-bold truncate transition-colors"
              :class="currentChannelId === channel.id ? 'text-blue-400' : 'text-zinc-200 group-hover:text-white'"
            >
              {{ channel.name }}
            </h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="flex items-center gap-1 text-[9px] font-bold text-zinc-500">
                <Users class="w-2.5 h-2.5" />
                {{ channel.listeners }} listening
              </span>
              <span v-if="channel.status === 'UP'" class="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse"></span>
            </div>
          </div>
          <ChevronRight class="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ListFilter, RefreshCw, ArrowUpDown, Search, Radio, Users, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  data: Object,
  currentChannelId: String,
  isRefreshing: Boolean
})

const emit = defineEmits(['refresh', 'select-channel'])

const searchQuery = ref('')
const sortBy = ref('listeners')

const filteredChannels = computed(() => {
  if (!props.data?.channels) return []
  
  let channels = [...props.data.channels]
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    channels = channels.filter(c => c.name.toLowerCase().includes(q))
  }
  
  return channels.sort((a, b) => {
    if (sortBy.value === 'listeners') {
      return (b.listeners || 0) - (a.listeners || 0)
    }
    return a.name.localeCompare(b.name)
  })
})
</script>
