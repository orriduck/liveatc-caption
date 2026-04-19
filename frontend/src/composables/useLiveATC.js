import { ref, shallowRef, onUnmounted, watch } from 'vue'

const API_BASE = "/api"
const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

// VAD Configuration
const VAD_THRESHOLD = 0.03       // raised from 0.02 — avoids triggering on squelch noise
const SILENCE_DURATION_MS = 600  // lowered from 800ms — faster cutoff on short ATC transmissions
const MIN_SPEECH_DURATION_MS = 500
const PREROLL_BUFFER_MS = 1000

export function useLiveATC() {
    const data = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const activeChannel = ref(null)
    const isConnected = ref(false)
    const captions = ref([])
    const geminiApiKey = ref(localStorage.getItem('anthropic_api_key') || '')

    // States: IDLE, LISTENING, SPEAKING, TRANSCRIBING
    const connectionState = ref('IDLE')
    const isPlaying = ref(false)

    const wsRef = shallowRef(null)
    const audioRef = shallowRef(new Audio())
    const audioCtxRef = shallowRef(null)
    const analyserRef = shallowRef(null)
    const processorRef = shallowRef(null)
    const mediaStreamDestRef = shallowRef(null)
    const recorderRef = shallowRef(null)
    const mediaSourceRef = shallowRef(null)

    // Audio Buffers
    let audioChunks = []
    let isSpeaking = false
    let silenceStart = null
    let speechStart = null
    let rafId = null
    let transcribeAbort = null  // AbortController for in-flight transcription requests
    let connectionId = 0        // increments on every connect(); guards stale finalize() calls

    // Monitor Audio State
    watch(audioRef, (audio) => {
        if (!audio) return

        const onPlay = () => isPlaying.value = true
        const onPause = () => isPlaying.value = false
        const onEnded = () => isPlaying.value = false

        audio.addEventListener('play', onPlay)
        audio.addEventListener('pause', onPause)
        audio.addEventListener('ended', onEnded)

        onUnmounted(() => {
            audio.removeEventListener('play', onPlay)
            audio.removeEventListener('pause', onPause)
            audio.removeEventListener('ended', onEnded)
        })
    }, { immediate: true })

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

    const initAudioContext = () => {
        if (!audioCtxRef.value) {
            const AudioContext = window.AudioContext || window.webkitAudioContext
            audioCtxRef.value = new AudioContext()
        }
        return audioCtxRef.value
    }

    async function processAudioVolume(analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const checkVolume = () => {
            if (!isConnected.value) return

            analyser.getByteFrequencyData(dataArray)

            // Calculate RMS or average volume
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i]
            }
            const average = sum / dataArray.length
            const normalizedVol = average / 255

            const now = Date.now()

            // Only detect speech if actually playing
            if (isPlaying.value && normalizedVol > VAD_THRESHOLD) {
                // Speech detected
                if (!isSpeaking) {
                    isSpeaking = true
                    speechStart = now
                    connectionState.value = 'SPEAKING'
                    console.log(">>> SPEAKING STARTED")
                }
                silenceStart = null
            } else {
                // Silence detected
                if (isSpeaking) {
                    if (!silenceStart) {
                        silenceStart = now
                    } else if (now - silenceStart > SILENCE_DURATION_MS) {
                        // Cutoff reached
                        isSpeaking = false
                        const currentSpeechStart = speechStart
                        connectionState.value = 'TRANSCRIBING'
                        console.log("<<< SPEECH ENDED. Transcribing...")
                        stopRecordingAndTranscribe(currentSpeechStart)
                    }
                }
            }

            rafId = requestAnimationFrame(checkVolume)
        }
        checkVolume()
    }

    const startRecording = () => {
        if (!mediaStreamDestRef.value) return

        try {
            const stream = mediaStreamDestRef.value.stream
            recorderRef.value = new MediaRecorder(stream, { mimeType: 'audio/webm' })

            audioChunks = []

            recorderRef.value.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data)
                }
            }

            recorderRef.value.start(100)
        } catch (err) {
            console.error("MediaRecorder init failed", err)
        }
    }

    const stopRecordingAndTranscribe = async (startTime) => {
        if (!recorderRef.value || recorderRef.value.state === 'inactive') return

        recorderRef.value.stop()

        const capturedId = connectionId  // snapshot epoch at call time

        const finalize = async () => {
            if (connectionId !== capturedId) return  // stale — new connection started

            const blob = new Blob(audioChunks, { type: 'audio/webm' })

            if (blob.size > 5000) {
                await sendToTranscribe(blob, startTime)
            }

            if (connectionId !== capturedId) return  // disconnected during transcription

            audioChunks = []
            connectionState.value = 'LISTENING'
            // Restart recording loop if connected
            if (isConnected.value) {
                try { recorderRef.value.start(100) } catch (e) { }
            }
        }

        setTimeout(finalize, 50)
    }

    const sendToTranscribe = async (audioBlob, startTime) => {
        const abort = new AbortController()
        transcribeAbort = abort

        try {
            const formData = new FormData()
            formData.append("file", audioBlob)

            const mockId = Date.now()
            captions.value.push({
                id: mockId,
                caption: "TRANSCRIPT_PENDING",
                speaker: "...",
                timestamp: startTime ? new Date(startTime) : new Date(),
                isTemp: true
            })

            let url = `${WS_BASE.replace('ws://', 'http://').replace('wss://', 'https://')}/caption/transcribe`
            if (startTime) {
                url += `?start_time=${new Date(startTime).toISOString()}`
            }

            const headers = {}
            if (geminiApiKey.value) {
                headers['X-API-Key'] = geminiApiKey.value
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
                signal: abort.signal
            })

            if (!resp.ok) throw new Error("Transcription failed")

            const result = await resp.json()

            // Remove the pending/mock caption
            captions.value = captions.value.filter(c => c.id !== mockId)

            if (result.type === 'error') {
                console.error("Transcription error:", result.error)
                return
            }

            if (result.type === 'caption_list' && result.results) {
                result.results.forEach(res => {
                    // res is ATCCaption or ATCCaptionException
                    captions.value.push({
                        ...res,
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: res.timestamp ? new Date(res.timestamp) : new Date()
                    })
                })
            }

        } catch (e) {
            if (e.name === 'AbortError') return  // intentional cancel on stream switch
            console.error("Transcription send error", e)
            captions.value = captions.value.filter(c => !c.isTemp)
        } finally {
            if (transcribeAbort === abort) transcribeAbort = null
        }
    }

    const togglePlay = async () => {
        const audio = audioRef.value
        if (!audio) return

        if (audio.paused) {
            try {
                // Resume context if suspended
                if (audioCtxRef.value && audioCtxRef.value.state === 'suspended') {
                    await audioCtxRef.value.resume()
                }
                await audio.play()
                error.value = null
            } catch (e) {
                console.error("Play failed", e)
                error.value = "Click Play to enable audio."
            }
        } else {
            audio.pause()
        }
    }

    const connect = async () => {
        if (!activeChannel.value) return

        disconnect()

        isConnected.value = true
        connectionState.value = 'LISTENING'
        captions.value = []

        const proxyUrl = `${API_BASE}/proxy/${activeChannel.value.id}`
        const audio = audioRef.value

        // Resume AudioContext first — browsers suspend it on pause; resuming before
        // play() avoids "AudioContext was not allowed to start" on stream switches.
        const ctx = initAudioContext()
        if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => { })
        }

        audio.crossOrigin = "anonymous"
        audio.src = proxyUrl
        audio.load()  // explicit reset so the element is clean after src change

        try {
            await audio.play()
            error.value = null
        } catch (e) {
            if (e.name === "AbortError") {
                // AbortError is expected when src changes mid-load (e.g., rapid
                // stream switches). The audio element will recover on its own.
                console.warn("Audio load aborted (stream switching), ignoring")
            } else if (e.name === "NotAllowedError") {
                error.value = "Click Play to enable audio."
            } else {
                console.error("Auto-play failed", e)
                error.value = "Click Play to start stream."
            }
        }

        if (!mediaSourceRef.value) {
            // Try catch for re-init
            try { mediaSourceRef.value = ctx.createMediaElementSource(audio) } catch (e) {
                console.warn("MediaElementSource already attached?", e)
            }
        }

        // If mediaSourceRef is still null (rare), abort
        if (!mediaSourceRef.value) return

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyserRef.value = analyser

        try { mediaSourceRef.value.disconnect() } catch (e) { }

        mediaSourceRef.value.connect(analyser)
        analyser.connect(ctx.destination)

        const dest = ctx.createMediaStreamDestination()
        mediaSourceRef.value.connect(dest)
        mediaStreamDestRef.value = dest

        if (rafId) cancelAnimationFrame(rafId)
        processAudioVolume(analyser)

        startRecording()
    }

    const disconnect = () => {
        connectionId++                          // invalidate any pending finalize() calls
        if (transcribeAbort) {
            transcribeAbort.abort()
            transcribeAbort = null
        }

        isConnected.value = false
        connectionState.value = 'IDLE'
        analyserRef.value = null
        if (audioRef.value) {
            audioRef.value.pause()
            audioRef.value.src = ""
        }
        if (rafId) cancelAnimationFrame(rafId)
        if (recorderRef.value && recorderRef.value.state !== 'inactive') {
            try { recorderRef.value.stop() } catch (e) { }
        }

        isSpeaking = false
        silenceStart = null
        speechStart = null
        audioChunks = []
    }

    const setGeminiApiKey = (key) => {
        geminiApiKey.value = key
        localStorage.setItem('anthropic_api_key', key)
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
        analyserRef,
        connectionState,
        isPlaying,
        captions,
        geminiApiKey,
        handleSearch,
        connect,
        disconnect,
        togglePlay,
        setGeminiApiKey
    }
}
