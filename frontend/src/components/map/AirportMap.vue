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

    <!-- Loading state -->
    <div v-if="!mapReady" class="absolute inset-0 flex items-center justify-center bg-atc-card rounded-lg">
      <div class="font-mono text-[11px] text-atc-faint tracking-widest">LOADING MAP…</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
// Entry shape: { marker, color, label, rot, baseLat, baseLon, baseTime, velocity, track, isAnimated }
const acMarkersMap = new Map()

const latStr = ref('')
const lonStr = ref('')

// Dead-reckoning: animate aircraft that exceed this speed (knots)
const ANIMATE_THRESHOLD_KT = 30

// RAF loop — updates predicted positions at ~60 fps for fast aircraft
let rafId = null

const animateLoop = () => {
  if (!map) return
  const now = Date.now()
  for (const [, entry] of acMarkersMap) {
    if (!entry.isAnimated) continue
    const dt = (now - entry.baseTime) / 1000  // seconds since last poll
    if (dt <= 0) continue

    // 匀速运动: uniform linear motion in the direction of `track`
    // 1 knot = 0.514444 m/s; track is degrees clockwise from north
    const mps = entry.velocity * 0.514444
    const trackRad = (entry.track * Math.PI) / 180
    const latRad   = (entry.baseLat * Math.PI) / 180
    const dLat = (mps * Math.cos(trackRad) * dt) / 111_320
    const dLon = (mps * Math.sin(trackRad) * dt) / (111_320 * Math.cos(latRad))
    entry.marker.setLatLng([entry.baseLat + dLat, entry.baseLon + dLon])
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
    dragging:         true,
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

const makeAcIcon = (color, label, rot = 0) => L.divIcon({
  className: '',
  html: `<div style="position:relative">
    <svg width="18" height="18" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);filter:drop-shadow(0 0 4px ${color})">
      <path d="M12 2L16 20L12 17L8 20Z" fill="${color}"/>
    </svg>
    <div style="position:absolute;left:22px;top:2px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:${color};white-space:nowrap;text-shadow:0 0 4px #0a0a0b,0 0 6px #0a0a0b;letter-spacing:0.3px">${label}</div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const updateAircraft = () => {
  if (!map) return

  const now = Date.now()
  const seen = new Set()
  props.aircraft.forEach(ac => {
    if (!ac.lat || !ac.lon) return
    seen.add(ac.icao24)
    const color = ac.onGround ? '#34d399' : props.accent
    const label = (ac.callsign || ac.icao24 || '').trim()
    const rot   = Math.round(ac.track || 0)
    const isAnimated = !ac.onGround && (ac.velocity ?? 0) >= ANIMATE_THRESHOLD_KT

    if (acMarkersMap.has(ac.icao24)) {
      const entry = acMarkersMap.get(ac.icao24)
      // Anchor dead-reckoning to the fresh authoritative position
      entry.marker.setLatLng([ac.lat, ac.lon])
      entry.baseLat   = ac.lat
      entry.baseLon   = ac.lon
      entry.baseTime  = now
      entry.velocity  = ac.velocity ?? 0
      entry.track     = ac.track ?? 0
      entry.isAnimated = isAnimated
      // Refresh icon only when appearance changes
      if (color !== entry.color || label !== entry.label || rot !== entry.rot) {
        entry.marker.setIcon(makeAcIcon(color, label, rot))
        entry.color = color; entry.label = label; entry.rot = rot
      }
    } else {
      const m = L.marker([ac.lat, ac.lon], { icon: makeAcIcon(color, label, rot) }).addTo(map)
      acMarkersMap.set(ac.icao24, {
        marker: m, color, label, rot,
        baseLat: ac.lat, baseLon: ac.lon, baseTime: now,
        velocity: ac.velocity ?? 0, track: ac.track ?? 0,
        isAnimated,
      })
    }
  })

  // Remove stale markers
  for (const [id, entry] of acMarkersMap) {
    if (!seen.has(id)) { entry.marker.remove(); acMarkersMap.delete(id) }
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
</style>
