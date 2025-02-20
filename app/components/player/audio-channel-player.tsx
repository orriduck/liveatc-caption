import { AudioChannel } from "@/types/airport";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/store/search-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface AudioChannelPlayerProps {
  audioChannel: AudioChannel;
}

interface CustomAudioElement extends HTMLAudioElement {
  cleanup?: () => void;
}

export default function AudioChannelPlayer({ audioChannel }: AudioChannelPlayerProps) {
  const audioRef = useRef<CustomAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { setFocusChannel } = useSearchStore();

  const resetAudioStream = useCallback(async () => {
    if (!audioChannel.mp3_url) {
      setIsLoading(false);
      return null;
    }

    if (audioRef.current?.cleanup) {
      audioRef.current.cleanup();
      audioRef.current = null;
    }

    const encodedUrl = encodeURIComponent(audioChannel.mp3_url);
    const audio = new Audio(`/api/audio?url=${encodedUrl}`) as CustomAudioElement;
    audio.preload = 'auto';

    audio.cleanup = () => {
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(audio.src);
    };

    return audio;
  }, [audioChannel.mp3_url]);

  const playAudioStream = useCallback(async (audio: CustomAudioElement) => {
    try {
      await audio.play();
      audioRef.current = audio;
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      toast.error('Failed to play audio due to exception:' + err);
      setIsLoading(false);
      setIsPlaying(false);
      audio.cleanup?.();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAudio = async () => {
      try {
        setIsLoading(true);
        const audio = await resetAudioStream();
        
        if (!audio || !isMounted) return;

        await playAudioStream(audio);
      } catch (err) {
        console.error('Audio initialization error:', err);
        if (isMounted) {
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      if (audioRef.current?.cleanup) {
        audioRef.current.cleanup();
        audioRef.current = null;
      }
    };
  }, [audioChannel.mp3_url, resetAudioStream, playAudioStream]);

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setFocusChannel(null);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className={`size-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <div className={`size-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse backdrop-blur-sm' : 'bg-gray-300'}`}></div>
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
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
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
            Frequencies: {audioChannel.frequencies.map(f => f.frequency).join(', ')}
          </div>
        </CardContent>
      )}
    </Card>
  );
}