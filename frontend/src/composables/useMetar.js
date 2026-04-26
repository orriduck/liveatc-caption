import { ref, watch } from 'vue'
import { metarClient } from '../services/aviationData.js'

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
      const json = await metarClient.fetchMetar(icao)

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
        flightCategory: m.flightCategory || m.fltCat || '',
        obsTime: m.obsTime || '',
        // Raw numbers for animated display
        rawTemp:  m.temp  ?? null,
        rawDewp:  m.dewp  ?? null,
        rawVisib: m.visib != null ? Number(m.visib) : null,
        rawAltim: m.altim != null ? Number(m.altim) : null,
        rawWspd:  m.wspd  ?? null,
        rawWgst:  m.wgst  ?? null,
        rawWdir:  m.wdir === 'VRB' ? null : (m.wdir != null ? Number(m.wdir) : null),
        rawWvrb:  m.wdir === 'VRB',
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

export function formatCeiling(m) {
  const layers = m.clouds || []
  const ceiling = layers.find(l => ['BKN','OVC','VV'].includes(l.cover))
  if (!ceiling) return 'CLR'
  const ft = ceiling.base != null ? `${Number(ceiling.base).toLocaleString()} ft` : '?'
  return `${ceiling.cover} ${ft}`
}
