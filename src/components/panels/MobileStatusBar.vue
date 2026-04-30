<template>
    <section class="mobile-status-bar" role="status" aria-live="polite">
        <transition name="status-fade" mode="out-in">
            <div :key="activeView" class="status-content">
                <template v-if="activeView === 'metar'">
                    <div class="status-kicker">METAR</div>
                    <div class="status-main">
                        <span>{{ metar.flightCategory || 'Observed' }}</span>
                        <span>·</span>
                        <span>{{ metar.wind || 'Wind —' }}</span>
                        <span>·</span>
                        <span>{{ metar.vis || 'Vis —' }}</span>
                    </div>
                </template>
                <template v-else>
                    <div class="status-kicker">Traffic</div>
                    <div class="status-main">
                        <span>↑ <NumberFlow :value="trafficCounts.ascending" /></span>
                        <span>↓ <NumberFlow :value="trafficCounts.descending" /></span>
                        <span>→ <NumberFlow :value="trafficCounts.level" /></span>
                    </div>
                </template>
            </div>
        </transition>
    </section>
</template>

<script setup>
import NumberFlow from '@number-flow/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
    metar: { type: Object, default: null },
    trafficCounts: {
        type: Object,
        default: () => ({ ascending: 0, descending: 0, level: 0 }),
    },
});

const activeView = ref('metar');
let rotationTimer = null;

const hasMetar = computed(() => Boolean(props.metar));

onMounted(() => {
    rotationTimer = window.setInterval(() => {
        if (!hasMetar.value) {
            activeView.value = 'traffic';
            return;
        }
        activeView.value = activeView.value === 'metar' ? 'traffic' : 'metar';
    }, 4200);
});

onBeforeUnmount(() => {
    if (rotationTimer) window.clearInterval(rotationTimer);
});
</script>

<style scoped>
.mobile-status-bar {
    align-items: center;
    backdrop-filter: blur(10px) saturate(125%);
    -webkit-backdrop-filter: blur(10px) saturate(125%);
    background: linear-gradient(
        145deg,
        var(--glass-card-top),
        var(--glass-card-bottom)
    );
    border: 1px solid var(--glass-card-border);
    border-radius: 18px;
    bottom: 14px;
    box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.24),
        inset 0 1px 0 var(--glass-card-inset);
    display: none;
    gap: 8px;
    left: 50%;
    min-height: 52px;
    padding: 10px 14px;
    position: fixed;
    transform: translateX(-50%);
    width: min(92vw, 420px);
    z-index: 45;
}

.status-content {
    display: grid;
    gap: 6px;
    width: 100%;
}

.status-kicker {
    color: var(--atc-faint);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
}

.status-main {
    color: var(--atc-text);
    display: flex;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    gap: 10px;
    line-height: 1.2;
}

.status-fade-enter-active,
.status-fade-leave-active {
    transition: opacity 0.32s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
    opacity: 0;
}

@media (max-width: 1080px) {
    .mobile-status-bar {
        display: grid;
    }
}
</style>
