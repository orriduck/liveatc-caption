<template>
  <div ref="playerEl" class="yt-sink" />
  <button
    class="ambient-audio-btn"
    :class="{ playing, loading: !ready }"
    :title="playing ? 'Pause ambient audio' : 'Play ambient audio'"
    :aria-pressed="playing"
    aria-label="Ambient audio"
    @click="toggle"
  >
    <svg v-if="playing" class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="4" width="3.5" height="12" rx="1.5" fill="currentColor" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="1.5" fill="currentColor" />
    </svg>
    <svg v-else class="icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 4.5L15.5 10L6 15.5V4.5Z" fill="currentColor" />
    </svg>

    <span class="audio-label">{{ playing ? 'Live' : 'ATC' }}</span>
  </button>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const VIDEO_ID = 'JDQiaRYmTGk'

const playerEl = ref(null)
const playing = ref(false)
const ready = ref(false)

let player = null

const loadApi = () => new Promise((resolve) => {
  if (window.YT?.Player) { resolve(); return }
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => { prev?.(); resolve() }
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
  }
})

onMounted(async () => {
  await loadApi()
  player = new window.YT.Player(playerEl.value, {
    height: 1,
    width: 1,
    videoId: VIDEO_ID,
    playerVars: {
      autoplay: 0,
      loop: 1,
      playlist: VIDEO_ID,
      controls: 0,
      playsinline: 1,
      rel: 0,
    },
    events: {
      onReady() { ready.value = true },
      onStateChange(e) {
        playing.value = e.data === window.YT.PlayerState.PLAYING
      },
    },
  })
})

onBeforeUnmount(() => {
  player?.destroy()
  player = null
})

const toggle = () => {
  if (!player || !ready.value) return
  if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
    player.pauseVideo()
  } else {
    player.playVideo()
  }
}
</script>

<style scoped>
.yt-sink {
  clip-path: inset(100%);
  height: 1px;
  left: 0;
  overflow: hidden;
  pointer-events: none;
  position: fixed;
  top: 0;
  width: 1px;
}

.ambient-audio-btn {
  align-items: center;
  background: linear-gradient(145deg, rgba(32, 34, 39, 0.88), rgba(16, 17, 21, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: rgba(245, 245, 247, 0.55);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 10px;
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  transition: color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  z-index: 50;
}

.ambient-audio-btn:hover {
  border-color: rgba(255, 90, 31, 0.45);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(255, 90, 31, 0.2);
  color: rgba(245, 245, 247, 0.9);
}

.ambient-audio-btn.playing {
  border-color: rgba(255, 90, 31, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(255, 90, 31, 0.28), 0 0 18px rgba(255, 90, 31, 0.18);
  color: var(--atc-orange, #ff5a1f);
}

.ambient-audio-btn.loading {
  opacity: 0.5;
  pointer-events: none;
}

.icon {
  flex-shrink: 0;
  height: 18px;
  width: 18px;
}

.audio-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.2px;
  line-height: 1;
  text-transform: uppercase;
}
</style>
