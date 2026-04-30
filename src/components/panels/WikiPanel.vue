<script setup>
defineProps({
    wikiSummary: {
        type: Object,
        default: null,
    },
    wikiLoading: {
        type: Boolean,
        default: false,
    },
    airportName: {
        type: String,
        default: "Airport",
    },
});
</script>

<template>
    <section class="glass-panel wiki-panel">
        <div class="panel-heading">
            <div>
                <div class="panel-kicker">Airport wiki</div>
                <h2>{{ wikiSummary?.title || airportName }}</h2>
            </div>
            <a
                v-if="wikiSummary?.url"
                class="panel-link"
                :href="wikiSummary.url"
                target="_blank"
                rel="noreferrer"
            >
                Wikipedia
            </a>
        </div>

        <p class="wiki-copy">
            <span v-if="wikiSummary?.extract">{{
                wikiSummary.extract
            }}</span>
            <span v-else-if="wikiLoading"
                >Loading airport introduction...</span
            >
            <span v-else>
                No Wikipedia summary was found for this airport. The
                rest of the dashboard remains live.
            </span>
        </p>

        <div class="wiki-source">Source: Wikipedia summary API</div>
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

.panel-link {
    border: 1px solid var(--atc-line-strong);
    border-radius: var(--atc-radius-pill);
    color: var(--atc-dim);
    flex-shrink: 0;
    font-size: 10px;
    letter-spacing: 1px;
    padding: 5px 9px;
    text-decoration: none;
    text-transform: uppercase;
}

.wiki-copy {
    color: color-mix(in oklab, var(--atc-text) 86%, transparent);
    font-size: 14px;
    line-height: 1.55;
    margin: 14px 0 0;
    max-height: 132px;
    overflow: auto;
    position: relative;
}

.wiki-source {
    border-top: 1px solid var(--atc-line);
    color: var(--atc-faint);
    font-size: 10px;
    letter-spacing: 1px;
    margin-top: 20px;
    padding-top: 12px;
    text-transform: uppercase;
}

@media (max-width: 980px) {
    .wiki-panel {
        grid-column: 1;
        min-height: 220px;
    }

    .glass-panel {
        max-height: none;
    }
}

@media (max-width: 620px) {
    .wiki-panel {
        grid-column: 1;
    }

    .glass-panel {
        border-radius: var(--atc-radius-panel);
        padding: 16px;
    }

    .wiki-copy {
        max-height: 138px;
    }
}
</style>
