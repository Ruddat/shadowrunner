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
    const { ctx, player } = state;

    ctx.save();

    drawTopHudImage();

    drawBottomPanel();

    ctx.restore();

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
