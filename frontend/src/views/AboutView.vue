<template>
  <div class="flex-1 flex flex-col h-full bg-base-100 backdrop-blur-md animate-in fade-in duration-300">
    <div class="max-w-xl w-full mx-auto mt-20 p-8">
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <div class="p-3 border rounded-2xl shadow-2xl">
            <Info class="w-6 h-6" />
          </div>
          <h1 class="text-3xl uppercase">About</h1>
        </div>
      </div>

      <div class="space-y-8">
        <div class="space-y-4">
          <h2 class="text-xl uppercase">LiveATC Caption</h2>
          <p class="text-sm opacity-50 leading-relaxed">
            LiveATC Caption brings real-time AI-powered transcriptions to your favorite Air Traffic Control feeds. 
            built for aviation enthusiasts, student pilots, and professionals who want to visualize communications 
            as they happen.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 border rounded-2xl">
            <span class="block text-[10px] uppercase opacity-50 mb-1">Version</span>
            <span class="text-sm">0.1.1 (ALPHA)</span>
          </div>
          <div class="p-4 border rounded-2xl">
            <span class="block text-[10px] uppercase opacity-50 mb-1">Model</span>
            <span class="text-sm">Gemini 2.0 Flash</span>
          </div>
        </div>

        <div class="pt-8 border-t flex flex-col gap-4">
          <a
            href="https://github.com/orriduck/liveatc-caption"
            target="_blank"
            rel="noreferrer"
            class="flex items-center justify-between p-4 border rounded-2xl transition-all group hover:bg-current/5"
          >
            <div class="flex items-center gap-3">
              <Github class="w-5 h-5 opacity-50 group-hover:opacity-100 transition-colors" />
              <span class="text-sm opacity-70 group-hover:opacity-100 transition-colors">Source Code</span>
            </div>
            <X class="w-4 h-4 opacity-30 rotate-45" />
          </a>
        </div>

        <div class="flex items-center justify-center gap-2 opacity-30 pt-8 animate-pulse">
          <Heart class="w-4 h-4 fill-current" />
          <span class="text-[10px] uppercase">Built for Aviation</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Info, X, Github, Heart } from 'lucide-vue-next'
</script>
