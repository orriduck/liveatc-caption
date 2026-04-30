"use client";

import { Gauge, SlidersHorizontal, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ZOOM_AIRPORT,
  ZOOM_APPROACH,
  ZOOM_DETAIL,
} from "../../utils/airportMapDisplay.js";
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
  applyThemePreference,
  initThemePreference,
  nextTheme,
  writeStoredTheme,
} from "../../utils/theme.js";
import AirportViewIcon from "./icons/AirportViewIcon";
import ApproachViewIcon from "./icons/ApproachViewIcon";
import DetailViewIcon from "./icons/DetailViewIcon";
import FocusWaveIcon from "./icons/FocusWaveIcon";
import ThemeModeIcon from "./icons/ThemeModeIcon";

const VIDEO_ID = "JDQiaRYmTGk";

const zoomOptions = [
  { value: ZOOM_APPROACH, title: "Approaching view", Icon: ApproachViewIcon },
  { value: ZOOM_AIRPORT, title: "Airport view", Icon: AirportViewIcon },
  { value: ZOOM_DETAIL, title: "Detail view", Icon: DetailViewIcon },
];

export default function MapControlBar({
  activeZoom = ZOOM_AIRPORT,
  showMapLabels = true,
  showTelemetry = true,
  onZoom,
  onToggleMapLabels,
  onToggleTelemetry,
}) {
  const controlZone = useRef(null);
  const playerEl = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEME_SYSTEM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const player = useRef(null);
  const mediaQueryList = useRef(null);

  const currentZoomOption = useMemo(
    () => zoomOptions.find((option) => option.value === activeZoom) || zoomOptions[1],
    [activeZoom],
  );

  const themeTitle = useMemo(() => {
    if (currentTheme === THEME_LIGHT) return "Theme: Light (click to switch)";
    if (currentTheme === THEME_DARK) return "Theme: Dark (click to switch)";
    return "Theme: System (click to switch)";
  }, [currentTheme]);

  useEffect(() => {
    const closeDrawer = () => setDrawerOpen(false);
    const handlePointerDown = (event) => {
      if (!drawerOpen || controlZone.current?.contains(event.target)) return;
      closeDrawer();
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    mediaQueryList.current = window.matchMedia("(prefers-color-scheme: dark)");
    setCurrentTheme(
      initThemePreference({ mediaQueryList: mediaQueryList.current }).preference,
    );
    const listener = () => {
      if (currentTheme === THEME_SYSTEM) {
        applyThemePreference({
          theme: THEME_SYSTEM,
          mediaQueryList: mediaQueryList.current,
        });
      }
    };
    mediaQueryList.current.addEventListener("change", listener);
    return () => mediaQueryList.current?.removeEventListener("change", listener);
  }, [currentTheme]);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !playerEl.current) return;
      player.current = new window.YT.Player(playerEl.current, {
        height: 1,
        width: 1,
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: VIDEO_ID,
          controls: 0,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady() {
            setAudioReady(true);
          },
          onStateChange(e) {
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  const cycleTheme = () => {
    const next = nextTheme(currentTheme);
    setCurrentTheme(next);
    writeStoredTheme(next);
    applyThemePreference({ theme: next, mediaQueryList: mediaQueryList.current });
  };

  const selectZoom = (zoom) => {
    onZoom?.(zoom);
    setDrawerOpen(false);
  };

  const cycleZoom = () => {
    const currentIndex = zoomOptions.findIndex((option) => option.value === activeZoom);
    const nextIndex = (currentIndex + 1) % zoomOptions.length;
    onZoom?.(zoomOptions[nextIndex].value);
  };

  const toggleAudio = () => {
    if (!player.current || !audioReady) return;
    if (playing) player.current.pauseVideo();
    else player.current.playVideo();
  };

  const CurrentIcon = currentZoomOption.Icon;

  return (
    <>
      <div ref={playerEl} className="yt-sink" />
      <div ref={controlZone} className="map-ctrl-zone">
        <div
          id="map-action-drawer"
          className={`map-action-drawer ${drawerOpen ? "open" : ""}`}
          aria-hidden={!drawerOpen}
        >
          {zoomOptions.map(({ value, title, Icon }) => (
            <button
              key={value}
              className={`ctrl-btn drawer-btn ${activeZoom === value ? "active" : ""}`}
              title={title}
              onClick={() => selectZoom(value)}
              type="button"
            >
              <Icon />
            </button>
          ))}
        </div>

        <div className="map-ctrl-bar">
          <button
            className="ctrl-btn ctrl-view active"
            title={`${currentZoomOption.title} (click to cycle)`}
            onClick={cycleZoom}
            type="button"
          >
            <CurrentIcon />
          </button>

          <div className="ctrl-sep" />

          <button
            className={`ctrl-btn ctrl-audio ${playing ? "playing" : ""} ${
              !audioReady ? "loading" : ""
            }`}
            aria-pressed={playing}
            title={playing ? "Pause Focus mode" : "Start Focus mode"}
            onClick={toggleAudio}
            type="button"
          >
            <FocusWaveIcon />
          </button>

          <button className="ctrl-btn ctrl-theme" title={themeTitle} onClick={cycleTheme} type="button">
            <ThemeModeIcon theme={currentTheme} />
          </button>

          <button
            className={`ctrl-btn ${showMapLabels ? "active" : ""}`}
            aria-pressed={showMapLabels}
            title={showMapLabels ? "Hide map labels" : "Show map labels"}
            onClick={onToggleMapLabels}
            type="button"
          >
            <Type />
          </button>

          <button
            className={`ctrl-btn ${showTelemetry ? "active" : ""}`}
            aria-pressed={showTelemetry}
            title={showTelemetry ? "Hide speed/altitude" : "Show speed/altitude"}
            onClick={onToggleTelemetry}
            type="button"
          >
            <Gauge />
          </button>

          <button
            className={`ctrl-btn ctrl-more ${drawerOpen ? "active" : ""}`}
            aria-expanded={drawerOpen}
            aria-controls="map-action-drawer"
            title="Map controls"
            onClick={() => setDrawerOpen((value) => !value)}
            type="button"
          >
            <SlidersHorizontal />
          </button>
        </div>
      </div>
    </>
  );
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}
