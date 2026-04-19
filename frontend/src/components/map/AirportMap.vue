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
const acMarkers = []

const latStr = ref('')
const lonStr = ref('')

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
  acMarkers.forEach(m => m.remove())
  acMarkers.length = 0

  props.aircraft.forEach(ac => {
    if (!ac.lat || !ac.lon) return
    const color = ac.onGround ? '#34d399' : props.accent
    const label = (ac.callsign || ac.icao24 || '').trim()
    const rot   = ac.track || 0
    const m = L.marker([ac.lat, ac.lon], { icon: makeAcIcon(color, label, rot) }).addTo(map)
    acMarkers.push(m)
  })
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
  sizeObs?.disconnect()
  if (map) { map.remove(); map = null }
})
</script>
