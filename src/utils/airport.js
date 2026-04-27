export const airportSubtitle = (airport) => {
  if (airport.city && airport.country) return `${airport.city} · ${airport.country}`
  if (airport.city) return airport.city
  if (airport.country) return airport.country
  return airport.type_label || airport.type || 'Airport'
}
