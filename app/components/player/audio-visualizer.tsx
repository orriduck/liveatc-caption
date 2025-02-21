import { useEffect, useRef } from 'react';
import { useAudioStore } from '@/store/audio-store';

interface ColorState {
  r: number;
  g: number;
  b: number;
}

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioData = useAudioStore((state) => state.audioData);
  const analyserNode = useAudioStore((state) => state.analyserNode);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setAudioData = useAudioStore((state) => state.actions.setAudioData);
  const frameRef = useRef<number | null>(null);
  const lastValuesRef = useRef<number[]>([]);
  const currentColorRef = useRef<ColorState>({ r: 34, g: 197, b: 94 }); // Start with green

  useEffect(() => {
    if (!canvasRef.current || !analyserNode || !audioData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize last values if needed
    if (lastValuesRef.current.length === 0) {
      lastValuesRef.current = new Array(audioData.length).fill(0);
    }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const barCount = 64; // Reduce number of bars for better visuals
      const smoothingFactor = 0.3; // Adjust for smoother transitions
      const colorSmoothingFactor = 0.1; // Slower color transitions

      // Get frequency data
      analyserNode.getByteFrequencyData(audioData);
      setAudioData(audioData);

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // Calculate bar dimensions
      const barWidth = (width / barCount) * 0.8;
      const barSpacing = (width / barCount) * 0.2;
      const maxBarHeight = height * 0.8;

      // Target colors
      const targetColor = isPlaying ? 
        { r: 34, g: 197, b: 94 } : // green-500
        { r: 59, g: 130, b: 246 }; // blue-500

      // Smooth color transition
      currentColorRef.current = {
        r: currentColorRef.current.r + (targetColor.r - currentColorRef.current.r) * colorSmoothingFactor,
        g: currentColorRef.current.g + (targetColor.g - currentColorRef.current.g) * colorSmoothingFactor,
        b: currentColorRef.current.b + (targetColor.b - currentColorRef.current.b) * colorSmoothingFactor,
      };

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Get average of frequency range
        const startIndex = Math.floor((i / barCount) * audioData.length);
        const endIndex = Math.floor(((i + 1) / barCount) * audioData.length);
        let sum = 0;
        for (let j = startIndex; j < endIndex; j++) {
          sum += audioData[j];
        }
        const value = sum / (endIndex - startIndex);

        // Calculate target height based on playing state
        const targetHeight = isPlaying ? 
          (Math.pow(value / 255, 1.5)) * maxBarHeight :
          0;

        // Smooth the height transition
        lastValuesRef.current[i] = lastValuesRef.current[i] * (1 - smoothingFactor) + 
                                  targetHeight * smoothingFactor;
        const barHeight = lastValuesRef.current[i];
        
        // Skip drawing if height is negligible
        if (barHeight < 0.1) continue;
        
        // Calculate position
        const x = (barWidth + barSpacing) * i;

        const { r, g, b } = currentColorRef.current;

        // Create gradients with current color
        const gradientUp = ctx.createLinearGradient(0, centerY, 0, centerY - barHeight);
        gradientUp.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
        gradientUp.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradientUp.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);

        const gradientDown = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
        gradientDown.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
        gradientDown.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradientDown.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);

        // Draw upper bar with rounded corners
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight, [barWidth/2]);
        ctx.fillStyle = gradientUp;
        ctx.fill();

        // Draw lower bar with rounded corners
        ctx.beginPath();
        ctx.roundRect(x, centerY, barWidth, barHeight, [barWidth/2]);
        ctx.fillStyle = gradientDown;
        ctx.fill();

        // Add glow effect
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw center line with enhanced glow when paused
      const { r, g, b } = currentColorRef.current;
      const lineGradient = ctx.createLinearGradient(0, centerY - 1, 0, centerY + 1);
      lineGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${isPlaying ? 0.1 : 0.2})`);
      lineGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${isPlaying ? 0.3 : 0.6})`);
      lineGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${isPlaying ? 0.1 : 0.2})`);
      
      // Add stronger glow effect for the line when paused
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${isPlaying ? 0.3 : 0.5})`;
      ctx.shadowBlur = isPlaying ? 15 : 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.fillStyle = lineGradient;
      ctx.fillRect(0, centerY - 1, width, 2);

      frameRef.current = requestAnimationFrame(draw);
    };

    // Always keep animation running for smooth transitions
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [analyserNode, audioData, isPlaying, setAudioData]);

  return (
    <div className="w-full h-40 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden shadow-lg">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={1024}
        height={160}
      />
    </div>
  );
} 