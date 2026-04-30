import { onUnmounted, ref, watch } from "vue";
import {
  aircraftPositionClient,
  DEFAULT_CLOSE_RANGE_NM,
  DEFAULT_WIDE_RANGE_NM,
  DEFAULT_AIRCRAFT_POLL_MS,
} from "../services/aviationData.js";
import { parseAdsbPositionTime } from "../utils/aircraftMotion.js";
import { createAircraftIntentTracker } from "../utils/aircraftTrafficIntent.js";

const HIDDEN_POLL_GRACE_MS = 5_000;

export function useAircraftPositions(icaoRef, latRef, lonRef) {
  const aircraft = ref([]);
  const loading = ref(false);
  const lastUpdated = ref(null);
  const intentTracker = createAircraftIntentTracker();
  let timer = null;

  const poll = async () => {
    const lat = latRef?.value;
    const lon = lonRef?.value;
    if (!lat || !lon) return;

    loading.value = true;
    try {
      // Fetch two ranges in parallel:
      //   Wide  (20 nm) — everything in the area
      //   Close ( 3 nm) — airport immediate vicinity, catches ground/taxi aircraft
      const [wideJson, closeJson] = await Promise.all([
        aircraftPositionClient.fetchNearbyAircraft({
          lat,
          lon,
          distNm: DEFAULT_WIDE_RANGE_NM,
        }),
        aircraftPositionClient.fetchNearbyAircraft({
          lat,
          lon,
          distNm: DEFAULT_CLOSE_RANGE_NM,
        }),
      ]);
      const receiveTime = Date.now();

      const parseAircraft = (a) => ({
        icao24: a.hex || "",
        callsign: (a.flight || a.r || "").trim(),
        lat: a.lat,
        lon: a.lon,
        altitude: a.alt_baro ?? a.alt_geom ?? null,
        baroRate: a.baro_rate ?? null,
        onGround: a.gnd ?? false,
        velocity: a.gs ?? null,
        track: a.track ?? 0,
        positionTime: parseAdsbPositionTime(a, wideJson.now, receiveTime),
        receiveTime,
      });

      // Merge by icao24 — prefer the close-range snapshot when both exist
      const seen = new Map();
      const addSnapshots = (list) => {
        for (const a of list || []) {
          if (a.lat == null || a.lon == null) continue;
          const key = a.hex || "";
          if (key) seen.set(key, parseAircraft(a));
        }
      };
      // Add close-range first so they take priority on key collision
      addSnapshots(closeJson.ac);
      addSnapshots(wideJson.ac);

      const snapshots = [...seen.values()];
      aircraft.value = intentTracker.update(
        snapshots,
        { lat, lon },
        receiveTime,
      );
      lastUpdated.value = new Date();
    } catch (e) {
      console.warn("ADS-B fetch failed:", e.message);
    } finally {
      loading.value = false;
    }
  };

  const start = () => {
    stop();
    intentTracker.clear();
    poll();
    timer = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    intentTracker.clear();
    aircraft.value = [];
  };

  let wasActive = false;
  let hiddenSince = 0;

  const handleVisibility = () => {
    if (document.hidden) {
      hiddenSince = Date.now();
      stop();
      return;
    }

    // Tab just became visible again.
    // If we were hidden for more than the grace period, force an
    // immediate full reload to avoid stale extrapolated positions.
    const hiddenDuration = Date.now() - hiddenSince;
    hiddenSince = 0;

    if (wasActive && hiddenDuration > HIDDEN_POLL_GRACE_MS) {
      // Hard restart: clear all state and re-poll immediately
      aircraft.value = [];
      intentTracker.clear();
      start();
    } else if (wasActive) {
      // Brief hide — just resume polling gently
      poll();
      timer = setInterval(poll, DEFAULT_AIRCRAFT_POLL_MS);
    }
  };

  watch(
    [icaoRef, latRef, lonRef],
    ([icao, lat, lon]) => {
      if (icao && lat && lon) {
        if (!wasActive) {
          wasActive = true;
          start();
        }
      } else {
        wasActive = false;
        stop();
      }
    },
    { immediate: true },
  );

  document.addEventListener("visibilitychange", handleVisibility);
  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibility);
    stop();
  });

  return { aircraft, loading, lastUpdated };
}
