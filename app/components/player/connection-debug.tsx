import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAudioStore } from '@/store/audio-store';

export default function ConnectionDebug() {
  const { 
    connectionStartTime,
    reconnectCount,
    lastReconnectTime,
    isPlaying,
    isBuffering 
  } = useAudioStore();
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (!connectionStartTime || !isPlaying) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - connectionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [connectionStartTime, isPlaying]);

  return (
    <Card className="bg-background/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Connection Status:</div>
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${isBuffering ? 'bg-yellow-500 animate-pulse' : isPlaying ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span>{isBuffering ? 'Buffering' : isPlaying ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <div className="text-muted-foreground">Current Session:</div>
          <div>{elapsedTime}s</div>
          
          <div className="text-muted-foreground">Reconnection Count:</div>
          <div>{reconnectCount}</div>
          
          <div className="text-muted-foreground">Last Reconnect:</div>
          <div>{lastReconnectTime ? new Date(lastReconnectTime).toLocaleTimeString() : 'N/A'}</div>
          
          <div className="text-muted-foreground">Session Start:</div>
          <div>{connectionStartTime ? new Date(connectionStartTime).toLocaleTimeString() : 'N/A'}</div>
        </div>
      </CardContent>
    </Card>
  );
} 