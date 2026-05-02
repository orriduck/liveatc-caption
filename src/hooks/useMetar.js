"use client";

import { useEffect, useState } from "react";
import { metarClient } from "../services/aviationData.js";

export function useMetar(icao) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMetar = async () => {
      if (!icao) return;
      setLoading(true);
      setError(null);
      try {
        const json = await metarClient.fetchMetar(icao);
        if (cancelled) return;
        const m = Array.isArray(json) ? json[0] : json;
        if (!m) {
          setRaw("");
          setParsed(null);
          return;
        }

        setRaw(m.rawOb || m.rawMETAR || "");
        setParsed({
          wind: formatWind(m),
          vis: m.visib ? `${m.visib} SM` : "-",
          temp: m.temp != null ? `${m.temp}deg C` : "-",
          dew: m.dewp != null ? `${m.dewp}deg C` : "-",
          altim: m.altim ? `${m.altim} inHg` : "-",
          ceiling: formatCeiling(m),
          wxString: m.wxString || "",
          flightCategory: m.flightCategory || m.fltCat || "",
          obsTime: m.obsTime || "",
          rawTemp: m.temp ?? null,
          rawDewp: m.dewp ?? null,
          rawVisib: m.visib != null ? Number(m.visib) : null,
          rawAltim: m.altim != null ? Number(m.altim) : null,
          rawWspd: m.wspd ?? null,
          rawWgst: m.wgst ?? null,
          rawClouds: Array.isArray(m.clouds) ? m.clouds : [],
          rawWdir:
            m.wdir === "VRB" ? null : m.wdir != null ? Number(m.wdir) : null,
          rawWvrb: m.wdir === "VRB",
        });
      } catch (e) {
        if (!cancelled) {
          console.warn("METAR fetch failed:", e.message);
          setError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMetar();
    return () => {
      cancelled = true;
    };
  }, [icao]);

  return { raw, parsed, loading, error };
}

function formatWind(m) {
  if (!m.wdir && !m.wspd) return "-";
  const dir =
    m.wdir === "VRB" ? "VRB" : `${String(m.wdir ?? 0).padStart(3, "0")}deg`;
  const spd = `${m.wspd ?? 0} kt`;
  return m.wgst ? `${dir} / ${spd} G${m.wgst}kt` : `${dir} / ${spd}`;
}

export function formatCeiling(m) {
  const layers = m.clouds || [];
  const ceiling = layers.find((l) => ["BKN", "OVC", "VV"].includes(l.cover));
  if (!ceiling) return "CLR";
  const ft =
    ceiling.base != null ? `${Number(ceiling.base).toLocaleString()} ft` : "?";
  return `${ceiling.cover} ${ft}`;
}
