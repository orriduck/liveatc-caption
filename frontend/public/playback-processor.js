/**
 * playback-processor.js — AudioWorklet for streaming PCM playback.
 *
 * Receives Float32Array chunks via port.postMessage({ type: 'pcm', samples })
 * and drains them through a ring buffer into the audio output.
 * Reports { type: 'position', samples: N } back every ~500 ms.
 */
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // 4-second ring buffer at 16 kHz mono
    this._capacity = 16000 * 4
    this._buf = new Float32Array(this._capacity)
    this._writePos = 0
    this._readPos = 0
    this._filled = 0
    this._totalPlayed = 0
    this._reportEvery = 64 * 128 // ~500 ms worth of render quanta

    this.port.onmessage = ({ data }) => {
      if (data.type !== 'pcm') return
      const samples = data.samples // Float32Array
      for (let i = 0; i < samples.length; i++) {
        if (this._filled < this._capacity) {
          this._buf[this._writePos] = samples[i]
          this._writePos = (this._writePos + 1) % this._capacity
          this._filled++
        }
        // Drop samples silently on overflow (should not happen with normal timing)
      }
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0][0]
    const n = out.length // always 128

    if (this._filled >= n) {
      for (let i = 0; i < n; i++) {
        out[i] = this._buf[this._readPos]
        this._readPos = (this._readPos + 1) % this._capacity
      }
      this._filled -= n
    } else {
      // Buffer underrun — output silence
      out.fill(0)
    }

    this._totalPlayed += n

    if (this._totalPlayed % this._reportEvery < n) {
      this.port.postMessage({ type: 'position', samples: this._totalPlayed })
    }

    return true // keep processor alive indefinitely
  }
}

registerProcessor('playback-processor', PlaybackProcessor)
