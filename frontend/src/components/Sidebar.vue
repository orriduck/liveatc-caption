<template>
  <div class="flex flex-col h-full bg-base-200 text-base-content w-full">
    <!-- Header Section -->
    <div class="p-4 bg-base-100/50">
      <SidebarHeader
        :icaoInput="icaoInput"
        @update:icaoInput="$emit('update:icaoInput', $event)"
        @search="$emit('search', $event)"
        @toggle="$emit('toggle')"
        @goHome="$emit('goHome')"
        :isMac="isMac"
      />
    </div>

    <!-- Content Section -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
      <SidebarLoading v-if="loading" />
      <div v-else class="flex flex-col gap-2 p-2">
        <AirportInfo :airport="data?.airport" />
        <AvailableFeedsDisplay
          v-if="data"
          :data="data"
          :currentChannelId="currentChannelId"
          :isRefreshing="isRefreshing"
          @refresh="$emit('refresh')"
          @select-channel="$emit('selectChannel', $event)"
        />
      </div>
    </div>

    <!-- Footer Section -->
    <div class="p-4 border-t border-base-300 bg-base-100/50 mt-auto flex flex-col gap-1">
      <button
        @click="$emit('openSettings')"
        class="btn btn-ghost btn-block justify-between normal-case"
      >
        <div class="flex items-center gap-2">
          <Settings class="w-4 h-4" />
          <span>Settings</span>
        </div>
      </button>
      <button
        @click="$emit('openAbout')"
        class="btn btn-ghost btn-block justify-between normal-case"
      >
        <div class="flex items-center gap-2">
          <Info class="w-4 h-4" />
          <span>About</span>
        </div>
        <span class="badge badge-sm badge-ghost">v0.1.0</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Settings, Info } from 'lucide-vue-next'
import SidebarHeader from './sidebar/SidebarHeader.vue'
import SidebarLoading from './sidebar/SidebarLoading.vue'
import AirportInfo from './sidebar/AirportInfo.vue'
import AvailableFeedsDisplay from './sidebar/AvailableFeedsDisplay.vue'

const props = defineProps({
  icaoInput: String,
  data: Object,
  loading: Boolean,
  currentChannelId: String,
  isRefreshing: Boolean
})

defineEmits([
  'update:icaoInput',
  'search',
  'refresh',
  'selectChannel',
  'toggle',
  'openSettings',
  'openAbout',
  'goHome'
])

const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
</script>
