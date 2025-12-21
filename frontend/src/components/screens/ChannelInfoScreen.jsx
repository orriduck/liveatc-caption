import { Radio, Volume2 } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function ChannelInfoScreen({ channel, airport, onConnect }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-950/50 backdrop-blur-sm z-20">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="space-y-2">
                    <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-700 shadow-2xl">
                        <Radio className="w-10 h-10 text-neutral-400" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">{channel.name}</h2>
                    <p className="text-neutral-400 text-sm">{airport?.name} <span className="font-mono">({airport?.icao})</span></p>
                </div>

                <div className="flex items-center justify-center gap-8 py-6 border-y border-neutral-800/50">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white font-mono">{channel.listeners}</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Listeners</p>
                    </div>
                    <div className="text-center">
                        <p className={cn("text-2xl font-bold font-mono", channel.is_up ? "text-green-500" : "text-red-500")}>
                            {channel.is_up ? "ONLINE" : "OFFLINE"}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Status</p>
                    </div>
                </div>

                <button
                    onClick={onConnect}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                    <span className="group-hover:tracking-wider transition-all">START LISTENING</span>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Volume2 className="w-4 h-4 fill-current" />
                    </div>
                </button>
            </div>
        </div>
    )
}
