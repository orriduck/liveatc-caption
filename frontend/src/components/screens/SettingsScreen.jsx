import { useState, useEffect } from 'react'
import { Settings, X, Key, Info, Github } from 'lucide-react'

export function SettingsScreen({ onClose, onSave, initialApiKey }) {
    const [apiKey, setApiKey] = useState(initialApiKey || '')

    const handleSave = () => {
        onSave(apiKey)
        onClose()
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-xl w-full mx-auto mt-20 p-8">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-900 rounded-2xl border border-white/5 shadow-2xl">
                            <Settings className="w-6 h-6 text-blue-500" />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Settings</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-800 rounded-full transition-all text-neutral-500 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-12">
                    {/* Gemini API Key Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Key className="w-4 h-4 text-blue-500" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Gemini API Key</h2>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mb-4">
                            Enter your Google Gemini API key to enable high-quality transcriptions.
                            Your key is stored locally on this device.
                        </p>
                        <div className="relative group">
                            <input
                                type="password"
                                placeholder="Paste your API key here..."
                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl py-4 pl-6 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-sm"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="pt-12 border-t border-white/5 space-y-6">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-neutral-600" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-600">About</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-white px-2 py-0.5 bg-blue-600 rounded">0.1.0</span>
                                <span className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Stable Release</span>
                            </div>
                            <p className="text-sm text-neutral-400 leading-relaxed italic">
                                Real-time ATC communication captioning powered by AI.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 pt-4">
                            <a
                                href="https://github.com/ruyyi/liveatc-caption"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-blue-400 transition-colors uppercase tracking-wider"
                            >
                                <Github className="w-4 h-4" />
                                GitHub Repository
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-16">
                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all uppercase tracking-widest"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    )
}
