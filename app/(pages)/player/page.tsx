"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AudioChannel } from "@/types/airport";
import PageHeader from "@/components/page-header";
import AudioPlayer from "@/components/player/audio-player";

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelParam = searchParams.get("channel");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<AudioChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let channel: AudioChannel | null = null;
    try {
      if (channelParam) {
        channel = JSON.parse(decodeURIComponent(channelParam));
        setChannelInfo(channel);
      }
    } catch (error) {
      console.error("Error parsing channel data:", error);
    }

    if (!channel) {
      router.push("/");
      return;
    }

    // Construct the audio stream URL
    if (channel.mp3_url) {
      const streamUrl = `/api/audio?url=${encodeURIComponent(channel.mp3_url)}&t=${Date.now()}`;
      setAudioUrl(streamUrl);
    }
    setIsLoading(false);
  }, [channelParam, router]);

  if (!channelInfo || !audioUrl) return null;

  return (
    <div className="flex flex-col space-y-8">
      <PageHeader />
      <AudioPlayer 
        audioUrl={audioUrl} 
        title={channelInfo.name}
        frequencies={channelInfo.frequencies}
        isLoading={isLoading}
      />
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
