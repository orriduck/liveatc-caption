<template>
    <section
        class="mobile-status-bar"
        role="status"
        aria-live="polite"
        :style="barStyle"
    >
        <!-- Both slots always mounted; one hidden, one visible per phase -->
        <div ref="metarSlot" class="status-slot" :style="slotStyle('metar')">
            <div class="status-kicker">METAR</div>
            <div class="status-main">
                <span>{{ metar.flightCategory || "Observed" }}</span>
                <span>·</span>
                <span>{{ metar.wind || "Wind —" }}</span>
                <span>·</span>
                <span>{{ metar.vis || "Vis —" }}</span>
            </div>
        </div>
        <div
            ref="trafficSlot"
            class="status-slot"
            :style="slotStyle('traffic')"
        >
            <div class="status-kicker">Traffic</div>
            <div class="status-main">
                <span>↑ <NumberFlow :value="trafficCounts.ascending" /></span>
                <span>↓ <NumberFlow :value="trafficCounts.descending" /></span>
                <span>→ <NumberFlow :value="trafficCounts.level" /></span>
            </div>
        </div>
    </section>
</template>

<script setup>
import NumberFlow from "@number-flow/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
    metar: { type: Object, default: null },
    trafficCounts: {
        type: Object,
        default: () => ({ ascending: 0, descending: 0, level: 0 }),
    },
});

// ── Phase machine ────────────────────────────────────────
// idle → fade-out → resize → fade-in → idle
const phase = ref("idle");
const activeView = ref("metar");
const metarSlot = ref(null);
const trafficSlot = ref(null);

const DURATIONS = { fadeOut: 160, resize: 260, fadeIn: 200 };
const INTERVAL_MS = 4200;

const hasMetar = computed(() => Boolean(props.metar));

// Lock width to a px value during resize so CSS transition can animate it
const lockWidth = ref(null);
const barStyle = computed(() =>
    lockWidth.value != null ? { width: `${lockWidth.value}px` } : {},
);

function slotStyle(view) {
    const isActive = view === activeView.value;
    if (phase.value === "idle" || phase.value === "resize") {
        return {
            opacity: isActive ? 1 : 0,
            pointerEvents: isActive ? "auto" : "none",
        };
    }
    // Both hidden during fade-out
    if (phase.value === "fade-out") {
        return { opacity: 0, pointerEvents: "none" };
    }
    // fade-in: new slot fades up
    if (phase.value === "fade-in") {
        return {
            opacity: isActive ? 1 : 0,
            pointerEvents: isActive ? "auto" : "none",
        };
    }
    return {};
}

// ── Rotation ─────────────────────────────────────────────
async function rotate() {
    if (!hasMetar.value && activeView.value === "traffic") return;
    if (!hasMetar.value) {
        activeView.value = "traffic";
        return;
    }

    const nextView = activeView.value === "metar" ? "traffic" : "metar";
    const incomingEl =
        nextView === "metar" ? metarSlot.value : trafficSlot.value;
    const barEl = document.querySelector(".mobile-status-bar");
    const fromW = barEl ? barEl.offsetWidth : 300;

    // 1. Fade out current content
    phase.value = "fade-out";
    await sleep(DURATIONS.fadeOut);

    // 2. Switch active view, briefly reveal incoming to measure its natural width
    activeView.value = nextView;
    await nextTick();
    incomingEl.style.opacity = "1";
    await nextTick();
    const toW = incomingEl.offsetWidth;
    incomingEl.style.opacity = "";

    // 3. Animate card width from → to
    lockWidth.value = fromW;
    void barEl?.offsetHeight; // force layout
    phase.value = "resize";
    lockWidth.value = toW;
    await sleep(DURATIONS.resize);

    // 4. Fade in new content, release width lock
    lockWidth.value = null;
    phase.value = "fade-in";
    await sleep(DURATIONS.fadeIn);

    // Done
    phase.value = "idle";
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Lifecycle ────────────────────────────────────────────
let timer = null;
onMounted(() => {
    timer = window.setInterval(rotate, INTERVAL_MS);
});
onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
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
    left: 50%;
    min-height: 52px;
    padding: 10px 14px;
    position: fixed;
    transform: translateX(-50%);
    transition: width 0.26s cubic-bezier(0.4, 0, 0.2, 1);
    width: fit-content;
    max-width: min(92vw, 420px);
    z-index: 45;
    overflow: hidden;
}

.status-slot {
    display: flex;
    flex-direction: column;
    gap: 6px;
    white-space: nowrap;
}

.status-kicker {
    color: var(--atc-faint);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
}

.status-main {
    color: var(--atc-text);
    display: flex;
    font-size: 13px;
    font-weight: 700;
    gap: 10px;
    line-height: 1.2;
}

@media (max-width: 1080px) {
    .mobile-status-bar {
        display: flex;
    }
}
</style>
