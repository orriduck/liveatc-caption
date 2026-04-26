<template>
  <div class="relative w-full h-full">
    <div ref="mapEl" class="w-full h-full rounded-lg" style="background:#0e0e12" />

    <!-- Overlay chrome -->
    <div class="absolute top-3 left-3.5 pointer-events-none font-mono text-[10px] tracking-[2px] font-semibold"
         :style="`color:${accent};text-shadow:0 0 6px #0a0a0b`">
      ● {{ icao }} · {{ latStr }} {{ lonStr }}
    </div>
    <div class="absolute bottom-3 right-3 pointer-events-none font-sans text-[9px] whitespace-nowrap"
         style="color:rgba(245,245,247,0.28);text-shadow:0 0 6px #0a0a0b">
      © OpenStreetMap · CartoDB
    </div>
    <div
      class="absolute right-3 top-[168px] pointer-events-none flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded border border-white/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.8px]"
      style="background:rgba(10,10,11,0.58);backdrop-filter:blur(10px);color:rgba(245,245,247,0.72);text-shadow:0 0 6px #0a0a0b"
    >
      <span v-for="item in trafficLegend" :key="item.id" class="inline-flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full" :style="{ background: item.color, boxShadow: `0 0 6px ${item.color}` }" />
        {{ item.label }}
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="!mapReady" class="absolute inset-0 flex items-center justify-center bg-atc-card rounded-lg">
      <div class="font-mono text-[11px] text-atc-faint tracking-widest">LOADING MAP…</div>
    </div>
  </div>
</template>

<script setup>
import { createApp, h, ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import NumberFlow from '@number-flow/vue'
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
} from '../../utils/aircraftMotion'

const props = defineProps({
  icao:     { type: String,  default: '' },
  lat:      { type: Number,  default: 0 },
  lon:      { type: Number,  default: 0 },
  zoom:     { type: Number,  default: 13 },
  accent:   { type: String,  default: '#FF5A1F' },
  aircraft: { type: Array,   default: () => [] },
})

const mapEl   = ref(null)
const mapReady = ref(false)
let map = null
let sizeObs = null
// Track markers by icao24 for smooth position updates
// Entry shape: { marker, color, label, lat, lon, positionTime, correctionLat, correctionLon, ... }
const acMarkersMap = new Map()

const latStr = ref('')
const lonStr = ref('')

// Dead-reckoning: animate aircraft that exceed this speed (knots)
const ANIMATE_THRESHOLD_KT = 30
const TRAFFIC_INTENT_COLORS = {
  arrival: '#38bdf8',
  departure: '#fb923c',
  unknown: '#cbd5e1',
  ground: '#34d399',
}
const trafficLegend = [
  { id: 'arrival', label: 'ARR', color: TRAFFIC_INTENT_COLORS.arrival },
  { id: 'departure', label: 'DEP', color: TRAFFIC_INTENT_COLORS.departure },
  { id: 'unknown', label: 'UNK', color: TRAFFIC_INTENT_COLORS.unknown },
]

// RAF loop — updates visual aircraft positions on a delayed, latency-aware clock
let rafId = null

const animateLoop = () => {
  if (!map) return
  const now = Date.now()
  for (const [, entry] of acMarkersMap) {
    const position = calculateAircraftVisualPosition(entry, now)
    entry.marker.setLatLng([position.lat, position.lon])
  }
  rafId = requestAnimationFrame(animateLoop)
}

const startRaf = () => {
  if (rafId == null) rafId = requestAnimationFrame(animateLoop)
}

const stopRaf = () => {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null }
}

const initMap = () => {
  if (!mapEl.value || map) return

  map = L.map(mapEl.value, {
    center:           [props.lat || 33.9416, props.lon || -118.4085],
    zoom:             props.zoom,
    zoomControl:      false,
    attributionControl: false,
    scrollWheelZoom:  false,
    dragging:         false,
  })

  // CartoDB Dark Matter — no auth needed
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png', {
    subdomains: 'abcd', maxZoom: 20,
  }).addTo(map)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png', {
    subdomains: 'abcd', maxZoom: 20, opacity: 0.55,
  }).addTo(map)

  // Airport perimeter box (approx ±0.03° from center)
  if (props.lat && props.lon) {
    const d = 0.032
    L.polygon([
      [props.lat + d, props.lon - d],
      [props.lat + d, props.lon + d],
      [props.lat - d, props.lon + d],
      [props.lat - d, props.lon - d],
    ], {
      color: 'rgba(255,255,255,0.2)', weight: 1,
      dashArray: '4 4', fillColor: 'rgba(255,255,255,0.02)', fillOpacity: 1,
    }).addTo(map)
  }

  latStr.value = props.lat ? `${Math.abs(props.lat).toFixed(2)}°${props.lat >= 0 ? 'N' : 'S'}` : ''
  lonStr.value = props.lon ? `${Math.abs(props.lon).toFixed(2)}°${props.lon >= 0 ? 'E' : 'W'}` : ''

  mapReady.value = true
  updateAircraft()
  startRaf()

  // Observe the container for size changes (flex layout settles asynchronously).
  // Every time the container grows/shrinks, tell Leaflet to recalculate so it
  // requests any tiles that became visible — this eliminates the blank corner
  // that appears when Leaflet initialises before the container has its final size.
  sizeObs = new ResizeObserver(() => {
    requestAnimationFrame(() => map?.invalidateSize())
  })
  sizeObs.observe(mapEl.value)
}

const wholeNumberFormat = { maximumFractionDigits: 0 }

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const formatTelemetryValue = (value) => {
  if (value == null || value === '' || value === 'ground') return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}

const syncNumberFlow = (root, selector, value, suffix) => {
  const host = root?.querySelector(selector)
  if (!host || value == null) return

  if (!host.__numberFlowApp) {
    const currentValue = shallowRef(value)
    const app = createApp({
      render: () => h(NumberFlow, {
        class: 'aircraft-number-flow',
        value: currentValue.value,
        suffix,
        format: wholeNumberFormat,
      }),
    })
    app.mount(host)
    host.__numberFlowApp = app
    host.__numberFlowValue = currentValue
  } else {
    host.__numberFlowValue.value = value
  }
}

const unmountAircraftTelemetry = (marker) => {
  marker?.getElement()?.querySelectorAll('[data-aircraft-flow]').forEach((host) => {
    host.__numberFlowApp?.unmount()
    delete host.__numberFlowApp
    delete host.__numberFlowValue
  })
}

const syncAircraftTelemetry = (marker, ac) => {
  const root = marker?.getElement()
  if (!root) return
  syncNumberFlow(root, '[data-aircraft-flow="speed"]', formatTelemetryValue(ac.velocity), 'kt')
  syncNumberFlow(root, '[data-aircraft-flow="altitude"]', formatTelemetryValue(ac.altitude), 'ft')
}

const queueAircraftTelemetrySync = (marker, ac) => {
  requestAnimationFrame(() => syncAircraftTelemetry(marker, ac))
}

const makeAcIcon = (color, label, rot = 0, showArrow = true, hasTelemetry = false) => {
  const symbol = showArrow
    ? `<svg width="18" height="18" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);filter:drop-shadow(0 0 4px ${color})">
        <path d="M12 2L16 20L12 17L8 20Z" fill="${color}"/>
       </svg>`
    : `<svg width="7" height="7" viewBox="0 0 7 7" style="filter:drop-shadow(0 0 3px ${color});margin:5.5px">
        <circle cx="3.5" cy="3.5" r="3.5" fill="${color}"/>
       </svg>`
  const safeLabel = escapeHtml(label)
  const labelTop = showArrow && hasTelemetry ? '-4px' : '2px'
  const telemetryLine = showArrow && hasTelemetry
    ? `<div class="aircraft-telemetry">
        <span data-aircraft-flow="speed"></span>
        <span class="aircraft-telemetry-separator">|</span>
        <span data-aircraft-flow="altitude"></span>
      </div>`
    : ''

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;display:flex;align-items:center">
      ${symbol}
      <div class="aircraft-label" style="left:${showArrow ? 22 : 18}px;top:${labelTop};color:${color}">
        <div class="aircraft-label-title">${safeLabel}</div>
        ${telemetryLine}
      </div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const getTrafficIntentColor = (ac, showArrow) => {
  if (ac.onGround) return TRAFFIC_INTENT_COLORS.ground
  if (ac.trafficIntent === 'arrival') return TRAFFIC_INTENT_COLORS.arrival
  if (ac.trafficIntent === 'departure') return TRAFFIC_INTENT_COLORS.departure
  return showArrow ? TRAFFIC_INTENT_COLORS.unknown : '#ffb347'
}

const updateAircraft = () => {
  if (!map) return

  const now = Date.now()
  const seen = new Set()
  props.aircraft.forEach(ac => {
    if (!ac.lat || !ac.lon) return
    seen.add(ac.icao24)
    const vel        = ac.velocity ?? 0
    const showArrow  = vel >= ANIMATE_THRESHOLD_KT
    const isAnimated = !ac.onGround && showArrow
    const color = getTrafficIntentColor(ac, showArrow)
    const label = (ac.callsign || ac.icao24 || '').trim()
    const rot   = Math.round(ac.track || 0)
    const hasTelemetry = !ac.onGround && showArrow && formatTelemetryValue(ac.velocity) != null && formatTelemetryValue(ac.altitude) != null

    if (acMarkersMap.has(ac.icao24)) {
      const entry = acMarkersMap.get(ac.icao24)
      const currentLatLng = entry.marker.getLatLng()
      const motionState = beginAircraftMotionState(ac, now, {
        lat: currentLatLng.lat,
        lon: currentLatLng.lng,
      })
      Object.assign(entry, motionState, {
        velocity: vel,
        track: ac.track ?? 0,
        isAnimated,
      })
      // Refresh icon only when appearance changes
      if (color !== entry.color || label !== entry.label || rot !== entry.rot || showArrow !== entry.showArrow || hasTelemetry !== entry.hasTelemetry || ac.trafficIntent !== entry.trafficIntent) {
        unmountAircraftTelemetry(entry.marker)
        entry.marker.setIcon(makeAcIcon(color, label, rot, showArrow, hasTelemetry))
        entry.color = color
        entry.label = label
        entry.rot = rot
        entry.showArrow = showArrow
        entry.hasTelemetry = hasTelemetry
        entry.trafficIntent = ac.trafficIntent
      }
      if (hasTelemetry) queueAircraftTelemetrySync(entry.marker, ac)
    } else {
      const motionState = beginAircraftMotionState(ac, now)
      const visualPosition = calculateAircraftVisualPosition(motionState, now)
      const m = L.marker([visualPosition.lat, visualPosition.lon], { icon: makeAcIcon(color, label, rot, showArrow, hasTelemetry) }).addTo(map)
      acMarkersMap.set(ac.icao24, {
        marker: m, color, label, rot, showArrow, hasTelemetry, trafficIntent: ac.trafficIntent,
        ...motionState,
        velocity: vel, track: ac.track ?? 0,
        isAnimated,
      })
      if (hasTelemetry) queueAircraftTelemetrySync(m, ac)
    }
  })

  // Remove stale markers
  for (const [id, entry] of acMarkersMap) {
    if (!seen.has(id)) {
      unmountAircraftTelemetry(entry.marker)
      entry.marker.remove()
      acMarkersMap.delete(id)
    }
  }
}

watch(() => props.aircraft, updateAircraft, { deep: true })
watch(() => [props.lat, props.lon], ([lat, lon]) => {
  if (map && lat && lon) {
    map.setView([lat, lon], props.zoom)
    latStr.value = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
    lonStr.value = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`
  }
})

onMounted(initMap)
onUnmounted(() => {
  stopRaf()
  sizeObs?.disconnect()
  for (const [, entry] of acMarkersMap) unmountAircraftTelemetry(entry.marker)
  acMarkersMap.clear()
  if (map) { map.remove(); map = null }
})
</script>

<style>
/* No CSS transition — fast aircraft use RAF dead-reckoning; slow/ground aircraft
   snap on poll which is imperceptible at low speeds. */
.leaflet-marker-icon {
  transition: none;
}

.aircraft-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1.05;
  position: absolute;
  text-shadow: 0 0 4px #0a0a0b, 0 0 7px #0a0a0b;
  white-space: nowrap;
}

.aircraft-label-title {
  font-size: 10px;
}

.aircraft-telemetry {
  align-items: baseline;
  color: rgba(245, 245, 247, 0.86);
  display: flex;
  font-size: 8.5px;
  font-weight: 700;
  gap: 3px;
  letter-spacing: 0;
  margin-top: 1px;
  text-shadow: 0 0 4px #0a0a0b, 0 0 8px #0a0a0b;
}

.aircraft-number-flow {
  font-variant-numeric: tabular-nums;
}

.aircraft-number-flow::part(suffix) {
  color: rgba(245, 245, 247, 0.54);
  font-size: 0.86em;
  font-weight: 700;
  margin-left: 1px;
}

.aircraft-telemetry-separator {
  color: rgba(255, 90, 31, 0.72);
  font-size: 0.9em;
}
</style>
