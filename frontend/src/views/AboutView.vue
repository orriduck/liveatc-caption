<template>
  <div class="flex flex-1 flex-col bg-gemini-base backdrop-blur-md animate-in fade-in duration-300">
    <div class="mx-auto mt-20 w-full max-w-xl rounded-2xl bg-base-100 p-8 shadow-sm">
      <div class="mb-10 flex items-center gap-4">
        <div class="rounded-2xl border p-3 shadow-2xl">
          <Info class="h-6 w-6" />
        </div>
        <h1 class="text-3xl uppercase">About</h1>
      </div>

      <div class="space-y-8">
        <div class="space-y-4">
          <h2 class="text-xl uppercase">Airport Explorer</h2>
          <p class="text-sm leading-relaxed opacity-60">
            This frontend is now an airport explorer focused on airport lookup, weather context, and nearby traffic visualization.
            The LiveATC player, feed selector, and transcription presentation have been removed from the UI.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-2xl border p-4">
            <span class="mb-1 block text-[10px] uppercase opacity-50">Version</span>
            <span class="text-sm">0.4.0 (Breaking)</span>
          </div>
          <div class="rounded-2xl border p-4">
            <span class="mb-1 block text-[10px] uppercase opacity-50">Focus</span>
            <span class="text-sm">Maps · Weather · Traffic</span>
          </div>
        </div>

        <div class="flex flex-col gap-4 border-t pt-8">
          <a
            href="https://github.com/orriduck/liveatc-caption"
            target="_blank"
            rel="noreferrer"
            class="group flex items-center justify-between rounded-2xl border p-4 transition-all hover:bg-current/5"
          >
            <div class="flex items-center gap-3">
              <Github class="h-5 w-5 opacity-50 transition-colors group-hover:opacity-100" />
              <span class="text-sm opacity-70 transition-colors group-hover:opacity-100">Source Code</span>
            </div>
            <X class="h-4 w-4 rotate-45 opacity-30" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Github, Info, X } from 'lucide-vue-next'
</script>
