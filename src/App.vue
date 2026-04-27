<template>
    <div class="min-h-screen bg-atc-bg text-atc-text">
        <router-view v-slot="{ Component }">
            <transition name="screen" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
        <Analytics />
    </div>
    <SpeedInsights />
</template>

<script setup>
import { SpeedInsights } from "@vercel/speed-insights/vue";
import { Analytics } from "@vercel/analytics/vue";
</script>
