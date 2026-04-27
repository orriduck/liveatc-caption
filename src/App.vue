<template>
    <div class="min-h-screen bg-atc-bg text-atc-text">
        <router-view v-slot="{ Component }">
            <transition name="screen" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </div>
</template>

<script setup>
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
</script>
