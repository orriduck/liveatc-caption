<template>
    <div class="min-h-screen bg-atc-bg text-atc-text">
        <router-view v-slot="{ Component }">
            <transition name="screen" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
        <Analytics />
    </div>
</template>

<script setup>
import { Analytics } from "@vercel/analytics/vue";
import { injectSpeedInsights } from "@vercel/speed-insights";

injectSpeedInsights();
</script>
