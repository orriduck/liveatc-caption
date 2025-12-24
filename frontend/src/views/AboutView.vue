<template>
  <div class="flex-1 flex flex-col h-full bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
    <div class="max-w-xl w-full mx-auto mt-20 p-8">
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-neutral-900 rounded-2xl border border-white/5 shadow-2xl">
            <Info class="w-6 h-6 text-blue-500" />
          </div>
          <h1 class="text-3xl font-black uppercase tracking-tighter text-white">About</h1>
        </div>
        <button
          @click="$router.back()"
          class="p-2 hover:bg-neutral-800 rounded-full transition-all text-neutral-500 hover:text-white"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="space-y-8">
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-white uppercase tracking-tight">LiveATC Caption</h2>
          <p class="text-sm text-neutral-400 leading-relaxed font-medium">
            LiveATC Caption brings real-time AI-powered transcriptions to your favorite Air Traffic Control feeds. 
            built for aviation enthusiasts, student pilots, and professionals who want to visualize communications 
            as they happen.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-neutral-900/50 border border-white/5 rounded-2xl">
            <span class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Version</span>
            <span class="text-sm font-bold text-white">0.1.0 (BETA)</span>
          </div>
          <div class="p-4 bg-neutral-900/50 border border-white/5 rounded-2xl">
            <span class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Model</span>
            <span class="text-sm font-bold text-white">Gemini 2.0 Flash</span>
          </div>
        </div>

        <div class="pt-8 border-t border-white/5 flex flex-col gap-4">
          <a
            href="https://github.com/orriduck/liveatc-caption"
            target="_blank"
            rel="noreferrer"
            class="flex items-center justify-between p-4 bg-neutral-900/50 hover:bg-neutral-800 rounded-2xl border border-white/5 transition-all group"
          >
            <div class="flex items-center gap-3">
              <Github class="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
              <span class="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">Source Code</span>
            </div>
            <X class="w-4 h-4 text-neutral-600 rotate-45" />
          </a>
        </div>

        <div class="flex items-center justify-center gap-2 text-neutral-600 pt-8 animate-pulse">
          <Heart class="w-4 h-4 fill-current text-red-500/50" />
          <span class="text-[10px] font-black uppercase tracking-[0.3em]">Built for Aviation</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Info, X, Github, Heart } from 'lucide-vue-next'
</script>
