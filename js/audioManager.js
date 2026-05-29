import { connectAudioElement, resumeNeonSync } from './neonSync.js';
import { saveSettings, loadSettings } from './saveSystem.js';

const tracks = {};
const sounds = {};

let currentMusic = null;
let currentMusicName = null;
let muted = false;
let masterVolume = 0.75;
let musicVolume = 0.65;
let sfxVolume = 0.85;

// Load saved settings on startup
const saved = loadSettings();
if (saved) {
    if (saved.masterVolume !== undefined) masterVolume = saved.masterVolume;
    if (saved.musicVolume !== undefined) musicVolume = saved.musicVolume;
    if (saved.sfxVolume !== undefined) sfxVolume = saved.sfxVolume;
    if (saved.muted !== undefined) muted = saved.muted;
}

export function registerMusic(name, src, loop = true) {
    const audio = new Audio();
    if (src.startsWith('http://') || src.startsWith('https://')) {
        try { new URL(src); audio.crossOrigin = 'anonymous'; } catch (_) { /* relative URL, skip */ }
    }
    audio.src = src;
    audio.loop = loop;
    audio.preload = 'auto';
    audio.volume = masterVolume * musicVolume;

    tracks[name] = audio;
}

export function registerSound(name, src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = masterVolume * sfxVolume;

    sounds[name] = audio;
}

export function playMusic(name) {
    if (muted) return;
    if (!tracks[name]) return;

    if (currentMusic && currentMusic !== tracks[name]) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }

    currentMusic = tracks[name];
    currentMusicName = name;
    currentMusic.volume = masterVolume * musicVolume;

    resumeNeonSync();
    connectAudioElement(currentMusic);

    currentMusic.play().catch(() => {
        console.warn('Audio konnte noch nicht gestartet werden.');
    });
}

export function stopMusic() {
    if (!currentMusic) return;

    currentMusic.pause();
    currentMusic.currentTime = 0;
    currentMusic = null;
    currentMusicName = null;
}

export function playSound(name) {
    if (muted) return;
    if (!sounds[name]) return;

    const sound = sounds[name].cloneNode();
    sound.volume = masterVolume * sfxVolume;
    sound.play().catch(() => {});
}

export function setMuted(value) {
    muted = value;

    if (currentMusic) {
        currentMusic.muted = muted;
    }
}

export function toggleMuted() {
    setMuted(!muted);
    return muted;
}

// --- Volume Controls ---

export function setMasterVolume(value) {
    masterVolume = Math.max(0, Math.min(1, value));

    if (currentMusic) {
        currentMusic.volume = masterVolume * musicVolume;
    }

    // Update all registered sounds base volume
    for (const name in sounds) {
        sounds[name].volume = masterVolume * sfxVolume;
    }
}

export function setMusicVolume(value) {
    musicVolume = Math.max(0, Math.min(1, value));

    if (currentMusic) {
        currentMusic.volume = masterVolume * musicVolume;
    }
}

export function setSfxVolume(value) {
    sfxVolume = Math.max(0, Math.min(1, value));

    for (const name in sounds) {
        sounds[name].volume = masterVolume * sfxVolume;
    }
}

export function getMasterVolume() { return masterVolume; }
export function getMusicVolume() { return musicVolume; }
export function getSfxVolume() { return sfxVolume; }
export function isMuted() { return muted; }

/**
 * Persist current volume/mute settings to localStorage.
 */
export function persistSettings() {
    saveSettings({
        masterVolume,
        musicVolume,
        sfxVolume,
        muted,
    });
}

export function getCurrentAudioElement() {
    return currentMusic;
}

export function getCurrentMusicName() {
    return currentMusicName;
}
