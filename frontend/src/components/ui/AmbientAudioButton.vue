<template>
  <div ref="playerEl" class="yt-sink" />
  <button
    class="ambient-btn"
    :class="{ playing, loading: !ready }"
    :aria-pressed="playing"
    :title="playing ? 'Pause Focus mode' : 'Start Focus mode'"
    @click="toggle"
  >
    <svg class="wave" viewBox="0 0 22 12" fill="currentColor" aria-hidden="true">
      <rect class="bar" x="0"     y="0" width="3" height="12" rx="1.5" />
      <rect class="bar" x="4.75"  y="0" width="3" height="12" rx="1.5" />
      <rect class="bar" x="9.5"   y="0" width="3" height="12" rx="1.5" />
      <rect class="bar" x="14.25" y="0" width="3" height="12" rx="1.5" />
      <rect class="bar" x="19"    y="0" width="3" height="12" rx="1.5" />
    </svg>
    <span class="label">Focus mode</span>
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
    playerVars: { autoplay: 0, loop: 1, playlist: VIDEO_ID, controls: 0, playsinline: 1, rel: 0 },
    events: {
      onReady() { ready.value = true },
      onStateChange(e) { playing.value = e.data === window.YT.PlayerState.PLAYING },
    },
  })
})

onBeforeUnmount(() => { player?.destroy(); player = null })

const toggle = () => {
  if (!player || !ready.value) return
  player.getPlayerState() === window.YT.PlayerState.PLAYING
    ? player.pauseVideo()
    : player.playVideo()
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

.ambient-btn {
  align-items: center;
  background: linear-gradient(145deg, rgba(28, 30, 35, 0.82), rgba(14, 15, 19, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  color: rgba(245, 245, 247, 0.38);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 11px;
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  z-index: 50;
}

.ambient-btn:hover {
  border-color: rgba(255, 90, 31, 0.35);
  color: rgba(245, 245, 247, 0.72);
}

.ambient-btn.playing {
  border-color: rgba(255, 90, 31, 0.55);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 0 14px rgba(255, 90, 31, 0.16);
  color: #ff5a1f;
}

.ambient-btn.loading {
  opacity: 0.4;
  pointer-events: none;
}

/* ── Wave icon ─────────────────────────────── */
.wave {
  height: 12px;
  width: 22px;
}

.bar {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  transition: transform 0.3s ease;
}

/* Static shape: low-high-low wave */
.bar:nth-child(1) { transform: scaleY(0.30); }
.bar:nth-child(2) { transform: scaleY(0.65); }
.bar:nth-child(3) { transform: scaleY(1.00); }
.bar:nth-child(4) { transform: scaleY(0.65); }
.bar:nth-child(5) { transform: scaleY(0.30); }

/* Flowing animation when playing */
@keyframes wave-flow {
  0%, 100% { transform: scaleY(0.22); }
  50%       { transform: scaleY(1.00); }
}

.playing .bar {
  animation: wave-flow 0.9s ease-in-out infinite;
  transition: none;
}
.playing .bar:nth-child(1) { animation-delay:  0.00s; }
.playing .bar:nth-child(2) { animation-delay: -0.18s; }
.playing .bar:nth-child(3) { animation-delay: -0.36s; }
.playing .bar:nth-child(4) { animation-delay: -0.54s; }
.playing .bar:nth-child(5) { animation-delay: -0.72s; }

/* ── Label ─────────────────────────────────── */
.label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1.1px;
  line-height: 1;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
</style>
