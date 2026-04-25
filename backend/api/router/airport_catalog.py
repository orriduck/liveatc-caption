import csv
import io
import time
from pathlib import Path
from typing import Any

import httpx

_OURAIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
_TIMEOUT = 20.0
_CACHE_TTL_SECONDS = 24 * 60 * 60
_CACHE_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "ourairports" / "airports.csv"
)
_CATALOG: list[dict[str, Any]] | None = None
_CATALOG_LOADED_AT = 0.0

_TYPE_LABELS = {
    "large_airport": "Large Airport",
    "medium_airport": "Medium Airport",
    "small_airport": "Small Airport",
    "heliport": "Heliport",
    "seaplane_base": "Seaplane Base",
    "balloonport": "Balloonport",
}
_TYPE_RANK = {
    "large_airport": 0,
    "medium_airport": 1,
    "small_airport": 2,
    "seaplane_base": 3,
    "heliport": 4,
    "balloonport": 5,
}


async def _download_ourairports_csv() -> str:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(_OURAIRPORTS_CSV_URL, follow_redirects=True)
        response.raise_for_status()
        return response.text


def clear_catalog_cache() -> None:
    global _CATALOG, _CATALOG_LOADED_AT
    _CATALOG = None
    _CATALOG_LOADED_AT = 0.0


def _cache_is_fresh() -> bool:
    if not _CACHE_PATH.exists():
        return False
    age_seconds = time.time() - _CACHE_PATH.stat().st_mtime
    return age_seconds <= _CACHE_TTL_SECONDS


def _read_cached_csv() -> str | None:
    if not _CACHE_PATH.exists():
        return None
    return _CACHE_PATH.read_text(encoding="utf-8")


def _write_cached_csv(csv_text: str) -> None:
    _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_PATH.write_text(csv_text, encoding="utf-8")


async def _load_csv_text() -> str:
    cached_csv = _read_cached_csv()
    if cached_csv is not None and _cache_is_fresh():
        return cached_csv

    try:
        downloaded_csv = await _download_ourairports_csv()
        _write_cached_csv(downloaded_csv)
        return downloaded_csv
    except Exception:
        if cached_csv is not None:
            return cached_csv
        raise


def _to_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_row(row: dict[str, str]) -> dict[str, Any] | None:
    airport_type = row.get("type") or ""
    if airport_type == "closed":
        return None

    ident = row.get("ident") or ""
    gps_code = row.get("gps_code") or ""
    local_code = row.get("local_code") or ""
    iata = row.get("iata_code") or ""
    code = gps_code or ident or local_code
    name = row.get("name") or code

    if not code or not name:
        return None

    return {
        "icao": code,
        "iata": iata,
        "name": name,
        "city": row.get("municipality") or "",
        "country": row.get("iso_country") or "",
        "region": row.get("iso_region") or "",
        "continent": row.get("continent") or "",
        "lat": _to_float(row.get("latitude_deg") or ""),
        "lon": _to_float(row.get("longitude_deg") or ""),
        "type": airport_type,
        "type_label": _TYPE_LABELS.get(
            airport_type, airport_type.replace("_", " ").title()
        ),
        "code": code,
        "scheduled_service": row.get("scheduled_service") == "yes",
        "source": "ourairports",
    }


def _parse_catalog(csv_text: str) -> list[dict[str, Any]]:
    airports = []
    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        airport = _normalize_row(row)
        if airport:
            airports.append(airport)
    return airports


async def _load_catalog() -> list[dict[str, Any]]:
    global _CATALOG, _CATALOG_LOADED_AT
    if _CATALOG is None or time.time() - _CATALOG_LOADED_AT > _CACHE_TTL_SECONDS:
        _CATALOG = _parse_catalog(await _load_csv_text())
        _CATALOG_LOADED_AT = time.time()
    return _CATALOG


def _browse_score(airport: dict[str, Any]) -> tuple[int, int, int, str]:
    type_rank = _TYPE_RANK.get(airport.get("type") or "", 9)
    scheduled_rank = 0 if airport.get("scheduled_service") else 1
    iata_rank = 0 if airport.get("iata") else 1
    return (type_rank, scheduled_rank, iata_rank, airport.get("name") or "")


def _query_score(
    query: str, airport: dict[str, Any]
) -> tuple[int, tuple[int, int, int, str], int]:
    normalized_query = query.strip().upper()
    code = (airport.get("icao") or airport.get("code") or "").upper()
    iata = (airport.get("iata") or "").upper()
    name = (airport.get("name") or "").upper()
    city = (airport.get("city") or "").upper()

    if code == normalized_query or iata == normalized_query:
        return (0, _browse_score(airport), 0)
    if code.startswith(normalized_query) or iata.startswith(normalized_query):
        return (1, _browse_score(airport), 0)
    if name.startswith(normalized_query) or city.startswith(normalized_query):
        return (2, _browse_score(airport), 0)
    if normalized_query in name or normalized_query in city:
        return (2, _browse_score(airport), 1)
    return (9, _browse_score(airport), 0)


def _matches_query(query: str, airport: dict[str, Any]) -> bool:
    normalized_query = query.strip().upper()
    if not normalized_query:
        return True
    haystack = " ".join(
        str(airport.get(field) or "")
        for field in ("icao", "iata", "name", "city", "country", "region")
    ).upper()
    return normalized_query in haystack


def _matches_kind(kind: str, airport: dict[str, Any]) -> bool:
    if not kind or kind == "all":
        return True
    return airport.get("type") == kind


async def search_ourairports(
    query: str = "",
    *,
    country: str = "",
    kind: str = "all",
    limit: int = 48,
) -> list[dict[str, Any]]:
    catalog = await _load_catalog()
    normalized_country = country.strip().upper()
    bounded_limit = max(1, min(limit, 100))

    results = [
        airport
        for airport in catalog
        if _matches_query(query, airport)
        and _matches_kind(kind, airport)
        and (
            not normalized_country
            or (airport.get("country") or "").upper() == normalized_country
        )
    ]

    if query.strip():
        results.sort(key=lambda airport: _query_score(query, airport))
    else:
        results.sort(key=_browse_score)

    return results[:bounded_limit]


async def catalog_count() -> int:
    return len(await _load_catalog())
