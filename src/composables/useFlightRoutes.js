import { computed, onUnmounted, shallowRef, watch } from "vue";

import { flightRouteClient } from "../services/aviationData.js";

const HIT_CACHE_MS = 6 * 60 * 60 * 1000;
const MISS_CACHE_MS = 2 * 60 * 60 * 1000; // 2h — was 30min; longer cache for unknowns avoids repeat 429s
const MAX_LOOKUPS_PER_PASS = 6;
const RATE_LIMITED_GRACE_MS = 60_000; // skip lookups for 1min after any 429 error

const routeCache = new Map();
const inFlight = new Set();

const normalizeCallsign = (callsign) =>
  String(callsign || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const isLookupCandidate = (callsign) => /^[A-Z0-9]{2,8}$/.test(callsign);

const getFreshCacheEntry = (callsign, now = Date.now()) => {
  const cached = routeCache.get(callsign);
  if (!cached) return null;

  const maxAge = cached.route ? HIT_CACHE_MS : MISS_CACHE_MS;
  if (now - cached.time <= maxAge) return cached;

  routeCache.delete(callsign);
  return null;
};

export function useFlightRoutes(aircraftRef) {
  const version = shallowRef(0);
  const loadingCount = shallowRef(0);
  let disposed = false;

  const bump = () => {
    version.value += 1;
  };

  const lookup = async (callsign) => {
    inFlight.add(callsign);
    loadingCount.value = inFlight.size;
    try {
      const route = await flightRouteClient.fetchFlightRoute(callsign);
      routeCache.set(callsign, {
        route,
        time: Date.now(),
      });
    } catch (error) {
      console.warn(
        `Flight route lookup failed for ${callsign}:`,
        error.message,
      );
    } finally {
      inFlight.delete(callsign);
      loadingCount.value = inFlight.size;
      if (!disposed) bump();
    }
  };

  watch(
    aircraftRef,
    (aircraft = []) => {
      const now = Date.now();
      const callsigns = [
        ...new Set(
          aircraft
            .map((item) => normalizeCallsign(item.callsign))
            .filter(isLookupCandidate),
        ),
      ];

      const pending = callsigns
        .filter(
          (callsign) =>
            !getFreshCacheEntry(callsign, now) && !inFlight.has(callsign),
        )
        .slice(0, MAX_LOOKUPS_PER_PASS);

      pending.forEach(lookup);
      bump();
    },
    { immediate: true },
  );

  const routesByCallsign = computed(() => {
    version.value;
    const routes = {};
    const now = Date.now();

    for (const item of aircraftRef.value || []) {
      const callsign = normalizeCallsign(item.callsign);
      const cached = getFreshCacheEntry(callsign, now);
      if (cached?.route) routes[callsign] = cached.route;
    }

    return routes;
  });

  onUnmounted(() => {
    disposed = true;
  });

  return {
    routesByCallsign,
    loadingCount,
  };
}
