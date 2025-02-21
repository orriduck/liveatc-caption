import { useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play, Pause, RotateCw } from "lucide-react";
import { Frequency } from "@/types/airport";
import DigitalClock from "./digital-clock";
import AudioVisualizer from "./audio-visualizer";
import { useAudioStore } from "@/store/audio-store";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  frequencies: Frequency[];
  isLoading: boolean;
}

export default function AudioPlayer({
  audioUrl,
  title,
  frequencies,
  isLoading,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const {
    isPlaying,
    isMuted,
    isBuffering,
    hasStartedPlaying,
    audioContext,
    analyserNode,
  } = useAudioStore();
  const {
    setPlaying,
    setMuted,
    setBuffering,
    setHasStartedPlaying,
    initializeAudioContext,
  } = useAudioStore((state) => state.actions);

  // Initialize audio context once
  useEffect(() => {
    if (!audioContext) {
      initializeAudioContext();
    }
  }, [audioContext, initializeAudioContext]);

  // Handle audio element setup and cleanup
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = "auto";

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    // Connect to audio context if available
    if (audioContext && analyserNode && !sourceRef.current) {
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
      sourceRef.current = source;
    }

    audioRef.current = audio;

    return () => {
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.pause();
      audio.src = "";
      
      // Disconnect source if it exists
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      
      setPlaying(false);
    };
  }, [audioUrl, audioContext, analyserNode, setBuffering, setPlaying]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        if (!hasStartedPlaying) {
          setHasStartedPlaying(true);
        }
      }
      setPlaying(!isPlaying);
    }
  }, [isPlaying, hasStartedPlaying, setPlaying, setHasStartedPlaying]);

  const reloadAndPlay = useCallback(() => {
    if (audioRef.current) {
      // Create a new audio element with a fresh timestamp
      const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
      const newAudio = new Audio(newUrl);

      // Clean up old audio
      audioRef.current.pause();
      audioRef.current.src = "";

      // Disconnect old source if it exists
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      // Set up new audio
      audioRef.current = newAudio;

      // Connect new audio to context
      if (audioContext && analyserNode) {
        const source = audioContext.createMediaElementSource(newAudio);
        source.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        sourceRef.current = source;
      }

      // Start playing
      newAudio.play().then(() => {
        setPlaying(true);
        if (!hasStartedPlaying) {
          setHasStartedPlaying(true);
        }
      });
    }
  }, [audioUrl, audioContext, analyserNode, setPlaying, hasStartedPlaying, setHasStartedPlaying]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setMuted(!isMuted);
    }
  }, [isMuted, setMuted]);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/50 to-background/80 backdrop-blur-[2px] rounded-lg" />
      <Card className="relative">
        <CardHeader>
          <CardTitle>
            <div className="flex flex-wrap justify-between items-center gap-4">
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
                      onClick={reloadAndPlay}
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isLoading}
                    >
                      <RotateCw className="size-4" />
                    </Button>
                    <Button
                      onClick={togglePlay}
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isLoading}
                    >
                      <Play className="size-4" />
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
        <CardContent className="space-y-4">
          <AudioVisualizer />
          {frequencies.length > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Frequencies:{" "}
                {frequencies
                  .map((f) =>
                    typeof f === "object" && f.frequency
                      ? f.frequency
                      : String(f),
                  )
                  .join(", ")}
              </div>
              <DigitalClock isVisible={hasStartedPlaying} isActive={isPlaying} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
