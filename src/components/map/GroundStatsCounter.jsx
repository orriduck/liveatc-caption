"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NumberFlow from "@number-flow/react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  ZOOM_APPROACH,
  isGroundLikeAircraft,
} from "../../utils/airportMapDisplay.js";
import { SLOW_AIRCRAFT_THRESHOLD_KT } from "../../utils/aircraftMotion.js";
import { AIRPORT_AREA_RADIUS_NM } from "./AreaMarker.jsx";

export default function GroundStatsCounter({ lat, lon, zoom, aircraft = [] }) {
  const map = useMapInstance();
  const markerRef = useRef(null);
  const [container] = useState(() =>
    typeof document !== "undefined" ? document.createElement("div") : null,
  );

  const visible = Number(zoom) === ZOOM_APPROACH && lat && lon;

  const groundCount = useMemo(() => {
    if (!visible) return 0;
    return aircraft.filter((item) =>
      isGroundLikeAircraft(item, {
        airportAreaRadiusNm: AIRPORT_AREA_RADIUS_NM,
        slowAircraftThresholdKt: SLOW_AIRCRAFT_THRESHOLD_KT,
      }),
    ).length;
  }, [aircraft, visible]);

  useEffect(() => {
    if (!map || !map.getContainer || !visible || !container) {
      markerRef.current?.remove();
      markerRef.current = null;
      return undefined;
    }
    const marker = L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: "",
        html: container,
        iconSize: [58, 18],
        iconAnchor: [29, 24],
      }),
    }).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, visible, lat, lon, container]);

  if (!container || !visible) return null;
  return createPortal(
    <div className="airport-ground-count">
      GND <NumberFlow value={groundCount} />
    </div>,
    container,
  );
}
