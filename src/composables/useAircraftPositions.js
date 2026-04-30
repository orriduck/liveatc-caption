import { onUnmounted, ref, watch } from "vue";
import {
  aircraftPositionClient,
  DEFAULT_AIRCRAFT_DIST_NM,
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
      const json = await aircraftPositionClient.fetchNearbyAircraft({
        lat,
        lon,
        distNm: DEFAULT_AIRCRAFT_DIST_NM,
      });
      const receiveTime = Date.now();

      // adsb.lol response: { ac: [{ hex, flight, lat, lon, alt_baro, gs, track, gnd, ... }] }
      const snapshots = (json.ac || [])
        .filter((a) => a.lat != null && a.lon != null)
        .map((a) => ({
          icao24: a.hex || "",
          callsign: (a.flight || a.r || "").trim(),
          lat: a.lat,
          lon: a.lon,
          altitude: a.alt_baro ?? a.alt_geom ?? null,
          baroRate: a.baro_rate ?? null,
          onGround: a.gnd ?? false,
          velocity: a.gs ?? null,
          track: a.track ?? 0,
          positionTime: parseAdsbPositionTime(a, json.now, receiveTime),
          receiveTime,
        }));
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
