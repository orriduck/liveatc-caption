<template>
  <div class="space-y-4 p-4">
    <div class="h-24 bg-zinc-800 rounded-2xl animate-pulse"></div>
    <div class="h-10 bg-zinc-800 rounded-full animate-pulse"></div>
    <div class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 bg-zinc-800/50 rounded-xl animate-pulse"></div>
    </div>
  </div>
</template>
