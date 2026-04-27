export const HOME_AIRPORT_COUNTRY = 'US'

export const HOME_AIRPORT_KIND_OPTIONS = [
  { id: 'all', label: 'All US airports' },
  { id: 'large_airport', label: 'Major hubs' },
  { id: 'medium_airport', label: 'Regional' },
  { id: 'small_airport', label: 'Local fields' },
  { id: 'heliport', label: 'Heliports' },
]

export const buildHomeAirportBrowseTitle = (kind) => {
  const selectedKind = HOME_AIRPORT_KIND_OPTIONS.find((option) => option.id === kind)?.label || 'All US airports'
  return kind === 'all' ? selectedKind : `${selectedKind} · United States`
}
