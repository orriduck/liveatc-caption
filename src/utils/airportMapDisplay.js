export const ZOOM_APPROACH = 10
export const ZOOM_AIRPORT = 13
export const ZOOM_DETAIL = 14

export const shouldShowAirportArea = (zoom) => Number(zoom) >= ZOOM_AIRPORT

export const countGroundAircraft = (aircraft = []) =>
  aircraft.filter((item) => item?.onGround).length
