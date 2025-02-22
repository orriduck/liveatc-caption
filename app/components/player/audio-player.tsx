import { useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play, Pause, RotateCw } from "lucide-react";
import { Frequency } from "@/types/airport";
import DigitalClock from "./digital-clock";
import AudioVisualizer from "./audio-visualizer";
import ConnectionDebug from "./connection-debug";
import { useAudioStore } from "@/store/audio-store";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  frequencies: Frequency[];
  isLoading: boolean;
}

const RECONNECT_INTERVAL = 8500; // Slightly reduced to ensure overlap
const RECONNECT_PREPARATION_TIME = 500; // Start preparing new connection 500ms before switch

export default function AudioPlayer({
  audioUrl,
  title,
  frequencies,
  isLoading,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const nextSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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
    updateConnectionTime,
    incrementReconnectCount,
  } = useAudioStore((state) => state.actions);

  useEffect(() => {
    if (!audioContext) {
      initializeAudioContext();
    }
  }, [audioContext, initializeAudioContext]);

  const cleanupAudioConnection = useCallback((isNext: boolean) => {
    try {
      const sourceToClean = isNext ? nextSourceRef.current : sourceRef.current;
      const audioToClean = isNext ? nextAudioRef.current : audioRef.current;

      if (audioToClean) {
        // Only pause if currently playing
        if (!audioToClean.paused) {
          audioToClean.pause();
        }
        // Remove source before clearing it
        if (sourceToClean) {
          sourceToClean.disconnect();
        }
        // Just remove the src attribute instead of using a blob
        audioToClean.removeAttribute('src');
      } else if (sourceToClean) {
        // Clean up source even if audio element is gone
        sourceToClean.disconnect();
      }

      if (isNext) {
        nextSourceRef.current = null;
        nextAudioRef.current = null;
      } else {
        sourceRef.current = null;
        audioRef.current = null;
      }
    } catch (error) {
      console.error('Error cleaning up connection:', error);
    }
  }, []);

  const setupNewAudioElement = useCallback((url: string, isNext = false) => {
    if (!audioContext || !analyserNode) {
      console.warn('Audio context or analyser not available');
      return null;
    }

    // Validate URL before creating audio element
    if (!url) {
      console.warn('Invalid audio URL');
      return null;
    }

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    
    if (isMuted) {
      audio.muted = true;
    }

    const onWaiting = () => {
      if (!isNext) setBuffering(true);
    };
    
    const onPlaying = () => {
      if (!isNext) {
        setBuffering(false);
        updateConnectionTime();
      }
    };

    const onError = (e: Event) => {
      const error = (e.target as HTMLAudioElement)?.error;
      console.error('Audio error:', error?.message || 'Unknown error');
      if (!isNext) {
        setBuffering(true);
        // Only attempt recovery for the current audio
        if (audio === audioRef.current && audio.src) {
          try {
            const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
            // Set source only if URL is valid
            if (newUrl) {
              audio.src = newUrl;
              audio.load();
              void audio.play().catch((playError) => {
                console.error('Recovery play failed:', playError);
                setBuffering(true);
              });
            }
          } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
            setBuffering(true);
          }
        }
      }
    };

    const onCanPlay = () => {
      if (!isNext) setBuffering(false);
    };

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);

    try {
      // Set source before creating source node
      audio.src = url;
      audio.load(); // Explicitly load the audio
      
      // Create source node only after setting source
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(audioContext.destination);

      // Update references
      if (isNext) {
        nextSourceRef.current = source;
        nextAudioRef.current = audio;
      } else {
        sourceRef.current = source;
        audioRef.current = audio;
      }

      return () => {
        try {
          audio.removeEventListener("waiting", onWaiting);
          audio.removeEventListener("playing", onPlaying);
          audio.removeEventListener("error", onError);
          audio.removeEventListener("canplay", onCanPlay);
          
          // Ensure we stop playback before cleanup
          if (!audio.paused) {
            audio.pause();
          }
          
          // Disconnect source before clearing audio source
          if (source) {
            source.disconnect();
          }
          
          // Just remove the src attribute
          audio.removeAttribute('src');

          if (isNext) {
            nextSourceRef.current = null;
            nextAudioRef.current = null;
          } else {
            sourceRef.current = null;
            audioRef.current = null;
          }
        } catch (error) {
          console.error('Error cleaning up audio:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up audio source:', error);
      // Clean up on setup failure
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeAttribute('src');
      return null;
    }
  }, [audioContext, analyserNode, setBuffering, updateConnectionTime, isMuted, audioUrl]);

  const reloadAndPlay = useCallback(() => {
    const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    cleanupRef.current = setupNewAudioElement(newUrl);
    
    if (audioRef.current instanceof HTMLAudioElement) {
      audioRef.current.play()
        .then(() => {
          setPlaying(true);
          if (!hasStartedPlaying) {
            setHasStartedPlaying(true);
          }
        })
        .catch((error: Error) => {
          console.error('Error playing audio:', error);
          setBuffering(true);
        });
    }
  }, [audioUrl, hasStartedPlaying, setPlaying, setHasStartedPlaying, setupNewAudioElement, setBuffering]);

  const switchToNextAudio = useCallback(() => {
    if (!nextAudioRef.current || !isPlaying) return;

    try {
      // Store references to the old audio elements
      const oldAudio = audioRef.current;
      const oldSource = sourceRef.current;

      // Update references to the new audio
      audioRef.current = nextAudioRef.current;
      sourceRef.current = nextSourceRef.current;
      nextAudioRef.current = null;
      nextSourceRef.current = null;

      // Start playing the new audio first
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            // Only clean up the old connection after the new one is playing
            if (oldAudio) {
              if (!oldAudio.paused) {
                oldAudio.pause();
              }
              if (oldSource) {
                oldSource.disconnect();
              }
              oldAudio.removeAttribute('src');
            }
            incrementReconnectCount();
            setBuffering(false);
          })
          .catch((error: Error) => {
            console.error('Error playing audio after switch:', error);
            setBuffering(true);
            // Clean up failed new connection
            if (audioRef.current) {
              if (!audioRef.current.paused) {
                audioRef.current.pause();
              }
              if (sourceRef.current) {
                sourceRef.current.disconnect();
              }
              audioRef.current.removeAttribute('src');
            }
            // Restore old connection
            audioRef.current = oldAudio;
            sourceRef.current = oldSource;
            if (oldAudio) {
              oldAudio.play().catch(() => {
                // If old audio fails to play, try a complete reload
                const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
                if (newUrl) {
                  oldAudio.src = newUrl;
                  oldAudio.load();
                  void oldAudio.play().catch(() => {
                    setBuffering(true);
                  });
                }
              });
            }
          });
      }
    } catch (error) {
      console.error('Error during audio switch:', error);
      setBuffering(true);
      const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
      if (audioRef.current && newUrl) {
        audioRef.current.src = newUrl;
        audioRef.current.load();
        void audioRef.current.play().catch(() => {
          setBuffering(true);
        });
      }
    }
  }, [isPlaying, incrementReconnectCount, setBuffering, audioUrl]);

  // Handle automatic reconnection
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const scheduleNextReconnect = () => {
      if (!isPlaying || !audioContext) return;
      
      const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
      
      try {
        // Only clean up next audio if it exists
        if (nextAudioRef.current || nextSourceRef.current) {
          cleanupAudioConnection(true);
        }

        // Setup new audio connection
        const cleanup = setupNewAudioElement(newUrl, true);
        if (!cleanup) {
          console.warn('Failed to setup next audio element');
          reconnectTimeout = setTimeout(scheduleNextReconnect, 1000);
          return;
        }

        cleanupRef.current = cleanup;

        // Attempt to start playing the next audio
        const nextAudio = nextAudioRef.current;
        if (!nextAudio) {
          console.warn('Next audio not available after setup');
          reconnectTimeout = setTimeout(scheduleNextReconnect, 1000);
          return;
        }

        // Load the audio first
        nextAudio.load();
        
        // Wait for canplay event or timeout
        const playPromise = new Promise<void>((resolve, reject) => {
          const timeoutDuration = 3000; // Increased timeout duration
          
          const onCanPlay = () => {
            nextAudio.removeEventListener('canplay', onCanPlay);
            clearTimeout(timeoutId);
            resolve();
          };
          
          const timeoutId = setTimeout(() => {
            nextAudio.removeEventListener('canplay', onCanPlay);
            reject(new Error('Audio load timeout'));
          }, timeoutDuration);
          
          nextAudio.addEventListener('canplay', onCanPlay);
        });

        void playPromise
          .then(() => {
            // Double check audio is still valid before playing
            if (nextAudio === nextAudioRef.current && nextAudio.src) {
              return nextAudio.play();
            }
            throw new Error('Audio element changed during load');
          })
          .then(() => {
            switchToNextAudio();
            // Schedule the next reconnection
            reconnectTimeout = setTimeout(scheduleNextReconnect, RECONNECT_INTERVAL);
          })
          .catch((error: Error) => {
            console.error('Error during reconnection:', error);
            setBuffering(true);
            
            // Clean up failed connection
            if (nextAudioRef.current === nextAudio) {
              cleanupAudioConnection(true);
            }
            
            // Try again with backoff
            const backoffDelay = error.message.includes('timeout') ? 2000 : 1000;
            reconnectTimeout = setTimeout(scheduleNextReconnect, backoffDelay);
          });
      } catch (error) {
        console.error('Error setting up next audio:', error);
        // Try again with backoff
        reconnectTimeout = setTimeout(scheduleNextReconnect, 2000);
      }
    };

    // Start the reconnection cycle
    if (isPlaying) {
      reconnectTimeout = setTimeout(scheduleNextReconnect, RECONNECT_INTERVAL);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      // Only clean up next audio if it exists
      if (nextAudioRef.current || nextSourceRef.current) {
        cleanupAudioConnection(true);
      }
    };
  }, [isPlaying, audioUrl, audioContext, setupNewAudioElement, switchToNextAudio, setBuffering, cleanupAudioConnection]);

  // Handle initial audio setup
  useEffect(() => {
    cleanupRef.current = setupNewAudioElement(audioUrl);
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [audioUrl, setupNewAudioElement]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        const newUrl = `${audioUrl.split("&t=")[0]}&t=${Date.now()}`;
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        cleanupRef.current = setupNewAudioElement(newUrl);
        audioRef.current.play().then(() => {
          setPlaying(true);
          if (!hasStartedPlaying) {
            setHasStartedPlaying(true);
          }
        });
      }
    }
  }, [isPlaying, audioUrl, hasStartedPlaying, setPlaying, setHasStartedPlaying, setupNewAudioElement]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMutedState = !audioRef.current.muted;
      audioRef.current.muted = newMutedState;
      if (nextAudioRef.current) {
        nextAudioRef.current.muted = newMutedState;
      }
      setMuted(newMutedState);
    }
  }, [setMuted]);

  return (
    <div className="space-y-4">
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
      <ConnectionDebug />
    </div>
  );
}
