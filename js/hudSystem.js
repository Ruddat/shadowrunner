/**
 * hudSystem.js - HUD drawing extracted from main.js
 * Uses state from gameState.js.
 * Now powered by Neon-Sync: HUD elements pulse with music beats.
 */

import { CONFIG } from './config.js';
import { state } from './gameState.js';
import { getWeaponDisplayName } from './weapons.js';
import { drawCenterMessage } from './screens.js';
import { neonSync } from './neonSync.js';

export function drawHud() {
    const { ctx, player, currentLevel: level, camera } = state;

    ctx.save();

    drawTopHudImage();

    drawBottomPanel();

    ctx.restore();

    // Mini-Map / Radar (top-right corner)
    drawMiniMap();

    // Combo display (below mini-map)
    drawComboDisplay();

    // Speedrun timer (below combo)
    drawSpeedrunTimer();

    // Neon-Sync: Beat indicator dot in corner (subtle visual feedback)
    if (neonSync.isActive && neonSync.timeSinceBeat < 0.2) {
        const beatAlpha = (1 - neonSync.timeSinceBeat / 0.2) * 0.6;
        ctx.save();
        ctx.globalAlpha = beatAlpha;
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#b388ff';
        ctx.beginPath();
        ctx.arc(CONFIG.width - 20, 20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (player.levelComplete) {
        drawCenterMessage('LEVEL COMPLETE', {
            y: 118,
            alpha: 1,
        });
    } else if (state.messageTimer > 0 && player.invincibleTimer > 0) {
        drawCenterMessage('HIT', {
            y: state.centerMessageY || 118,
            alpha: state.centerMessageAlpha,
        });
    } else if (state.messageTimer > 0 && state.centerMessage) {
        drawCenterMessage(state.centerMessage, {
            y: state.centerMessageY,
            alpha: state.centerMessageAlpha,
        });
    }
}

function drawTopHudImage() {
    const { ctx, hudTopImage } = state;
    const hudWidth = CONFIG.width - 36;
    const hudHeight = 150;

    const x = 18;
    const y = 8;

    if (hudTopImage.complete) {
        ctx.drawImage(hudTopImage, x, y, hudWidth, hudHeight);
    }

    drawTopHudValues(x, y, hudWidth, hudHeight);
}

function drawTopHudValues(x, y, hudWidth, hudHeight) {
    const { ctx, currentLevel: level, player } = state;
    ctx.save();

    const scaleX = hudWidth / 1280;
    const scaleY = hudHeight / 220;

    ctx.textBaseline = 'middle';

    // Neon-Sync: bar pulse on beat
    const beatGlow = neonSync.isActive ? neonSync.bassIntensity * 0.35 : 0;

    // HP Bars
    for (let i = 0; i < 9; i++) {
        const isFilled = i < player.lives;
        const pulseR = isFilled ? Math.min(255, 255 + Math.floor(beatGlow * 50)) : 255;
        const pulseG = isFilled ? Math.min(255, 43 + Math.floor(beatGlow * 80)) : 255;
        const pulseB = isFilled ? Math.min(255, 214 + Math.floor(beatGlow * 40)) : 255;

        ctx.fillStyle = isFilled
            ? `rgb(${pulseR},${pulseG},${pulseB})`
            : 'rgba(255,255,255,.10)';

        ctx.fillRect(
            x + (248 + i * 16) * scaleX,
            y + 32 * scaleY,
            13 * scaleX,
            21 * scaleY
        );
    }

    // Energy Bars
    const energyBars = Math.ceil(player.energy / 10);

    for (let i = 0; i < 10; i++) {
        const isFilled = i < energyBars;
        const pulseB2 = isFilled ? Math.min(255, 255 + Math.floor(beatGlow * 30)) : 255;

        ctx.fillStyle = isFilled
            ? `rgb(33, 230, ${pulseB2})`
            : 'rgba(33,230,255,.12)';

        ctx.fillRect(
            x + (248 + i * 16) * scaleX,
            y + 84 * scaleY,
            13 * scaleX,
            21 * scaleY
        );
    }

    // Gems oben mitte
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
        `${player.gems} / ${level.gems.length}`,
        x + 610 * scaleX,
        y + 66 * scaleY
    );

    // Score rechts
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 25px monospace';
    ctx.fillText(
        String(player.score ?? 0).padStart(6, '0'),
        x + 1165 * scaleX,
        y + 84 * scaleY
    );

    // Levelname unten rechts
    ctx.font = '900 20px monospace';
    ctx.fillText(
        level.name ?? 'LEVEL 1',
        x + 1165 * scaleX,
        y + 185 * scaleY
    );

    ctx.restore();
}



function drawPanel(x, y, width, height, color = '#21e6ff') {
    const { ctx } = state;
    ctx.save();

    ctx.fillStyle = 'rgba(3, 7, 18, 0.82)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x + 10, y - 2, 42, 3);
    ctx.fillRect(x + width - 52, y + height - 1, 42, 3);

    ctx.restore();
}

function drawTopStatusPanel(x, y) {
    const { ctx, player } = state;
    drawPanel(x, y, 250, 78, '#21e6ff');

    ctx.fillStyle = 'rgba(15,23,42,.9)';
    ctx.fillRect(x + 10, y + 10, 50, 50);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(x + 10, y + 10, 50, 50);

    ctx.fillStyle = '#ff2bd6';
    ctx.font = '900 20px monospace';
    ctx.fillText('S', x + 28, y + 42);

    drawBars(x + 72, y + 16, 'HP', player.lives, 9, '#ff2bd6', 10);
    drawBars(x + 72, y + 44, 'ENERGY', Math.ceil(player.energy / 10), 10, '#21e6ff', 10);
}

function drawBars(x, y, label, value, max, color, barW = 10) {
    const { ctx } = state;
    ctx.fillStyle = color;
    ctx.font = '900 13px monospace';
    ctx.fillText(label, x, y + 13);

    for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < value ? color : 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 72 + i * (barW + 4), y + 2, barW, 16);
    }
}

function drawGemCounter(x, y) {
    const { ctx, currentLevel: level, player } = state;
    drawPanel(x, y, 170, 54, '#ff2bd6');

    ctx.save();
    ctx.translate(x + 30, y + 27);

    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff2bd6';

    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px monospace';
    ctx.fillText(`${player.gems} / ${level.gems.length}`, x + 62, y + 35);
}

function drawScorePanel(x, y) {
    const { ctx, currentLevel: level, player } = state;
    drawPanel(x, y, 168, 90, '#21e6ff');

    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE', x + 84, y + 21);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 21px monospace';
    ctx.fillText(String(player.score ?? 0).padStart(6, '0'), x + 84, y + 48);

    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 13px monospace';
    ctx.fillText('LEVEL', x + 84, y + 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.fillText(level.name ?? 'LEVEL 1', x + 84, y + 86);

    ctx.textAlign = 'left';
}

function drawBottomPanel() {
    const { ctx, hudBottomImage } = state;
    const hudWidth = CONFIG.width - 36;
    const hudHeight = 96;

    const x = 18;
    const y = CONFIG.height - hudHeight;

    if (hudBottomImage.complete) {
        ctx.drawImage(hudBottomImage, x, y, hudWidth, hudHeight);
    }

    drawBottomHudValues(x, y, hudWidth, hudHeight);
}

function getWeaponName() {
    const { player } = state;
    return getWeaponDisplayName(player.weaponId, player.weaponLevel);
}


function drawBottomHudValues(x, y, hudWidth, hudHeight) {
    const { ctx, player } = state;
    ctx.save();
    ctx.textBaseline = 'middle';

    // Neon-Sync: weapon panel pulse on beat
    const neonPulse = neonSync.isActive ? neonSync.intensity * 0.15 : 0;

    if (state.weaponHudPulse > 0) {
        const pulse = state.weaponHudPulse / 0.45;
        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 18 + pulse * 24;
    } else if (neonPulse > 0.02) {
        // Subtle glow from music even without weapon switch
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = neonPulse * 60;
    }


    const scaleX = hudWidth / 860;
    const scaleY = hudHeight / 100;

    if (state.weaponHudPulse > 0) {
        const pulse = state.weaponHudPulse / 0.45;

        ctx.fillStyle = `rgba(33, 230, 255, ${0.18 + pulse * 0.32})`;
        ctx.fillRect(
            x + 112 * scaleX,
            y + 28 * scaleY,
            245 * scaleX,
            45 * scaleY
        );
    }


    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px monospace';
    ctx.fillText(getWeaponName(), x + 125 * scaleX, y + 45 * scaleY);

    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i < player.weaponLevel * 2
            ? '#21e6ff'
            : 'rgba(33,230,255,.18)';

        ctx.fillRect(
            x + (125 + i * 18) * scaleX,
            y + 60 * scaleY,
            13 * scaleX,
            19 * scaleY
        );
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px monospace';
    ctx.fillText(player.gems, x + 380 * scaleX, y + 57 * scaleY);

    ctx.fillText(`${player.keys ?? 0} / 3`, x + 565 * scaleX, y + 57 * scaleY);

    ctx.fillText(`x ${player.lives}`, x + 750 * scaleX, y + 57 * scaleY);

    ctx.restore();
}

// --- Mini-Map / Radar ---

/**
 * Draws a minimap in the top-right corner showing:
 * - Player position (cyan dot)
 * - Enemies (red dots)
 * - Boss (large pink dot)
 * - Exit (green dot)
 * - Gems (diamond markers)
 * - Floating items (yellow dots)
 * - Camera viewport outline
 */
function drawMiniMap() {
    const { ctx, player, currentLevel: level, camera } = state;
    if (!level) return;

    // Mini-Map dimensions and position
    const mapW = 180;
    const mapH = 40;
    const mapX = CONFIG.width - mapW - 12;
    const mapY = 166;

    // Calculate world bounds
    let maxX = CONFIG.worldWidth;
    let maxY = CONFIG.height;

    // Find actual level extent
    if (level.exit) {
        maxX = Math.max(maxX, level.exit.x + level.exit.width + 100);
    }

    const scaleX = mapW / maxX;
    const scaleY = mapH / maxY;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    // Border
    ctx.strokeStyle = 'rgba(33, 230, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    // Camera viewport rectangle
    const camX = mapX + camera.x * scaleX;
    const camY = mapY + camera.y * scaleY;
    const camW = CONFIG.width * scaleX;
    const camH = CONFIG.height * scaleY;
    ctx.strokeStyle = 'rgba(33, 230, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX, camY, camW, camH);

    // Enemies (color-coded by type)
    if (level.enemies) {
        for (const enemy of level.enemies) {
            if (enemy.active === false) continue;
            const dotX = mapX + (enemy.x + enemy.width / 2) * scaleX;
            const dotY = mapY + (enemy.y + enemy.height / 2) * scaleY;

            const type = enemy.type ?? 'walker';
            switch (type) {
                case 'drone':  ctx.fillStyle = '#ff6b00'; break;   // orange
                case 'shield': ctx.fillStyle = '#3b82f6'; break;   // blue
                case 'mech':   ctx.fillStyle = '#ef4444'; break;   // red (bigger)
                case 'turret': ctx.fillStyle = '#a855f7'; break;   // purple
                default:       ctx.fillStyle = '#ff003c'; break;   // default red
            }

            if (type === 'mech') {
                // Mech = slightly larger dot
                ctx.fillRect(dotX - 2.5, dotY - 2.5, 5, 5);
            } else {
                ctx.fillRect(dotX - 1.5, dotY - 1.5, 3, 3);
            }
        }
    }

    // Boss (large pink dot)
    if (level.boss && level.boss.active !== false) {
        ctx.fillStyle = '#ff2bd6';
        ctx.shadowColor = '#ff2bd6';
        ctx.shadowBlur = 4;
        const bossX = mapX + (level.boss.x + level.boss.width / 2) * scaleX;
        const bossY = mapY + (level.boss.y + level.boss.height / 2) * scaleY;
        ctx.beginPath();
        ctx.arc(bossX, bossY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Exit (green dot)
    if (level.exit && !level.exit.locked) {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 4;
        const exitX = mapX + (level.exit.x + level.exit.width / 2) * scaleX;
        const exitY = mapY + (level.exit.y + level.exit.height / 2) * scaleY;
        ctx.beginPath();
        ctx.arc(exitX, exitY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    } else if (level.exit) {
        // Locked exit = dim red
        ctx.fillStyle = 'rgba(255, 0, 60, 0.5)';
        const exitX = mapX + (level.exit.x + level.exit.width / 2) * scaleX;
        const exitY = mapY + (level.exit.y + level.exit.height / 2) * scaleY;
        ctx.beginPath();
        ctx.arc(exitX, exitY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Uncollected gems (small diamond shapes)
    if (level.gems) {
        ctx.fillStyle = 'rgba(255, 43, 214, 0.6)';
        for (const gem of level.gems) {
            if (gem.collected) continue;
            const gx = mapX + (gem.x + 13) * scaleX;
            const gy = mapY + (gem.y + 13) * scaleY;
            ctx.fillRect(gx - 1, gy - 1, 2, 2);
        }
    }

    // Player (bright cyan dot with glow)
    const playerDotX = mapX + (player.x + player.width / 2) * scaleX;
    const playerDotY = mapY + (player.y + player.height / 2) * scaleY;
    ctx.fillStyle = '#21e6ff';
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(playerDotX, playerDotY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // "RADAR" label
    ctx.fillStyle = 'rgba(33, 230, 255, 0.5)';
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('RADAR', mapX + 4, mapY + 8);

    ctx.restore();
}

// --- Combo Display ---

/**
 * Draws the combo multiplier and kill count in the top-right area
 * below the mini-map. Pulses and glows when combo is active.
 */
function drawComboDisplay() {
    const { ctx, player } = state;

    if (player.comboCount <= 0) return;

    const baseX = CONFIG.width - 192;
    const baseY = 210;

    ctx.save();

    // Combo timer bar (how much time before combo resets)
    const timerRatio = player.comboTimer / player.comboDecayTime;

    // Background
    ctx.fillStyle = 'rgba(3, 7, 18, 0.7)';
    ctx.fillRect(baseX, baseY, 180, 32);

    // Timer bar
    const barColor = player.comboMultiplier >= 5 ? '#facc15'
        : player.comboMultiplier >= 3 ? '#ff2bd6'
        : '#21e6ff';

    ctx.fillStyle = barColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(baseX, baseY, 180 * timerRatio, 32);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = barColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(baseX, baseY, 180, 32);

    // Multiplier text
    ctx.shadowColor = barColor;
    ctx.shadowBlur = player.comboMultiplier >= 3 ? 12 : 6;
    ctx.fillStyle = barColor;
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`x${player.comboMultiplier}`, baseX + 8, baseY + 21);

    // Kill count
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px monospace';
    ctx.fillText(`${player.comboCount} KILLS`, baseX + 60, baseY + 21);

    // Pulse effect on beat
    if (neonSync.isActive && neonSync.timeSinceBeat < 0.15 && player.comboMultiplier >= 2) {
        const pulseAlpha = (1 - neonSync.timeSinceBeat / 0.15) * 0.3;
        ctx.fillStyle = barColor;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillRect(baseX, baseY, 180, 32);
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// --- Speedrun Timer ---

/**
 * Draws the speedrun timer in the top-right area below combo display.
 * Shows elapsed time as MM:SS.ms and best time if available.
 */
function drawSpeedrunTimer() {
    // Check if speedrun mode is enabled
    try {
        const settings = JSON.parse(localStorage.getItem('shadowrunner_settings') || '{}');
        if (!settings.speedrunEnabled) return;
    } catch (_) { return; }

    if (!state.speedrunActive && state.gameState !== 'playing') return;

    const { ctx } = state;
    const baseX = CONFIG.width - 192;
    const baseY = 248;

    // Calculate elapsed time
    const elapsed = state.speedrunActive
        ? (performance.now() - state.speedrunStartTime) / 1000
        : 0;

    const timeStr = formatTime(elapsed);

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
    ctx.fillRect(baseX, baseY, 180, 28);

    // Border
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.strokeRect(baseX, baseY, 180, 28);

    // Timer icon
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 4;
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TIME', baseX + 6, baseY + 17);

    // Timer value
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, baseX + 174, baseY + 18);

    // Best time indicator
    const levelIdx = state.currentLevelIndex;
    const bestTime = getBestTime(levelIdx);
    if (bestTime !== null) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '700 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('BEST: ' + formatTime(bestTime), baseX + 6, baseY + 38);
    }

    ctx.textAlign = 'left';
    ctx.restore();
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + String(ms).padStart(2, '0');
}

function getBestTime(levelIndex) {
    try {
        const raw = localStorage.getItem('shadowrunner_speedrun');
        if (!raw) return null;
        const times = JSON.parse(raw);
        return times[levelIndex] ?? null;
    } catch (_) {
        return null;
    }
}

export { formatTime, getBestTime };
