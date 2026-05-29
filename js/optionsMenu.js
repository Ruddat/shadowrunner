/**
 * optionsMenu.js - In-Game Options Menu for Shadowrunner
 *
 * Features:
 * - Master Volume, Music Volume, SFX Volume sliders
 * - Mute toggle
 * - Fullscreen toggle
 * - Gamepad config (remap buttons)
 * - Speedrun timer toggle
 * - Back button
 * - Full keyboard + gamepad navigation
 *
 * Opened from: Title screen "OPTIONS" or Pause menu
 */

import { CONFIG } from './config.js';
import {
    playSound,
    getMasterVolume,
    getMusicVolume,
    getSfxVolume,
    isMuted,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setMuted,
    persistSettings,
} from './audioManager.js';
import {
    keys,
    justPressed,
    isGamepadConnected,
    getGamepadId,
    getGamepadBindings,
    setGamepadBinding,
    resetGamepadBindings,
    getDefaultBindings,
    getGamepadButtonName,
    getGamepadMenuAction,
    getPressedGamepadButton,
} from './input.js';

// --- Speedrun setting ---
let speedrunEnabled = false;

function isSpeedrunEnabled() { return speedrunEnabled; }
function setSpeedrunEnabled(v) { speedrunEnabled = v; }

// Flag: when fullscreen is toggled in the keydown gesture handler,
// the rAF-based options menu should skip its own requestFullscreen call
// (otherwise it would undo the toggle or fail silently).
let fullscreenGestureHandled = false;

function isFullscreen() {
    return !!document.fullscreenElement;
}

function toggleFullscreen(v) {
    // If fullscreen was already toggled in the keydown gesture context,
    // skip the API call here (rAF is not a user gesture context).
    if (fullscreenGestureHandled) {
        fullscreenGestureHandled = false;
        return;
    }
    const canvas = document.getElementById('game');
    if (v && !document.fullscreenElement) {
        // IMPORTANT: Must call method with proper this-binding!
        // (canvas.requestFullscreen || canvas.webkitRequestFullscreen)() would lose this.
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen().catch(() => {});
        } else if (canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } else if (!v && document.fullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

// Check if the FULLSCREEN option is currently selected in the options menu.
// Used by main.js to handle requestFullscreen in the keydown gesture context.
export function isFullscreenOptionSelected() {
    return currentMenu === MENU_MAIN && MAIN_ITEMS[selectedIndex]?.id === 'fullscreen';
}

// Mark that fullscreen was already handled in the keydown gesture context.
// The rAF-based toggleFullscreen will see this and skip its own API call.
export function markFullscreenHandled() {
    fullscreenGestureHandled = true;
}

// Resize canvas to fill available space while maintaining 16:9 aspect ratio
export function setupFullscreenResize() {
    const canvas = document.getElementById('game');
    const BASE_W = 960;
    const BASE_H = 540;

    function resizeCanvas() {
        const isFS = !!document.fullscreenElement;

        if (isFS) {
            // Use window dimensions (accounts for DPI and actual available space)
            const availW = window.innerWidth;
            const availH = window.innerHeight;

            // Scale to fill screen maintaining 16:9 aspect
            const scale = Math.min(availW / BASE_W, availH / BASE_H);
            const displayW = Math.round(BASE_W * scale);
            const displayH = Math.round(BASE_H * scale);

            // When canvas itself is fullscreen, it fills the whole screen
            // We center the 16:9 content within it
            canvas.style.width = availW + 'px';
            canvas.style.height = availH + 'px';
            canvas.style.objectFit = 'contain';
            canvas.style.imageRendering = 'pixelated';
            canvas.style.background = '#000';
        } else {
            // Normal windowed mode — scale to fit window while maintaining aspect
            resizeWindowed();
        }
    }

    function resizeWindowed() {
        const availW = window.innerWidth;
        const availH = window.innerHeight;
        const maxScale = Math.min(availW / BASE_W, availH / BASE_H);
        // Integer scaling for pixel-perfect look (1x, 2x, 3x...)
        const intScale = Math.max(1, Math.floor(maxScale));
        const displayW = BASE_W * intScale;
        const displayH = BASE_H * intScale;

        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';
        canvas.style.position = '';
        canvas.style.left = '';
        canvas.style.top = '';
        canvas.style.objectFit = '';
        canvas.style.background = '';
    }

    // Listen for fullscreen enter/exit
    document.addEventListener('fullscreenchange', resizeCanvas);
    document.addEventListener('webkitfullscreenchange', resizeCanvas);

    // Also handle window resize in windowed mode
    window.addEventListener('resize', () => {
        if (!document.fullscreenElement) {
            resizeWindowed();
        }
    });

    // Initial sizing
    resizeWindowed();
}

// Load speedrun setting
try {
    const saved = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
    if (saved.speedrunEnabled !== undefined) speedrunEnabled = saved.speedrunEnabled;
} catch (_) {}

// --- Options Menu State ---

const MENU_MAIN = 'main';
const MENU_GAMEPAD = 'gamepad';

let currentMenu = MENU_MAIN;
let selectedIndex = 0;
let optionsTime = 0;
let transitionIn = 0;

// Gamepad config state
let gpConfigSelectedIndex = 0;
let gpConfigListening = false;   // waiting for button press
let gpConfigAction = null;       // which action we're rebinding
let gpListenTimer = 0;

const MAIN_ITEMS = [
    { id: 'masterVol', label: 'MASTER VOL', type: 'slider', get: getMasterVolume, set: setMasterVolume },
    { id: 'musicVol', label: 'MUSIC VOL', type: 'slider', get: getMusicVolume, set: setMusicVolume },
    { id: 'sfxVol', label: 'SFX VOL', type: 'slider', get: getSfxVolume, set: setSfxVolume },
    { id: 'mute', label: 'MUTE', type: 'toggle', get: isMuted, set: (v) => setMuted(v) },
    { id: 'fullscreen', label: 'FULLSCREEN', type: 'toggle', get: isFullscreen, set: toggleFullscreen },
    { id: 'gamepad', label: 'GAMEPAD CONFIG', type: 'action', action: 'gamepad' },
    { id: 'speedrun', label: 'SPEEDRUN TIMER', type: 'toggle', get: isSpeedrunEnabled, set: setSpeedrunEnabled },
    { id: 'back', label: 'BACK', type: 'action', action: 'back' },
];

// Gamepad binding actions (excluding move/pause which use stick/dpad)
const GP_BIND_ACTIONS = [
    { action: 'jump', label: 'JUMP' },
    { action: 'shoot', label: 'SHOOT' },
    { action: 'shadow', label: 'SHADOW' },
    { action: 'dash', label: 'DASH' },
    { action: 'interact', label: 'INTERACT' },
];

export function initOptionsMenu() {
    currentMenu = MENU_MAIN;
    selectedIndex = 0;
    optionsTime = 0;
    transitionIn = 0;
    gpConfigSelectedIndex = 0;
    gpConfigListening = false;
    gpConfigAction = null;
}

export function updateOptionsMenu(dt) {
    optionsTime += dt;
    transitionIn = Math.min(1, transitionIn + dt * 4);

    if (gpConfigListening) {
        gpListenTimer += dt;
    }
}

export function drawOptionsMenu(ctx) {
    if (currentMenu === MENU_GAMEPAD) {
        drawGamepadConfig(ctx);
    } else {
        drawMainMenu(ctx);
    }
}

// ========== MAIN MENU ==========

function drawMainMenu(ctx) {
    const W = CONFIG.width;
    const H = CONFIG.height;

    ctx.save();

    const t = transitionIn;
    ctx.globalAlpha = t;

    // Dark overlay
    ctx.fillStyle = `rgba(3, 7, 18, ${0.92 * t})`;
    ctx.fillRect(0, 0, W, H);

    // Scan lines
    ctx.save();
    ctx.globalAlpha = 0.05 * t;
    for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = '#b388ff';
        ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // Panel
    const panelW = 620;
    const panelH = 470;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // Scale animation
    ctx.translate(W / 2, H / 2);
    const scale = 0.95 + t * 0.05;
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -H / 2);

    // Panel background
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(5, 5, 20, 0.97)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border
    ctx.strokeStyle = '#21e6ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Inner border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(33, 230, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16);

    // Title
    ctx.save();
    const titlePulse = Math.sin(optionsTime * 3) * 0.12 + 0.88;
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 16 * titlePulse;
    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OPTIONS', W / 2, panelY + 36);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(33, 230, 255, 0.6)';
    ctx.font = '700 11px monospace';
    ctx.fillText('SETTINGS & CONFIGURATION', W / 2, panelY + 58);
    ctx.restore();

    // Gamepad indicator
    if (isGamepadConnected()) {
        ctx.save();
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'right';
        const gpId = getGamepadId();
        const displayName = gpId.length > 28 ? gpId.substring(0, 28) + '...' : gpId;
        ctx.fillText('GAMEPAD: ' + displayName, panelX + panelW - 20, panelY + 26);
        ctx.restore();
    }

    // Option items
    const startY = panelY + 82;
    const itemH = 40;
    const itemGap = 4;

    for (let i = 0; i < MAIN_ITEMS.length; i++) {
        const item = MAIN_ITEMS[i];
        const iy = startY + i * (itemH + itemGap);
        const isSelected = i === selectedIndex;

        drawOptionItem(ctx, panelX + 20, iy, panelW - 40, itemH, item, isSelected);
    }

    // Controls help
    ctx.fillStyle = 'rgba(33, 230, 255, 0.5)';
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S OR ARROWS: NAVIGATE  |  A/D: ADJUST  |  ENTER/SPACE: SELECT  |  ESC: BACK', W / 2, panelY + panelH - 20);

    ctx.restore();
}

function drawOptionItem(ctx, x, y, width, height, item, isSelected) {
    ctx.save();

    // Background
    if (isSelected) {
        const selPulse = Math.sin(optionsTime * 4) * 0.12 + 0.88;
        ctx.fillStyle = `rgba(33, 230, 255, ${0.08 * selPulse})`;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = `rgba(33, 230, 255, ${0.5 * selPulse})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, width, height);

        // Left accent
        ctx.fillStyle = '#21e6ff';
        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 4;
        ctx.fillRect(x, y, 3, height);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, y, width, height);
    }

    // Label
    ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.font = `${isSelected ? '700' : '400'} 13px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(item.label, x + 14, y + height / 2 + 1);

    if (item.type === 'slider') {
        drawSlider(ctx, x + 210, y + 8, width - 270, height - 16, item.get, item.set, isSelected);
    } else if (item.type === 'toggle') {
        drawToggle(ctx, x + width - 80, y + 6, 60, height - 12, item.get, item.set, isSelected);
    } else if (item.type === 'action') {
        ctx.fillStyle = isSelected ? '#21e6ff' : 'rgba(33, 230, 255, 0.4)';
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'center';
        const actionLabel = item.action === 'gamepad' ? (isGamepadConnected() ? 'CONFIGURE' : 'NO PAD') : 'ENTER';
        ctx.fillText(actionLabel, x + width / 2, y + height / 2 + 1);
    }

    ctx.restore();
}

function drawSlider(ctx, x, y, width, height, getValue, setValue, isSelected) {
    const value = getValue();
    const fillW = width * value;

    // Track background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y + height / 2 - 4, width, 8);

    // Filled portion
    const barColor = isSelected ? '#21e6ff' : '#21e6ff88';
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y + height / 2 - 4, fillW, 8);

    // Glow on filled
    if (isSelected) {
        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(x, y + height / 2 - 4, fillW, 8);
        ctx.shadowBlur = 0;
    }

    // Thumb
    const thumbX = x + fillW;
    const thumbR = isSelected ? 7 : 5;
    ctx.fillStyle = isSelected ? '#ffffff' : '#21e6ff88';
    ctx.beginPath();
    ctx.arc(thumbX, y + height / 2, thumbR, 0, Math.PI * 2);
    ctx.fill();

    // Value text
    ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value * 100)}%`, x + width + 42, y + height / 2 + 4);
    ctx.textAlign = 'left';
}

function drawToggle(ctx, x, y, width, height, getValue, setValue, isSelected) {
    const isOn = getValue();

    // Track
    ctx.fillStyle = isOn ? 'rgba(33, 230, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = isOn ? '#21e6ff' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Knob
    const knobW = height - 4;
    const knobX = isOn ? x + width - knobW - 2 : x + 2;
    ctx.fillStyle = isOn ? '#21e6ff' : 'rgba(255,255,255,0.3)';
    if (isSelected && isOn) {
        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 6;
    }
    ctx.fillRect(knobX, y + 2, knobW, knobW);
    ctx.shadowBlur = 0;

    // ON/OFF label
    ctx.fillStyle = isOn ? '#ffffff' : 'rgba(255,255,255,0.4)';
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isOn ? 'ON' : 'OFF', x + width / 2, y + height / 2 + 3);
    ctx.textAlign = 'left';
}

// ========== GAMEPAD CONFIG ==========

function drawGamepadConfig(ctx) {
    const W = CONFIG.width;
    const H = CONFIG.height;

    ctx.save();

    const t = transitionIn;
    ctx.globalAlpha = t;

    // Dark overlay
    ctx.fillStyle = `rgba(3, 7, 18, ${0.95 * t})`;
    ctx.fillRect(0, 0, W, H);

    // Panel
    const panelW = 580;
    const panelH = 420;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // Panel background
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(5, 5, 20, 0.97)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16);

    // Title
    ctx.save();
    const titlePulse = Math.sin(optionsTime * 3) * 0.12 + 0.88;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14 * titlePulse;
    ctx.fillStyle = '#facc15';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAMEPAD CONFIG', W / 2, panelY + 32);
    ctx.restore();

    // Gamepad name
    if (isGamepadConnected()) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        const gpId = getGamepadId();
        const displayName = gpId.length > 40 ? gpId.substring(0, 40) + '...' : gpId;
        ctx.fillText('Connected: ' + displayName, W / 2, panelY + 54);
    } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = '700 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO GAMEPAD DETECTED - Press a button on your controller', W / 2, panelY + 54);
    }

    // Binding rows
    const bindings = getGamepadBindings();
    const startY = panelY + 78;
    const rowH = 42;
    const rowGap = 4;

    for (let i = 0; i < GP_BIND_ACTIONS.length; i++) {
        const { action, label } = GP_BIND_ACTIONS[i];
        const boundBtns = bindings[action] || [];
        const btnNames = boundBtns.map(b => getGamepadButtonName(b)).join(' + ');
        const iy = startY + i * (rowH + rowGap);
        const isSelected = i === gpConfigSelectedIndex;
        const isListening = gpConfigListening && gpConfigAction === action;

        // Row background
        if (isSelected) {
            const selPulse = Math.sin(optionsTime * 4) * 0.12 + 0.88;
            if (isListening) {
                // Pulsing red when listening for input
                const listenPulse = Math.sin(optionsTime * 8) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(250, 204, 21, ${0.15 * listenPulse})`;
                ctx.strokeStyle = `rgba(250, 204, 21, ${0.8 * listenPulse})`;
            } else {
                ctx.fillStyle = `rgba(33, 230, 255, ${0.08 * selPulse})`;
                ctx.strokeStyle = `rgba(33, 230, 255, ${0.5 * selPulse})`;
            }
            ctx.fillRect(panelX + 20, iy, panelW - 40, rowH);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(panelX + 20, iy, panelW - 40, rowH);

            // Left accent
            ctx.fillStyle = isListening ? '#facc15' : '#21e6ff';
            ctx.shadowColor = isListening ? '#facc15' : '#21e6ff';
            ctx.shadowBlur = 4;
            ctx.fillRect(panelX + 20, iy, 3, rowH);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(panelX + 20, iy, panelW - 40, rowH);
        }

        // Action label
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
        ctx.font = `${isSelected ? '700' : '400'} 13px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(label, panelX + 40, iy + rowH / 2 + 1);

        // Button binding
        if (isListening) {
            const dots = '.'.repeat(Math.floor(optionsTime * 3) % 4);
            ctx.fillStyle = '#facc15';
            ctx.font = '700 12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('PRESS BUTTON' + dots, panelX + panelW - 40, iy + rowH / 2 + 1);
        } else {
            ctx.fillStyle = isSelected ? '#facc15' : 'rgba(250, 204, 21, 0.5)';
            ctx.font = '700 11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(btnNames || 'NONE', panelX + panelW - 40, iy + rowH / 2 + 1);
        }
    }

    // RESET DEFAULTS row
    const resetY = startY + GP_BIND_ACTIONS.length * (rowH + rowGap) + 10;
    const isResetSelected = gpConfigSelectedIndex === GP_BIND_ACTIONS.length;

    if (isResetSelected) {
        const selPulse = Math.sin(optionsTime * 4) * 0.12 + 0.88;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.08 * selPulse})`;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 * selPulse})`;
        ctx.fillRect(panelX + 20, resetY, panelW - 40, rowH);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(panelX + 20, resetY, panelW - 40, rowH);
    }
    ctx.fillStyle = isResetSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.4)';
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RESET DEFAULTS', W / 2, resetY + rowH / 2 + 1);

    // BACK row
    const backY = resetY + rowH + rowGap;
    const isBackSelected = gpConfigSelectedIndex === GP_BIND_ACTIONS.length + 1;

    if (isBackSelected) {
        const selPulse = Math.sin(optionsTime * 4) * 0.12 + 0.88;
        ctx.fillStyle = `rgba(33, 230, 255, ${0.08 * selPulse})`;
        ctx.strokeStyle = `rgba(33, 230, 255, ${0.5 * selPulse})`;
        ctx.fillRect(panelX + 20, backY, panelW - 40, rowH);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(panelX + 20, backY, panelW - 40, rowH);
    }
    ctx.fillStyle = isBackSelected ? '#21e6ff' : 'rgba(33, 230, 255, 0.4)';
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', W / 2, backY + rowH / 2 + 1);

    // Help text
    ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S: NAVIGATE  |  ENTER: REBIND  |  ESC: BACK', W / 2, panelY + panelH - 20);

    ctx.restore();
}

// ========== INPUT HANDLING ==========

let inputCooldown = 0;

export function handleOptionsInput(dt) {
    inputCooldown = Math.max(0, inputCooldown - dt);
    if (inputCooldown > 0) return null;

    // Also check gamepad menu actions
    const gpAction = getGamepadMenuAction();
    if (gpAction === 'back') {
        // B/Circle on gamepad = back
        return handleBack();
    }

    if (currentMenu === MENU_GAMEPAD) {
        return handleGamepadConfigInput(dt, gpAction);
    }

    return handleMainMenuInput(dt, gpAction);
}

function handleMainMenuInput(dt, gpAction) {
    const item = MAIN_ITEMS[selectedIndex];

    // Navigate up
    if (justPressed('up') || gpAction === 'up') {
        selectedIndex = (selectedIndex - 1 + MAIN_ITEMS.length) % MAIN_ITEMS.length;
        inputCooldown = 0.12;
        playSound('menuMove');
        return null;
    }

    // Navigate down
    if (justPressed('down') || gpAction === 'down') {
        selectedIndex = (selectedIndex + 1) % MAIN_ITEMS.length;
        inputCooldown = 0.12;
        playSound('menuMove');
        return null;
    }

    // Adjust slider left
    if (item.type === 'slider') {
        if (keys.left || gpAction === 'left') {
            item.set(Math.max(0, item.get() - 0.05));
            inputCooldown = 0.08;
            return null;
        }
        if (keys.right || gpAction === 'right') {
            item.set(Math.min(1, item.get() + 0.05));
            inputCooldown = 0.08;
            return null;
        }
    }

    // Toggle
    if (item.type === 'toggle') {
        if (justPressed('left') || justPressed('right') || justPressed('jump') || justPressed('interact') || gpAction === 'confirm') {
            item.set(!item.get());
            inputCooldown = 0.2;
            playSound('menuSelect');
            return null;
        }
    }

    // Action items
    if (item.type === 'action') {
        if (justPressed('jump') || justPressed('interact') || gpAction === 'confirm') {
            if (item.action === 'back') {
                return handleBack();
            }
            if (item.action === 'gamepad') {
                currentMenu = MENU_GAMEPAD;
                gpConfigSelectedIndex = 0;
                gpConfigListening = false;
                gpConfigAction = null;
                inputCooldown = 0.25;
                playSound('menuSelect');
                return null;
            }
        }
    }

    // Escape = back
    if (justPressed('pause')) {
        return handleBack();
    }

    return null;
}

function handleGamepadConfigInput(dt, gpAction) {
    const totalItems = GP_BIND_ACTIONS.length + 2; // actions + RESET + BACK

    // If listening for a button binding
    if (gpConfigListening) {
        // Check for any pressed gamepad button
        const btnIdx = getPressedGamepadButton();
        if (btnIdx >= 0 && btnIdx !== 9) { // Don't bind Start button
            setGamepadBinding(gpConfigAction, [btnIdx]);

            gpConfigListening = false;
            gpConfigAction = null;
            inputCooldown = 0.3;
            playSound('menuSelect');
        }

        // Cancel with Escape
        if (justPressed('pause')) {
            gpConfigListening = false;
            gpConfigAction = null;
            inputCooldown = 0.2;
        }

        return null;
    }

    // Navigate up
    if (justPressed('up') || gpAction === 'up') {
        gpConfigSelectedIndex = (gpConfigSelectedIndex - 1 + totalItems) % totalItems;
        inputCooldown = 0.12;
        playSound('menuMove');
        return null;
    }

    // Navigate down
    if (justPressed('down') || gpAction === 'down') {
        gpConfigSelectedIndex = (gpConfigSelectedIndex + 1) % totalItems;
        inputCooldown = 0.12;
        playSound('menuMove');
        return null;
    }

    // Confirm
    if (justPressed('jump') || justPressed('interact') || gpAction === 'confirm') {
        if (gpConfigSelectedIndex < GP_BIND_ACTIONS.length) {
            // Start listening for button press
            gpConfigAction = GP_BIND_ACTIONS[gpConfigSelectedIndex].action;
            gpConfigListening = true;
            gpListenTimer = 0;
            inputCooldown = 0.3;
            playSound('menuSelect');
        } else if (gpConfigSelectedIndex === GP_BIND_ACTIONS.length) {
            // RESET DEFAULTS
            resetGamepadBindings();
            inputCooldown = 0.3;
            playSound('menuSelect');
        } else {
            // BACK
            currentMenu = MENU_MAIN;
            inputCooldown = 0.25;
            playSound('menuSelect');
        }
        return null;
    }

    // Escape = back to main options
    if (justPressed('pause')) {
        currentMenu = MENU_MAIN;
        inputCooldown = 0.25;
        playSound('menuSelect');
        return null;
    }

    return null;
}

function handleBack() {
    if (currentMenu === MENU_GAMEPAD) {
        gpConfigListening = false;
        gpConfigAction = null;
        currentMenu = MENU_MAIN;
        inputCooldown = 0.25;
        playSound('menuSelect');
        return null;
    }

    inputCooldown = 0.25;
    playSound('menuSelect');
    persistSettings();
    // Persist speedrun setting
    try {
        const settings = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
        settings.speedrunEnabled = speedrunEnabled;
        localStorage.setItem('shadowrunner_settings', JSON.stringify(settings));
    } catch (_) {}
    return 'back';
}
