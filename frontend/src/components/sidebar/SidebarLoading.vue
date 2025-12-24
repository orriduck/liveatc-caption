<template>
  <div class="space-y-4 p-4">
    <div class="h-24 border rounded-2xl animate-pulse"></div>
    <div class="h-10 border rounded-full animate-pulse"></div>
    <div class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 border rounded-xl animate-pulse opacity-50"></div>
    </div>
  </div>
</template>
