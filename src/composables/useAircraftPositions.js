import { ref, watch, onUnmounted } from "vue";
import {
  aircraftPositionClient,
  DEFAULT_AIRCRAFT_DIST_NM,
  DEFAULT_AIRCRAFT_POLL_MS,
} from "../services/aviationData.js";
import { parseAdsbPositionTime } from "../utils/aircraftMotion.js";
import { createAircraftIntentTracker } from "../utils/aircraftTrafficIntent.js";

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
  onUnmounted(stop);

  return { aircraft, loading, lastUpdated };
}
