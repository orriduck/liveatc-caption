"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AirportCaptionScreen from "./AirportCaptionScreen";
import SearchScreen from "./SearchScreen";
import { airportDirectoryClient } from "../../services/airportDirectory.js";

export default function HomeClient({ initialIcao = "" }) {
  const router = useRouter();
  const [airport, setAirport] = useState(null);
  const [currentIcao, setCurrentIcao] = useState(initialIcao);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAirport = async (icao) => {
    if (!icao || icao.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedAirport = await airportDirectoryClient.resolveAirport(icao);
      setAirport(resolvedAirport);
      setCurrentIcao(String(resolvedAirport?.icao || icao).toUpperCase());
    } catch (err) {
      console.error("Failed to load airport", err);
      setAirport(null);
      setError(err?.message || "Failed to load airport");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialIcao) loadAirport(initialIcao);
  }, [initialIcao]);

  const handleOpenAirport = async (selectedAirport) => {
    const nextIcao = String(
      selectedAirport.icao || selectedAirport.code || "",
    ).toUpperCase();
    if (!nextIcao) return;
    setCurrentIcao(nextIcao);
    router.push(`/${nextIcao}`);
    await loadAirport(nextIcao);
  };

  const handleBack = () => {
    setAirport(null);
    setError(null);
    setCurrentIcao("");
    router.push("/");
  };

  if (!currentIcao) {
    return <SearchScreen loading={loading} error={error} onOpenAirport={handleOpenAirport} />;
  }

  return (
    <AirportCaptionScreen
      icao={currentIcao}
      airport={airport}
      loading={loading}
      error={error}
      onBack={handleBack}
    />
  );
}
