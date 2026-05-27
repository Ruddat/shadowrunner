import { connectAudioElement, resumeNeonSync } from './neonSync.js';

const tracks = {};
const sounds = {};

let currentMusic = null;
let currentMusicName = null;
let muted = false;
let masterVolume = 0.75;
let musicVolume = 0.65;
let sfxVolume = 0.85;

export function registerMusic(name, src, loop = true) {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous'; // required for Web Audio API AnalyserNode
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

    // Ensure AudioContext is running (browser autoplay policy)
    resumeNeonSync();

    // Connect this audio element to neonSync analyser
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

export function setMasterVolume(value) {
    masterVolume = Math.max(0, Math.min(1, value));

    if (currentMusic) {
        currentMusic.volume = masterVolume * musicVolume;
    }
}

/**
 * Get the currently playing audio element.
 * Used by neonSync to connect to the analyser.
 */
export function getCurrentAudioElement() {
    return currentMusic;
}

/**
 * Get the name of the currently playing music track.
 */
export function getCurrentMusicName() {
    return currentMusicName;
}
