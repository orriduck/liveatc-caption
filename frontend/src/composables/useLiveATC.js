import { ref, shallowRef, onUnmounted } from 'vue'

const API_BASE = '/api'
const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export function useLiveATC() {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const activeChannel = ref(null)
  const isConnected = ref(false)
  const captions = ref([])
  const geminiApiKey = ref(localStorage.getItem('anthropic_api_key') || '')

  const connectionState = ref('IDLE')
  const isPlaying = ref(false)

  const wsRef = shallowRef(null)
  const audioCtxRef = shallowRef(null)
  const analyserRef = shallowRef(null)
  const workletNodeRef = shallowRef(null)

  let samplesPlayed = 0
  let pendingPcm = []       // buffer before worklet is ready
  let workletReady = false

  // ── Search ────────────────────────────────────────────────────────────────

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
      console.error('Failed to fetch data', err)
      error.value = 'Failed to fetch data. Is the backend running?'
    } finally {
      loading.value = false
    }
  }

  // ── Audio context (created once, reused) ─────────────────────────────────

  const initAudioContext = () => {
    if (!audioCtxRef.value) {
      audioCtxRef.value = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      })
    }
    return audioCtxRef.value
  }

  // ── Caption scheduling ────────────────────────────────────────────────────

  const scheduleCaption = (msg) => {
    const playbackNow = samplesPlayed / 16000
    const delayMs = Math.max(0, (msg.stream_offset - playbackNow) * 1000)
    setTimeout(() => {
      if (msg.is_error) return
      captions.value.push({
        speaker: msg.speaker || null,
        caption: msg.caption || null,
        details: msg.details || null,
        is_error: false,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        isTemp: false,
      })
    }, delayMs)
  }

  // ── PCM delivery ──────────────────────────────────────────────────────────

  const deliverPcm = (f32) => {
    if (workletReady && workletNodeRef.value) {
      workletNodeRef.value.port.postMessage({ type: 'pcm', samples: f32 })
    } else {
      pendingPcm.push(f32)
    }
  }

  const flushPendingPcm = () => {
    for (const chunk of pendingPcm) {
      workletNodeRef.value.port.postMessage({ type: 'pcm', samples: chunk })
    }
    pendingPcm = []
  }

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = async () => {
    if (!activeChannel.value) return
    disconnect()

    isConnected.value = true
    connectionState.value = 'LISTENING'
    captions.value = []
    samplesPlayed = 0
    pendingPcm = []
    workletReady = false

    const model = localStorage.getItem('ws_model') || 'tiny.en'
    const vad = localStorage.getItem('ws_vad') || '2'
    const silence = localStorage.getItem('ws_silence') || '600'
    const buffer = localStorage.getItem('ws_buffer') || '512'
    const syncOffset = localStorage.getItem('ws_sync_offset') || '0'

    const params = new URLSearchParams({ model, vad, silence, buffer, sync_offset: syncOffset })
    const wsUrl = `${WS_BASE}/caption/${activeChannel.value.id}?${params}`

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.value = ws

    ws.onopen = () => console.log('[WS] connected to', activeChannel.value?.id)

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)

        if (msg.type === 'stream_start') {
          // Tear down any previous worklet to avoid leaking audio nodes on reconnect
          if (workletNodeRef.value) {
            workletNodeRef.value.disconnect()
            workletNodeRef.value = null
          }
          analyserRef.value = null
          workletReady = false

          const ctx = initAudioContext()
          if (ctx.state === 'suspended') await ctx.resume().catch(() => {})

          await ctx.audioWorklet.addModule('/playback-processor.js')

          const worklet = new AudioWorkletNode(ctx, 'playback-processor')
          workletNodeRef.value = worklet

          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyserRef.value = analyser

          worklet.connect(analyser)
          analyser.connect(ctx.destination)

          worklet.port.onmessage = ({ data }) => {
            if (data.type === 'position') samplesPlayed = data.samples
          }

          workletReady = true
          flushPendingPcm()
          isPlaying.value = true
        }

        if (msg.type === 'caption') {
          scheduleCaption(msg)
        }

        if (msg.type === 'error') {
          error.value = msg.message
          console.error('[WS] server error:', msg.message)
        }
      } else {
        // Binary: raw PCM s16le → Float32
        const pcm16 = new Int16Array(event.data)
        const f32 = new Float32Array(pcm16.length)
        for (let i = 0; i < pcm16.length; i++) f32[i] = pcm16[i] / 32768
        deliverPcm(f32)
      }
    }

    ws.onclose = () => {
      wsRef.value = null
      isConnected.value = false
      connectionState.value = 'IDLE'
      isPlaying.value = false
      analyserRef.value = null
    }

    ws.onerror = (e) => {
      error.value = 'WebSocket connection failed'
      console.error('[WS] error', e)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = () => {
    if (wsRef.value) {
      wsRef.value.close()
      wsRef.value = null
    }
    if (workletNodeRef.value) {
      workletNodeRef.value.disconnect()
      workletNodeRef.value = null
    }
    analyserRef.value = null
    isConnected.value = false
    connectionState.value = 'IDLE'
    isPlaying.value = false
    workletReady = false
    pendingPcm = []
    samplesPlayed = 0
  }

  // ── Play / pause (suspend AudioContext) ──────────────────────────────────

  const togglePlay = async () => {
    const ctx = audioCtxRef.value
    if (!ctx) return
    if (ctx.state === 'suspended') {
      await ctx.resume()
      isPlaying.value = true
    } else {
      await ctx.suspend()
      isPlaying.value = false
    }
  }

  // ── API key ───────────────────────────────────────────────────────────────

  const setGeminiApiKey = (key) => {
    geminiApiKey.value = key
    localStorage.setItem('anthropic_api_key', key)
  }

  onUnmounted(() => disconnect())

  return {
    data,
    loading,
    error,
    activeChannel,
    isConnected,
    analyserRef,
    connectionState,
    isPlaying,
    captions,
    geminiApiKey,
    handleSearch,
    connect,
    disconnect,
    togglePlay,
    setGeminiApiKey,
  }
}
