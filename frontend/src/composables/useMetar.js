import { ref, watch } from 'vue'

// aviationweather.gov — US government, no auth required
const BASE = 'https://aviationweather.gov/api/data/metar'

export function useMetar(icaoRef) {
  const raw    = ref('')
  const parsed = ref(null)
  const loading = ref(false)
  const error  = ref(null)

  const fetch_ = async (icao) => {
    if (!icao) return
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${BASE}?ids=${icao.toUpperCase()}&format=json`, {
        headers: { 'User-Agent': 'LiveATC-Caption/2.0' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()

      // API returns an array; take first result
      const m = Array.isArray(json) ? json[0] : json
      if (!m) { raw.value = ''; parsed.value = null; return }

      raw.value = m.rawOb || m.rawMETAR || ''

      parsed.value = {
        wind:     formatWind(m),
        vis:      m.visib   ? `${m.visib} SM`         : '—',
        temp:     m.temp    != null ? `${m.temp}°C`   : '—',
        dew:      m.dewp    != null ? `${m.dewp}°C`   : '—',
        altim:    m.altim   ? `${m.altim} inHg`       : '—',
        ceiling:  formatCeiling(m),
        wxString: m.wxString || '',
        flightCategory: m.flightCategory || '',
        obsTime: m.obsTime || '',
      }
    } catch (e) {
      console.warn('METAR fetch failed:', e.message)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  watch(icaoRef, (v) => fetch_(v), { immediate: true })

  return { raw, parsed, loading, error }
}

function formatWind(m) {
  if (!m.wdir && !m.wspd) return '—'
  const dir = m.wdir === 'VRB' ? 'VRB' : `${String(m.wdir ?? 0).padStart(3,'0')}°`
  const spd = `${m.wspd ?? 0} kt`
  return m.wgst ? `${dir} / ${spd} G${m.wgst}kt` : `${dir} / ${spd}`
}

function formatCeiling(m) {
  const layers = m.clouds || []
  const ceiling = layers.find(l => ['BKN','OVC','VV'].includes(l.cover))
  if (!ceiling) return 'CLR'
  const ft = ceiling.base != null ? `${(ceiling.base * 100).toLocaleString()} ft` : '?'
  return `${ceiling.cover} ${ft}`
}
