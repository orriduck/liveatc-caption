import asyncio

import httpx
from fastapi import APIRouter, HTTPException, Query

from api.router.airport_catalog import catalog_count, search_ourairports

router = APIRouter(prefix="/search", tags=["search"])

_AIRPORTS_API = "https://airportsapi.com/api/airports"
_TIMEOUT = 10.0
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/vnd.api+json, application/json;q=0.9, */*;q=0.8",
}
_FEATURED_CODES = [
    "KLAX",
    "KJFK",
    "KORD",
    "KATL",
    "KDFW",
    "KSFO",
    "KBOS",
    "KSEA",
    "EGLL",
    "LFPG",
    "EDDF",
    "RJTT",
]


def _normalize_airport(attrs: dict) -> dict:
    code = attrs.get("code") or attrs.get("icao_code") or attrs.get("gps_code") or ""
    airport_type = (attrs.get("type") or "").replace("_", " ").strip()
    type_label = airport_type.title() if airport_type else ""

    return {
        "icao": attrs.get("icao_code") or attrs.get("gps_code") or code,
        "iata": attrs.get("iata_code") or attrs.get("local_code") or code,
        "name": attrs.get("name") or code,
        "city": attrs.get("municipality") or "",
        "country": attrs.get("country_code") or attrs.get("iso_country") or "",
        "lat": attrs.get("latitude"),
        "lon": attrs.get("longitude"),
        "type": attrs.get("type") or "",
        "type_label": type_label,
        "code": code,
    }


def _build_preview_channels(airport: dict) -> list[dict]:
    base = (airport.get("icao") or airport.get("code") or "airport").lower()
    name = airport.get("name") or airport.get("icao") or "Airport"
    return [
        {
            "name": f"{name} Tower",
            "id": f"{base}-tower",
            "status": "PREVIEW",
            "is_up": False,
            "listeners": 0,
            "data_source": "remote",
            "stream_url": None,
            "frequencies": [],
        },
        {
            "name": f"{name} Ground",
            "id": f"{base}-ground",
            "status": "PREVIEW",
            "is_up": False,
            "listeners": 0,
            "data_source": "remote",
            "stream_url": None,
            "frequencies": [],
        },
        {
            "name": f"{name} Approach",
            "id": f"{base}-approach",
            "status": "PREVIEW",
            "is_up": False,
            "listeners": 0,
            "data_source": "remote",
            "stream_url": None,
            "frequencies": [],
        },
        {
            "name": f"{name} Delivery",
            "id": f"{base}-delivery",
            "status": "PREVIEW",
            "is_up": False,
            "listeners": 0,
            "data_source": "remote",
            "stream_url": None,
            "frequencies": [],
        },
    ]


async def _fetch_json(client: httpx.AsyncClient, url: str, **params) -> dict:
    response = await client.get(
        url,
        params=params or None,
        headers=_HEADERS,
        follow_redirects=True,
    )
    if response.status_code == 404:
        return {}
    response.raise_for_status()
    return response.json()


async def _fetch_exact_airport(client: httpx.AsyncClient, code: str) -> dict | None:
    payload = await _fetch_json(client, f"{_AIRPORTS_API}/{code.upper()}")
    record = payload.get("data")
    if not record:
        return None
    return _normalize_airport(record.get("attributes") or {})


async def _fetch_filtered_airports(
    client: httpx.AsyncClient, field: str, value: str
) -> list[dict]:
    payload = await _fetch_json(client, _AIRPORTS_API, **{f"filter[{field}]": value})
    results = []
    for record in payload.get("data", []):
        attrs = record.get("attributes") or {}
        normalized = _normalize_airport(attrs)
        if normalized.get("icao") or normalized.get("name"):
            results.append(normalized)
    return results


def _dedupe_airports(airports: list[dict]) -> list[dict]:
    seen = set()
    deduped = []
    for airport in airports:
        key = (
            airport.get("icao") or airport.get("code") or airport.get("name") or ""
        ).upper()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(airport)
    return deduped


def _score_airport(query: str, airport: dict) -> tuple[int, str]:
    normalized_query = query.strip().upper()
    code = (airport.get("icao") or airport.get("code") or "").upper()
    iata = (airport.get("iata") or "").upper()
    name = (airport.get("name") or "").upper()

    if code == normalized_query or iata == normalized_query:
        return (0, name)
    if code.startswith(normalized_query) or iata.startswith(normalized_query):
        return (1, name)
    if normalized_query in name:
        return (2, name)
    return (3, name)


async def _search_remote_airports(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        candidates = []
        exact = None
        trimmed = query.strip()
        upper = trimmed.upper()

        if 3 <= len(upper) <= 4 and upper.isalnum():
            exact = await _fetch_exact_airport(client, upper)
            if exact:
                candidates.append(exact)

        lookups = await asyncio.gather(
            _fetch_filtered_airports(client, "code", upper),
            _fetch_filtered_airports(client, "name", trimmed),
            return_exceptions=True,
        )

        for result in lookups:
            if isinstance(result, Exception):
                continue
            candidates.extend(result)

        airports = _dedupe_airports(candidates)
        airports.sort(key=lambda airport: _score_airport(query, airport))
        return airports[:12]


@router.get("/airports")
async def search_airports(
    query: str = Query(default="", max_length=80),
    country: str = Query(default="", max_length=2),
    kind: str = Query(default="all", max_length=40),
    limit: int = Query(default=48, ge=1, le=100),
):
    """
    Search and browse airports using OurAirports, with airportsapi.com retained
    as a fallback for lookup gaps.
    """
    try:
        trimmed = query.strip()
        airports = await search_ourairports(
            trimmed,
            country=country,
            kind=kind,
            limit=limit,
        )
        if airports or not trimmed:
            return {
                "airports": airports,
                "source": "ourairports",
                "catalog_count": await catalog_count(),
            }

        fallback_airports = await _search_remote_airports(trimmed)
        return {
            "airports": fallback_airports[:limit],
            "source": "airportsapi.com",
            "catalog_count": await catalog_count(),
        }
    except httpx.HTTPError as exc:
        if query.strip():
            try:
                return {
                    "airports": (await _search_remote_airports(query.strip()))[:limit],
                    "source": "airportsapi.com",
                    "catalog_count": 0,
                }
            except httpx.HTTPError:
                pass
        else:
            try:
                async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                    featured = await asyncio.gather(
                        *[
                            _fetch_exact_airport(client, code)
                            for code in _FEATURED_CODES
                        ]
                    )
                return {
                    "airports": [airport for airport in featured if airport][:limit],
                    "source": "airportsapi.com",
                    "catalog_count": 0,
                }
            except httpx.HTTPError:
                pass
        raise HTTPException(
            status_code=502, detail="Airport search is unavailable"
        ) from exc


@router.get("")
async def search(icao: str = Query(..., min_length=2, max_length=10)):
    """
    Resolve a single airport and return preview channel metadata.
    """
    try:
        airports = await search_ourairports(icao, limit=1)
        if not airports:
            airports = await _search_remote_airports(icao)
        if not airports:
            raise HTTPException(status_code=404, detail="Airport not found")
        airport = airports[0]
        return {"airport": airport, "channels": _build_preview_channels(airport)}
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail="Airport lookup is unavailable"
        ) from exc
