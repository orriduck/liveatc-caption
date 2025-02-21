import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play, Pause, RotateCw } from "lucide-react";
import { Frequency } from "@/types/airport";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  frequencies: Frequency[];
  isLoading: boolean;
}

interface CustomAudioElement extends HTMLAudioElement {
  cleanup?: () => void;
}

export default function AudioPlayer({
  audioUrl,
  title,
  frequencies,
  isLoading,
}: AudioPlayerProps) {
  const audioRef = useRef<CustomAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const audio = new Audio(audioUrl) as CustomAudioElement;
    audio.preload = "auto";

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onPlaying = () => {
      setIsBuffering(false);
    };

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const reloadAndPlay = useCallback(() => {
    if (audioRef.current) {
      // Create a new audio element with a fresh timestamp
      const newUrl = `${audioUrl.split('&t=')[0]}&t=${Date.now()}`;
      const newAudio = new Audio(newUrl) as CustomAudioElement;
      newAudio.preload = "auto";
      
      // Clean up old audio
      audioRef.current.pause();
      audioRef.current.src = "";
      
      // Set up new audio
      audioRef.current = newAudio;
      newAudio.play();
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div
                  className={`size-2 rounded-full ${
                    isLoading || isBuffering
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-green-500"
                  }`}
                />
                <div
                  className={`size-2 rounded-full ${
                    isPlaying
                      ? "bg-green-500 animate-pulse backdrop-blur-sm"
                      : "bg-gray-300"
                  }`}
                />
              </div>
              <span>{title}</span>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying ? (
                <Button
                  onClick={togglePlay}
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={isLoading}
                >
                  <Pause className="size-4" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={togglePlay}
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isLoading}
                  >
                    <Play className="size-4" />
                  </Button>
                  <Button
                    onClick={reloadAndPlay}
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isLoading}
                  >
                    <RotateCw className="size-4" />
                  </Button>
                </>
              )}
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
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
      {frequencies.length > 0 && (
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Frequencies:{" "}
            {frequencies
              .map((f) =>
                typeof f === "object" && f.frequency ? f.frequency : String(f)
              )
              .join(", ")}
          </div>
        </CardContent>
      )}
    </Card>
  );
} 