<script setup>
import { ref, computed } from "vue";
import NumberFlow from "@number-flow/vue";

const props = defineProps({
    metar: {
        type: Object,
        default: null,
    },
    metarRaw: {
        type: String,
        default: "",
    },
    metarLoading: {
        type: Boolean,
        default: false,
    },
    metarError: {
        type: String,
        default: null,
    },
});

const activeWeatherView = ref("parsed");

const weatherSummary = computed(() => {
    if (!props.metar) return "Weather report pending";
    const category = props.metar.flightCategory || "Observed";
    const wind =
        props.metar.wind && props.metar.wind !== "—"
            ? props.metar.wind
            : "wind unavailable";
    return `${category} · ${wind}`;
});

const visInfo = computed(() => {
    const raw = props.metar?.vis;
    const match = raw?.match(/^(\d+(?:\.\d+)?)(\+)?\s*SM$/);
    if (!match) return null;

    return {
        value: Number(match[1]),
        plus: Boolean(match[2]),
    };
});

const formatObsTime = (value) => {
    if (!value) return "latest";
    const date = new Date(
        Number(value) < 10_000_000_000 ? Number(value) * 1000 : value,
    );
    if (Number.isNaN(date.getTime())) return "latest";
    return date.toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
    });
};
</script>

<template>
    <section class="glass-panel weather-instrument-panel">
        <div class="panel-heading">
            <div>
                <div class="panel-kicker">METAR / Weather</div>
                <h2>
                    {{
                        activeWeatherView === "parsed"
                            ? weatherSummary
                            : "Observation string"
                    }}
                </h2>
            </div>
            <span class="panel-pill">{{
                formatObsTime(metar?.obsTime)
            }}</span>
        </div>

        <div class="weather-view-frame">
            <dl
                v-if="activeWeatherView === 'parsed'"
                class="weather-readout"
            >
                <div>
                    <dt>Wind</dt>
                    <dd>{{ metar?.wind || "—" }}</dd>
                </div>
                <div>
                    <dt>Visibility</dt>
                    <dd>
                        <template v-if="visInfo">
                            <NumberFlow
                                :value="visInfo.value"
                                :suffix="
                                    visInfo.plus ? '+ SM' : ' SM'
                                "
                            />
                        </template>
                        <template v-else>{{
                            metar?.vis || "—"
                        }}</template>
                    </dd>
                </div>
                <div>
                    <dt>Ceiling</dt>
                    <dd>{{ metar?.ceiling || "—" }}</dd>
                </div>
                <div>
                    <dt>Temp / Dew</dt>
                    <dd>
                        {{
                            metar
                                ? `${metar.temp} / ${metar.dew}`
                                : "—"
                        }}
                    </dd>
                </div>
                <div>
                    <dt>Altimeter</dt>
                    <dd>{{ metar?.altim || "—" }}</dd>
                </div>
                <div>
                    <dt>Weather</dt>
                    <dd>
                        {{ metar?.wxString || "None reported" }}
                    </dd>
                </div>
            </dl>

            <div v-else class="metar-code">
                <span v-if="metarRaw">{{ metarRaw }}</span>
                <span v-else-if="metarLoading">Loading METAR...</span>
                <span v-else>No METAR available.</span>
            </div>
        </div>

        <div v-if="metarError" class="panel-error">
            {{ metarError }}
        </div>

        <div
            class="weather-view-dots"
            role="tablist"
            aria-label="Weather card view"
        >
            <button
                type="button"
                role="tab"
                aria-label="Parsed weather"
                :aria-selected="activeWeatherView === 'parsed'"
                :class="{ active: activeWeatherView === 'parsed' }"
                @click="activeWeatherView = 'parsed'"
            />
            <button
                type="button"
                role="tab"
                aria-label="Raw METAR"
                :aria-selected="activeWeatherView === 'raw'"
                :class="{ active: activeWeatherView === 'raw' }"
                @click="activeWeatherView = 'raw'"
            />
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

.panel-pill {
    border: 1px solid var(--atc-line-strong);
    border-radius: var(--atc-radius-pill);
    color: var(--atc-dim);
    flex-shrink: 0;
    font-size: 10px;
    letter-spacing: 1px;
    padding: 5px 9px;
    text-transform: uppercase;
}

.weather-instrument-panel {
    display: flex;
    flex-direction: column;
    min-height: 250px;
}

.weather-view-frame {
    flex: 1 1 auto;
    min-height: 0;
}

.metar-code {
    color: var(--atc-text);
    font-family: "JetBrains Mono", monospace;
    font-size: clamp(14px, 1.1vw, 18px);
    font-weight: 800;
    line-height: 1.3;
    margin-top: 14px;
    max-height: 156px;
    overflow: auto;
    white-space: pre-wrap;
}

.panel-error {
    color: var(--atc-red);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.8px;
    margin-top: 10px;
    text-transform: uppercase;
}

.weather-readout {
    display: grid;
    gap: 7px 18px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 14px 0 0;
}

.weather-readout div {
    border-top: 1px solid var(--atc-line);
    padding-top: 8px;
}

.weather-readout dt {
    color: var(--atc-faint);
    display: block;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
}

.weather-readout dd {
    color: var(--atc-text);
    display: block;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.18;
    margin: 6px 0 0;
}

.weather-view-dots {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 12px;
    position: relative;
}

.weather-view-dots button {
    appearance: none;
    background: color-mix(in oklab, var(--atc-dim) 48%, transparent);
    border: 0;
    border-radius: var(--atc-radius-pill);
    cursor: pointer;
    height: 7px;
    padding: 0;
    transition:
        background 0.16s ease,
        transform 0.16s ease,
        width 0.16s ease;
    width: 7px;
}

.weather-view-dots button.active {
    background: var(--atc-orange);
    transform: scale(1.08);
    width: 18px;
}

@media (max-width: 980px) {
    .glass-panel {
        max-height: none;
    }

    .weather-instrument-panel {
        grid-column: auto;
    }
}

@media (max-width: 620px) {
    .glass-panel {
        border-radius: var(--atc-radius-panel);
        padding: 16px;
    }

    .weather-instrument-panel {
        min-height: 292px;
    }
}
</style>
