<template>
  <div class="border rounded-2xl overflow-hidden flex flex-col min-h-0">
    <div class="p-3 border-b sticky top-0 z-10 backdrop-blur-md">
      <div class="flex items-center justify-between mb-2 px-1">
        <div class="flex items-center gap-2">
          <ListFilter class="w-3 h-3" />
          <h3 class="text-[10px] uppercase">Feeds</h3>
        </div>
        <div class="flex items-center gap-1">
          <button 
            @click="$emit('refresh')"
            class="btn btn-ghost btn-xs btn-square"
            :class="{ 'animate-spin': isRefreshing }"
          >
            <RefreshCw class="w-3 h-3" />
          </button>
          <div class="dropdown dropdown-end">
            <button tabindex="0" class="btn btn-ghost btn-xs btn-square">
              <ArrowUpDown class="w-3 h-3" />
            </button>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow border rounded-xl w-40 mt-2 text-[10px] uppercase">
              <li><a @click="sortBy = 'listeners'" :class="{ 'underline': sortBy === 'listeners' }">Most Active</a></li>
              <li><a @click="sortBy = 'name'" :class="{ 'underline': sortBy === 'name' }">A-Z Name</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 z-10 pointer-events-none" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Filter channels..." 
          class="input border w-full pl-9 text-[10px] h-8 rounded-lg"
        />
      </div>
    </div>

    <div class="overflow-y-auto max-h-[400px]">
      <div v-if="filteredChannels.length === 0" class="p-8 text-center opacity-20">
        <Radio class="w-8 h-8 mx-auto mb-2" />
        <p class="text-[10px] uppercase">No feeds found</p>
      </div>
      <div v-else>
        <button
          v-for="channel in filteredChannels"
          :key="channel.id"
          @click="$emit('select-channel', channel)"
          class="w-full text-left p-3 flex items-center justify-between transition-colors group border-b last:border-0"
          :class="{ 'bg-current/10': currentChannelId === channel.id }"
        >
          <div class="flex-1 min-w-0 pr-2">
            <h4 
              class="text-xs truncate transition-colors"
            >
              {{ channel.name }}
            </h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="flex items-center gap-1 text-[9px] opacity-50">
                <Users class="w-2.5 h-2.5" />
                <span class="font-google-sans-code">{{ channel.listeners }}</span> listening
              </span>
              <span v-if="channel.status === 'UP'" class="w-1.5 h-1.5 rounded-full opacity-50 animate-pulse"></span>
            </div>
          </div>
          <ChevronRight class="w-3 h-3 opacity-30 group-hover:opacity-100 transition-colors" />
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
