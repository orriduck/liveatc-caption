"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AirportCaptionScreen from "./AirportCaptionScreen";
import SearchScreen from "./SearchScreen";
import { airportDirectoryClient } from "../../services/airportDirectory.js";

export default function HomeClient({ initialIcao = "" }) {
  const router = useRouter();
  const [airport, setAirport] = useState(null);
  const [currentIcao, setCurrentIcao] = useState(initialIcao);

  const loadAirport = async (icao) => {
    if (!icao || icao.length < 3) return;
    const toastId = toast.loading("Loading airport context...", {
      id: "airport-resolve",
    });
    try {
      const resolvedAirport = await airportDirectoryClient.resolveAirport(icao);
      toast.dismiss(toastId);
      setAirport(resolvedAirport);
      setCurrentIcao(String(resolvedAirport?.icao || icao).toUpperCase());
    } catch (err) {
      console.error("Failed to load airport", err);
      toast.error(err?.message || "Airport not found or unavailable", {
        id: toastId,
      });
      setAirport(null);
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
    setCurrentIcao("");
    router.push("/");
  };

  if (!currentIcao) {
    return <SearchScreen onOpenAirport={handleOpenAirport} />;
  }

  return (
    <AirportCaptionScreen
      icao={currentIcao}
      airport={airport}
      onBack={handleBack}
    />
  );
}
