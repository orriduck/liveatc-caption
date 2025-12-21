import { useState, useEffect } from 'react'
import { Activity, Square, Volume2 } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function Player({ channel, onStop }) {
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setDuration(d => d + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60
        return [
            h > 0 ? h : null,
            (h > 0 ? m.toString().padStart(2, '0') : m),
            s.toString().padStart(2, '0')
        ].filter(v => v !== null).join(':')
    }

    return (
        <div className="absolute bottom-0 left-0 right-0 z-[70] animate-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="bg-neutral-900/40 backdrop-blur-3xl border-t border-white/5 px-8 py-4 flex items-center justify-between shadow-2xl shadow-black/50 overflow-hidden group">
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                {/* Left: Channel Info */}
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center relative border border-white/10">
                        <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-900 shadow-sm" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-sm font-black text-white/90 uppercase tracking-wider">
                            {channel?.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest animate-pulse">Live</span>
                        </div>
                    </div>
                </div>

                {/* Right: Timer & Control */}
                <div className="flex items-center gap-8 relative z-10">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-0.5 opacity-50">Connection Time</span>
                        <span className="text-sm font-mono font-bold text-blue-100 tabular-nums tracking-tight">
                            {formatTime(duration)}
                        </span>
                    </div>

                    <div className="h-8 w-px bg-white/5" />

                    <button
                        onClick={onStop}
                        className="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl transition-all active:scale-95 group/stop"
                    >
                        <Square className="w-3.5 h-3.5 fill-current group-hover/stop:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Stop</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
