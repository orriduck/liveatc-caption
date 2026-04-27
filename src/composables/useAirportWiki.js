import { ref, watch } from 'vue'
import { fetchAirportWikiSummary } from '../services/airportWiki.js'

export function useAirportWiki(airportRef) {
  const summary = ref(null)
  const loading = ref(false)
  const error = ref(null)

  watch(airportRef, async (airport) => {
    summary.value = null
    error.value = null
    if (!airport?.name && !airport?.icao && !airport?.iata) return

    loading.value = true
    try {
      summary.value = await fetchAirportWikiSummary(airport)
    } catch (err) {
      error.value = err?.message || 'Airport summary unavailable'
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  return { summary, loading, error }
}

