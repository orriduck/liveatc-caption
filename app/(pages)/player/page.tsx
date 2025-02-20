"use client";

import AudioChannelPlayer from "@/components/player/audio-channel-player";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AudioChannel } from "@/types/airport";
import PageHeader from "@/components/page-header";

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelParam = searchParams.get("channel");

  let channel: AudioChannel | null = null;
  try {
    if (channelParam) {
      channel = JSON.parse(decodeURIComponent(channelParam));
    }
  } catch (error) {
    console.error("Error parsing channel data:", error);
  }

  useEffect(() => {
    if (!channel) {
      router.push("/");
    }
  }, [channel, router]);

  if (!channel) return null;

  return (
    <div className="flex flex-col space-y-8">
      <PageHeader />
      <AudioChannelPlayer audioChannel={channel} />
    </div>
  );
}

function FallBackContent() {
  return (
    <div className="flex flex-col space-y-8">
      <PageHeader />
      <div className="animate-pulse">Loading...</div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<FallBackContent />}>
      <PlayerContent />
    </Suspense>
  );
}
