import pytest


AIRPORTS_CSV = """id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords
3632,KLAX,large_airport,Los Angeles International Airport,33.942501,-118.407997,125,NA,US,US-CA,Los Angeles,yes,KLAX,LAX,LAX,,,
507,EGLL,large_airport,London Heathrow Airport,51.4706,-0.461941,83,EU,GB,GB-ENG,London,yes,EGLL,LHR,,,
9999,00AK,small_airport,Low Priority Strip,59.0,-151.0,100,NA,US,US-AK,Remote,no,00AK,,00AK,,,
10000,TE17,small_airport,Heathrow Airport,31.4,-97.1,100,NA,US,US-TX,Robinson,no,TE17,,TE17,,,
"""

ALT_AIRPORTS_CSV = """id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords
20000,KSEA,large_airport,Seattle Tacoma International Airport,47.449001,-122.308998,433,NA,US,US-WA,Seattle,yes,KSEA,SEA,SEA,,,
"""


@pytest.mark.asyncio
async def test_ourairports_catalog_searches_codes_and_names(monkeypatch):
    from api.router import airport_catalog

    async def fake_download():
        return AIRPORTS_CSV

    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fake_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("heathrow", limit=10)

    assert results[0]["icao"] == "EGLL"
    assert results[0]["iata"] == "LHR"
    assert results[0]["name"] == "London Heathrow Airport"
    assert results[0]["city"] == "London"
    assert results[0]["country"] == "GB"
    assert results[0]["source"] == "ourairports"


@pytest.mark.asyncio
async def test_ourairports_catalog_prefers_major_airports_for_text_search(monkeypatch):
    from api.router import airport_catalog

    async def fake_download():
        return AIRPORTS_CSV

    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fake_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("heathrow", limit=10)

    assert results[0]["icao"] == "EGLL"


@pytest.mark.asyncio
async def test_ourairports_catalog_browses_major_airports_first(monkeypatch):
    from api.router import airport_catalog

    async def fake_download():
        return AIRPORTS_CSV

    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fake_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("", limit=3)

    assert {airport["icao"] for airport in results[:2]} == {"KLAX", "EGLL"}
    assert results[2]["type"] == "small_airport"


@pytest.mark.asyncio
async def test_ourairports_catalog_uses_fresh_disk_cache_without_network(
    monkeypatch, tmp_path
):
    from api.router import airport_catalog

    cache_file = tmp_path / "airports.csv"
    cache_file.write_text(AIRPORTS_CSV, encoding="utf-8")

    async def fail_download():
        raise AssertionError("fresh disk cache should not hit network")

    monkeypatch.setattr(airport_catalog, "_CACHE_PATH", cache_file)
    monkeypatch.setattr(airport_catalog, "_CACHE_TTL_SECONDS", 3600)
    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fail_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("LAX", limit=10)

    assert results[0]["icao"] == "KLAX"


@pytest.mark.asyncio
async def test_ourairports_catalog_refreshes_stale_disk_cache(monkeypatch, tmp_path):
    from api.router import airport_catalog

    cache_file = tmp_path / "airports.csv"
    cache_file.write_text(AIRPORTS_CSV, encoding="utf-8")

    async def fake_download():
        return ALT_AIRPORTS_CSV

    monkeypatch.setattr(airport_catalog, "_CACHE_PATH", cache_file)
    monkeypatch.setattr(airport_catalog, "_CACHE_TTL_SECONDS", -1)
    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fake_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("SEA", limit=10)

    assert results[0]["icao"] == "KSEA"
    assert cache_file.read_text(encoding="utf-8") == ALT_AIRPORTS_CSV


@pytest.mark.asyncio
async def test_ourairports_catalog_falls_back_to_stale_disk_cache(
    monkeypatch, tmp_path
):
    from api.router import airport_catalog

    cache_file = tmp_path / "airports.csv"
    cache_file.write_text(AIRPORTS_CSV, encoding="utf-8")

    async def fail_download():
        raise RuntimeError("network down")

    monkeypatch.setattr(airport_catalog, "_CACHE_PATH", cache_file)
    monkeypatch.setattr(airport_catalog, "_CACHE_TTL_SECONDS", -1)
    monkeypatch.setattr(airport_catalog, "_download_ourairports_csv", fail_download)
    airport_catalog.clear_catalog_cache()

    results = await airport_catalog.search_ourairports("LAX", limit=10)

    assert results[0]["icao"] == "KLAX"
