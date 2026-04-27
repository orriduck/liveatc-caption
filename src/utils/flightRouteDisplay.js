const airportCode = (airport) =>
  String(airport?.iata || airport?.icao || '').trim().toUpperCase()

const airportCodes = (airport) =>
  new Set(
    [airport?.iata, airport?.icao]
      .map((code) => String(code || '').trim().toUpperCase())
      .filter(Boolean),
  )

const airportMatches = (routeAirport, airport) => {
  const localCodes = airportCodes(airport)
  return [routeAirport?.iata, routeAirport?.icao]
    .map((code) => String(code || '').trim().toUpperCase())
    .some((code) => localCodes.has(code))
}

export const formatFlightRouteLabel = (route) => {
  const origin = airportCode(route?.origin)
  const destination = airportCode(route?.destination)
  return origin && destination ? `${origin} -> ${destination}` : ''
}

export const formatLocalFlightRouteLabel = (route, airport, trafficIntent) => {
  if (!route || !airport) return ''

  if (trafficIntent === 'arrival' && !airportMatches(route.destination, airport)) {
    return ''
  }

  if (trafficIntent === 'departure' && !airportMatches(route.origin, airport)) {
    return ''
  }

  if (
    trafficIntent !== 'arrival'
    && trafficIntent !== 'departure'
    && !airportMatches(route.origin, airport)
    && !airportMatches(route.destination, airport)
  ) {
    return ''
  }

  return formatFlightRouteLabel(route)
}
