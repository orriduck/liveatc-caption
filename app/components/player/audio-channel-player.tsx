import { AudioChannel } from "@/types/airport";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
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

  const setupAudioAnalyser = useCallback((audio: CustomAudioElement) => {
    try {
      // 清理现有的音频连接
      if (audio.source) {
        audio.source.disconnect();
      }
      if (audio.analyser) {
        audio.analyser.disconnect();
      }
      if (audio.audioContext?.state !== 'closed') {
        audio.audioContext?.close();
      }

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
      let animationFrameId: number;

      const updateVolume = () => {
        if (!audio.analyser || audio.audioContext?.state === 'closed') {
          cancelAnimationFrame(animationFrameId);
          return;
        }

        try {
          audio.analyser.getByteFrequencyData(dataArray);

          let weightedSum = 0;
          let weightSum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const weight = Math.exp(-i / (dataArray.length / 4));
            weightedSum += dataArray[i] * weight;
            weightSum += weight;
          }

          const average = weightedSum / weightSum;
          const normalizedVolume = Math.min(average / 200, 1);
          const smoothedVolume = lastVolume * 0.6 + normalizedVolume * 0.4;
          lastVolume = smoothedVolume;

          setVolumeLevel(smoothedVolume);
          animationFrameId = requestAnimationFrame(updateVolume);
        } catch (err) {
          console.error('Error updating volume:', err);
          cancelAnimationFrame(animationFrameId);
        }
      };

      updateVolume();

      const checkAudioContext = setInterval(() => {
        if (audio.audioContext?.state === 'suspended') {
          audio.audioContext.resume().catch(console.error);
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(checkAudioContext);
        cancelAnimationFrame(animationFrameId);
      };

      return cleanup;
    } catch (err) {
      console.error('Failed to setup audio analyser:', err);
      return () => {};
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      try {
        setIsLoading(true);

        const audio = new Audio(
          `/api/audio?url=${encodeURIComponent(audioChannel.mp3_url || '')}&t=${Date.now()}`,
        ) as CustomAudioElement;
        audio.preload = "auto";

        if (!isMounted) return;

        audioRef.current = audio;
        const cleanup = setupAudioAnalyser(audio);
        audio.cleanup = cleanup;
        setIsLoading(false);
      } catch (err) {
        console.error("Audio initialization error:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.cleanup?.();
        audioRef.current = null;
        setIsLoading(false);
        setIsPlaying(false);
      }
    };
  }, [audioChannel.mp3_url, setupAudioAnalyser]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      toast.error("Failed to toggle audio: " + err);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card
      className={`transition-shadow ease-in-out ${volumeLevelInt > 0 ? `drop-shadow drop-shadow-green-500/${volumeLevelInt}` : "drop-shadow-none"}`}
    >
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div
                  className={`size-2 rounded-full ${isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
                ></div>
                <div
                  className={`size-2 rounded-full ${isPlaying ? "bg-green-500 animate-pulse backdrop-blur-sm" : "bg-gray-300"}`}
                ></div>
              </div>
              Listening To {audioChannel.name}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={togglePlayPause}
                variant={"ghost"}
                size={"icon"}
                className="size-8"
                disabled={isLoading}
              >
                {isPlaying ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
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
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      {audioChannel.frequencies.length > 0 && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Frequencies:{" "}
            {audioChannel.frequencies.map((f) => (typeof f === 'object' && f.frequency ? f.frequency : String(f))).join(", ")}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
