"use client";

import {
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Navigation,
  Moon,
  Sun,
  Thermometer,
} from "lucide-react";

const FLIGHT_RULES = {
  VFR: {
    label: "Visual Flight Rules",
    color: "#19c37d",
    context:
      "Skies and visibility support normal visual operations. Weather is unlikely to constrain airport capacity.",
  },
  MVFR: {
    label: "Marginal Visual Flight Rules",
    color: "#2f8cff",
    context:
      "Visibility or ceiling is reduced. Arrivals and departures usually continue, but pilots watch weather margins closely.",
  },
  IFR: {
    label: "Instrument Flight Rules",
    color: "#ff453a",
    context:
      "Low clouds or limited visibility require instrument procedures. Arrival spacing can increase and delays become more likely.",
  },
  LIFR: {
    label: "Low IFR",
    color: "#e12aa2",
    context:
      "Very low ceiling or visibility limits airport flow. Only aircraft and runways equipped for low-visibility operations can land reliably.",
  },
};

const WEATHER_CODES = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

export function MetarSlide({ metarRaw, metarLoading, metarError }) {
  return (
    <div className="weather-slide-stack">
      <div className="metar-code weather-metar-code">
        {metarRaw || (metarLoading ? "Loading METAR..." : "No METAR available.")}
      </div>
      {metarError ? <div className="panel-error">{metarError}</div> : null}
    </div>
  );
}

export function FlightRulesSlide({ metar }) {
  const code = metar?.flightCategory || "VFR";
  const rules = FLIGHT_RULES[code] || FLIGHT_RULES.VFR;
  const visibility = metar?.rawVisib ?? null;
  const ceilingFt = getCeilingFeet(metar);
  const detailMeters = [
    ceilingFt == null
      ? null
      : {
          icon: <Cloud size={16} />,
          label: "Ceiling",
          marker: Math.min(1, ceilingFt / 3000),
          value: `${ceilingFt.toLocaleString()} ft`,
        },
    visibility == null
      ? null
      : {
          icon: <Eye size={16} />,
          label: "Visibility",
          marker: Math.min(1, visibility / 5),
          value: `${visibility >= 10 ? "10+" : visibility} SM`,
        },
  ].filter(Boolean);

  return (
    <div className="weather-slide-stack">
      <div className="flight-rule-banner">
        <span style={{ background: rules.color }}>{code}</span>
        <strong style={{ color: rules.color }}>{rules.label}</strong>
      </div>
      <p className="weather-context-copy">{rules.context}</p>
      {detailMeters.length ? (
        <div className={`weather-two-up weather-two-up--${detailMeters.length}`}>
          {detailMeters.map((item) => (
            <ThresholdMeter
              key={item.label}
              icon={item.icon}
              label={item.label}
              marker={item.marker}
              value={item.value}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WindSlide({ metar, localWeather }) {
  const speed = toNumber(metar?.rawWspd) ?? localWeather?.windSpeedKt ?? 0;
  const gust = toNumber(metar?.rawWgst) ?? localWeather?.windGustKt ?? null;
  const direction = metar?.rawWvrb ? null : toNumber(metar?.rawWdir) ?? localWeather?.windDirection;

  return (
    <div className="weather-slide-stack">
      <WindVector speed={speed} gust={gust} direction={direction} />
      <SegmentBars value={speed} max={40} />
      {gust != null ? <SegmentBars value={gust} max={50} tone="orange" /> : null}
      <p className="weather-context-copy">
        {direction == null
          ? "Variable wind reported near the field. Watch tower instructions for runway-specific flow."
          : `Wind from ${Math.round(direction)}° at ${Math.round(
              speed,
            )} kt${gust == null ? "" : ` with gusts to ${Math.round(gust)} kt`}.`}
      </p>
    </div>
  );
}

export function TemperatureSlide({ metar, localWeather }) {
  const temp = toNumber(metar?.rawTemp) ?? localWeather?.temperatureC;
  const dew = toNumber(metar?.rawDewp) ?? null;
  const spread = temp != null && dew != null ? Math.max(0, temp - dew) : null;

  return (
    <div className="weather-slide-stack">
      <div className="temperature-strip">
        <MetricLine
          label="Temperature"
          value={temp == null ? "-" : `${round1(temp)}°C`}
          icon={<Thermometer size={16} />}
        />
        <MetricLine
          label="Dew point"
          value={dew == null ? "-" : `${round1(dew)}°C`}
          icon={<Droplets size={16} />}
        />
        <MetricLine
          label="Spread"
          value={spread == null ? "-" : `${round1(spread)}°C`}
        />
      </div>
      <p className="weather-context-copy">
        {spread != null && spread < 3
          ? "Small temperature-dewpoint spread can support fog, haze, or low cloud development."
          : "Temperature and dewpoint are separated enough that fog risk is lower near the field."}
      </p>
    </div>
  );
}

export function PressureSlide({ metar, localWeather }) {
  const altim = metar?.rawAltim;
  const pressure = localWeather?.pressureMslHpa;

  return (
    <div className="weather-visual-layout">
      <div className="pressure-dial">
        <Gauge size={42} />
        <strong>{altim == null ? "-" : `${round2(altim)} inHg`}</strong>
      </div>
      <div className="weather-slide-stack">
        <MetricLine label="Altimeter" value={metar?.altim || "-"} />
        <MetricLine
          label="Sea-level pressure"
          value={pressure == null ? "-" : `${Math.round(pressure)} hPa`}
        />
        <MetricLine
          label="Surface pressure"
          value={
            localWeather?.surfacePressureHpa == null
              ? "-"
              : `${Math.round(localWeather.surfacePressureHpa)} hPa`
          }
        />
      </div>
    </div>
  );
}

export function LocalWeatherSlide({
  airportCode,
  localWeather,
  localWeatherError,
  localWeatherLoading,
}) {
  const condition = localWeather
    ? WEATHER_CODES[localWeather.weatherCode] || "Current conditions"
    : "Local weather pending";

  return (
    <div className="weather-visual-layout">
      <div className="local-weather-glyph">
        {localWeather?.isDay ? <Sun size={58} /> : <Moon size={58} />}
      </div>
      <div className="weather-slide-stack">
        <MetricLine
          label={`${airportCode || "Airport"} local`}
          value={
            localWeather?.temperatureC == null
              ? localWeatherLoading
                ? "Loading..."
                : "-"
              : `${round1(localWeather.temperatureC)}°C`
          }
        />
        <p className="weather-context-copy">
          {localWeatherError
            ? `Open-Meteo unavailable: ${localWeatherError}`
            : condition}
        </p>
      </div>
    </div>
  );
}

function WindVector({ speed, gust, direction }) {
  return (
    <div className="wind-vector-card">
      <div
        className="wind-vector-arrow"
        style={{ transform: `rotate(${direction ?? 0}deg)` }}
      >
        <Navigation size={21} fill="currentColor" />
      </div>
      <div>
        <span>Direction</span>
        <strong>{direction == null ? "VRB" : `${Math.round(direction)}°`}</strong>
      </div>
      <div>
        <span>Wind</span>
        <strong>{Math.round(speed)} kt</strong>
      </div>
      <div>
        <span>Gust</span>
        <strong>{gust == null ? "None" : `${Math.round(gust)} kt`}</strong>
      </div>
    </div>
  );
}

function MetricLine({ label, value, icon = null }) {
  return (
    <div className="weather-metric-line">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function ThresholdMeter({ label, value, marker, icon }) {
  return (
    <div className="threshold-meter">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      <div className="threshold-track">
        <i style={{ left: `${marker * 100}%` }} />
      </div>
    </div>
  );
}

function SegmentBars({ value, max, tone = "cyan" }) {
  const active = Math.round((Math.min(Math.max(value, 0), max) / max) * 18);
  return (
    <div className={`segment-bars segment-bars--${tone}`} aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} className={index < active ? "active" : ""} />
      ))}
    </div>
  );
}

function getCeilingFeet(metar) {
  const layer = metar?.rawClouds?.find((item) =>
    ["BKN", "OVC", "VV"].includes(item.cover),
  );
  return layer?.base != null ? Number(layer.base) : null;
}

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const round1 = (value) => Number(value).toFixed(1);
const round2 = (value) => Number(value).toFixed(2);
