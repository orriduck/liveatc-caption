import { useCallback, useEffect, useRef, useState } from "react";

interface DigitalClockProps {
  isVisible: boolean;
  isActive: boolean;
}

export default function DigitalClock({
  isVisible,
  isActive,
}: DigitalClockProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTime = useCallback(() => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    setCurrentTime(`${hours}:${minutes}:${seconds}`);
  }, []);

  useEffect(() => {
    if (isActive) {
      updateTime();
      intervalRef.current = setInterval(updateTime, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, updateTime]);

  if (!isVisible) return null;

  return (
    <span
      className={`font-mono text-sm transition-opacity duration-300 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      {currentTime}
    </span>
  );
}
