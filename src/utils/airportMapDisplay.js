export const ZOOM_APPROACH = 10
export const ZOOM_AIRPORT = 13
export const ZOOM_DETAIL = 14

export const shouldShowAirportArea = (zoom) => Number(zoom) >= ZOOM_AIRPORT

export const isGroundLikeAircraft = (
  aircraft,
  {
    airportAreaRadiusNm,
    slowAircraftThresholdKt,
  } = {},
) => {
  if (aircraft?.onGround) return true

  const distanceNm = Number(aircraft?.distanceNm)
  const speedKt = Number(aircraft?.velocity ?? 0)

  return (
    Number.isFinite(distanceNm)
    && distanceNm <= airportAreaRadiusNm
    && Number.isFinite(speedKt)
    && speedKt < slowAircraftThresholdKt
  )
}

export const countGroundAircraft = (aircraft = []) =>
  aircraft.filter((item) => item?.onGround).length
