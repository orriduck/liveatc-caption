import { create } from 'zustand';
import { AudioChannel } from '@/types/airport';

export interface AudioState {
  currentChannel: AudioChannel | null;
  isPlaying: boolean;
  isMuted: boolean;
  isBuffering: boolean;
  hasStartedPlaying: boolean;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  audioData: Uint8Array | null;
  connectionStartTime: number | null;
  reconnectCount: number;
  lastReconnectTime: number | null;
  actions: {
    setCurrentChannel: (channel: AudioChannel | null) => void;
    setPlaying: (isPlaying: boolean) => void;
    setMuted: (isMuted: boolean) => void;
    setBuffering: (isBuffering: boolean) => void;
    setHasStartedPlaying: (hasStarted: boolean) => void;
    initializeAudioContext: () => void;
    setAudioData: (data: Uint8Array) => void;
    cleanup: () => void;
    updateConnectionTime: () => void;
    incrementReconnectCount: () => void;
  };
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentChannel: null,
  isPlaying: false,
  isMuted: false,
  isBuffering: false,
  hasStartedPlaying: false,
  audioContext: null,
  analyserNode: null,
  audioData: null,
  connectionStartTime: null,
  reconnectCount: 0,
  lastReconnectTime: null,
  actions: {
    setCurrentChannel: (channel) => set({ currentChannel: channel }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setMuted: (isMuted) => set({ isMuted }),
    setBuffering: (isBuffering) => set({ isBuffering }),
    setHasStartedPlaying: (hasStarted) => set({ hasStartedPlaying: hasStarted }),
    initializeAudioContext: () => {
      const { audioContext } = get();
      if (audioContext) return; // Prevent multiple contexts

      const newAudioContext = new AudioContext();
      const analyserNode = newAudioContext.createAnalyser();
      analyserNode.fftSize = 256;
      set({ 
        audioContext: newAudioContext,
        analyserNode,
        audioData: new Uint8Array(analyserNode.frequencyBinCount),
        connectionStartTime: Date.now()
      });
    },
    setAudioData: (data) => set({ audioData: data }),
    cleanup: () => {
      const { audioContext, isPlaying } = get();
      if (!audioContext || isPlaying) return; // Don't cleanup if still playing

      audioContext.close();
      set({
        audioContext: null,
        analyserNode: null,
        audioData: null,
        isBuffering: false,
        connectionStartTime: null,
        reconnectCount: 0,
        lastReconnectTime: null
      });
    },
    updateConnectionTime: () => set({ 
      connectionStartTime: Date.now(),
      lastReconnectTime: Date.now()
    }),
    incrementReconnectCount: () => set((state) => ({ 
      reconnectCount: state.reconnectCount + 1,
      lastReconnectTime: Date.now()
    })),
  },
})); 