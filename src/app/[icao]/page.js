import HomeClient from "@/components/screens/HomeClient";

export default async function AirportPage({ params }) {
  const { icao } = await params;
  return <HomeClient initialIcao={String(icao || "").toUpperCase()} />;
}
