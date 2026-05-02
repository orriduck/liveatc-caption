"use client";

import { useEffect, useState } from "react";
import { localWeatherClient } from "../services/aviationData.js";

export function useLocalWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      if (!lat || !lon) {
        setWeather(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await localWeatherClient.fetchCurrentWeather({ lat, lon });
        if (cancelled) return;
        setWeather(normalizeLocalWeather(payload));
      } catch (e) {
        if (!cancelled) {
          console.warn("Local weather fetch failed:", e.message);
          setError(e.message);
          setWeather(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return { weather, loading, error };
}

function normalizeLocalWeather(payload) {
  const current = payload?.current;
  if (!current) return null;

  return {
    time: current.time || "",
    temperatureC: toFinite(current.temperature_2m),
    apparentTemperatureC: toFinite(current.apparent_temperature),
    humidity: toFinite(current.relative_humidity_2m),
    isDay: current.is_day === 1,
    precipitationIn: toFinite(current.precipitation),
    rainIn: toFinite(current.rain),
    showersIn: toFinite(current.showers),
    snowfallIn: toFinite(current.snowfall),
    weatherCode: toFinite(current.weather_code),
    cloudCover: toFinite(current.cloud_cover),
    pressureMslHpa: toFinite(current.pressure_msl),
    surfacePressureHpa: toFinite(current.surface_pressure),
    windSpeedKt: toFinite(current.wind_speed_10m),
    windDirection: toFinite(current.wind_direction_10m),
    windGustKt: toFinite(current.wind_gusts_10m),
    timezone: payload.timezone || "",
    source: "Open-Meteo",
  };
}

const toFinite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
