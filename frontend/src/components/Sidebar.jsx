import { useState, useMemo } from 'react'
import { Search, Radio, Activity, ChevronDown, Settings } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function Sidebar({
    icaoInput,
    setIcaoInput,
    handleSearch,
    loading,
    data,
    sortedChannels,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
    currentChannelId,
    selectChannel,
    isCollapsed,
    onToggle,
    onOpenSettings
}) {
    const [feedSearch, setFeedSearch] = useState('')
    const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

    const filteredChannels = useMemo(() => {
        if (!sortedChannels) return []
        return sortedChannels.filter(ch =>
            ch.name.toLowerCase().includes(feedSearch.toLowerCase())
        )
    }, [sortedChannels, feedSearch])

    if (isCollapsed) return null

    return (
        <aside className={cn(
            "w-80 border-none bg-neutral-950 p-3 flex flex-col h-full relative group",
            isMac && "pt-10"
        )}>
            <div className="flex-1 bg-neutral-900/40 backdrop-blur-3xl border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col relative shadow-2xl">
                {/* Header Section (Fixed) */}
                <div className="p-4 pb-2 flex flex-col gap-6">
                    <div className="flex items-center justify-between px-2 py-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/40">
                                <Radio className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight">LiveATC <span className="text-blue-500">Caption</span></h1>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-white transition-all"
                            title="Hide Sidebar"
                        >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                    </div>

                    <form onSubmit={handleSearch} className="px-1">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Enter ICAO (e.g. KBOS)"
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-xs"
                                value={icaoInput}
                                onChange={(e) => setIcaoInput(e.target.value)}
                            />
                        </div>
                    </form>

                    {data?.airport?.name && !loading && (
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
                            <h2 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-2">Airport</h2>
                            <p className="text-sm font-bold leading-tight">{data.airport.name}</p>
                            <p className="text-[11px] text-neutral-500 mt-1">{data.airport.city}, {data.airport.region}</p>
                            {data.airport.metar && (
                                <div className="mt-4 pt-4 border-t border-neutral-800/50 group/metar cursor-pointer">
                                    <h3 className="text-[10px] font-bold text-neutral-600 uppercase mb-2 tracking-widest">METAR</h3>
                                    <div className="relative overflow-hidden transition-all duration-500 ease-in-out max-h-20 group-hover/metar:max-h-96">
                                        <p className="text-[11px] leading-relaxed text-neutral-400 font-mono bg-black/30 p-2 rounded-lg border border-white/5">
                                            {data.airport.metar}
                                        </p>
                                        {/* Fade effect when collapsed */}
                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-900/40 to-transparent opacity-100 group-hover/metar:opacity-0 transition-opacity duration-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Channels Section (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 pt-0 scrollbar-hide flex flex-col gap-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-neutral-500 font-medium">Scanning frequency...</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-4">
                            {/* Sticky Feed Controls */}
                            <div className="sticky top-0 z-20 bg-[#0a0a0a] pt-4 pb-2 -mx-4 px-4 space-y-3 shadow-xl shadow-black/20">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Available Feeds</h2>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsSortOpen(!isSortOpen)}
                                            className="flex items-center gap-1 text-[10px] font-black text-neutral-600 hover:text-blue-400 uppercase tracking-wider transition-colors"
                                        >
                                            {sortBy === 'listeners' ? 'By Listeners' : 'By Name'}
                                            <ChevronDown className="w-3 h-3" />
                                        </button>

                                        {isSortOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                                                <div className="absolute right-0 top-full mt-2 w-36 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden">
                                                    <button
                                                        onClick={() => { setSortBy('listeners'); setIsSortOpen(false) }}
                                                        className={cn(
                                                            "w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-neutral-800 transition-colors uppercase tracking-wider",
                                                            sortBy === 'listeners' ? "text-blue-400" : "text-neutral-400"
                                                        )}
                                                    >
                                                        Listeners
                                                    </button>
                                                    <button
                                                        onClick={() => { setSortBy('name'); setIsSortOpen(false) }}
                                                        className={cn(
                                                            "w-full text-left px-4 py-2 text-[11px] font-bold hover:bg-neutral-800 transition-colors uppercase tracking-wider",
                                                            sortBy === 'name' ? "text-blue-400" : "text-neutral-400"
                                                        )}
                                                    >
                                                        Name
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="relative group/feedsearch">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 group-focus-within/feedsearch:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Filter feeds..."
                                        className="w-full bg-black/40 border border-neutral-800/50 rounded-lg py-1.5 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all text-[10px] font-medium placeholder:text-neutral-700"
                                        value={feedSearch}
                                        onChange={(e) => setFeedSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pb-4">
                                {filteredChannels.length > 0 ? filteredChannels.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => selectChannel(ch)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl transition-all border group",
                                            currentChannelId === ch.id
                                                ? "bg-blue-600/10 border-blue-500/50 text-blue-100"
                                                : "bg-neutral-900/30 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 text-neutral-400"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold truncate pr-2 group-hover:text-neutral-200 transition-colors">{ch.name}</span>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", ch.is_up ? "bg-green-500 shadow-lg shadow-green-500/40" : "bg-red-500 shadow-lg shadow-red-500/40")} />
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                                            <Activity className="w-3 h-3 opacity-30" />
                                            <span>{ch.listeners} listening</span>
                                        </div>
                                    </button>
                                )) : (
                                    <div className="flex flex-col items-center justify-center p-8 text-center opacity-30">
                                        <p className="text-[10px] font-bold uppercase tracking-widest italic">No feeds match</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 py-20 px-4">
                            <Search className="w-10 h-10 mb-4 text-neutral-600" />
                            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Search by ICAO code<br />to list live feeds</p>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button
                        onClick={onOpenSettings}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-800 transition-all group/settings"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-neutral-900 rounded-lg group-hover/settings:bg-neutral-800 transition-colors">
                                <Settings className="w-4 h-4 text-neutral-500 group-hover/settings:text-blue-500" />
                            </div>
                            <span className="text-xs font-bold text-neutral-500 group-hover/settings:text-neutral-200 uppercase tracking-widest">Settings</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-700 font-black">v0.1.0</span>
                    </button>
                </div>
            </div>
        </aside>
    )
}
