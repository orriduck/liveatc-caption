import { AudioChannel } from "@/types/airport";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/store/search-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface AudioChannelPlayerProps {
  audioChannel: AudioChannel;
}

interface CustomAudioElement extends HTMLAudioElement {
  cleanup?: () => void;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  source?: MediaElementAudioSourceNode;
}

export default function AudioChannelPlayer({
  audioChannel,
}: AudioChannelPlayerProps) {
  const audioRef = useRef<CustomAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const volumeLevelInt = useMemo(() => {
    return parseInt(Math.floor(volumeLevel * 100).toFixed(0));
  }, [volumeLevel]);

  const { setFocusChannel } = useSearchStore();

  const setupAudioAnalyser = useCallback((audio: CustomAudioElement) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audio.audioContext = audioContext;
      audio.analyser = analyser;
      audio.source = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastVolume = 0;

      const updateVolume = () => {
        if (!audio.analyser) return;
        audio.analyser.getByteFrequencyData(dataArray);

        // 计算加权平均值，偏重低频和中频
        let weightedSum = 0;
        let weightSum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const weight = Math.exp(-i / (dataArray.length / 4));
          weightedSum += dataArray[i] * weight;
          weightSum += weight;
        }

        const average = weightedSum / weightSum;
        const normalizedVolume = Math.min(average / 200, 1);

        // 平滑过渡
        const smoothedVolume = lastVolume * 0.6 + normalizedVolume * 0.4;
        lastVolume = smoothedVolume;

        setVolumeLevel(smoothedVolume);
        requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Failed to setup audio analyser:", err);
    }
  }, []);

  const playAudioStream = useCallback(
    async (audio: CustomAudioElement) => {
      try {
        await audio.play();
        audioRef.current = audio;
        setupAudioAnalyser(audio);
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err) {
        toast.error("Failed to play audio due to exception:" + err);
        setIsLoading(false);
        setIsPlaying(false);
        audio.cleanup?.();
      }
    },
    [setupAudioAnalyser],
  );

  const cleanupAudioResources = useCallback(async (audio: CustomAudioElement | null) => {
    if (!audio) return;
    try {
      if (audio.source) {
        audio.source.disconnect();
      }
      if (audio.analyser) {
        audio.analyser.disconnect();
      }
      if (audio.audioContext?.state !== 'closed') {
        await audio.audioContext?.close();
      }
      audio.pause();
      audio.load(); // 强制重置音频元素状态
      audio.src = "";
      URL.revokeObjectURL(audio.src);
      audio.cleanup?.();
    } catch (err) {
      console.error("Error cleaning up audio resources:", err);
    }
  }, []);

  const resetAudioStream = useCallback(async () => {
    if (!audioChannel.mp3_url) {
      setIsLoading(false);
      return null;
    }

    await cleanupAudioResources(audioRef.current);
    audioRef.current = null;

    const encodedUrl = encodeURIComponent(audioChannel.mp3_url);
    const audio = new Audio(
      `/api/audio?url=${encodedUrl}`,
    ) as CustomAudioElement;
    audio.preload = "auto";

    audio.cleanup = async () => {
      if (audio.audioContext && audio.audioContext.state !== 'closed') {
        try {
          await audio.audioContext.close();
        } catch (err) {
          console.error("Error closing audio context:", err);
        }
      }
      audio.pause();
      audio.src = "";
      URL.revokeObjectURL(audio.src);
    };

    return audio;
  }, [audioChannel.mp3_url, cleanupAudioResources]);

  useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      try {
        setIsLoading(true);
        setIsPlaying(false);
        
        // 清理旧的音频资源
        await cleanupAudioResources(audioRef.current);
        audioRef.current = null;

        const audio = await resetAudioStream();
        if (!audio || !isMounted) return;

        await playAudioStream(audio);
      } catch (err) {
        console.error("Audio initialization error:", err);
        if (isMounted) {
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      cleanupAudioResources(audioRef.current).then(() => {
        if (isMounted) {
          audioRef.current = null;
          setIsPlaying(false);
          setIsLoading(false);
        }
      });
    };
  }, [audioChannel.mp3_url, resetAudioStream, playAudioStream, cleanupAudioResources]);

  const handleClose = async () => {
    await cleanupAudioResources(audioRef.current);
    audioRef.current = null;
    setFocusChannel(null);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card
      className={`transition-shadow ${volumeLevelInt > 0 ? `shadow-md shadow-green-500/${volumeLevelInt}` : ""}`}
    >
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div
                  className={`size-2 rounded-full ${isLoading ? "bg-yellow-500 animate-pulse" : "bg-gray-300"}`}
                ></div>
                <div
                  className={`size-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse backdrop-blur-sm" : "bg-gray-300"}`}
                ></div>
              </div>
              Listening To {audioChannel.name}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleMute}
                variant={"ghost"}
                size={"icon"}
                className="size-8"
              >
                {isMuted ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant={"ghost"}
                size={"icon"}
                className="size-8"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      {audioChannel.frequencies.length > 0 && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Frequencies:{" "}
            {audioChannel.frequencies.map((f) => f.frequency).join(", ")}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
