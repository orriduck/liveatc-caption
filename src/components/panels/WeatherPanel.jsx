"use client";

import { useMemo, useRef, useState } from "react";
import { useLocalWeather } from "../../hooks/useLocalWeather.js";
import {
  FlightRulesSlide,
  LocalWeatherSlide,
  MetarSlide,
  PressureSlide,
  TemperatureSlide,
  WindSlide,
} from "../weather/WeatherSlides";

export default function WeatherPanel({
  metar,
  metarRaw = "",
  metarLoading = false,
  metarError = null,
  airportLat = 0,
  airportLon = 0,
  airportCode = "",
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const {
    weather: localWeather,
    loading: localWeatherLoading,
    error: localWeatherError,
  } = useLocalWeather(airportLat, airportLon);

  const slides = useMemo(
    () => [
      {
        id: "metar",
        label: "METAR",
        title: "METAR report",
        eyebrow: "METAR / Weather",
        content: (
          <MetarSlide
            metarRaw={metarRaw}
            metarLoading={metarLoading}
            metarError={metarError}
          />
        ),
      },
      {
        id: "rules",
        label: "Rules",
        title: "Flight rules",
        eyebrow: "Operational context",
        content: <FlightRulesSlide metar={metar} />,
      },
      {
        id: "wind",
        label: "Wind",
        title: "Wind speed",
        eyebrow: "Surface flow",
        content: <WindSlide metar={metar} localWeather={localWeather} />,
      },
      {
        id: "temp",
        label: "Temp",
        title: "Temp / dew",
        eyebrow: "Thermal spread",
        content: <TemperatureSlide metar={metar} localWeather={localWeather} />,
      },
      {
        id: "pressure",
        label: "Pressure",
        title: "Pressure",
        eyebrow: "Altimeter",
        content: <PressureSlide metar={metar} localWeather={localWeather} />,
      },
      {
        id: "local",
        label: "Local",
        title: "Local weather",
        eyebrow: "Open-Meteo",
        content: (
          <LocalWeatherSlide
            airportCode={airportCode}
            localWeather={localWeather}
            localWeatherError={localWeatherError}
            localWeatherLoading={localWeatherLoading}
          />
        ),
      },
    ],
    [
      airportCode,
      localWeather,
      localWeatherError,
      localWeatherLoading,
      metar,
      metarError,
      metarLoading,
      metarRaw,
    ],
  );

  const activeSlide = slides[activeIndex] || slides[0];

  const scrollToSlide = (index) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: track.clientWidth * index,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setActiveIndex(Math.min(Math.max(nextIndex, 0), slides.length - 1));
  };

  return (
    <section className="glass-panel weather-instrument-panel weather-carousel-panel">
      <div className="panel-heading weather-carousel-heading">
        <div>
          <div className="panel-kicker">{activeSlide.eyebrow}</div>
          <h2>{activeSlide.title}</h2>
        </div>
        <span className="panel-pill">{formatObsTime(metar?.obsTime)}</span>
      </div>

      <div
        ref={trackRef}
        className="weather-carousel-track"
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            aria-hidden={activeIndex !== index}
            className="weather-carousel-slide"
          >
            {slide.content}
          </article>
        ))}
      </div>

      <div
        className="weather-view-dots weather-carousel-dots"
        role="tablist"
        aria-label="Weather card view"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-label={slide.label}
            aria-selected={activeIndex === index}
            className={activeIndex === index ? "active" : ""}
            onClick={() => scrollToSlide(index)}
          />
        ))}
      </div>
    </section>
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
