/**
 * neonSync.js - Neon-Sync Music System
 * Connects game music to the Web Audio API, analyzes frequency data
 * in real-time, and exposes reactive properties that drive visual effects.
 *
 * Architecture:
 *   <audio> → MediaElementSource → AnalyserNode → AudioContext.destination
 *                                          ↓
 *                               getByteFrequencyData() each frame
 *                                          ↓
 *                               bassIntensity (0-1) + beat detection
 *                                          ↓
 *                               neonSync state → levelFx, camera, HUD
 */

// --- State ---

let audioContext = null;
let analyser = null;

/**
 * Map of AudioElement → MediaElementAudioSourceNode.
 * CRITICAL: createMediaElementSource() can only be called ONCE per element.
 * After that, the element is permanently "captured" by Web Audio API and
 * can only play through the Web Audio graph (not directly to speakers).
 * So we must REUSE existing source nodes when switching back to a track.
 */
const sourceNodes = new Map();

/** The audio element currently connected to the analyser */
let activeElement = null;

const FREQUENCY_DATA = new Uint8Array(128); // half of fftSize

/**
 * Reactive state – read by levelFx, camera, HUD, etc.
 * Updated every frame in updateNeonSync().
 */
export const neonSync = {
    /** Overall music intensity 0-1 (smoothed bass + mid energy) */
    intensity: 0,

    /** Bass-only intensity 0-1 (60-350 Hz) */
    bassIntensity: 0,

    /** Mid-range intensity 0-1 (350-2000 Hz) */
    midIntensity: 0,

    /** High-range intensity 0-1 (2000+ Hz) */
    highIntensity: 0,

    /** True for 1 frame when a beat is detected */
    beat: false,

    /** Raw bass energy this frame (before smoothing) */
    rawBass: 0,

    /** Whether the system is active (AudioContext running + music playing) */
    isActive: false,

    /** Time since last beat (seconds), useful for decay effects */
    timeSinceBeat: 999,

    /** Configurable thresholds */
    beatThreshold: 0.55,
    beatCooldown: 0.12, // seconds between detected beats

    // Internal
    _beatCooldownTimer: 0,
    _bassHistory: [],    // rolling window for dynamic threshold
    _historySize: 30,
};

// --- Initialization ---

/**
 * Initialize the AudioContext and AnalyserNode.
 * MUST be called from a user-interaction handler (click/keydown)
 * due to browser autoplay policies.
 */
export function initNeonSync() {
    if (audioContext) return; // already initialized

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // 128 frequency bins
        analyser.smoothingTimeConstant = 0.4; // balance responsive vs smooth
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        // Connect analyser to destination so audio still plays
        analyser.connect(audioContext.destination);

        neonSync.isActive = true;

        console.log('[neonSync] AudioContext initialized, sample rate:', audioContext.sampleRate);
    } catch (err) {
        console.warn('[neonSync] Failed to initialize AudioContext:', err.message);
        neonSync.isActive = false;
    }
}

/**
 * Connect an <audio> HTML element to the analyser.
 * Called by audioManager when a new music track starts playing.
 *
 * IMPORTANT: createMediaElementSource() can only be called ONCE per element.
 * After that, the element is permanently "captured" by Web Audio API and
 * can only output through the Web Audio graph. We cache all source nodes
 * in a Map and reuse them when switching between tracks.
 *
 * Audio routing:
 *   sourceNode → analyser → destination
 *   (only one source connected to analyser at a time)
 *
 * @param {HTMLAudioElement} audioElement
 */
export function connectAudioElement(audioElement) {
    if (!audioContext || !analyser) {
        // Try lazy init
        initNeonSync();
        if (!audioContext) return;
    }

    // Same element already active → nothing to do
    if (activeElement === audioElement) return;

    // Disconnect whatever is currently connected to the analyser
    if (activeElement) {
        const oldSource = sourceNodes.get(activeElement);
        if (oldSource) {
            try { oldSource.disconnect(); } catch (_) { /* already disconnected */ }
        }
    }

    // Get or create the source node for this element
    let source = sourceNodes.get(audioElement);

    if (!source) {
        // First time seeing this element → create source (can only be done ONCE)
        try {
            source = audioContext.createMediaElementSource(audioElement);
            sourceNodes.set(audioElement, source);
            console.log('[neonSync] Created source node for new audio element');
        } catch (err) {
            console.warn('[neonSync] Could not create source node:', err.message);
            return;
        }
    }

    // Connect: source → analyser → destination
    try {
        source.connect(analyser);
        activeElement = audioElement;
        console.log('[neonSync] Audio element connected to analyser');
    } catch (err) {
        console.warn('[neonSync] Could not connect source to analyser:', err.message);
    }
}

/**
 * Resume AudioContext after browser suspension.
 * Call this on user interaction if audio isn't working.
 */
export function resumeNeonSync() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// --- Per-Frame Update ---

/**
 * Call every frame from the game loop.
 * Reads frequency data, computes intensities, detects beats.
 *
 * @param {number} dt - Delta time in seconds
 */
export function updateNeonSync(dt) {
    if (!analyser || !audioContext) {
        neonSync.isActive = false;
        return;
    }

    // Auto-resume if suspended (can happen after tab switch or browser throttling)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
        neonSync.isActive = false;
        return;
    }

    if (audioContext.state !== 'running') {
        neonSync.isActive = false;
        return;
    }

    neonSync.isActive = true;

    // Read frequency data
    analyser.getByteFrequencyData(FREQUENCY_DATA);

    // --- Compute band energies ---
    // FFT size 256 → 128 bins
    // Sample rate ~44100 → each bin ≈ 344 Hz
    // Bin 0: 0-172 Hz (sub-bass + bass)
    // Bin 1: 172-344 Hz (upper bass)
    // Bins 2-5: 344-1720 Hz (mids)
    // Bins 6+: 1720+ Hz (highs)

    const bassEnergy = computeBandEnergy(FREQUENCY_DATA, 0, 2);   // bins 0-1: 0-344Hz
    const midEnergy = computeBandEnergy(FREQUENCY_DATA, 2, 6);    // bins 2-5: 344-2064Hz
    const highEnergy = computeBandEnergy(FREQUENCY_DATA, 6, 32);  // bins 6-31: 2kHz-11kHz

    // Normalize to 0-1 (byte values are 0-255)
    const rawBass = bassEnergy / 255;
    const rawMid = midEnergy / 255;
    const rawHigh = highEnergy / 255;

    // Store raw bass for external use
    neonSync.rawBass = rawBass;

    // --- Smooth intensities (exponential decay + fast attack) ---
    const attackSpeed = 18;  // how fast intensity rises
    const decaySpeed = 6;    // how fast intensity falls

    neonSync.bassIntensity = smoothValue(neonSync.bassIntensity, rawBass, attackSpeed, decaySpeed, dt);
    neonSync.midIntensity = smoothValue(neonSync.midIntensity, rawMid, 14, 5, dt);
    neonSync.highIntensity = smoothValue(neonSync.highIntensity, rawHigh, 10, 4, dt);

    // Overall intensity = weighted mix (bass-heavy for that cyberpunk feel)
    neonSync.intensity = Math.min(1,
        neonSync.bassIntensity * 0.55 +
        neonSync.midIntensity * 0.30 +
        neonSync.highIntensity * 0.15
    );

    // --- Beat detection ---
    neonSync.beat = false;
    neonSync._beatCooldownTimer -= dt;
    neonSync.timeSinceBeat += dt;

    // Update rolling bass history for dynamic threshold
    neonSync._bassHistory.push(rawBass);
    if (neonSync._bassHistory.length > neonSync._historySize) {
        neonSync._bassHistory.shift();
    }

    // Dynamic threshold: average of recent bass + offset
    const avgBass = neonSync._bassHistory.reduce((a, b) => a + b, 0) / neonSync._bassHistory.length;
    const dynamicThreshold = Math.max(neonSync.beatThreshold, avgBass + 0.12);

    // Detect beat: raw bass exceeds threshold AND cooldown expired
    if (rawBass > dynamicThreshold && neonSync._beatCooldownTimer <= 0) {
        neonSync.beat = true;
        neonSync._beatCooldownTimer = neonSync.beatCooldown;
        neonSync.timeSinceBeat = 0;
    }

    // Decay beat cooldown timer
    if (neonSync._beatCooldownTimer < 0) {
        neonSync._beatCooldownTimer = 0;
    }
}

// --- Helpers ---

function computeBandEnergy(data, startBin, endBin) {
    let sum = 0;
    const count = endBin - startBin;
    if (count <= 0) return 0;

    for (let i = startBin; i < endBin && i < data.length; i++) {
        sum += data[i];
    }

    return sum / count;
}

/**
 * Fast-attack, slow-decay smoothing.
 * Makes visuals respond instantly to new energy but fade out gracefully.
 */
function smoothValue(current, target, attackRate, decayRate, dt) {
    if (target > current) {
        // Attack: fast rise
        return Math.min(target, current + (target - current) * attackRate * dt);
    }

    // Decay: slow fall
    return Math.max(target, current - (current - target) * decayRate * dt);
}

// --- Debug / Utility ---

/**
 * Get the full frequency spectrum (for debug visualization or future features).
 * Returns a copy of the current frequency data array.
 */
export function getFrequencySpectrum() {
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
}
