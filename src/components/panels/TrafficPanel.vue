<script setup>
import NumberFlow from "@number-flow/vue";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";

defineProps({
    aircraft: {
        type: Array,
        default: () => [],
    },
    trafficCounts: {
        type: Object,
        default: () => ({ ascending: 0, descending: 0, level: 0 }),
    },
});
</script>

<template>
    <section class="glass-panel traffic-panel">
        <div class="panel-heading">
            <div>
                <div class="panel-kicker">Airport traffic</div>
                <h2>Nearby aircraft</h2>
            </div>
        </div>

        <div class="traffic-counts">
            <div>
                <span>Total</span>
                <strong style="color: var(--atc-text)"
                    ><NumberFlow :value="aircraft.length"
                /></strong>
            </div>
            <div>
                <span>Ascending</span>
                <strong :style="{ color: AIRCRAFT_COLORS.ascending }"
                    ><NumberFlow :value="trafficCounts.ascending"
                /></strong>
            </div>
            <div>
                <span>Descending</span>
                <strong :style="{ color: AIRCRAFT_COLORS.descending }"
                    ><NumberFlow :value="trafficCounts.descending"
                /></strong>
            </div>
            <div>
                <span>Level</span>
                <strong :style="{ color: 'var(--traffic-level-color)' }"
                    ><NumberFlow :value="trafficCounts.level"
                /></strong>
            </div>
        </div>
    </section>
</template>

<style scoped>
.glass-panel {
    background: linear-gradient(
        145deg,
        var(--glass-card-top),
        var(--glass-card-bottom)
    );
    border: 1px solid var(--glass-card-border);
    border-radius: var(--atc-radius-panel);
    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.18),
        0 24px 64px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 var(--glass-card-inset);
    max-height: 250px;
    min-width: 0;
    overflow: hidden;
    padding: 16px;
    position: relative;
    backdrop-filter: blur(6px) saturate(120%);
    -webkit-backdrop-filter: blur(6px) saturate(120%);
}

.glass-panel::before {
    background: linear-gradient(
        120deg,
        var(--glass-card-glint-strong) 0%,
        var(--glass-card-glint-soft) 45%,
        transparent 60%
    );
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
}

.panel-heading {
    align-items: flex-start;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    position: relative;
}

.panel-heading h2 {
    color: var(--atc-text);
    font-size: 16px;
    font-weight: 800;
    line-height: 1.15;
    margin: 4px 0 0;
}

.panel-kicker {
    color: var(--atc-faint);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
}

.traffic-counts {
    display: grid;
    gap: 12px 18px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 18px;
}

.traffic-counts > div {
    border-top: 1px solid var(--atc-line);
    padding-top: 10px;
}

.traffic-counts span {
    color: var(--atc-faint);
    display: block;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
}

.traffic-counts strong {
    display: block;
    font-size: 30px;
    line-height: 1;
    margin-top: 9px;
}

@media (max-width: 980px) {
    .traffic-panel {
        grid-column: auto;
        min-height: 220px;
    }

    .glass-panel {
        max-height: none;
    }
}

@media (max-width: 620px) {
    .glass-panel {
        border-radius: var(--atc-radius-panel);
        padding: 16px;
    }
}
</style>
