/**
 * optionsMenu.js - In-Game Options Menu for Shadowrunner
 *
 * Features:
 * - Master Volume, Music Volume, SFX Volume sliders
 * - Mute toggle
 * - Fullscreen toggle
 * - Gamepad indicator
 * - Speedrun timer toggle
 * - Back button
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
import { keys, isGamepadConnected, getGamepadId } from './input.js';

const OPTIONS_ITEMS = [
    { id: 'masterVol', label: 'MASTER VOL', type: 'slider', get: getMasterVolume, set: setMasterVolume },
    { id: 'musicVol', label: 'MUSIC VOL', type: 'slider', get: getMusicVolume, set: setMusicVolume },
    { id: 'sfxVol', label: 'SFX VOL', type: 'slider', get: getSfxVolume, set: setSfxVolume },
    { id: 'mute', label: 'MUTE', type: 'toggle', get: isMuted, set: (v) => setMuted(v) },
    { id: 'fullscreen', label: 'FULLSCREEN', type: 'toggle', get: isFullscreen, set: toggleFullscreen },
    { id: 'speedrun', label: 'SPEEDRUN TIMER', type: 'toggle', get: isSpeedrunEnabled, set: setSpeedrunEnabled },
    { id: 'back', label: 'BACK', type: 'action', action: null },
];

let selectedIndex = 0;
let optionsTime = 0;
let transitionIn = 0;

// Speedrun setting (persisted)
let speedrunEnabled = false;

function isSpeedrunEnabled() { return speedrunEnabled; }
function setSpeedrunEnabled(v) { speedrunEnabled = v; }

function isFullscreen() {
    return !!document.fullscreenElement;
}

function toggleFullscreen(v) {
    if (v && !document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (!v && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
    }
}

// Load speedrun setting
try {
    const saved = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
    if (saved.speedrunEnabled !== undefined) speedrunEnabled = saved.speedrunEnabled;
} catch (_) {}

export function initOptionsMenu() {
    selectedIndex = 0;
    optionsTime = 0;
    transitionIn = 0;
}

export function updateOptionsMenu(dt) {
    optionsTime += dt;
    transitionIn = Math.min(1, transitionIn + dt * 4);
}

export function drawOptionsMenu(ctx) {
    const W = CONFIG.width;
    const H = CONFIG.height;

    ctx.save();

    // Transition
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
    const panelW = 600;
    const panelH = 440;
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
        const displayName = gpId.length > 30 ? gpId.substring(0, 30) + '...' : gpId;
        ctx.fillText('GAMEPAD: ' + displayName, panelX + panelW - 20, panelY + 26);
        ctx.restore();
    }

    // Option items
    const startY = panelY + 82;
    const itemH = 46;
    const itemGap = 4;

    for (let i = 0; i < OPTIONS_ITEMS.length; i++) {
        const item = OPTIONS_ITEMS[i];
        const iy = startY + i * (itemH + itemGap);
        const isSelected = i === selectedIndex;

        drawOptionItem(ctx, panelX + 20, iy, panelW - 40, itemH, item, isSelected);
    }

    // Controls help
    ctx.fillStyle = 'rgba(33, 230, 255, 0.5)';
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S NAVIGATE  |  A/D ADJUST  |  ENTER SELECT  |  ESC BACK', W / 2, panelY + panelH - 20);

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
        drawSlider(ctx, x + 200, y + 10, width - 220, height - 20, item.get, item.set, isSelected);
    } else if (item.type === 'toggle') {
        drawToggle(ctx, x + width - 80, y + 8, 60, height - 16, item.get, item.set, isSelected);
    } else if (item.type === 'action') {
        ctx.fillStyle = isSelected ? '#21e6ff' : 'rgba(33, 230, 255, 0.4)';
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ENTER', x + width / 2, y + height / 2 + 1);
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

// --- Input handling ---

let inputCooldown = 0;

export function handleOptionsInput(dt) {
    inputCooldown = Math.max(0, inputCooldown - dt);
    if (inputCooldown > 0) return null;

    const item = OPTIONS_ITEMS[selectedIndex];

    // Navigate
    if (keys.up) {
        selectedIndex = (selectedIndex - 1 + OPTIONS_ITEMS.length) % OPTIONS_ITEMS.length;
        inputCooldown = 0.15;
        playSound('menuMove');
        return null;
    }
    if (keys.down) {
        selectedIndex = (selectedIndex + 1) % OPTIONS_ITEMS.length;
        inputCooldown = 0.15;
        playSound('menuMove');
        return null;
    }

    // Adjust value
    if (item.type === 'slider') {
        if (keys.left) {
            item.set(Math.max(0, item.get() - 0.05));
            inputCooldown = 0.08;
            return null;
        }
        if (keys.right) {
            item.set(Math.min(1, item.get() + 0.05));
            inputCooldown = 0.08;
            return null;
        }
    }

    if (item.type === 'toggle') {
        if (keys.left || keys.right || keys.jump || keys.interact) {
            item.set(!item.get());
            inputCooldown = 0.2;
            playSound('menuSelect');
            return null;
        }
    }

    // Confirm action (back)
    if (keys.shoot || keys.interact || keys.jump) {
        if (item.type === 'action') {
            inputCooldown = 0.25;
            playSound('menuSelect');
            persistSettings();
            // Also persist speedrun setting
            try {
                const settings = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
                settings.speedrunEnabled = speedrunEnabled;
                localStorage.setItem('shadowrunner_settings', JSON.stringify(settings));
            } catch (_) {}
            return 'back';
        }
    }

    // Escape / dash = back
    if (keys.dash) {
        inputCooldown = 0.25;
        playSound('menuSelect');
        persistSettings();
        try {
            const settings = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
            settings.speedrunEnabled = speedrunEnabled;
            localStorage.setItem('shadowrunner_settings', JSON.stringify(settings));
        } catch (_) {}
        return 'back';
    }

    return null;
}


