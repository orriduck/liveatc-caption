"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  SLOW_AIRCRAFT_THRESHOLD_KT,
} from "../../utils/aircraftMotion.js";
import {
  ZOOM_APPROACH,
  isGroundLikeAircraft as isGroundLikeAircraftForDisplay,
  shouldShowAirportArea,
} from "../../utils/airportMapDisplay.js";
import {
  AIRCRAFT_COLORS,
  BARO_RATE_THRESHOLD_FPM,
} from "../../constants/aircraft.js";
import { DEFAULT_WIDE_RANGE_NM } from "../../services/aviationData.js";

const TILE_VARIANTS = {
  light: {
    base: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png",
    labelOpacity: 0.66,
  },
  dark: {
    base: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
    labels:
      "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png",
    labelOpacity: 0.55,
  },
};

const trafficLegend = [
  { id: "ascending", label: "ASC", color: AIRCRAFT_COLORS.ascending },
  { id: "level", label: "LEVEL", color: AIRCRAFT_COLORS.level },
  { id: "descending", label: "DESC", color: AIRCRAFT_COLORS.descending },
];

const QUERY_RANGE_NM = DEFAULT_WIDE_RANGE_NM;
const AIRPORT_AREA_RADIUS_NM = 2.2;
const NM_TO_METERS = 1852;

export default function AirportMap({
  icao = "",
  lat = 0,
  lon = 0,
  zoom = 13,
  accent = "#FF5A1F",
  aircraft = [],
  airport = null,
  showMapLabels = true,
  showTelemetry = true,
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const sizeObs = useRef(null);
  const baseTileLayer = useRef(null);
  const labelTileLayer = useRef(null);
  const airportAreaLayer = useRef(null);
  const queryRangeLayer = useRef(null);
  const airportInfoMarker = useRef(null);
  const airportGroundCountMarker = useRef(null);
  const acMarkersMap = useRef(new Map());
  const rafId = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => resolveCurrentTheme());

  const latStr = lat
    ? `${Math.abs(lat).toFixed(2)}${lat >= 0 ? "N" : "S"}`
    : "";
  const lonStr = lon
    ? `${Math.abs(lon).toFixed(2)}${lon >= 0 ? "E" : "W"}`
    : "";
  const mapBackground = currentTheme === "light" ? "#d6dde8" : "#0e0e12";
  const mapLabelShadowColor =
    currentTheme === "light" ? "rgba(248,250,252,0.95)" : "#0a0a0b";
  const mapAttributionColor =
    currentTheme === "light" ? "rgba(18,21,26,0.45)" : "rgba(245,245,247,0.28)";

  const latestProps = useRef({
    lat,
    lon,
    zoom,
    airport,
    aircraft,
    showMapLabels,
    showTelemetry,
    currentTheme,
    icao,
  });
  latestProps.current = {
    lat,
    lon,
    zoom,
    airport,
    aircraft,
    showMapLabels,
    showTelemetry,
    currentTheme,
    icao,
  };

  const helpers = useMemo(() => {
    const removeAirportContext = () => {
      airportAreaLayer.current?.removeFrom(mapRef.current);
      queryRangeLayer.current?.removeFrom(mapRef.current);
      airportInfoMarker.current?.removeFrom(mapRef.current);
      airportGroundCountMarker.current?.removeFrom(mapRef.current);
      airportAreaLayer.current = null;
      queryRangeLayer.current = null;
      airportInfoMarker.current = null;
      airportGroundCountMarker.current = null;
    };

    const updateTileLayers = () => {
      const map = mapRef.current;
      if (!map) return;
      baseTileLayer.current?.removeFrom(map);
      labelTileLayer.current?.removeFrom(map);
      const props = latestProps.current;
      const variant = TILE_VARIANTS[props.currentTheme] || TILE_VARIANTS.dark;
      baseTileLayer.current = L.tileLayer(variant.base, {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);
      if (props.showMapLabels) {
        labelTileLayer.current = L.tileLayer(variant.labels, {
          subdomains: "abcd",
          maxZoom: 20,
          opacity: variant.labelOpacity,
        }).addTo(map);
      }
    };

    const isGroundLikeAircraft = (ac) =>
      isGroundLikeAircraftForDisplay(ac, {
        airportAreaRadiusNm: AIRPORT_AREA_RADIUS_NM,
        slowAircraftThresholdKt: SLOW_AIRCRAFT_THRESHOLD_KT,
      });

    const buildAirportOverlayDetails = () => {
      const { airport: nextAirport } = latestProps.current;
      const details = [];
      const runways = nextAirport?.runways;
      if (Array.isArray(runways) && runways.length)
        details.push(`RWY ${runways.length}`);
      const approachCount = Number(nextAirport?.approachCount);
      if (Number.isFinite(approachCount) && approachCount > 0) {
        details.push(`APP ${approachCount}`);
      }
      return details;
    };

    const updateAirportContextOverlays = () => {
      const map = mapRef.current;
      const props = latestProps.current;
      if (!map || !props.lat || !props.lon) return;

      airportAreaLayer.current?.removeFrom(map);
      queryRangeLayer.current?.removeFrom(map);
      airportInfoMarker.current?.removeFrom(map);
      airportGroundCountMarker.current?.removeFrom(map);

      const stroke =
        props.currentTheme === "light"
          ? "rgba(18,21,26,0.22)"
          : "rgba(255,255,255,0.28)";
      const fill =
        props.currentTheme === "light"
          ? "rgba(18,21,26,0.06)"
          : "rgba(255,255,255,0.05)";

      if (shouldShowAirportArea(props.zoom)) {
        airportAreaLayer.current = L.layerGroup([
          L.circle([props.lat, props.lon], {
            radius: AIRPORT_AREA_RADIUS_NM * NM_TO_METERS,
            color: stroke,
            weight: 1,
            dashArray: "4 4",
            fillColor: fill,
            fillOpacity: 1,
          }),
        ]).addTo(map);
      }

      queryRangeLayer.current = L.circle([props.lat, props.lon], {
        radius: QUERY_RANGE_NM * NM_TO_METERS,
        color: stroke,
        weight: 1,
        dashArray: "6 6",
        fillColor: fill,
        fillOpacity: 1,
      }).addTo(map);

      const airportCode = escapeHtml(
        (props.airport?.iata || props.icao || "").trim(),
      );
      const detailLines = buildAirportOverlayDetails()
        .map((line) => `<span>${escapeHtml(line)}</span>`)
        .join("");
      airportInfoMarker.current = L.marker([props.lat, props.lon], {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: `<div class="airport-overlay-label">${airportCode}${detailLines}</div>`,
          iconSize: [120, 34],
          iconAnchor: [0, -8],
        }),
      }).addTo(map);

      if (Number(props.zoom) === ZOOM_APPROACH) {
        const groundCount = props.aircraft.filter((item) =>
          isGroundLikeAircraft(item),
        ).length;
        airportGroundCountMarker.current = L.marker([props.lat, props.lon], {
          interactive: false,
          icon: L.divIcon({
            className: "",
            html: `<div class="airport-ground-count">GND ${groundCount}</div>`,
            iconSize: [58, 18],
            iconAnchor: [29, 24],
          }),
        }).addTo(map);
      }
    };

    const makeAcIcon = (
      color,
      label,
      rot = 0,
      showArrow = true,
      hasTelemetry = false,
      routeLabel = "",
    ) => {
      const symbol = showArrow
        ? `<svg width="18" height="18" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);filter:drop-shadow(0 0 4px ${color})"><path d="M12 2L16 20L12 17L8 20Z" fill="${color}"/></svg>`
        : `<svg width="7" height="7" viewBox="0 0 7 7" style="filter:drop-shadow(0 0 3px ${color});margin:5.5px"><circle cx="3.5" cy="3.5" r="3.5" fill="${color}"/></svg>`;
      const safeLabel = escapeHtml(label);
      const safeRouteLabel = escapeHtml(routeLabel);
      const labelTop = showArrow && hasTelemetry ? "-4px" : "2px";
      const props = latestProps.current;
      const telemetryLine =
        showArrow && hasTelemetry && props.showTelemetry
          ? `<div class="aircraft-telemetry"><span>${formatTelemetryValue(props.currentAircraft?.velocity)}kt</span><span class="aircraft-telemetry-separator">|</span><span>${formatTelemetryValue(props.currentAircraft?.altitude)}ft</span></div>`
          : "";
      const routeLine = safeRouteLabel
        ? `<div class="aircraft-route-label">${safeRouteLabel}</div>`
        : "";
      const labelClass = safeRouteLabel
        ? "aircraft-label aircraft-label--route-cycle"
        : "aircraft-label";
      const titleLine = safeRouteLabel
        ? `<div class="aircraft-title-cycle"><div class="aircraft-label-title aircraft-callsign-state">${safeLabel}</div>${routeLine}</div>`
        : `<div class="aircraft-label-title">${safeLabel}</div>`;

      return L.divIcon({
        className: "",
        html: `<div style="position:relative;display:flex;align-items:center">${symbol}<div class="${labelClass}" style="left:${showArrow ? 22 : 18}px;top:${labelTop};color:${color}">${titleLine}${telemetryLine}</div></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    };

    const getAircraftColor = (ac, showArrow) => {
      const props = latestProps.current;
      if (ac.onGround) return AIRCRAFT_COLORS.ground;
      if (!showArrow || ac.baroRate == null) {
        return props.currentTheme === "light"
          ? "#475569"
          : AIRCRAFT_COLORS.level;
      }
      if (ac.baroRate >= BARO_RATE_THRESHOLD_FPM)
        return AIRCRAFT_COLORS.ascending;
      if (ac.baroRate < -BARO_RATE_THRESHOLD_FPM)
        return AIRCRAFT_COLORS.descending;
      return AIRCRAFT_COLORS.level;
    };

    const updateAircraft = () => {
      const map = mapRef.current;
      const props = latestProps.current;
      if (!map) return;
      const now = Date.now();
      const seen = new Set();
      const onlyMovingAtApproach = Number(props.zoom) === ZOOM_APPROACH;
      for (const ac of props.aircraft) {
        const speedKt = Number(ac.velocity ?? 0);
        const isMoving = speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
        const isGroundLike = isGroundLikeAircraft(ac);
        if (onlyMovingAtApproach && (isGroundLike || !isMoving)) continue;
        if (!ac.lat || !ac.lon) continue;
        seen.add(ac.icao24);
        const vel = ac.velocity ?? 0;
        const showArrow = vel >= SLOW_AIRCRAFT_THRESHOLD_KT;
        const isAnimated = !ac.onGround && showArrow;
        const color = getAircraftColor(ac, showArrow);
        const label = (ac.callsign || ac.icao24 || "").trim();
        const routeLabel = (ac.flightRouteLabel || "").trim();
        const rot = Math.round(ac.track || 0);
        const hasTelemetry =
          !ac.onGround &&
          showArrow &&
          formatTelemetryValue(ac.velocity) != null &&
          formatTelemetryValue(ac.altitude) != null;

        latestProps.current.currentAircraft = ac;
        if (acMarkersMap.current.has(ac.icao24)) {
          const entry = acMarkersMap.current.get(ac.icao24);
          const currentLatLng = entry.marker.getLatLng();
          const motionState = beginAircraftMotionState(ac, now, {
            lat: currentLatLng.lat,
            lon: currentLatLng.lng,
          });
          Object.assign(entry, motionState, {
            velocity: vel,
            track: ac.track ?? 0,
            isAnimated,
          });
          if (
            color !== entry.color ||
            label !== entry.label ||
            rot !== entry.rot ||
            showArrow !== entry.showArrow ||
            hasTelemetry !== entry.hasTelemetry ||
            routeLabel !== entry.routeLabel ||
            props.showTelemetry !== entry.showTelemetry
          ) {
            entry.marker.setIcon(
              makeAcIcon(
                color,
                label,
                rot,
                showArrow,
                hasTelemetry,
                routeLabel,
              ),
            );
            Object.assign(entry, {
              color,
              label,
              rot,
              showArrow,
              hasTelemetry,
              routeLabel,
              showTelemetry: props.showTelemetry,
            });
          }
        } else {
          const motionState = beginAircraftMotionState(ac, now);
          const visualPosition = calculateAircraftVisualPosition(
            motionState,
            now,
          );
          const marker = L.marker([visualPosition.lat, visualPosition.lon], {
            icon: makeAcIcon(
              color,
              label,
              rot,
              showArrow,
              hasTelemetry,
              routeLabel,
            ),
          }).addTo(map);
          acMarkersMap.current.set(ac.icao24, {
            marker,
            color,
            label,
            rot,
            showArrow,
            hasTelemetry,
            routeLabel,
            showTelemetry: props.showTelemetry,
            ...motionState,
            velocity: vel,
            track: ac.track ?? 0,
            isAnimated,
          });
        }
      }

      for (const [id, entry] of acMarkersMap.current) {
        if (!seen.has(id)) {
          entry.marker.remove();
          acMarkersMap.current.delete(id);
        }
      }
      updateAirportContextOverlays();
    };

    return {
      removeAirportContext,
      updateTileLayers,
      updateAirportContextOverlays,
      updateAircraft,
    };
  }, []);

  useEffect(() => {
    setCurrentTheme(resolveCurrentTheme());
    const observer = new MutationObserver(() => {
      const next = resolveCurrentTheme();
      setCurrentTheme((current) => (current === next ? current : next));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return undefined;
    const map = L.map(mapEl.current, {
      center: [lat || 33.9416, lon || -118.4085],
      zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
    });
    mapRef.current = map;
    helpers.updateTileLayers();
    helpers.updateAirportContextOverlays();
    setMapReady(true);
    helpers.updateAircraft();

    const animateLoop = () => {
      if (!mapRef.current) return;
      const now = Date.now();
      for (const [, entry] of acMarkersMap.current) {
        const position = calculateAircraftVisualPosition(entry, now);
        entry.marker.setLatLng([position.lat, position.lon]);
      }
      rafId.current = requestAnimationFrame(animateLoop);
    };
    rafId.current = requestAnimationFrame(animateLoop);

    sizeObs.current = new ResizeObserver(() => {
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    });
    sizeObs.current.observe(mapEl.current);

    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      sizeObs.current?.disconnect();
      for (const [, entry] of acMarkersMap.current) entry.marker.remove();
      acMarkersMap.current.clear();
      helpers.removeAirportContext();
      baseTileLayer.current = null;
      labelTileLayer.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    helpers.updateTileLayers();
    helpers.updateAirportContextOverlays();
  }, [showMapLabels, currentTheme]);

  useEffect(() => {
    if (mapRef.current && lat && lon) {
      mapRef.current.setView([lat, lon], zoom);
      helpers.updateAirportContextOverlays();
      helpers.updateAircraft();
    }
  }, [lat, lon, zoom, aircraft, showTelemetry]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapEl}
        className="h-full w-full rounded-lg"
        style={{ background: mapBackground }}
      />

      {mapReady && (
        <>
          <div
            className="pointer-events-none absolute left-3.5 top-3 font-mono text-[10px] font-semibold tracking-[2px]"
            style={{
              color: accent,
              textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }}
          >
            * {icao} / {latStr} {lonStr}
          </div>
          <div
            className="pointer-events-none absolute bottom-3 right-3 whitespace-nowrap font-sans text-[9px]"
            style={{
              color: mapAttributionColor,
              textShadow: `0 0 6px ${mapLabelShadowColor}`,
            }}
          >
            OpenStreetMap / CartoDB
          </div>
          <div className="map-traffic-legend pointer-events-none absolute right-3 top-[168px] flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.8px]">
            {trafficLegend.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: item.color,
                    boxShadow: `0 0 6px ${item.color}`,
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </>
      )}

      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-atc-card">
          <div className="font-mono text-[11px] tracking-widest text-atc-faint">
            LOADING MAP...
          </div>
        </div>
      ) : null}
    </div>
  );
}

const resolveCurrentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTelemetryValue = (value) => {
  if (value == null || value === "" || value === "ground") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
};
