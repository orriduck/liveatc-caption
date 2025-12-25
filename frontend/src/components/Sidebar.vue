<template>
  <div class="flex flex-col h-full w-full">
    <!-- Header Section -->
    <div class="p-2">
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
    <div class="flex-1 min-h-0">
      <SidebarLoading v-if="loading" />
      <div v-else class="flex flex-col h-full gap-2 p-2">
        <AirportInfo :airport="data?.airport" class="shrink-0" />
        <AvailableFeedsDisplay
          v-if="data"
          :data="data"
          class="flex-1 min-h-0"
          :currentChannelId="currentChannelId"
          :isRefreshing="isRefreshing"
          @refresh="$emit('refresh')"
          @select-channel="$emit('selectChannel', $event)"
        />
      </div>
    </div>

    <!-- Footer Section -->
    <SidebarFooter
      @open-settings="$emit('openSettings')"
      @open-about="$emit('openAbout')"
    />
  </div>
</template>

<script setup>
import SidebarHeader from './sidebar/SidebarHeader.vue'
import SidebarLoading from './sidebar/SidebarLoading.vue'
import SidebarFooter from './sidebar/SidebarFooter.vue'
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
