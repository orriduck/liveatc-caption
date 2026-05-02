"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import MobileStatusBar from "../panels/MobileStatusBar";
import TrafficPanel from "../panels/TrafficPanel";
import WeatherPanel from "../panels/WeatherPanel";
import WikiPanel from "../panels/WikiPanel";
import MapControlBar from "../ui/MapControlBar";
import Orb from "../ui/Orb";
import { useAircraftPositions } from "../../hooks/useAircraftPositions.js";
import { useAirportWiki } from "../../hooks/useAirportWiki.js";
import { useFlightRoutes } from "../../hooks/useFlightRoutes.js";
import { useMetar } from "../../hooks/useMetar.js";
import { useScrollParallax } from "../../hooks/useScrollParallax.js";
import { BARO_RATE_THRESHOLD_FPM } from "../../constants/aircraft.js";
import { AIRPORT_FALLBACKS, COORDS } from "../../data/airportFallbacks.js";
import { ZOOM_APPROACH } from "../../utils/airportMapDisplay.js";
import { SLOW_AIRCRAFT_THRESHOLD_KT } from "../../utils/aircraftMotion.js";
import { formatLocalFlightRouteLabel } from "../../utils/flightRouteDisplay.js";

const AirportMap = dynamic(() => import("../map/AirportMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-atc-card font-mono text-[11px] tracking-widest text-atc-faint">
      LOADING MAP...
    </div>
  ),
});

const ADSB_LOADING_FADE_MS = 1100;

export default function AirportCaptionScreen({
  icao = "",
  airport = null,
  onBack,
}) {
  const [mapZoom, setMapZoom] = useState(ZOOM_APPROACH);
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const screenRef = useRef(null);
  const parallax = useScrollParallax(screenRef);

  const normalizedIcao = String(airport?.icao || icao || "").toUpperCase();
  const airportFallback = AIRPORT_FALLBACKS[normalizedIcao] || null;
  const airportCodeLabel =
    airport?.iata || airportFallback?.iata || normalizedIcao;
  const airportName =
    airport?.name || airportFallback?.name || normalizedIcao || "Airport";
  const airportLat = COORDS[normalizedIcao]?.[0] || airport?.lat || 0;
  const airportLon = COORDS[normalizedIcao]?.[1] || airport?.lon || 0;

  const {
    raw: metarRaw,
    parsed: metar,
    loading: metarLoading,
    error: metarError,
  } = useMetar(normalizedIcao);
  const {
    aircraft,
    initialLoading: aircraftInitialLoading,
    lastUpdated,
  } = useAircraftPositions(normalizedIcao, airportLat, airportLon);
  const { routesByCallsign } = useFlightRoutes(aircraft);

  const aircraftWithRoutes = useMemo(
    () =>
      aircraft.map((item) => {
        const key = normalizeCallsign(item.callsign);
        const route = routesByCallsign[key] || null;
        const localAirport = {
          iata: airportCodeLabel,
          icao: normalizedIcao,
        };
        return {
          ...item,
          flightRoute: route,
          flightRouteLabel: formatLocalFlightRouteLabel(
            route,
            localAirport,
            item.trafficIntent,
          ),
        };
      }),
    [aircraft, routesByCallsign, airportCodeLabel, normalizedIcao],
  );

  const wikiAirport = useMemo(
    () => ({
      name: airportName,
      icao: normalizedIcao,
      iata: airportCodeLabel,
    }),
    [airportName, normalizedIcao, airportCodeLabel],
  );
  const { summary: wikiSummary, loading: wikiLoading } =
    useAirportWiki(wikiAirport);

  const coordinatesLabel = useMemo(() => {
    if (!airportLat || !airportLon) return "Coordinates pending";
    const lat = `${Math.abs(airportLat).toFixed(2)} ${airportLat >= 0 ? "N" : "S"}`;
    const lon = `${Math.abs(airportLon).toFixed(2)} ${airportLon >= 0 ? "E" : "W"}`;
    return `${lat} / ${lon}`;
  }, [airportLat, airportLon]);

  const trafficCounts = useMemo(
    () =>
      aircraft.reduce(
        (counts, item) => {
          const showArrow = (item.velocity ?? 0) >= SLOW_AIRCRAFT_THRESHOLD_KT;
          if (!item.onGround && showArrow && item.baroRate != null) {
            if (item.baroRate > BARO_RATE_THRESHOLD_FPM) {
              counts.ascending += 1;
              return counts;
            }
            if (item.baroRate < -BARO_RATE_THRESHOLD_FPM) {
              counts.descending += 1;
              return counts;
            }
          }
          counts.level += 1;
          return counts;
        },
        { ascending: 0, descending: 0, level: 0 },
      ),
    [aircraft],
  );

  return (
    <div
      ref={screenRef}
      className="airport-screen relative min-h-screen bg-atc-bg font-sans text-atc-text"
      style={{
        "--mobile-breadcrumb-opacity": parallax.breadcrumbOpacity,
        "--mobile-title-opacity": parallax.titleOpacity,
        "--mobile-compact-title-opacity": parallax.compactTitleOpacity,
        "--mobile-top-mask-opacity": parallax.topMaskOpacity,
      }}
    >
      <div className="airport-map-layer absolute inset-0 z-0">
        <AirportMap
          icao={normalizedIcao}
          lat={airportLat}
          lon={airportLon}
          zoom={mapZoom}
          accent="#FF5A1F"
          aircraft={aircraftWithRoutes}
          airport={airport}
          showMapLabels={showMapLabels}
          showTelemetry={showTelemetry}
        />
      </div>

      <div className="airport-map-warmth absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_14%,rgba(255,90,31,0.14),transparent_28%)]" />
      <AircraftDataLoadingOverlay active={aircraftInitialLoading} />
      <div className="mobile-map-dim" />
      <div className="mobile-top-mask" />
      <div className="mobile-compact-title" aria-hidden="true">
        <span className="mobile-compact-code">{airportCodeLabel}</span>
        <span className="mobile-compact-name">{airportName}</span>
      </div>

      <MapControlBar
        activeZoom={mapZoom}
        showMapLabels={showMapLabels}
        showTelemetry={showTelemetry}
        onZoom={setMapZoom}
        onToggleMapLabels={() => setShowMapLabels((value) => !value)}
        onToggleTelemetry={() => setShowTelemetry((value) => !value)}
      />

      <div className="airport-content relative z-20 flex min-h-screen flex-col px-5 py-5 md:px-8 lg:px-10">
        <header className="airport-header">
          <div className="airport-hero">
            <nav className="airport-breadcrumb" aria-label="Airport navigation">
              <button className="airport-back" onClick={onBack} type="button">
                ADSBao
              </button>
              <span>/</span>
              <span className="airport-breadcrumb-current">{airportName}</span>
            </nav>

            <div className="airport-title-row">
              <span className="airport-code">{airportCodeLabel}</span>
              <div className="airport-title-stack">
                <h1 className="airport-title">{airportName}</h1>
              </div>
            </div>
          </div>
          <div className="airport-coordinates">
            <span>{coordinatesLabel}</span>
          </div>
        </header>

        <div className="dashboard-updated">
          Updated {fmtUpdated(lastUpdated)}
        </div>

        <main className="airport-dashboard">
          <WeatherPanel
            metar={metar}
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            metarError={metarError}
          />
          <TrafficPanel aircraft={aircraft} trafficCounts={trafficCounts} />
          <WikiPanel
            wikiSummary={wikiSummary}
            wikiLoading={wikiLoading}
            airportName={airportName}
          />
        </main>
      </div>

      <MobileStatusBar metar={metar} trafficCounts={trafficCounts} />
    </div>
  );
}

const normalizeCallsign = (callsign) =>
  String(callsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

function AircraftDataLoadingOverlay({ active }) {
  const [visible, setVisible] = useState(active);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let fadeTimer;

    if (active) {
      setVisible(true);
      setExiting(false);
      return undefined;
    }

    if (visible) {
      setExiting(true);
      fadeTimer = window.setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, ADSB_LOADING_FADE_MS);
    }

    return () => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      className={`adsb-loading-overlay ${exiting ? "is-exiting" : ""}`}
      aria-label="Loading ADS-B aircraft data"
      onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || !exiting) return;
        setVisible(false);
        setExiting(false);
      }}
      role="status"
    >
      <div className="adsb-loading-orb-shell" aria-hidden="true">
        <Orb
          backgroundColor="#0a0a0b"
          color1="#ff5a1f"
          color2="#ffb15f"
          color3="#5f160b"
          forceHoverState={false}
          hoverIntensity={0}
          hue={0}
          rotateOnHover
        />
      </div>
      <div className="adsb-loading-status">
        <span>adsb.lol</span>
        <strong>SYNCING TRAFFIC</strong>
      </div>
    </div>
  );
}

const fmtUpdated = (date) => {
  if (!date) return "-";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
