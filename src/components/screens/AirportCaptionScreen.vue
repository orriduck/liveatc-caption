<template>
    <div
        ref="screenRef"
        class="airport-screen relative min-h-screen bg-atc-bg font-sans text-atc-text"
        @touchstart.passive="onMobileTouchStart"
        @touchend.passive="onMobileTouchEnd"
        :style="{
            '--mobile-breadcrumb-opacity': parallax.breadcrumbOpacity.value,
            '--mobile-title-opacity': parallax.titleOpacity.value,
            '--mobile-compact-title-opacity':
                parallax.compactTitleOpacity.value,
            '--mobile-top-mask-opacity': parallax.topMaskOpacity.value,
        }"
    >
        <div class="airport-map-layer absolute inset-0 z-0">
            <AirportMap
                :icao="airport?.icao || icao"
                :lat="airportLat"
                :lon="airportLon"
                :zoom="mapZoom"
                accent="#FF5A1F"
                :aircraft="aircraftWithRoutes"
                :airport="airport"
            />
        </div>

        <div
            class="airport-map-warmth absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_14%,rgba(255,90,31,0.14),transparent_28%)]"
        />
        <div class="mobile-map-dim" />
        <div class="mobile-top-mask" />
        <div class="mobile-compact-title" aria-hidden="true">
            <span class="mobile-compact-code">{{ airportCodeLabel }}</span>
            <span class="mobile-compact-name">{{ airportName }}</span>
        </div>

        <MapControlBar :active-zoom="mapZoom" @zoom="mapZoom = $event" />

        <div
            class="airport-content relative z-20 flex min-h-screen flex-col px-5 py-5 md:px-8 lg:px-10"
        >
            <header class="airport-header">
                <div class="airport-hero">
                    <nav
                        class="airport-breadcrumb"
                        aria-label="Airport navigation"
                    >
                        <button class="airport-back" @click="$emit('back')">
                            ADSBao
                        </button>
                        <span>/</span>
                        <span class="airport-breadcrumb-current">{{
                            airportName
                        }}</span>
                    </nav>

                    <div class="airport-title-row">
                        <span class="airport-code">{{ airportCodeLabel }}</span>
                        <div class="airport-title-stack">
                            <h1 class="airport-title">{{ airportName }}</h1>
                        </div>
                    </div>
                </div>
                <div class="airport-coordinates">
                    <span>{{ coordinatesLabel }}</span>
                </div>
            </header>

            <div
                v-if="loading || error"
                class="glass-panel mt-4 border px-4 py-3"
                :class="
                    error
                        ? 'border-atc-red/40 bg-[#251011]/75'
                        : 'border-atc-line-strong/70 bg-atc-card/60'
                "
            >
                <div
                    class="panel-kicker"
                    :class="error ? 'text-atc-red' : 'text-atc-faint'"
                >
                    {{
                        error
                            ? "Airport lookup error"
                            : "Refreshing airport data"
                    }}
                </div>
                <div class="mt-1 text-[13px] font-semibold text-atc-text">
                    {{ error || "Loading airport context..." }}
                </div>
            </div>

            <div class="dashboard-updated">
                Updated {{ fmtUpdated(lastUpdated) }}
            </div>

            <main
                class="airport-dashboard"
                :class="`is-${dashboardMode}`"
            >
                <WeatherPanel
                    :metar="metar"
                    :metar-raw="metarRaw"
                    :metar-loading="metarLoading"
                    :metar-error="metarError"
                />

                <TrafficPanel
                    :aircraft="aircraft"
                    :traffic-counts="trafficCounts"
                />

                <WikiPanel
                    :wiki-summary="wikiSummary"
                    :wiki-loading="wikiLoading"
                    :airport-name="airportName"
                />
            </main>
        </div>

        <button
            class="dashboard-scroll-cue"
            :class="{ 'is-visible': dashboardMode === 'hidden' }"
            type="button"
            aria-label="Scroll up to show airport cards"
            @click="dashboardMode = 'peek'"
        >
            <ChevronUp aria-hidden="true" :size="24" :stroke-width="2.2" />
        </button>
    </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { ChevronUp } from "lucide-vue-next";
import MapControlBar from "../ui/MapControlBar.vue";
import AirportMap from "../map/AirportMap.vue";
import WeatherPanel from "../panels/WeatherPanel.vue";
import TrafficPanel from "../panels/TrafficPanel.vue";
import WikiPanel from "../panels/WikiPanel.vue";
import { useAircraftPositions } from "../../composables/useAircraftPositions.js";
import { useAirportWiki } from "../../composables/useAirportWiki.js";
import { useFlightRoutes } from "../../composables/useFlightRoutes.js";
import { useMetar } from "../../composables/useMetar.js";
import { useScrollParallax } from "../../composables/useScrollParallax.js";
import { BARO_RATE_THRESHOLD_FPM } from "../../constants/aircraft.js";
import { SLOW_AIRCRAFT_THRESHOLD_KT } from "../../utils/aircraftMotion.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { formatLocalFlightRouteLabel } from "../../utils/flightRouteDisplay.js";
import { AIRPORT_FALLBACKS, COORDS } from "../../data/airportFallbacks.js";

const props = defineProps({
    icao: { type: String, default: "" },
    airport: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: null },
});

defineEmits(["back"]);

const mapZoom = ref(ZOOM_APPROACH);
const screenRef = ref(null);
const dashboardMode = ref("peek");
const touchStartY = ref(null);

const parallax = useScrollParallax(screenRef);

const onMobileTouchStart = (event) => {
    touchStartY.value = event.changedTouches?.[0]?.clientY ?? null;
};

const onMobileTouchEnd = (event) => {
    if (touchStartY.value == null) return;
    const endY = event.changedTouches?.[0]?.clientY;
    if (endY == null) return;

    const deltaY = endY - touchStartY.value;
    touchStartY.value = null;
    if (Math.abs(deltaY) < 44) return;

    if (deltaY < 0) {
        if (dashboardMode.value === "hidden") dashboardMode.value = "peek";
        else dashboardMode.value = "expanded";
        return;
    }

    if (dashboardMode.value === "expanded") dashboardMode.value = "peek";
    else dashboardMode.value = "hidden";
};

const airportFallback = computed(
    () => AIRPORT_FALLBACKS[props.icao?.toUpperCase()] || null,
);
const airportCodeLabel = computed(
    () => props.airport?.iata || airportFallback.value?.iata || props.icao,
);
const airportName = computed(
    () =>
        props.airport?.name ||
        airportFallback.value?.name ||
        props.icao ||
        "Airport",
);
const airportLocation = computed(
    () => props.airport?.city || airportFallback.value?.city || "",
);
const airportCountry = computed(
    () => props.airport?.country || airportFallback.value?.country || "",
);

const icaoRef = computed(() => props.icao);
const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    error: metarError,
} = useMetar(icaoRef);

const airportLat = computed(
    () => COORDS[props.icao]?.[0] || props.airport?.lat || 0,
);
const airportLon = computed(
    () => COORDS[props.icao]?.[1] || props.airport?.lon || 0,
);

const latRef = computed(() => airportLat.value);
const lonRef = computed(() => airportLon.value);
const { aircraft, lastUpdated } = useAircraftPositions(icaoRef, latRef, lonRef);
const { routesByCallsign } = useFlightRoutes(aircraft);

const normalizeCallsign = (callsign) =>
    String(callsign || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

const aircraftWithRoutes = computed(() =>
    aircraft.value.map((item) => {
        const key = normalizeCallsign(item.callsign);
        const route = routesByCallsign.value[key] || null;
        const localAirport = {
            iata: airportCodeLabel.value,
            icao: props.airport?.icao || props.icao,
        };
        return {
            ...item,
            flightRoute: route,
            flightRouteLabel: formatLocalFlightRouteLabel(
                route,
                localAirport,
                item.trafficIntent,
            ),
        };
    }),
);

const wikiAirport = computed(() => ({
    name: airportName.value,
    icao: props.airport?.icao || props.icao,
    iata: airportCodeLabel.value,
}));
const { summary: wikiSummary, loading: wikiLoading } =
    useAirportWiki(wikiAirport);

const coordinatesLabel = computed(() => {
    if (!airportLat.value || !airportLon.value) return "Coordinates pending";
    const lat = `${Math.abs(airportLat.value).toFixed(2)} ${airportLat.value >= 0 ? "N" : "S"}`;
    const lon = `${Math.abs(airportLon.value).toFixed(2)} ${airportLon.value >= 0 ? "E" : "W"}`;
    return `${lat} / ${lon}`;
});

const trafficCounts = computed(() =>
    aircraft.value.reduce(
        (counts, item) => {
            const showArrow =
                (item.velocity ?? 0) >= SLOW_AIRCRAFT_THRESHOLD_KT;
            if (!item.onGround && showArrow && item.baroRate != null) {
                if (item.baroRate > BARO_RATE_THRESHOLD_FPM) {
                    counts.ascending += 1;
                    return counts;
                }
                if (item.baroRate < -BARO_RATE_THRESHOLD_FPM) {
                    counts.descending += 1;
                    return counts;
                }
            }
            counts.level += 1;
            return counts;
        },
        { ascending: 0, descending: 0, level: 0 },
    ),
);

const fmtUpdated = (date) => {
    if (!date) return "—";
    return date.toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};
</script>

<style scoped>
.airport-screen {
    overflow: hidden;
}

.mobile-map-dim {
    background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--atc-bg) 12%, transparent),
        color-mix(in oklab, var(--atc-bg) 88%, transparent)
    );
    display: none;
    inset: 0;
    opacity: var(--mobile-map-dim);
    pointer-events: none;
    position: fixed;
    transition: opacity 0.08s linear;
    z-index: 11;
}

.mobile-top-mask {
    background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--atc-bg) 96%, transparent) 0%,
        color-mix(in oklab, var(--atc-bg) 78%, transparent) 38%,
        color-mix(in oklab, var(--atc-bg) 0%, transparent) 100%
    );
    display: none;
    height: 178px;
    inset: 0 0 auto;
    opacity: var(--mobile-top-mask-opacity);
    pointer-events: none;
    position: fixed;
    z-index: 29;
}

.airport-header {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    min-height: clamp(170px, 22vh, 238px);
}

.airport-hero {
    min-width: 0;
    padding-top: 4px;
}

.airport-breadcrumb {
    align-items: center;
    color: var(--atc-faint);
    display: flex;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    gap: 10px;
    letter-spacing: 1.2px;
    line-height: 1;
    max-width: min(760px, 72vw);
    text-transform: uppercase;
}

.airport-back,
.airport-breadcrumb-current {
    min-width: 0;
}

.airport-back {
    background: transparent;
    border: 0;
    color: var(--atc-text);
    cursor: pointer;
    flex-shrink: 0;
    font: inherit;
    letter-spacing: inherit;
    padding: 0;
    text-transform: uppercase;
    transition:
        color 0.15s ease,
        opacity 0.15s ease;
}

.airport-back:hover {
    color: var(--atc-orange);
}

.airport-breadcrumb-current {
    color: var(--atc-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.airport-coordinates,
.panel-kicker,
.panel-pill,
.panel-link,
.wiki-source {
    font-family: "JetBrains Mono", monospace;
}

.airport-code {
    color: var(--atc-orange);
    flex-shrink: 0;
    font-family: "Instrument Serif", serif;
    font-size: clamp(68px, 8.5vw, 126px);
    font-style: italic;
    line-height: 0.78;
    text-shadow: 0 24px 60px rgba(255, 90, 31, 0.24);
}

.airport-title-row {
    align-items: center;
    display: grid;
    gap: 10px 24px;
    grid-template-columns: auto minmax(0, 1fr);
    margin-top: clamp(34px, 5vh, 56px);
    max-width: min(1240px, calc(100vw - 140px));
}

.airport-title-stack {
    min-width: 0;
    position: relative;
}

.airport-title-stack::before {
    background: linear-gradient(
        90deg,
        color-mix(in oklab, var(--atc-orange) 62%, transparent),
        color-mix(in oklab, var(--atc-line) 42%, transparent)
    );
    content: "";
    height: 1px;
    left: 0;
    position: absolute;
    top: -15px;
    width: min(420px, 58vw);
}

.airport-title {
    color: var(--atc-text);
    font-size: clamp(34px, 4.7vw, 66px);
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 0.92;
    margin: 0;
    max-width: 1120px;
    text-wrap: balance;
}

.airport-coordinates {
    color: var(--atc-dim);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    font-size: 11px;
    gap: 5px;
    letter-spacing: 0.6px;
    line-height: 1;
    padding-top: 4px;
    text-align: right;
    text-transform: uppercase;
}

.dashboard-updated {
    color: var(--atc-dim);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 1.4px;
    margin-top: auto;
    padding-bottom: 10px;
    text-align: center;
    text-transform: uppercase;
}

.dashboard-scroll-cue {
    align-items: center;
    background: color-mix(in oklab, var(--atc-bg) 74%, transparent);
    border: 1px solid var(--atc-line-strong);
    border-radius: var(--atc-radius-pill);
    bottom: 18px;
    box-shadow:
        0 12px 36px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    color: var(--atc-text);
    cursor: pointer;
    display: none;
    height: 44px;
    justify-content: center;
    left: 50%;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    transform: translate(-50%, 10px);
    transition:
        opacity 0.16s ease,
        transform 0.16s ease;
    width: 44px;
    z-index: 44;
    backdrop-filter: blur(10px) saturate(130%);
    -webkit-backdrop-filter: blur(10px) saturate(130%);
}

.airport-dashboard {
    align-items: stretch;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(0, 1fr));
    margin-inline: auto;
    padding-bottom: 16px;
    width: min(75vw, 1280px);
}

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

.panel-pill,
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

.weather-readout dt,
.traffic-counts span {
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

.traffic-counts strong {
    display: block;
    font-size: 30px;
    line-height: 1;
    margin-top: 9px;
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

@media (max-width: 1180px) {
    .airport-dashboard {
        grid-template-columns: minmax(0, 1.25fr) repeat(2, minmax(0, 1fr));
        width: min(75vw, 960px);
    }
}

@media (max-width: 1080px) {
    .airport-screen {
        height: 100dvh;
        overflow-x: hidden;
        overflow-y: hidden;
        overscroll-behavior-y: contain;
        scroll-padding-bottom: 18px;
        touch-action: pan-y;
    }

    .airport-map-layer,
    .airport-map-warmth {
        bottom: auto;
        height: 100dvh;
        position: fixed;
    }

    .mobile-map-dim {
        display: none;
    }

    .mobile-top-mask {
        display: block;
    }

    .airport-content {
        min-height: 100dvh;
        padding-bottom: 22px;
    }

    .airport-header {
        display: block;
        left: 20px;
        min-height: 0;
        position: fixed;
        right: 20px;
        top: 18px;
        z-index: 40;
    }

    .airport-breadcrumb {
        font-size: 10px;
        gap: 8px;
        max-width: calc(100vw - 40px);
        opacity: var(--mobile-breadcrumb-opacity);
        transform: translateY(
            calc((1 - var(--mobile-breadcrumb-opacity)) * -8px)
        );
        transition:
            opacity 0.08s linear,
            transform 0.08s linear;
    }

    .mobile-compact-title {
        align-items: center;
        display: flex;
        justify-content: center;
        left: 0;
        min-height: 42px;
        opacity: var(--mobile-compact-title-opacity);
        pointer-events: none;
        position: fixed;
        right: 0;
        top: 40px;
        transform: translateY(
            calc((1 - var(--mobile-compact-title-opacity)) * 5px)
        );
        transition:
            opacity 0.08s linear,
            transform 0.08s linear;
        z-index: 41;
    }

    .mobile-compact-code {
        color: rgba(255, 90, 31, 0.34);
        font-family: "Instrument Serif", serif;
        font-size: 72px;
        font-style: italic;
        left: 50%;
        line-height: 0.8;
        position: absolute;
        top: -8px;
        transform: translateX(-50%);
    }

    .mobile-compact-name {
        color: var(--atc-text);
        display: block;
        font-size: 18px;
        font-weight: 800;
        line-height: 1.05;
        max-width: min(300px, calc(100vw - 72px));
        position: relative;
        text-align: center;
        text-shadow: 0 2px 18px
            color-mix(in oklab, var(--atc-bg) 95%, transparent);
        z-index: 1;
    }

    .airport-title-row {
        align-items: center;
        gap: 10px;
        grid-template-columns: auto minmax(0, 1fr);
        margin-top: 28px;
        max-width: calc(100vw - 40px);
        opacity: var(--mobile-title-opacity);
        transform: translateY(calc((1 - var(--mobile-title-opacity)) * -12px));
        transition:
            opacity 0.08s linear,
            transform 0.08s linear;
    }

    .airport-code {
        font-size: 58px;
    }

    .airport-title {
        font-size: 34px;
        letter-spacing: -0.04em;
    }

    .airport-title-stack::before {
        top: -12px;
        width: min(210px, 52vw);
    }

    .airport-coordinates {
        display: none;
    }

    .airport-dashboard {
        bottom: 18px;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr);
        left: 50%;
        margin-inline: 0;
        overflow-x: hidden;
        overflow-y: hidden;
        padding: 0 2px 16px;
        position: fixed;
        transform: translateX(-50%) translateY(44%);
        transition:
            max-height 0.22s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
            width 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        width: min(82vw, 560px);
        z-index: 35;
    }

    .airport-dashboard.is-expanded {
        max-height: calc(100dvh - 132px);
        overflow-y: auto;
        transform: translateX(-50%) translateY(0);
        width: min(92vw, 620px);
    }

    .airport-dashboard.is-hidden {
        pointer-events: none;
        transform: translateX(-50%) translateY(calc(100% + 34px));
    }

    .glass-panel {
        max-height: none;
    }

    .weather-instrument-panel {
        grid-column: auto;
    }

    .wiki-panel,
    .traffic-panel {
        display: none;
    }

    .airport-dashboard.is-expanded .wiki-panel,
    .airport-dashboard.is-expanded .traffic-panel {
        display: block;
    }

    .traffic-panel,
    .wiki-panel {
        min-height: 220px;
    }

    .dashboard-scroll-cue {
        display: flex;
        opacity: 0;
        transform: translate(-50%, 10px);
    }

    .dashboard-scroll-cue.is-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, 0);
    }
}

@media (max-width: 720px) {
    .airport-dashboard {
        width: min(84vw, 460px);
    }
}

@media (max-width: 620px) {
    .airport-content {
        display: block;
        padding: 0 0 22px;
    }

    .airport-header {
        top: 18px;
    }

    .dashboard-updated {
        display: none;
    }

    .airport-dashboard {
        bottom: 14px;
        margin-top: 0;
        padding-bottom: 18px;
        width: min(92vw, 430px);
    }

    .wiki-panel {
        grid-column: auto;
    }

    .glass-panel {
        border-radius: var(--atc-radius-panel);
        padding: 16px;
    }

    .weather-instrument-panel {
        min-height: 292px;
    }

    .wiki-copy {
        max-height: 138px;
    }
}
</style>
