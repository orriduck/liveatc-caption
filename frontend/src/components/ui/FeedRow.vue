<template>
  <div
    @click="$emit('select')"
    class="flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-all"
    :class="selected
      ? 'border-atc-orange bg-gradient-to-r from-[rgba(255,90,31,0.12)] to-atc-card'
      : 'border-atc-line bg-atc-card hover:border-atc-line-strong'"
  >
    <div class="font-mono text-[12px] text-atc-faint tracking-[0.5px] w-6 flex-shrink-0">
      {{ String(index + 1).padStart(2, '0') }}
    </div>

    <div class="flex-1 min-w-0">
      <div class="text-[15px] font-semibold mb-1 truncate" style="letter-spacing:-0.2px">{{ feed.name }}</div>
      <div class="flex items-center gap-2.5 text-[12px] text-atc-dim">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-mono text-[10px] font-semibold tracking-[1px]"
              style="color:#34d399;border-color:rgba(52,211,153,0.3)">
          <span class="w-[5px] h-[5px] rounded-full bg-atc-mint" style="box-shadow:0 0 6px #34d399" />
          LIVE
        </span>
        <span>{{ feed.listeners }} listening</span>
        <span class="text-atc-faint">·</span>
        <span>24 kbps MP3</span>
      </div>
    </div>

    <div class="font-mono text-[20px] font-semibold flex items-baseline gap-1.5 flex-shrink-0" style="letter-spacing:-0.5px">
      {{ feed.freq || '' }}
      <span v-if="feed.freq" class="text-[11px] text-atc-faint tracking-[1px]">MHz</span>
    </div>

    <button
      @click.stop="$emit('listen')"
      class="w-10 h-10 rounded-full bg-atc-orange text-atc-bg border-none cursor-pointer grid place-items-center flex-shrink-0"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  feed:     { type: Object,  required: true },
  index:    { type: Number,  default: 0     },
  selected: { type: Boolean, default: false },
})
defineEmits(['select', 'listen'])
</script>
