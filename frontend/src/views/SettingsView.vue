<template>
  <div class="flex flex-1 flex-col bg-gemini-base backdrop-blur-md animate-in fade-in duration-300">
    <div class="mx-auto mt-20 w-full max-w-xl rounded-2xl bg-base-100 p-8 shadow-sm">
      <div class="mb-10 flex items-center gap-4">
        <div class="rounded-2xl border p-3 shadow-2xl">
          <SettingsIcon class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-3xl uppercase">Settings</h1>
          <p class="mt-1 text-sm opacity-50">Frontend cleanup complete. This build no longer exposes audio or transcription controls.</p>
        </div>
      </div>

      <div class="space-y-6">
        <section class="space-y-3 rounded-2xl border p-5">
          <div class="flex items-center gap-2 opacity-60 uppercase">
            <Map class="h-4 w-4" />
            <h2 class="text-sm">Airport Explorer</h2>
          </div>
          <p class="text-sm leading-relaxed opacity-60">
            Airport views focus on map context, METAR, and nearby traffic. No provider keys, audio worklets, or caption timing settings remain in the frontend.
          </p>
        </section>

        <section class="space-y-3 rounded-2xl border p-5">
          <div class="flex items-center gap-2 opacity-60 uppercase">
            <Info class="h-4 w-4" />
            <h2 class="text-sm">Runtime Settings</h2>
          </div>
          <p class="text-sm leading-relaxed opacity-60">
            There are no user-configurable frontend runtime settings in this build yet. Add new controls here only if they affect the airport explorer directly.
          </p>
        </section>
      </div>

      <div class="mt-12">
        <button
          class="btn btn-outline btn-block h-14 rounded-2xl border-opacity-20 uppercase shadow-xl"
          @click="router.back()"
        >
          Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Info, Map, Settings as SettingsIcon } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
