import { MessageSquare, Plane, TowerControl as Tower, Clock } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// eslint-disable-next-line no-unused-vars
export function LiveCaptionScreen({ _channel, captions, _onStop, msgRef }) {
    return (
        <>
            {/* Captions Feed */}
            <div className="flex-1 overflow-y-auto p-12 pt-24 pb-32 scrollbar-hide flex flex-col justify-end">
                <div className="space-y-6">
                    {captions.length > 0 ? captions.map((cap, i) => {
                        return (
                            <div
                                key={cap.id}
                                className={cn(
                                    "flex flex-col gap-1.5 max-w-5xl transition-all duration-700 ease-out",
                                    i === captions.length - 1 ? "opacity-100 translate-y-0" : "opacity-50 -translate-y-2 scale-[0.98]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0 shadow-sm",
                                        cap.speaker === 'ATC' ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" :
                                            cap.speaker === 'PLANE' ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20" :
                                                "bg-white/5 text-neutral-500"
                                    )}>
                                        {cap.speaker === 'ATC' ? <Tower className="w-4 h-4" /> :
                                            cap.speaker === 'PLANE' ? <Plane className="w-4 h-4" /> :
                                                <MessageSquare className="w-4 h-4" />}
                                    </div>

                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-[.2em] leading-none",
                                        cap.speaker === 'ATC' ? "text-blue-400/80" :
                                            cap.speaker === 'PLANE' ? "text-emerald-400/80" :
                                                "text-neutral-500"
                                    )}>
                                        {cap.speaker || 'UNKNOWN'}
                                    </span>

                                    <div className="flex items-center gap-1.5 opacity-20 ml-auto font-mono text-[10px]">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(cap.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="pl-0.5 mt-1">
                                    <p className={cn(
                                        "text-2xl md:text-4xl font-black italic tracking-tighter leading-[1.1] uppercase antialiased",
                                        cap.speaker === 'ATC' ? "text-blue-50/95" :
                                            cap.speaker === 'PLANE' ? "text-emerald-50/95" :
                                                "text-white"
                                    )}>
                                        {cap.text}
                                    </p>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="h-[60vh] flex flex-col items-center justify-center opacity-10 pb-24">
                            <MessageSquare className="w-20 h-20 mb-4 animate-pulse" />
                            <h2 className="text-2xl font-black italic uppercase tracking-widest">Awaiting Transmission</h2>
                        </div>
                    )}
                    <div ref={msgRef} className="h-4" />
                </div>
            </div>
        </>
    )
}
