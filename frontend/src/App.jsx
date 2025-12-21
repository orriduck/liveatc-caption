import { useState, useEffect, useRef, useMemo } from 'react'
import { BrowserRouter, useSearchParams } from 'react-router-dom'
import { Radio, Plane } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const API_BASE = "http://localhost:8000/api"
const WS_BASE = "ws://localhost:8000/ws"

import { Sidebar } from './components/Sidebar'
import { ChannelInfoScreen } from './components/screens/ChannelInfoScreen'
import { LiveCaptionScreen } from './components/screens/LiveCaptionScreen'
import { Player } from './components/Player'

function LiveATCApp() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [icaoInput, setIcaoInput] = useState(searchParams.get('icao') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeChannel, setActiveChannel] = useState(null)
  const [captions, setCaptions] = useState([])
  const [error, setError] = useState(null)

  const [isConnected, setIsConnected] = useState(false)
  const [sortBy, setSortBy] = useState('listeners') // 'listeners' | 'name'
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  const wsRef = useRef(null)
  const audioRef = useRef(null)
  const captionsEndRef = useRef(null)

  const scrollToBottom = () => {
    captionsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [captions])

  // Get current state from URL
  const currentIcao = searchParams.get('icao')
  const currentChannelId = searchParams.get('channel')

  // Auto-Search Effect
  useEffect(() => {
    if (currentIcao && (!data || data.airport?.icao !== currentIcao)) {
      handleSearch(null, currentIcao)
    }
  }, [currentIcao])

  // Auto-Select Effect (Only selects, doesn't play)
  useEffect(() => {
    if (data && currentChannelId) {
      const channel = data.channels.find(c => c.id === currentChannelId)
      if (channel && activeChannel?.id !== channel.id) {
        // Just select, don't start
        setActiveChannel(channel)
        setIsConnected(false)
      }
    }
  }, [data, currentChannelId])

  // Sorted Channels
  const sortedChannels = useMemo(() => {
    if (!data?.channels) return []
    return [...data.channels].sort((a, b) => {
      if (sortBy === 'listeners') {
        return b.listeners - a.listeners
      }
      return a.name.localeCompare(b.name)
    })
  }, [data?.channels, sortBy])

  const handleSearch = async (e, forcedIcao) => {
    if (e) e.preventDefault()
    const targetIcao = forcedIcao || icaoInput
    if (!targetIcao || targetIcao.length < 3) return

    setLoading(true)
    setError(null)

    // Update URL if manually searched
    if (!forcedIcao) {
      setSearchParams({ icao: targetIcao.toUpperCase() })
    }

    try {
      const resp = await fetch(`${API_BASE}/search?icao=${targetIcao.toUpperCase()}`)
      const result = await resp.json()
      setData(result)
    } catch (err) {
      setError("Failed to fetch data. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  const connect = () => {
    if (!activeChannel) return
    setIsConnected(true)
    setCaptions([])

    // Audio
    if (audioRef.current) {
      audioRef.current.src = activeChannel.stream_url || `https://d.liveatc.net/${activeChannel.id}`
      audioRef.current.load()
      audioRef.current.play().catch(e => {
        console.log("Play failed", e)
        setError("Auto-play blocked by browser.")
      })
    }

    // WebSocket
    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(`${WS_BASE}/caption/${activeChannel.id}`)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'caption') {
          // Normalize keys just in case
          const normalized = {}
          Object.keys(msg).forEach(key => {
            normalized[key.toLowerCase()] = msg[key]
          })

          setCaptions(prev => [...prev.slice(-49), {
            ...normalized,
            id: Date.now() + Math.random(),
            timestamp: new Date()
          }])
        } else if (msg.type === 'error') {
          setError(msg.error)
        }
      } catch (e) {
        console.error("Failed to parse WS message", e)
      }
    }
    wsRef.current = ws
  }

  const disconnect = () => {
    setIsConnected(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const selectChannel = (channel) => {
    // Just update URL, effect will handle selection
    setSearchParams({ icao: currentIcao, channel: channel.id })
    // Reset connection state if switching channels
    if (activeChannel?.id !== channel.id) {
      disconnect()
    }
  }

  return (
    <div className="flex h-screen bg-black text-neutral-100 overflow-hidden relative">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />

      {/* Collapsed Pill Button */}
      {!isSidebarVisible && (
        <button
          onClick={() => setIsSidebarVisible(true)}
          className="fixed top-6 left-6 z-[60] bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg shadow-blue-900/40 flex items-center gap-2 animate-in fade-in zoom-in slide-in-from-left-4 duration-300 font-bold text-xs"
        >
          <Radio className="w-4 h-4" />
          <span>LIVEATC</span>
        </button>
      )}

      {/* Sidebar: Feed List */}
      <div className={cn(
        "transition-all duration-500 ease-in-out h-full overflow-hidden",
        isSidebarVisible ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"
      )}>
        <Sidebar
          icaoInput={icaoInput}
          setIcaoInput={setIcaoInput}
          handleSearch={handleSearch}
          loading={loading}
          data={data}
          sortedChannels={sortedChannels}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isSortOpen={isSortOpen}
          setIsSortOpen={setIsSortOpen}
          currentChannelId={currentChannelId}
          selectChannel={selectChannel}
          isCollapsed={!isSidebarVisible}
          onToggle={() => setIsSidebarVisible(false)}
        />
      </div>

      {/* Main Content (Caption Panel) */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {activeChannel ? (
          isConnected ? (
            <LiveCaptionScreen
              channel={activeChannel}
              captions={captions}
              onStop={disconnect}
              msgRef={captionsEndRef}
            />
          ) : (
            <ChannelInfoScreen
              channel={activeChannel}
              airport={data?.airport}
              onConnect={connect}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md text-center opacity-20">
              <Radio className="w-24 h-24 mx-auto mb-6" />
              <h2 className="text-2xl font-black uppercase tracking-widest">Select Frequency</h2>
              <p className="mt-2 text-sm italic">Transmission captions will appear here in real-time</p>
            </div>
          </div>
        )}

        {/* Floating Player */}
        {isConnected && activeChannel && (
          <Player
            channel={activeChannel}
            onStop={disconnect}
          />
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-6 right-6 bg-red-600/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom flex items-center gap-3 z-[100]">
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="text-white/50 hover:text-white transition-colors text-lg">✕</button>
          </div>
        )}
      </main>
    </div >
  )
}

function App() {
  return (
    <BrowserRouter>
      <LiveATCApp />
    </BrowserRouter>
  )
}

export default App
