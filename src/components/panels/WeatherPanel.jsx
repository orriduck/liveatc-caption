"use client";

import NumberFlow from "@number-flow/react";
import { useMemo, useState } from "react";

export default function WeatherPanel({
  metar,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
}) {
  const [activeWeatherView, setActiveWeatherView] = useState("parsed");
  const weatherSummary = useMemo(() => {
    if (!metar) return "Weather report pending";
    const category = metar.flightCategory || "Observed";
    const wind = metar.wind && metar.wind !== "-" ? metar.wind : "wind unavailable";
    return `${category} · ${wind}`;
  }, [metar]);
  const visInfo = useMemo(() => {
    const match = metar?.vis?.match(/^(\d+(?:\.\d+)?)(\+)?\s*SM$/);
    if (!match) return null;
    return { value: Number(match[1]), plus: Boolean(match[2]) };
  }, [metar]);

  return (
    <section className="glass-panel weather-instrument-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">METAR / Weather</div>
          <h2>
            {activeWeatherView === "parsed"
              ? weatherSummary
              : "Observation string"}
          </h2>
        </div>
        <span className="panel-pill">{formatObsTime(metar?.obsTime)}</span>
      </div>

      <div className="weather-view-frame">
        {activeWeatherView === "parsed" ? (
          <dl className="weather-readout">
            <Readout label="Wind" value={metar?.wind || "-"} />
            <div>
              <dt>Visibility</dt>
              <dd>
                {visInfo ? (
                  <NumberFlow
                    value={visInfo.value}
                    suffix={visInfo.plus ? "+ SM" : " SM"}
                  />
                ) : (
                  metar?.vis || "-"
                )}
              </dd>
            </div>
            <Readout label="Ceiling" value={metar?.ceiling || "-"} />
            <Readout
              label="Temp / Dew"
              value={metar ? `${metar.temp} / ${metar.dew}` : "-"}
            />
            <Readout label="Altimeter" value={metar?.altim || "-"} />
            <Readout label="Weather" value={metar?.wxString || "None reported"} />
          </dl>
        ) : (
          <div className="metar-code">
            {metarRaw || (metarLoading ? "Loading METAR..." : "No METAR available.")}
          </div>
        )}
      </div>

      {metarError ? <div className="panel-error">{metarError}</div> : null}

      <div className="weather-view-dots" role="tablist" aria-label="Weather card view">
        <button
          type="button"
          role="tab"
          aria-label="Parsed weather"
          aria-selected={activeWeatherView === "parsed"}
          className={activeWeatherView === "parsed" ? "active" : ""}
          onClick={() => setActiveWeatherView("parsed")}
        />
        <button
          type="button"
          role="tab"
          aria-label="Raw METAR"
          aria-selected={activeWeatherView === "raw"}
          className={activeWeatherView === "raw" ? "active" : ""}
          onClick={() => setActiveWeatherView("raw")}
        />
      </div>
    </section>
  );
}

function Readout({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatObsTime(value) {
  if (!value) return "latest";
  const date = new Date(Number(value) < 10_000_000_000 ? Number(value) * 1000 : value);
  if (Number.isNaN(date.getTime())) return "latest";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}
