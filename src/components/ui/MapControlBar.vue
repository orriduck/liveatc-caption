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
                <ApproachViewIcon />
            </button>
            <button
                class="ctrl-btn"
                :class="{ active: activeZoom === ZOOM_AIRPORT }"
                title="Airport view"
                @click="$emit('zoom', ZOOM_AIRPORT)"
            >
                <AirportViewIcon />
            </button>
            <button
                class="ctrl-btn"
                :class="{ active: activeZoom === ZOOM_DETAIL }"
                title="Detail view"
                @click="$emit('zoom', ZOOM_DETAIL)"
            >
                <DetailViewIcon />
            </button>

            <div class="ctrl-sep" />

            <button
                class="ctrl-btn ctrl-audio"
                :class="{ playing, loading: !audioReady }"
                :aria-pressed="playing"
                :title="playing ? 'Pause Focus mode' : 'Start Focus mode'"
                @click="toggleAudio"
            >
                <FocusWaveIcon />
            </button>

            <button class="ctrl-btn ctrl-theme" :title="themeTitle" @click="cycleTheme">
                <ThemeModeIcon :theme="currentTheme" />
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
import AirportViewIcon from "./icons/AirportViewIcon.vue";
import ApproachViewIcon from "./icons/ApproachViewIcon.vue";
import DetailViewIcon from "./icons/DetailViewIcon.vue";
import FocusWaveIcon from "./icons/FocusWaveIcon.vue";
import ThemeModeIcon from "./icons/ThemeModeIcon.vue";

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
        color-mix(in oklab, var(--atc-card) 78%, transparent),
        color-mix(in oklab, var(--atc-elev) 86%, transparent)
    );
    backdrop-filter: blur(6px) saturate(120%);
    -webkit-backdrop-filter: blur(6px) saturate(120%);
    border: 1px solid var(--atc-line-strong);
    border-radius: 20px;
    bottom: 18px;
    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.18),
        0 24px 64px rgba(0, 0, 0, 0.22),
        inset 0 1px 0 color-mix(in oklab, var(--atc-line-strong) 90%, transparent);
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
        color-mix(in oklab, var(--atc-line-strong) 84%, transparent) 0%,
        color-mix(in oklab, var(--atc-line) 64%, transparent) 45%,
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
    color: var(--atc-faint);
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

.ctrl-btn :deep(svg) {
    height: 16px;
    width: 16px;
}

.ctrl-btn:hover {
    background: color-mix(in oklab, var(--atc-line) 60%, transparent);
    border-color: var(--atc-line-strong);
    color: var(--atc-dim);
}

.ctrl-btn.active {
    background: rgba(255, 90, 31, 0.12);
    border-color: rgba(255, 90, 31, 0.4);
    color: #ff5a1f;
}

.ctrl-sep {
    background: var(--atc-line-strong);
    border-radius: 1px;
    height: 1px;
    margin: 2px 6px;
    width: calc(100% - 12px);
}

/* ── Audio button ──────────────────────────── */
.ctrl-audio :deep(.wave) {
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

.ctrl-audio :deep(.bar) {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    transition: transform 0.3s ease;
}

.ctrl-audio :deep(.bar:nth-child(1)) {
    transform: scaleY(0.3);
}
.ctrl-audio :deep(.bar:nth-child(2)) {
    transform: scaleY(0.65);
}
.ctrl-audio :deep(.bar:nth-child(3)) {
    transform: scaleY(1);
}
.ctrl-audio :deep(.bar:nth-child(4)) {
    transform: scaleY(0.65);
}
.ctrl-audio :deep(.bar:nth-child(5)) {
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

.playing :deep(.bar) {
    animation: wave-flow 0.9s ease-in-out infinite;
    transition: none;
}
.playing :deep(.bar:nth-child(1)) {
    animation-delay: 0s;
}
.playing :deep(.bar:nth-child(2)) {
    animation-delay: -0.18s;
}
.playing :deep(.bar:nth-child(3)) {
    animation-delay: -0.36s;
}
.playing :deep(.bar:nth-child(4)) {
    animation-delay: -0.54s;
}
.playing :deep(.bar:nth-child(5)) {
    animation-delay: -0.72s;
}

.ctrl-theme {
    color: var(--atc-dim);
}
</style>
