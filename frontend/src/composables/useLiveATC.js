import { ref, shallowRef, onUnmounted, watch } from 'vue'

const API_BASE = "http://localhost:8000/api"
const WS_BASE = "ws://localhost:8000/ws"

export function useLiveATC() {
    const data = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const activeChannel = ref(null)
    const isConnected = ref(false)
    const captions = ref([])
    const geminiApiKey = ref(localStorage.getItem('gemini_api_key') || '')

    const wsRef = shallowRef(null)
    const audioRef = shallowRef(new Audio())

    const handleSearch = async (icao) => {
        if (!icao || icao.length < 3) return

        loading.value = true
        error.value = null

        try {
            const resp = await fetch(`${API_BASE}/search?icao=${icao.toUpperCase()}`)
            const result = await resp.json()
            data.value = result
            return result
        } catch (err) {
            console.error("Failed to fetch data", err)
            error.value = "Failed to fetch data. Is the backend running?"
        } finally {
            loading.value = false
        }
    }

    const connect = () => {
        if (!activeChannel.value) return

        isConnected.value = true
        captions.value = []

        // Audio setup
        const streamUrl = activeChannel.value.stream_url || `https://d.liveatc.net/${activeChannel.value.id}`
        audioRef.value.src = streamUrl
        audioRef.value.load()
        audioRef.value.play().catch(e => {
            console.error("Play failed", e)
            error.value = "Auto-play blocked by browser."
        })

        // WebSocket setup
        if (wsRef.value) wsRef.value.close()

        const wsUrl = new URL(`${WS_BASE}/caption/${activeChannel.value.id}`)
        if (geminiApiKey.value) {
            wsUrl.searchParams.append('api_key', geminiApiKey.value)
        }

        const ws = new WebSocket(wsUrl.toString())
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                if (msg.type === 'caption') {
                    const normalized = {}
                    Object.keys(msg).forEach(key => {
                        normalized[key.toLowerCase()] = msg[key]
                    })

                    captions.value = [...captions.value.slice(-49), {
                        ...normalized,
                        id: Date.now() + Math.random(),
                        timestamp: new Date()
                    }]
                } else if (msg.type === 'error') {
                    error.value = msg.error
                }
            } catch (e) {
                console.error("Failed to parse WS message", e)
            }
        }

        ws.onclose = () => {
            isConnected.value = false
        }

        wsRef.value = ws
    }

    const disconnect = () => {
        isConnected.value = false
        if (audioRef.value) {
            audioRef.value.pause()
            audioRef.value.src = ""
        }
        if (wsRef.value) {
            wsRef.value.close()
            wsRef.value = null
        }
    }

    const setGeminiApiKey = (key) => {
        geminiApiKey.value = key
        localStorage.setItem('gemini_api_key', key)
    }

    onUnmounted(() => {
        disconnect()
    })

    return {
        data,
        loading,
        error,
        activeChannel,
        isConnected,
        captions,
        geminiApiKey,
        handleSearch,
        connect,
        disconnect,
        setGeminiApiKey
    }
}
