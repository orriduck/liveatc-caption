import { toFiniteNumber } from "./math.js";

/** @typedef {"Ascending" | "Descending" | "Flat"} VerticalState */

export const ASCENDING = "Ascending";
export const DESCENDING = "Descending";
export const FLAT = "Flat";

// Hysteresis window — prevents flicker when rate oscillates around zero.
const HYSTERESIS_ENTER_FPM = 100;
const HYSTERESIS_EXIT_FPM = 40;

// Minimum altitude delta between current and MCP/FMS selected altitude
// for the intent signal to override a near-zero vertical rate.
const INTENT_MIN_DELTA_FT = 250;

// Minimum altitude change over time to infer climb/descent when the
// instantaneous rate is 0 (common with many Mode‑S transponders).
const ALTITUDE_SLOPE_THRESHOLD_FPM = 60;
const ALTITUDE_SLOPE_MIN_PERIOD_MS = 6_000; // need ≥6s of data
const ALTITUDE_SLOPE_MIN_DELTA_FT = 60; // need ≥60 ft change

/**
 * Classify a single aircraft's vertical movement.
 *
 * Uses `geom_rate` (GPS/WGS84) as the PRIMARY rate source because it is
 * immune to QNH noise. Falls back to `baro_rate`.
 *
 * When the instantaneous rate sits inside the hysteresis dead-zone the
 * function checks two fallbacks:
 *
 * 1. **Intent** — if the autopilot/FMS target altitude differs meaningfully
 *    from the current barometric altitude, trust the direction even during a
 *    momentary level-off.
 * 2. **Altitude slope over time** — if an aircraft has consistently gained
 *    or lost altitude over several poll cycles (>6 s, >60 ft delta), use
 *    that trend as a slow-but-correct classifier. This covers aircraft
 *    whose transponders report `baro_rate = 0` during shallow climbs or
 *    descents.
 *
 * @param {object} ac       Aircraft object with `geomRate`, `baroRate`,
 *                          `altitude`, `navAltitudeMcp`, `onGround`,
 *                          `receiveTime`, `icao24`.
 * @param {object|null} prev Optional previous record for the same aircraft
 *                          from the last poll. Must have `altitude` and
 *                          `receiveTime`.
 * @returns {VerticalState}
 */
export function determineVerticalState(ac, prev = null) {
  if (ac?.onGround) return FLAT;

  // Primary rate: GPS geom_rate, fallback baro_rate
  const rate = toFiniteNumber(ac?.geomRate) ?? toFiniteNumber(ac?.baroRate);
  if (rate == null) {
    return classifyAltitudeSlope(ac, prev);
  }

  // Strong unambiguous rate — return immediately
  if (rate > HYSTERESIS_ENTER_FPM) return ASCENDING;
  if (rate < -HYSTERESIS_ENTER_FPM) return DESCENDING;

  // Inside hysteresis dead-zone: check intent
  const altitude = toFiniteNumber(ac?.altitude);
  const mcp = toFiniteNumber(ac?.navAltitudeMcp);
  if (altitude != null && mcp != null) {
    const delta = mcp - altitude;
    if (Math.abs(delta) >= INTENT_MIN_DELTA_FT) {
      if (delta > 0 && rate > -HYSTERESIS_EXIT_FPM) return ASCENDING;
      if (delta < 0 && rate < HYSTERESIS_EXIT_FPM) return DESCENDING;
    }
  }

  // Rate is ambiguous — check slope
  return classifyAltitudeSlope(ac, prev);
}

function classifyAltitudeSlope(ac, prev) {
  const currentAlt = toFiniteNumber(ac?.altitude);
  const currentTime = toFiniteNumber(ac?.receiveTime);
  const prevAlt = toFiniteNumber(prev?.altitude);
  const prevTime = toFiniteNumber(prev?.receiveTime);

  if (
    currentAlt == null ||
    currentTime == null ||
    prevAlt == null ||
    prevTime == null
  ) {
    return FLAT;
  }

  const periodMs = currentTime - prevTime;
  if (periodMs <= 0 || periodMs < ALTITUDE_SLOPE_MIN_PERIOD_MS) return FLAT;

  const deltaFt = currentAlt - prevAlt;
  if (Math.abs(deltaFt) < ALTITUDE_SLOPE_MIN_DELTA_FT) return FLAT;

  const slopeFpm = Math.abs(deltaFt) / (periodMs / 60_000);
  if (slopeFpm < ALTITUDE_SLOPE_THRESHOLD_FPM) return FLAT;

  return deltaFt > 0 ? ASCENDING : DESCENDING;
}

/**
 * Constrain a vertical-state classification using flight-route knowledge.
 *
 * When a flight route is known, the phase of flight is bounded:
 * - If the **destination** matches the current airport, the aircraft
 *   *must* be arriving here. It can only be Descending or Flat — never
 *   Ascending.
 * - If the **origin** matches the current airport, the aircraft
 *   *must* be departing from here. It can only be Ascending or Flat —
 *   never Descending.
 *
 * This takes priority over the sensor-derived classification because the
 * route table is the ground truth for intent. It overrides only the
 * physically-impossible direction.
 *
 * @param {"Ascending" | "Descending" | "Flat"} state
 * @param {object | null} route   Flight route with `origin.icao`, `destination.icao`
 * @param {string} currentIcao    ICAO of the currently-viewed airport
 * @returns {"Ascending" | "Descending" | "Flat"}
 */
export function constrainVerticalByRoute(state, route, currentIcao) {
  if (!route || !currentIcao) return state;

  const originIcao = (route.origin?.icao || "").toUpperCase();
  const destIcao = (route.destination?.icao || "").toUpperCase();
  const icao = currentIcao.toUpperCase();

  if (destIcao === icao && state === ASCENDING) return FLAT;
  if (originIcao === icao && state === DESCENDING) return FLAT;

  return state;
}
