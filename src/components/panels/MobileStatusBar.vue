<template>
    <section
        ref="barRef"
        class="mobile-status-bar"
        role="status"
        aria-live="polite"
        :style="barStyle"
    >
        <!-- Both slots always mounted; one hidden, one visible per phase -->
        <div
            ref="metarSlot"
            :class="slotClass('metar')"
            :style="slotStyle('metar')"
            :aria-hidden="activeView !== 'metar'"
        >
            <div class="status-kicker">METAR</div>
            <div class="status-main">
                <span>{{ metar?.flightCategory || "Observed" }}</span>
                <span>·</span>
                <span>{{ metar?.wind || "Wind —" }}</span>
                <span>·</span>
                <span>{{ metar?.vis || "Vis —" }}</span>
            </div>
        </div>
        <div
            ref="trafficSlot"
            :class="slotClass('traffic')"
            :style="slotStyle('traffic')"
            :aria-hidden="activeView !== 'traffic'"
        >
            <div class="status-kicker">Traffic</div>
            <div class="status-main">
                <span :style="{ color: AIRCRAFT_COLORS.ascending }"
                    >↑ <NumberFlow :value="trafficCounts.ascending"
                /></span>
                <span :style="{ color: AIRCRAFT_COLORS.descending }"
                    >↓ <NumberFlow :value="trafficCounts.descending"
                /></span>
                <span :style="{ color: AIRCRAFT_COLORS.level }"
                    >→ <NumberFlow :value="trafficCounts.level"
                /></span>
            </div>
        </div>
    </section>
</template>

<script setup>
import NumberFlow from "@number-flow/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";

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
const barRef = ref(null);
const metarSlot = ref(null);
const trafficSlot = ref(null);

const DURATIONS = { fadeOut: 160, resize: 260, fadeIn: 200, expandReveal: 170 };
const INTERVAL_MS = 4200;

const hasMetar = computed(() => Boolean(props.metar));

// Lock width to a px value during resize so CSS transition can animate it
const lockWidth = ref(null);
const barStyle = computed(() =>
    lockWidth.value != null ? { width: `${lockWidth.value}px` } : {},
);

function slotStyle(view) {
    const isActive = view === activeView.value;
    if (phase.value === "idle" || phase.value === "fade-in") {
        return {
            opacity: isActive ? 1 : 0,
            pointerEvents: isActive ? "auto" : "none",
        };
    }

    // Keep the active slot in flow during fade-out/resize for measuring, but
    // hide all content until the final fade-in phase.
    return { opacity: 0, pointerEvents: "none" };
}

function slotClass(view) {
    return {
        "status-slot": true,
        "status-slot--layered": view !== activeView.value,
    };
}

// ── Rotation ─────────────────────────────────────────────
let rotating = false;
let mounted = false;
async function rotate() {
    if (rotating) return;
    if (!hasMetar.value && activeView.value === "traffic") return;
    if (!hasMetar.value) {
        activeView.value = "traffic";
        return;
    }

    rotating = true;
    const nextView = activeView.value === "metar" ? "traffic" : "metar";
    const incomingEl =
        nextView === "metar" ? metarSlot.value : trafficSlot.value;
    const barEl = barRef.value;
    const fromW = barEl ? barEl.getBoundingClientRect().width : 300;
    const toW = measureBarWidth(barEl, incomingEl);
    const isExpanding = toW > fromW;

    // 1. Fade out current content
    phase.value = "fade-out";
    await sleep(DURATIONS.fadeOut);
    if (!mounted) return;

    // 2. Lock current width, then switch active slot while hidden.
    lockWidth.value = fromW;
    await nextTick();
    activeView.value = nextView;
    await nextTick();

    if (isExpanding) {
        // On expansion, start revealing late enough that the incoming text
        // is not readable while the card is still too narrow for it.
        void barEl?.offsetHeight; // force layout
        phase.value = "resize";
        lockWidth.value = toW;
        await sleep(DURATIONS.expandReveal);
        if (!mounted) return;

        phase.value = "fade-in";
        await sleep(
            Math.max(
                DURATIONS.resize - DURATIONS.expandReveal,
                DURATIONS.fadeIn,
            ),
        );
        if (!mounted) return;

        lockWidth.value = null;
        phase.value = "idle";
        rotating = false;
        return;
    }

    // 3. Animate card width from -> to
    void barEl?.offsetHeight; // force layout
    phase.value = "resize";
    lockWidth.value = toW;
    await sleep(DURATIONS.resize);
    if (!mounted) return;

    // 4. Fade in new content, release width lock
    phase.value = "fade-in";
    await sleep(DURATIONS.fadeIn);
    if (!mounted) return;

    // Done
    lockWidth.value = null;
    phase.value = "idle";
    rotating = false;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function measureBarWidth(barEl, slotEl) {
    if (!barEl || !slotEl) return 300;

    const styles = window.getComputedStyle(barEl);
    const chromeWidth = [
        styles.paddingLeft,
        styles.paddingRight,
        styles.borderLeftWidth,
        styles.borderRightWidth,
    ].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0);

    return Math.ceil(slotEl.scrollWidth + chromeWidth);
}

// ── Lifecycle ────────────────────────────────────────────
let timer = null;
onMounted(() => {
    mounted = true;
    timer = window.setInterval(rotate, INTERVAL_MS);
});
onBeforeUnmount(() => {
    mounted = false;
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
    box-sizing: border-box;
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
    max-width: calc(min(92vw, 420px) - 30px);
    min-width: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    width: max-content;
}

.status-slot--layered {
    left: 14px;
    position: absolute;
    top: 10px;
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
    min-width: 0;
    overflow: hidden;
}

@media (max-width: 1080px) {
    .mobile-status-bar {
        display: flex;
    }
}
</style>
