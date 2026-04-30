"use client";

import { useEffect, useMemo, useState } from "react";
import { flightRouteClient } from "../services/aviationData.js";

const HIT_CACHE_MS = 6 * 60 * 60 * 1000;
const MISS_CACHE_MS = 2 * 60 * 60 * 1000;
const MAX_LOOKUPS_PER_PASS = 6;

const routeCache = new Map();
const inFlight = new Set();

const normalizeCallsign = (callsign) =>
  String(callsign || "").trim().toUpperCase().replace(/\s+/g, "");

const isLookupCandidate = (callsign) => /^[A-Z0-9]{2,8}$/.test(callsign);

const getFreshCacheEntry = (callsign, now = Date.now()) => {
  const cached = routeCache.get(callsign);
  if (!cached) return null;
  const maxAge = cached.route ? HIT_CACHE_MS : MISS_CACHE_MS;
  if (now - cached.time <= maxAge) return cached;
  routeCache.delete(callsign);
  return null;
};

export function useFlightRoutes(aircraft) {
  const [version, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);

  useEffect(() => {
    let disposed = false;
    const bump = () => setVersion((value) => value + 1);
    const lookup = async (callsign) => {
      inFlight.add(callsign);
      setLoadingCount(inFlight.size);
      try {
        const route = await flightRouteClient.fetchFlightRoute(callsign);
        routeCache.set(callsign, { route, time: Date.now() });
      } catch (error) {
        console.warn(`Flight route lookup failed for ${callsign}:`, error.message);
        routeCache.set(callsign, { route: null, time: Date.now() });
      } finally {
        inFlight.delete(callsign);
        if (!disposed) {
          setLoadingCount(inFlight.size);
          bump();
        }
      }
    };

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

    pending.forEach((callsign, index) => {
      if (index === 0) lookup(callsign);
      else requestAnimationFrame(() => lookup(callsign));
    });
    bump();

    return () => {
      disposed = true;
    };
  }, [aircraft]);

  const routesByCallsign = useMemo(() => {
    version;
    const routes = {};
    const now = Date.now();
    for (const item of aircraft || []) {
      const callsign = normalizeCallsign(item.callsign);
      const cached = getFreshCacheEntry(callsign, now);
      if (cached?.route) routes[callsign] = cached.route;
    }
    return routes;
  }, [aircraft, version]);

  return { routesByCallsign, loadingCount };
}
