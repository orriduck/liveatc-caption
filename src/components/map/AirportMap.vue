<template>
    <div class="relative w-full h-full">
        <div
            ref="mapEl"
            class="w-full h-full rounded-lg"
            :style="{ background: mapBackground }"
        />

        <!-- Overlay chrome -->
        <div
            class="absolute top-3 left-3.5 pointer-events-none font-mono text-[10px] tracking-[2px] font-semibold"
            :style="{
                color: accent,
                textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }"
        >
            ● {{ icao }} · {{ latStr }} {{ lonStr }}
        </div>
        <div
            class="absolute bottom-3 right-3 pointer-events-none font-sans text-[9px] whitespace-nowrap"
            :style="{
                color: mapAttributionColor,
                textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }"
        >
            © OpenStreetMap · CartoDB
        </div>
        <div
            class="map-traffic-legend absolute right-3 top-[168px] pointer-events-none flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.8px]"
        >
            <span
                v-for="item in trafficLegend"
                :key="item.id"
                class="inline-flex items-center gap-1.5"
            >
                <span
                    class="h-1.5 w-1.5 rounded-full"
                    :style="{
                        background: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                    }"
                />
                {{ item.label }}
            </span>
        </div>

        <!-- Loading state -->
        <div
            v-if="!mapReady"
            class="absolute inset-0 flex items-center justify-center bg-atc-card rounded-lg"
        >
            <div class="font-mono text-[11px] text-atc-faint tracking-widest">
                LOADING MAP…
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    createApp,
    computed,
    h,
    ref,
    shallowRef,
    onMounted,
    onUnmounted,
    watch,
} from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import NumberFlow from "@number-flow/vue";
import {
    beginAircraftMotionState,
    calculateAircraftVisualPosition,
    SLOW_AIRCRAFT_THRESHOLD_KT,
} from "../../utils/aircraftMotion";
import {
    ZOOM_APPROACH,
    isGroundLikeAircraft as isGroundLikeAircraftForDisplay,
    shouldShowAirportArea,
} from "../../utils/airportMapDisplay.js";
import {
    AIRCRAFT_COLORS,
    BARO_RATE_THRESHOLD_FPM,
} from "../../constants/aircraft";
import { DEFAULT_WIDE_RANGE_NM } from "../../services/aviationData.js";

const props = defineProps({
    icao: { type: String, default: "" },
    lat: { type: Number, default: 0 },
    lon: { type: Number, default: 0 },
    zoom: { type: Number, default: 13 },
    accent: { type: String, default: "#FF5A1F" },
    aircraft: { type: Array, default: () => [] },
    airport: { type: Object, default: null },
});

const mapEl = ref(null);
const mapReady = ref(false);
const currentTheme = ref("dark");
let map = null;
let sizeObs = null;
let airportAreaLayer = null;
let queryRangeLayer = null;
let airportInfoMarker = null;
let airportGroundCountMarker = null;
let baseTileLayer = null;
let labelTileLayer = null;
let themeObs = null;
// Track markers by icao24 for smooth position updates
// Entry shape: { marker, color, label, lat, lon, positionTime, correctionLat, correctionLon, ... }
const acMarkersMap = new Map();

const latStr = ref("");
const lonStr = ref("");
const mapBackground = computed(() =>
    currentTheme.value === "light" ? "#d6dde8" : "#0e0e12",
);
const mapLabelShadowColor = computed(() =>
    currentTheme.value === "light" ? "rgba(248,250,252,0.95)" : "#0a0a0b",
);
const mapAttributionColor = computed(() =>
    currentTheme.value === "light"
        ? "rgba(18,21,26,0.45)"
        : "rgba(245,245,247,0.28)",
);

const TILE_VARIANTS = {
    light: {
        base: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        labels: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png",
        labelOpacity: 0.66,
    },
    dark: {
        base: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
        labelOpacity: 0.55,
    },
};

const resolveCurrentTheme = () =>
    document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";

const updateTileLayers = () => {
    if (!map) return;

    baseTileLayer?.removeFrom(map);
    labelTileLayer?.removeFrom(map);

    const variant = TILE_VARIANTS[currentTheme.value] || TILE_VARIANTS.dark;
    baseTileLayer = L.tileLayer(variant.base, {
        subdomains: "abcd",
        maxZoom: 20,
    }).addTo(map);
    labelTileLayer = L.tileLayer(variant.labels, {
        subdomains: "abcd",
        maxZoom: 20,
        opacity: variant.labelOpacity,
    }).addTo(map);
};

const trafficLegend = [
    { id: "ascending", label: "ASC", color: AIRCRAFT_COLORS.ascending },
    { id: "level", label: "LEVEL", color: AIRCRAFT_COLORS.level },
    { id: "descending", label: "DESC", color: AIRCRAFT_COLORS.descending },
];

// RAF loop — updates visual aircraft positions on a delayed, latency-aware clock
let rafId = null;

const animateLoop = () => {
    if (!map) return;
    const now = Date.now();
    for (const [, entry] of acMarkersMap) {
        const position = calculateAircraftVisualPosition(entry, now);
        entry.marker.setLatLng([position.lat, position.lon]);
    }
    rafId = requestAnimationFrame(animateLoop);
};

const startRaf = () => {
    if (rafId == null) rafId = requestAnimationFrame(animateLoop);
};

const stopRaf = () => {
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
};

const initMap = () => {
    if (!mapEl.value || map) return;

    map = L.map(mapEl.value, {
        center: [props.lat || 33.9416, props.lon || -118.4085],
        zoom: props.zoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
    });

    updateTileLayers();

    updateAirportArea();
    updateAirportContextOverlays();

    latStr.value = props.lat
        ? `${Math.abs(props.lat).toFixed(2)}°${props.lat >= 0 ? "N" : "S"}`
        : "";
    lonStr.value = props.lon
        ? `${Math.abs(props.lon).toFixed(2)}°${props.lon >= 0 ? "E" : "W"}`
        : "";

    mapReady.value = true;
    updateAircraft();
    startRaf();

    // Observe the container for size changes (flex layout settles asynchronously).
    // Every time the container grows/shrinks, tell Leaflet to recalculate so it
    // requests any tiles that became visible — this eliminates the blank corner
    // that appears when Leaflet initialises before the container has its final size.
    sizeObs = new ResizeObserver(() => {
        requestAnimationFrame(() => map?.invalidateSize());
    });
    sizeObs.observe(mapEl.value);
};

const wholeNumberFormat = { maximumFractionDigits: 0 };

const escapeHtml = (value) =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const isGroundLikeAircraft = (ac) => {
    return isGroundLikeAircraftForDisplay(ac, {
        airportAreaRadiusNm: AIRPORT_AREA_RADIUS_NM,
        slowAircraftThresholdKt: SLOW_AIRCRAFT_THRESHOLD_KT,
    });
};

const formatTelemetryValue = (value) => {
    if (value == null || value === "" || value === "ground") return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : null;
};

const syncNumberFlow = (root, selector, value, suffix) => {
    const host = root?.querySelector(selector);
    if (!host || value == null) return;

    if (!host.__numberFlowApp) {
        const currentValue = shallowRef(value);
        const app = createApp({
            render: () =>
                h(NumberFlow, {
                    class: "aircraft-number-flow",
                    value: currentValue.value,
                    suffix,
                    format: wholeNumberFormat,
                }),
        });
        app.mount(host);
        host.__numberFlowApp = app;
        host.__numberFlowValue = currentValue;
    } else {
        host.__numberFlowValue.value = value;
    }
};

const unmountAircraftTelemetry = (marker) => {
    marker
        ?.getElement()
        ?.querySelectorAll("[data-aircraft-flow]")
        .forEach((host) => {
            host.__numberFlowApp?.unmount();
            delete host.__numberFlowApp;
            delete host.__numberFlowValue;
        });
};

const syncAircraftTelemetry = (marker, ac) => {
    const root = marker?.getElement();
    if (!root) return;
    syncNumberFlow(
        root,
        '[data-aircraft-flow="speed"]',
        formatTelemetryValue(ac.velocity),
        "kt",
    );
    syncNumberFlow(
        root,
        '[data-aircraft-flow="altitude"]',
        formatTelemetryValue(ac.altitude),
        "ft",
    );
};

const queueAircraftTelemetrySync = (marker, ac) => {
    requestAnimationFrame(() => syncAircraftTelemetry(marker, ac));
};

const updateAirportArea = () => {
    if (!map) return;

    airportAreaLayer?.removeFrom(map);
    queryRangeLayer?.removeFrom(map);
    airportInfoMarker?.removeFrom(map);
    airportGroundCountMarker?.removeFrom(map);
    airportAreaLayer = null;
    queryRangeLayer = null;
    airportInfoMarker = null;
    airportGroundCountMarker = null;

    if (!props.lat || !props.lon || !shouldShowAirportArea(props.zoom)) return;

    const borderColor =
        currentTheme.value === "light"
            ? "rgba(18,21,26,0.2)"
            : "rgba(255,255,255,0.2)";
    const fillColor =
        currentTheme.value === "light"
            ? "rgba(18,21,26,0.045)"
            : "rgba(255,255,255,0.02)";

    airportAreaLayer = L.layerGroup([
        L.circle([props.lat, props.lon], {
            radius: AIRPORT_AREA_RADIUS_NM * NM_TO_METERS,
            color: borderColor,
            weight: 1,
            dashArray: "4 4",
            fillColor,
            fillOpacity: 1,
        }),
    ]).addTo(map);
};

const QUERY_RANGE_NM = DEFAULT_WIDE_RANGE_NM;
const AIRPORT_AREA_RADIUS_NM = 2.2;
const NM_TO_METERS = 1852;

const buildAirportOverlayDetails = () => {
    const details = [];
    const runways = props.airport?.runways;
    if (Array.isArray(runways) && runways.length)
        details.push(`RWY ${runways.length}`);

    const approachCount = Number(props.airport?.approachCount);
    if (Number.isFinite(approachCount) && approachCount > 0)
        details.push(`APP ${approachCount}`);

    return details;
};

const updateAirportContextOverlays = () => {
    if (!map || !props.lat || !props.lon) return;

    queryRangeLayer?.removeFrom(map);
    airportInfoMarker?.removeFrom(map);
    airportGroundCountMarker?.removeFrom(map);
    queryRangeLayer = null;
    airportInfoMarker = null;
    airportGroundCountMarker = null;

    const stroke =
        currentTheme.value === "light"
            ? "rgba(18,21,26,0.22)"
            : "rgba(255,255,255,0.28)";
    const fill =
        currentTheme.value === "light"
            ? "rgba(18,21,26,0.06)"
            : "rgba(255,255,255,0.05)";

    queryRangeLayer = L.circle([props.lat, props.lon], {
        radius: QUERY_RANGE_NM * NM_TO_METERS,
        color: stroke,
        weight: 1,
        dashArray: "6 6",
        fillColor: fill,
        fillOpacity: 1,
    }).addTo(map);

    const airportCode = escapeHtml(
        (props.airport?.iata || props.icao || "").trim(),
    );
    const detailLines = buildAirportOverlayDetails()
        .map((line) => `<span>${escapeHtml(line)}</span>`)
        .join("");

    airportInfoMarker = L.marker([props.lat, props.lon], {
        interactive: false,
        icon: L.divIcon({
            className: "",
            html: `<div class="airport-overlay-label">${airportCode}${detailLines}</div>`,
            iconSize: [120, 34],
            iconAnchor: [0, -8],
        }),
    }).addTo(map);

    if (Number(props.zoom) === ZOOM_APPROACH) {
        const groundCount = props.aircraft.filter((item) =>
            isGroundLikeAircraft(item),
        ).length;
        airportGroundCountMarker = L.marker([props.lat, props.lon], {
            interactive: false,
            icon: L.divIcon({
                className: "",
                html: `<div class="airport-ground-count">GROUND ${groundCount}</div>`,
                iconSize: [92, 18],
                iconAnchor: [46, 24],
            }),
        }).addTo(map);
    }
};
const makeAcIcon = (
    color,
    label,
    rot = 0,
    showArrow = true,
    hasTelemetry = false,
    routeLabel = "",
) => {
    const symbol = showArrow
        ? `<svg width="18" height="18" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);filter:drop-shadow(0 0 4px ${color})">
        <path d="M12 2L16 20L12 17L8 20Z" fill="${color}"/>
       </svg>`
        : `<svg width="7" height="7" viewBox="0 0 7 7" style="filter:drop-shadow(0 0 3px ${color});margin:5.5px">
        <circle cx="3.5" cy="3.5" r="3.5" fill="${color}"/>
       </svg>`;
    const safeLabel = escapeHtml(label);
    const safeRouteLabel = escapeHtml(routeLabel);
    const labelTop = showArrow && hasTelemetry ? "-4px" : "2px";
    const telemetryLine =
        showArrow && hasTelemetry
            ? `<div class="aircraft-telemetry">
        <span data-aircraft-flow="speed"></span>
        <span class="aircraft-telemetry-separator">|</span>
        <span data-aircraft-flow="altitude"></span>
      </div>`
            : "";
    const routeLine = safeRouteLabel
        ? `<div class="aircraft-route-label">${safeRouteLabel}</div>`
        : "";
    const labelClass = safeRouteLabel
        ? "aircraft-label aircraft-label--route-cycle"
        : "aircraft-label";
    const titleLine = safeRouteLabel
        ? `<div class="aircraft-title-cycle">
          <div class="aircraft-label-title aircraft-callsign-state">${safeLabel}</div>
          ${routeLine}
        </div>`
        : `<div class="aircraft-label-title">${safeLabel}</div>`;

    return L.divIcon({
        className: "",
        html: `<div style="position:relative;display:flex;align-items:center">
      ${symbol}
      <div class="${labelClass}" style="left:${showArrow ? 22 : 18}px;top:${labelTop};color:${color}">
        ${titleLine}
        ${telemetryLine}
      </div>
    </div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
};

const getAircraftColor = (ac, showArrow) => {
    if (ac.onGround) return AIRCRAFT_COLORS.ground;
    if (!showArrow || ac.baroRate == null) {
        return currentTheme.value === "light"
            ? "#475569"
            : AIRCRAFT_COLORS.level;
    }
    if (ac.baroRate >= BARO_RATE_THRESHOLD_FPM)
        return AIRCRAFT_COLORS.ascending;
    if (ac.baroRate < -BARO_RATE_THRESHOLD_FPM)
        return AIRCRAFT_COLORS.descending;
    return AIRCRAFT_COLORS.level;
};

const updateAircraft = () => {
    if (!map) return;

    const now = Date.now();
    const seen = new Set();
    const onlyMovingAtApproach = Number(props.zoom) === ZOOM_APPROACH;
    props.aircraft.forEach((ac) => {
        const speedKt = Number(ac.velocity ?? 0);
        const isMoving = speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
        const isGroundLike = isGroundLikeAircraft(ac);
        if (onlyMovingAtApproach && (isGroundLike || !isMoving)) return;
        if (!ac.lat || !ac.lon) return;
        seen.add(ac.icao24);
        const vel = ac.velocity ?? 0;
        const showArrow = vel >= SLOW_AIRCRAFT_THRESHOLD_KT;
        const isAnimated = !ac.onGround && showArrow;
        const color = getAircraftColor(ac, showArrow);
        const label = (ac.callsign || ac.icao24 || "").trim();
        const routeLabel = (ac.flightRouteLabel || "").trim();
        const rot = Math.round(ac.track || 0);
        const hasTelemetry =
            !ac.onGround &&
            showArrow &&
            formatTelemetryValue(ac.velocity) != null &&
            formatTelemetryValue(ac.altitude) != null;

        if (acMarkersMap.has(ac.icao24)) {
            const entry = acMarkersMap.get(ac.icao24);
            const currentLatLng = entry.marker.getLatLng();
            const motionState = beginAircraftMotionState(ac, now, {
                lat: currentLatLng.lat,
                lon: currentLatLng.lng,
            });
            Object.assign(entry, motionState, {
                velocity: vel,
                track: ac.track ?? 0,
                isAnimated,
            });
            // Refresh icon only when appearance changes
            if (
                color !== entry.color ||
                label !== entry.label ||
                rot !== entry.rot ||
                showArrow !== entry.showArrow ||
                hasTelemetry !== entry.hasTelemetry ||
                routeLabel !== entry.routeLabel
            ) {
                unmountAircraftTelemetry(entry.marker);
                entry.marker.setIcon(
                    makeAcIcon(
                        color,
                        label,
                        rot,
                        showArrow,
                        hasTelemetry,
                        routeLabel,
                    ),
                );
                entry.color = color;
                entry.label = label;
                entry.rot = rot;
                entry.showArrow = showArrow;
                entry.hasTelemetry = hasTelemetry;
                entry.routeLabel = routeLabel;
            }
            if (hasTelemetry) queueAircraftTelemetrySync(entry.marker, ac);
        } else {
            const motionState = beginAircraftMotionState(ac, now);
            const visualPosition = calculateAircraftVisualPosition(
                motionState,
                now,
            );
            const m = L.marker([visualPosition.lat, visualPosition.lon], {
                icon: makeAcIcon(
                    color,
                    label,
                    rot,
                    showArrow,
                    hasTelemetry,
                    routeLabel,
                ),
            }).addTo(map);
            acMarkersMap.set(ac.icao24, {
                marker: m,
                color,
                label,
                rot,
                showArrow,
                hasTelemetry,
                routeLabel,
                ...motionState,
                velocity: vel,
                track: ac.track ?? 0,
                isAnimated,
            });
            if (hasTelemetry) queueAircraftTelemetrySync(m, ac);
        }
    });

    // Remove stale markers
    for (const [id, entry] of acMarkersMap) {
        if (!seen.has(id)) {
            unmountAircraftTelemetry(entry.marker);
            entry.marker.remove();
            acMarkersMap.delete(id);
        }
    }

    updateAirportArea();
    updateAirportContextOverlays();
};

watch(() => props.aircraft, updateAircraft, { deep: true });
watch(
    () => currentTheme.value,
    () => {
        updateTileLayers();
        updateAirportArea();
        updateAirportContextOverlays();
    },
);

watch(
    () => [props.lat, props.lon],
    ([lat, lon]) => {
        if (map && lat && lon) {
            map.setView([lat, lon], props.zoom);
            latStr.value = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
            lonStr.value = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
            updateAirportArea();
            updateAirportContextOverlays();
        }
    },
);
watch(
    () => props.zoom,
    (zoom) => {
        if (map) {
            map.setZoom(zoom);
            updateAirportArea();
            updateAirportContextOverlays();
            updateAircraft();
        }
    },
);

onMounted(() => {
    currentTheme.value = resolveCurrentTheme();
    initMap();
    themeObs = new MutationObserver(() => {
        const next = resolveCurrentTheme();
        if (next !== currentTheme.value) currentTheme.value = next;
    });
    themeObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });
});
onUnmounted(() => {
    stopRaf();
    sizeObs?.disconnect();
    for (const [, entry] of acMarkersMap)
        unmountAircraftTelemetry(entry.marker);
    acMarkersMap.clear();
    airportAreaLayer?.removeFrom(map);
    queryRangeLayer?.removeFrom(map);
    airportInfoMarker?.removeFrom(map);
    airportGroundCountMarker?.removeFrom(map);
    airportAreaLayer = null;
    queryRangeLayer = null;
    airportInfoMarker = null;
    airportGroundCountMarker = null;
    themeObs?.disconnect();
    themeObs = null;
    baseTileLayer = null;
    labelTileLayer = null;
    if (map) {
        map.remove();
        map = null;
    }
});
</script>

<style>
:root {
    --map-label-glow: rgba(248, 250, 252, 0.95);
    --map-telemetry-color: rgba(18, 21, 26, 0.8);
    --map-telemetry-dim: rgba(18, 21, 26, 0.5);
}

:root[data-theme="dark"] {
    --map-label-glow: #0a0a0b;
    --map-telemetry-color: rgba(245, 245, 247, 0.86);
    --map-telemetry-dim: rgba(245, 245, 247, 0.54);
}

/* No CSS transition — fast aircraft use RAF dead-reckoning; slow/ground aircraft
   snap on poll which is imperceptible at low speeds. */
.leaflet-marker-icon {
    transition: none;
}

.map-traffic-legend {
    backdrop-filter: blur(10px);
    background: color-mix(in oklab, var(--atc-card) 72%, transparent);
    border: 1px solid
        color-mix(in oklab, var(--atc-line-strong) 90%, transparent);
    color: var(--atc-dim);
    text-shadow: 0 0 6px var(--map-label-glow);
}

.aircraft-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.3px;
    line-height: 1.05;
    position: absolute;
    text-shadow:
        0 0 4px var(--map-label-glow),
        0 0 7px var(--map-label-glow);
    white-space: nowrap;
}

.aircraft-label-title {
    font-size: 10px;
}

.aircraft-label--route-cycle {
    min-height: 20px;
    min-width: 74px;
}

.aircraft-title-cycle {
    min-height: 11px;
    min-width: 74px;
    position: relative;
}

.aircraft-callsign-state,
.aircraft-route-label {
    transition: opacity 0.32s cubic-bezier(0.25, 1, 0.5, 1);
}

.aircraft-label--route-cycle .aircraft-callsign-state {
    animation: aircraft-callsign-fade 7.2s infinite;
}

.aircraft-route-label {
    color: inherit;
    font-size: 9px;
    font-weight: 800;
    left: 0;
    letter-spacing: 0.4px;
    line-height: 1.05;
    opacity: 0;
    position: absolute;
    text-shadow:
        0 0 4px var(--map-label-glow),
        0 0 8px var(--map-label-glow);
    top: 0;
}

.aircraft-label--route-cycle .aircraft-route-label {
    animation: aircraft-route-fade 7.2s infinite;
}

@keyframes aircraft-callsign-fade {
    0%,
    42%,
    100% {
        opacity: 1;
    }
    50%,
    84% {
        opacity: 0;
    }
}

@keyframes aircraft-route-fade {
    0%,
    42%,
    100% {
        opacity: 0;
    }
    50%,
    84% {
        opacity: 1;
    }
}

.aircraft-telemetry {
    align-items: baseline;
    color: var(--map-telemetry-color);
    display: flex;
    font-size: 8.5px;
    font-weight: 700;
    gap: 3px;
    letter-spacing: 0;
    margin-top: 1px;
    text-shadow:
        0 0 4px var(--map-label-glow),
        0 0 8px var(--map-label-glow);
}

.aircraft-number-flow {
    font-variant-numeric: tabular-nums;
}

.aircraft-number-flow::part(suffix) {
    color: var(--map-telemetry-dim);
    font-size: 0.86em;
    font-weight: 700;
    margin-left: 1px;
}

.aircraft-telemetry-separator {
    color: rgba(255, 90, 31, 0.72);
    font-size: 0.9em;
}

.airport-overlay-label {
    color: var(--atc-text);
    display: flex;
    flex-direction: column;
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 700;
    gap: 1px;
    letter-spacing: 0.6px;
    text-shadow: 0 0 6px var(--map-label-glow);
}

.airport-overlay-label > span {
    color: var(--atc-dim);
    font-size: 8px;
    font-weight: 600;
}

.airport-ground-count {
    background: color-mix(in oklab, var(--atc-card) 78%, transparent);
    border: 1px solid
        color-mix(in oklab, var(--atc-line-strong) 88%, transparent);
    border-radius: 999px;
    color: var(--atc-text);
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.8px;
    padding: 1px 6px;
    text-shadow: 0 0 6px var(--map-label-glow);
}

@media (prefers-reduced-motion: reduce) {
    .aircraft-label--route-cycle .aircraft-callsign-state,
    .aircraft-label--route-cycle .aircraft-route-label {
        animation: none;
    }

    .aircraft-label--route-cycle .aircraft-callsign-state {
        opacity: 1;
    }

    .aircraft-label--route-cycle .aircraft-route-label {
        display: none;
    }
}
</style>
