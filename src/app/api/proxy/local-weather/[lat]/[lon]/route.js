const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

export async function GET(_request, { params }) {
  const { lat, lon } = await params;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_VARIABLES);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ADSBao/0.8 (https://github.com/orriduck/ADSBao)",
    },
    next: {
      revalidate: 300,
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}
