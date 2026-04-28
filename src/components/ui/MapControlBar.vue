<template>
    <div ref="playerEl" class="yt-sink" />
    <div class="map-ctrl-zone">
        <div class="map-ctrl-bar">
            <button
                class="ctrl-btn"
                :class="{ active: activeZoom === ZOOM_APPROACH }"
                title="Approaching view"
                @click="$emit('zoom', ZOOM_APPROACH)"
            >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle
                        cx="10"
                        cy="10"
                        r="7.5"
                        stroke="currentColor"
                        stroke-width="1.4"
                    />
                    <circle
                        cx="10"
                        cy="10"
                        r="4"
                        stroke="currentColor"
                        stroke-width="1.4"
                    />
                    <circle cx="10" cy="10" r="1.4" fill="currentColor" />
                </svg>
            </button>
            <button
                class="ctrl-btn"
                :class="{ active: activeZoom === ZOOM_AIRPORT }"
                title="Airport view"
                @click="$emit('zoom', ZOOM_AIRPORT)"
            >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect
                        x="9.2"
                        y="2.5"
                        width="1.6"
                        height="15"
                        rx="0.8"
                        fill="currentColor"
                    />
                    <rect
                        x="2.5"
                        y="9.2"
                        width="15"
                        height="1.6"
                        rx="0.8"
                        fill="currentColor"
                    />
                    <rect
                        x="6"
                        y="6"
                        width="8"
                        height="8"
                        rx="1"
                        stroke="currentColor"
                        stroke-width="1.2"
                    />
                </svg>
            </button>
            <button
                class="ctrl-btn"
                :class="{ active: activeZoom === ZOOM_DETAIL }"
                title="Detail view"
                @click="$emit('zoom', ZOOM_DETAIL)"
            >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle
                        cx="8.5"
                        cy="8.5"
                        r="5.5"
                        stroke="currentColor"
                        stroke-width="1.4"
                    />
                    <line
                        x1="12.5"
                        y1="12.5"
                        x2="16.5"
                        y2="16.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                    />
                    <line
                        x1="6.5"
                        y1="8.5"
                        x2="10.5"
                        y2="8.5"
                        stroke="currentColor"
                        stroke-width="1.2"
                        stroke-linecap="round"
                    />
                    <line
                        x1="8.5"
                        y1="6.5"
                        x2="8.5"
                        y2="10.5"
                        stroke="currentColor"
                        stroke-width="1.2"
                        stroke-linecap="round"
                    />
                </svg>
            </button>

            <div class="ctrl-sep" />

            <button
                class="ctrl-btn ctrl-audio"
                :class="{ playing, loading: !audioReady }"
                :aria-pressed="playing"
                :title="playing ? 'Pause Focus mode' : 'Start Focus mode'"
                @click="toggleAudio"
            >
                <svg
                    class="wave"
                    viewBox="0 0 22 12"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <rect
                        class="bar"
                        x="0"
                        y="0"
                        width="3"
                        height="12"
                        rx="1.5"
                    />
                    <rect
                        class="bar"
                        x="4.75"
                        y="0"
                        width="3"
                        height="12"
                        rx="1.5"
                    />
                    <rect
                        class="bar"
                        x="9.5"
                        y="0"
                        width="3"
                        height="12"
                        rx="1.5"
                    />
                    <rect
                        class="bar"
                        x="14.25"
                        y="0"
                        width="3"
                        height="12"
                        rx="1.5"
                    />
                    <rect
                        class="bar"
                        x="19"
                        y="0"
                        width="3"
                        height="12"
                        rx="1.5"
                    />
                </svg>
            </button>

            <button class="ctrl-btn ctrl-theme" :title="themeTitle" @click="cycleTheme">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle
                        v-if="currentTheme === THEME_LIGHT"
                        cx="10"
                        cy="10"
                        r="3.1"
                        fill="currentColor"
                    />
                    <g
                        v-if="currentTheme === THEME_LIGHT"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linecap="round"
                    >
                        <line x1="10" y1="2.3" x2="10" y2="4.3" />
                        <line x1="10" y1="15.7" x2="10" y2="17.7" />
                        <line x1="2.3" y1="10" x2="4.3" y2="10" />
                        <line x1="15.7" y1="10" x2="17.7" y2="10" />
                        <line x1="4.4" y1="4.4" x2="5.8" y2="5.8" />
                        <line x1="14.2" y1="14.2" x2="15.6" y2="15.6" />
                        <line x1="14.2" y1="5.8" x2="15.6" y2="4.4" />
                        <line x1="4.4" y1="15.6" x2="5.8" y2="14.2" />
                    </g>
                    <path
                        v-else-if="currentTheme === THEME_DARK"
                        d="M13.6 2.7A6.8 6.8 0 1 0 17.3 10a7.1 7.1 0 0 1-3.7-7.3z"
                        fill="currentColor"
                    />
                    <g v-else stroke="currentColor" stroke-width="1.2" fill="none">
                        <rect x="3" y="4.2" width="14" height="9.2" rx="1.3" />
                        <line x1="7.2" y1="16.4" x2="12.8" y2="16.4" />
                    </g>
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
    ZOOM_AIRPORT,
    ZOOM_APPROACH,
    ZOOM_DETAIL,
} from "../../utils/airportMapDisplay.js";
import {
    THEME_DARK,
    THEME_LIGHT,
    THEME_SYSTEM,
    applyThemePreference,
    initThemePreference,
    nextTheme,
    writeStoredTheme,
} from "../../utils/theme.js";

const VIDEO_ID = "JDQiaRYmTGk";

defineProps({
    activeZoom: { type: Number, default: ZOOM_AIRPORT },
});

defineEmits(["zoom"]);

const playerEl = ref(null);
const playing = ref(false);
const audioReady = ref(false);
const currentTheme = ref(THEME_SYSTEM);
let player = null;
let mediaQueryList = null;
let mediaQueryListener = null;

const themeTitle = computed(() => {
    if (currentTheme.value === THEME_LIGHT) return "Theme: Light (click to switch)";
    if (currentTheme.value === THEME_DARK) return "Theme: Dark (click to switch)";
    return "Theme: System (click to switch)";
});

const cycleTheme = () => {
    const next = nextTheme(currentTheme.value);
    currentTheme.value = next;
    writeStoredTheme(next);
    applyThemePreference({ theme: next, mediaQueryList });
};

const loadApi = () =>
    new Promise((resolve) => {
        if (window.YT?.Player) {
            resolve();
            return;
        }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            resolve();
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const s = document.createElement("script");
            s.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(s);
        }
    });

onMounted(async () => {
    mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    currentTheme.value = initThemePreference({ mediaQueryList }).preference;
    mediaQueryListener = () => {
        if (currentTheme.value === THEME_SYSTEM) {
            applyThemePreference({ theme: THEME_SYSTEM, mediaQueryList });
        }
    };
    mediaQueryList.addEventListener("change", mediaQueryListener);

    await loadApi();
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
            onReady() {
                audioReady.value = true;
            },
            onStateChange(e) {
                playing.value = e.data === window.YT.PlayerState.PLAYING;
            },
        },
    });
});

onBeforeUnmount(() => {
    if (mediaQueryList && mediaQueryListener) {
        mediaQueryList.removeEventListener("change", mediaQueryListener);
    }
    player?.destroy();
    player = null;
});

const toggleAudio = () => {
    if (!player || !audioReady.value) return;
    player.getPlayerState() === window.YT.PlayerState.PLAYING
        ? player.pauseVideo()
        : player.playVideo();
};
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

.map-ctrl-zone {
    bottom: 0;
    height: 300px;
    position: fixed;
    right: 0;
    width: 80px;
    z-index: 50;
}

.map-ctrl-bar {
    align-items: center;
    background: linear-gradient(
        145deg,
        rgba(38, 40, 46, 0.2),
        rgba(14, 16, 20, 0.34)
    );
    backdrop-filter: blur(6px) saturate(120%);
    -webkit-backdrop-filter: blur(6px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 20px;
    bottom: 18px;
    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.18),
        0 24px 64px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    padding: 6px;
    position: absolute;
    right: 0;
    transform: translateX(calc(100% - 14px));
    transition: transform 0.28s cubic-bezier(0.34, 1.1, 0.64, 1);
}

.map-ctrl-zone:hover .map-ctrl-bar {
    transform: translateX(-18px);
}

.map-ctrl-bar::before {
    background: linear-gradient(
        120deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.03) 45%,
        transparent 60%
    );
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
}

.ctrl-btn {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: rgba(245, 245, 247, 0.38);
    cursor: pointer;
    display: flex;
    height: 36px;
    justify-content: center;
    padding: 0;
    position: relative;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
    width: 36px;
}

.ctrl-btn svg {
    height: 16px;
    width: 16px;
}

.ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(245, 245, 247, 0.75);
}

.ctrl-btn.active {
    background: rgba(255, 90, 31, 0.12);
    border-color: rgba(255, 90, 31, 0.4);
    color: #ff5a1f;
}

.ctrl-sep {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1px;
    height: 1px;
    margin: 2px 6px;
    width: calc(100% - 12px);
}

/* ── Audio button ──────────────────────────── */
.ctrl-audio .wave {
    height: 12px;
    width: 22px;
}

.ctrl-audio.playing {
    border-color: rgba(255, 90, 31, 0.5);
    color: #ff5a1f;
    box-shadow: 0 0 10px rgba(255, 90, 31, 0.14);
}

.ctrl-audio.loading {
    opacity: 0.4;
    pointer-events: none;
}

.bar {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    transition: transform 0.3s ease;
}

.bar:nth-child(1) {
    transform: scaleY(0.3);
}
.bar:nth-child(2) {
    transform: scaleY(0.65);
}
.bar:nth-child(3) {
    transform: scaleY(1);
}
.bar:nth-child(4) {
    transform: scaleY(0.65);
}
.bar:nth-child(5) {
    transform: scaleY(0.3);
}

@keyframes wave-flow {
    0%,
    100% {
        transform: scaleY(0.22);
    }
    50% {
        transform: scaleY(1);
    }
}

.playing .bar {
    animation: wave-flow 0.9s ease-in-out infinite;
    transition: none;
}
.playing .bar:nth-child(1) {
    animation-delay: 0s;
}
.playing .bar:nth-child(2) {
    animation-delay: -0.18s;
}
.playing .bar:nth-child(3) {
    animation-delay: -0.36s;
}
.playing .bar:nth-child(4) {
    animation-delay: -0.54s;
}
.playing .bar:nth-child(5) {
    animation-delay: -0.72s;
}

.ctrl-theme {
    color: rgba(245, 245, 247, 0.7);
}
</style>
