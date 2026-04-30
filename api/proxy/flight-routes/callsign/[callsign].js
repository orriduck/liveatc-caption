/**
 * Vercel serverless function — FlightAware route scraper
 *
 * GET /api/proxy/flight-routes/callsign/[callsign]
 *
 * Fetches the FlightAware live flight page for a given callsign and extracts
 * origin/destination airport codes from the embedded ad-targeting metadata.
 *
 * Returns JSON matching the adsbdb format so the frontend client needs no
 * changes beyond pointing at a different proxy path.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLIGHTAWARE_BASE = "https://www.flightaware.com/live/flight";

const USER_AGENT =
  "ADSBao/0.4 (+https://github.com/orriduck/ADSBao) FlightAware-scraper/1.0";

// Regex to extract ad-targeting key/value pairs from the FlightAware HTML.
// The page includes calls like:
//   .setTargeting('origin', 'KJFK').setTargeting('origin_IATA', 'JFK')
//   .setTargeting('destination', 'OMDB').setTargeting('destination_IATA', 'DXB')
const TARGETING_RE = /\.setTargeting\('(\w+)',\s*'([^']*)'\)/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the FlightAware page and extract origin/destination airport codes.
 *
 * @param {string} callsign - e.g. "UAE202"
 * @returns {Promise<{origin: {icao:string,iata:string}, destination: {icao:string,iata:string}}|null>}
 */
async function scrapeFlightAware(callsign) {
  const url = `${FLIGHTAWARE_BASE}/${encodeURIComponent(callsign)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      // Vercel serverless functions have a 10s default timeout; we set slightly less
      signal: AbortSignal.timeout(9_000),
    });
  } catch (err) {
    console.warn(`[flight-scraper] fetch failed for ${callsign}:`, err.message);
    return null;
  }

  if (!response.ok) {
    console.warn(
      `[flight-scraper] HTTP ${response.status} for ${callsign}`,
    );
    return null;
  }

  const html = await response.text();

  // Parse targeting key-values
  const targeting = {};
  let match;
  while ((match = TARGETING_RE.exec(html)) !== null) {
    targeting[match[1]] = match[2];
  }
  TARGETING_RE.lastIndex = 0; // reset for safety

  const originIcao = targeting.origin || "";
  const originIata = targeting.origin_IATA || "";
  const destIcao = targeting.destination || "";
  const destIata = targeting.destination_IATA || "";

  // We need at least one of the ICAO codes to produce a valid route
  if (!originIcao && !destIcao) {
    return null;
  }

  return {
    origin: { icao: originIcao, iata: originIata },
    destination: { icao: destIcao, iata: destIata },
  };
}

// ---------------------------------------------------------------------------
// Build an adsbdb-compatible response shape
// ---------------------------------------------------------------------------

/**
 * Convert scraped data into the same JSON shape the frontend expects from
 * adsbdb's normalizeFlightRoute().
 */
function buildResponse(callsign, scraped) {
  if (!scraped) {
    return { response: null };
  }

  return {
    response: {
      flightroute: {
        callsign: callsign.toUpperCase(),
        origin: {
          icao_code: scraped.origin.icao,
          iata_code: scraped.origin.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        destination: {
          icao_code: scraped.destination.icao,
          iata_code: scraped.destination.iata,
          name: "",
          municipality: "",
          country_name: "",
          latitude: 0,
          longitude: 0,
        },
        airline: {
          name: "",
          icao: callsign.slice(0, 3).toUpperCase(),
          iata: "",
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Vercel handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // CORS headers — same as adsb.lol
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawCallsign = req.query.callsign || "";
  const callsign = rawCallsign.trim().toUpperCase().replace(/\s+/g, "");

  if (!callsign || callsign.length < 3 || !/^[A-Z][A-Z0-9]{2,7}$/.test(callsign)) {
    res.status(400).json({ error: "Invalid callsign" });
    return;
  }

  try {
    const scraped = await scrapeFlightAware(callsign);
    const body = buildResponse(callsign, scraped);

    if (!scraped) {
      // Flight not found / no route data — return 404 so frontend falls back
      res.status(404).json(body);
      return;
    }

    res.status(200).json(body);
  } catch (err) {
    console.error(`[flight-scraper] error for ${callsign}:`, err);
    res.status(500).json({ error: "Internal error" });
  }
}
