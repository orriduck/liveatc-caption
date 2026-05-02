import { toFiniteNumber } from "./math.js";

/** @typedef {"Ascending" | "Descending" | "Flat"} VerticalState */

export const ASCENDING = "Ascending";
export const DESCENDING = "Descending";
export const FLAT = "Flat";

// Hysteresis window — prevents flicker when rate oscillates around zero.
const HYSTERESIS_ENTER_FPM = 120;
const HYSTERESIS_EXIT_FPM = 50;

// Minimum altitude delta between current and MCP/FMS selected altitude
// for the intent signal to override a near-zero vertical rate.
const INTENT_MIN_DELTA_FT = 250;

/**
 * Classify a single aircraft's vertical movement.
 *
 * Uses `geom_rate` (GPS/WGS84) as the PRIMARY rate source because it is immune
 * to QNH noise. Falls back to `baro_rate` when `geom_rate` is missing.
 *
 * When the instantaneous rate sits inside the hysteresis dead-zone this
 * function checks *intent* — if the autopilot/FMS has a target altitude that
 * differs meaningfully from the current barometric altitude we trust the
 * direction of the intended flight phase even during a momentary level-off.
 *
 * @param {object} ac  Aircraft object containing `geomRate`, `baroRate`,
 *                     `altitude` (baro), `navAltitudeMcp` (FMS sel alt),
 *                     `onGround`.
 * @returns {VerticalState}
 */
export function determineVerticalState(ac) {
  if (ac?.onGround) return FLAT;

  // Primary rate: GPS geom_rate, fallback baro_rate
  const rate = toFiniteNumber(ac?.geomRate) ?? toFiniteNumber(ac?.baroRate);
  if (rate == null) return FLAT;

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

  return FLAT;
}
