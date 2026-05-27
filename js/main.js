/**
 * main.js - Game loop, init code, event handlers, and render/update orchestration.
 * Refactored from 2,522 lines down to ~300 lines by extracting modules.
 */

import { CONFIG } from './config.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { getLevel } from './levels.js';
import { keys } from './input.js';
import { initIntro, updateIntro, drawIntro } from './intro.js';
import { updateParticles, drawParticles } from './particles.js';
import {
    updateFloatingItems,
    drawFloatingItems,
} from './powerups.js';
import {
    getWeaponDisplayName,
    WEAPON_IDS,
} from './weapons.js';
import {
    initLevelFx,
    updateLevelFx,
    drawLevelFxBehind,
    drawLevelFxFront,
} from './levelFx.js';
import {
    registerMusic,
    registerSound,
    playMusic,
    stopMusic,
    playSound,
} from './audioManager.js';
import {
    initTitleScreen,
    updateTitleScreen,
    drawTitleScreen,
    handleTitleKey,
    handleTitleClick,
} from './titleScreen.js';
import { initCreditsScreen, updateCreditsScreen, drawCreditsScreen } from './creditsScreen.js';

// New modules
import { state } from './gameState.js';
import { updateBoss, updateBossProjectiles, drawBoss, drawBossProjectiles } from './bossSystem.js';
import { updateEnemies, updateEnemyProjectiles, drawEnemies, drawEnemyProjectiles } from './enemySystem.js';
import {
    triggerGameOver,
    updateGameOver,
    drawGameOverScreen,
    drawLevelCompleteScreen,
    drawCenterMessage,
    updateCenterMessage,
    createLevelStats,
    showCenterMessage,
} from './screens.js';
import { drawHud } from './hudSystem.js';
import {
    initializeLevelState,
    loadNextLevel,
    retryCurrentLevel,
    startNewGame,
    updateGems,
    updateExit,
    updateBonusBlocks,
    updateBonusBlockSpawns,
    updatePowerupPickup,
    updateProjectiles,
    updatePendingLevelComplete,
} from './levelManager.js';

// Effect modules (no longer prototype patches, called explicitly)
import { drawShadowEnergyBar } from './shadow-player-effects.js';
import { drawShadowEnemyAuras } from './shadow-enemy-effects.js';
import { updateKeyPortalSystem, drawKeyPortalSystem } from './key-portal-system.js';

// Neon-Sync: Music-driven visual effects
import { initNeonSync, updateNeonSync, neonSync } from './neonSync.js';

// Save / Load / Pause / Checkpoint
import { saveGame, loadGame, hasSaveGame, deleteSave } from './saveSystem.js';

// Hacking Minigame
import {
    startHacking,
    isHacking,
    updateHacking,
    drawHacking,
    updateHackTerminals,
    drawHackTerminals,
    abortHacking,
} from './hackingMinigame.js';

// Sprite System
import { initPlayerSprite } from './spriteManager.js';

// --- Init ---

const hudBottomImage = new Image();
hudBottomImage.src = 'assets/ui/hud-bottom.png';

const hudTopImage = new Image();
hudTopImage.src = 'assets/ui/hud-top.png';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Populate shared state
state.ctx = ctx;
state.hudTopImage = hudTopImage;
state.hudBottomImage = hudBottomImage;
state.currentLevelIndex = 0;
state.currentLevel = getLevel(state.currentLevelIndex);
state.levelBackground.src = state.currentLevel.background;
state.player = new Player(state.currentLevel.spawn.x, state.currentLevel.spawn.y);
state.camera = new Camera();

initializeLevelState(state.currentLevel);
state.levelStats = createLevelStats(state.currentLevel);

// Audio registration
registerMusic('title', 'assets/audio/title-theme.mp3');
registerMusic('level1', 'assets/audio/level1-theme.mp3');
registerMusic('level2', 'assets/audio/level2-theme.mp3');
registerMusic('level4', 'assets/audio/level4-boss-theme.mp3');
registerMusic('levelComplete', 'assets/audio/level-complete.mp3', false);
registerMusic('gameOver', 'assets/audio/game-over.mp3', false);
registerSound('menuMove', 'assets/audio/menu-move.mp3');
registerSound('menuSelect', 'assets/audio/menu-select.mp3');
registerSound('weaponPickup', 'assets/audio/weapon-pickup.mp3');
registerSound('itemPickup', 'assets/audio/item-pickup.mp3');
registerSound('shootBlaster', 'assets/audio/shoot-blaster.mp3');
registerSound('shootSpread', 'assets/audio/shoot-spread.mp3');
registerSound('shootLaser', 'assets/audio/shoot-laser.mp3');
registerSound('shootWave', 'assets/audio/shoot-wave.mp3');
registerSound('shootBounce', 'assets/audio/shoot-bounce.mp3');
registerSound('shootPlasma', 'assets/audio/shoot-plasma.mp3');
registerMusic('credits', 'assets/audio/credits-theme.mp3');

initIntro();
initTitleScreen();
initCreditsScreen();
initLevelFx();
initNeonSync(); // Neon-Sync: AudioContext + AnalyserNode
initPlayerSprite(); // Load player sprite sheet

// --- Update ---

function update(dt) {
    const { player, camera } = state;

    // Pause: freeze all updates
    if (state.paused) return;

    if (state.gameState === 'intro') {
        updateIntro(dt);
        return;
    }

    if (state.gameState === 'title') {
        updateTitleScreen(dt);
        return;
    }

    if (state.gameState === 'credits') {
        updateCreditsScreen(dt);
        return;
    }

    if (state.gameState === 'gameOver') {
        updateGameOver(dt);
        return;
    }

    // Hacking minigame: freeze normal gameplay, run hacking update
    if (isHacking()) {
        updateHacking(dt);
        return;
    }

    player.update(dt, state.currentLevel);

    if (player.isGameOver) {
        triggerGameOver();
        return;
    }

    if (keys.shoot) {
        player.shoot(state.projectiles);
    }

    camera.follow(player);
    camera.update(dt);

    // Neon-Sync: update music analysis every frame
    updateNeonSync(dt);
    // Beat → micro camera shake
    if (neonSync.beat) {
        camera.shake(3 + neonSync.bassIntensity * 4, 0.1);
    }

    updateLevelFx(dt, state.currentLevel);
    updateGems();
    updateExit();
    updateKeyPortalSystem(player, state.currentLevel);
    updateEnemies(dt);
    updateEnemyProjectiles(dt);
    updateBoss(dt);
    updateBossProjectiles(dt);
    updateProjectiles(dt);
    updateBonusBlocks(dt);
    updateBonusBlockSpawns();
    updateFloatingItems(dt);
    updatePowerupPickup();
    updateHackTerminals();
    updatePendingLevelComplete(dt);
    updateParticles(dt);

    if (state.messageTimer > 0) {
        state.messageTimer -= dt;

        if (state.messageTimer <= 0) {
            state.messageTimer = 0;
            state.centerMessage = '';
        }
    }

    updateCenterMessage(dt);

    if (state.weaponHudPulse > 0) {
        state.weaponHudPulse -= dt;

        if (state.weaponHudPulse < 0) {
            state.weaponHudPulse = 0;
        }
    }
}

// --- Render ---

function drawBackground() {
    const { levelBackground, camera } = state;
    ctx.fillStyle = '#060612';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    if (!levelBackground.complete) return;

    const bgWidth = levelBackground.width;
    const bgHeight = levelBackground.height;

    const scale = CONFIG.height / bgHeight;
    const drawWidth = bgWidth * scale;
    const drawHeight = CONFIG.height;

    const scrollX = -(camera.x * 0.25) % drawWidth;

    ctx.drawImage(levelBackground, scrollX, 0, drawWidth, drawHeight);
    ctx.drawImage(levelBackground, scrollX + drawWidth, 0, drawWidth, drawHeight);

    if (scrollX > 0) {
        ctx.drawImage(levelBackground, scrollX - drawWidth, 0, drawWidth, drawHeight);
    }
}

function drawPlatforms() {
    const { currentLevel, camera, player } = state;
    const isShadow = player?.shadowShift;

    // Neon-Sync: platforms pulse with bass
    const bassPulse = neonSync.isActive ? neonSync.bassIntensity : 0;
    const time = performance.now() * 0.001; // time-based animation

    // Ambient scan-line sweep (moves across all platforms)
    const scanX = ((time * 60) % (CONFIG.width + 200)) - 100;

    for (const platform of currentLevel.platforms) {
        const x = platform.x - camera.x;
        const y = platform.y - camera.y;
        const w = platform.width;
        const h = platform.height;

        // Shadow platforms have a different visual style
        const isShadowPlatform = h === 24;

        ctx.save();

        if (isShadowPlatform) {
            drawShadowPlatform(x, y, w, h, isShadow, bassPulse, time);
        } else {
            drawCyberPlatform(x, y, w, h, bassPulse, time, scanX);
        }

        ctx.restore();
    }
}

/**
 * Draws a normal cyber-platform with struts, glow, grid pattern,
 * circuit lines, rivets, corner accents and animated neon pulse.
 */
function drawCyberPlatform(x, y, w, h, bassPulse, time, scanX) {
    const glowBoost = 18 + bassPulse * 20;
    const topBarH = 4 + bassPulse * 2;
    const botBarH = 3 + bassPulse * 1;
    const bodyY = y + topBarH;
    const bodyH = h - topBarH - botBarH;

    // --- 1) OUTER GLOW LAYER (soft wide glow behind platform) ---
    ctx.save();
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = glowBoost + 12;
    ctx.fillStyle = 'rgba(255,43,214,0.03)';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.restore();

    // --- 2) PLATFORM BODY (dark metallic fill) ---
    ctx.fillStyle = '#0e0e24';
    ctx.fillRect(x, y, w, h);

    // --- 3) GRID / HATCH PATTERN on body ---
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ff2bd6';
    ctx.lineWidth = 0.5;
    const gridSize = 12;
    // Vertical grid lines
    for (let gx = x + gridSize; gx < x + w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, bodyY);
        ctx.lineTo(gx, bodyY + bodyH);
        ctx.stroke();
    }
    // Horizontal grid lines
    for (let gy = bodyY + gridSize; gy < bodyY + bodyH; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
    }
    ctx.restore();

    // --- 4) CIRCUIT LINES (horizontal accent lines running through body) ---
    ctx.save();
    ctx.globalAlpha = 0.25 + bassPulse * 0.15;
    ctx.strokeStyle = '#21e6ff';
    ctx.lineWidth = 1;
    // Upper circuit line
    const circuitY1 = bodyY + Math.floor(bodyH * 0.3);
    ctx.beginPath();
    ctx.moveTo(x + 6, circuitY1);
    ctx.lineTo(x + w - 6, circuitY1);
    ctx.stroke();
    // Lower circuit line (dashed)
    const circuitY2 = bodyY + Math.floor(bodyH * 0.7);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x + 10, circuitY2);
    ctx.lineTo(x + w - 10, circuitY2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Small circuit nodes (dots at intersections)
    ctx.fillStyle = '#21e6ff';
    for (let nx = x + 20; nx < x + w - 10; nx += 40) {
        ctx.fillRect(nx - 1.5, circuitY1 - 1.5, 3, 3);
    }
    ctx.restore();

    // --- 5) DIAGONAL STRUTS / BRACES underneath ---
    if (h >= 28) {
        ctx.save();
        ctx.globalAlpha = 0.3 + bassPulse * 0.1;
        ctx.strokeStyle = '#ff2bd6';
        ctx.lineWidth = 1.5;
        const strutSpacing = 50;
        const strutCount = Math.floor(w / strutSpacing);
        for (let i = 1; i <= strutCount; i++) {
            const sx = x + i * strutSpacing;
            if (sx >= x + w - 5) break;
            // Diagonal from top-edge down to bottom
            ctx.beginPath();
            ctx.moveTo(sx, y + topBarH);
            ctx.lineTo(sx - 12, y + h - botBarH);
            ctx.stroke();
            // Cross-brace
            ctx.beginPath();
            ctx.moveTo(sx, y + topBarH);
            ctx.lineTo(sx + 12, y + h - botBarH);
            ctx.stroke();
        }
        ctx.restore();
    }

    // --- 6) TOP NEON BAR (magenta glow strip) ---
    ctx.save();
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = glowBoost;
    ctx.fillStyle = '#ff2bd6';
    ctx.fillRect(x, y, w, topBarH);
    // Inner bright core of top bar
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,200,240,0.5)';
    ctx.fillRect(x, y, w, Math.max(1, topBarH * 0.4));
    ctx.restore();

    // --- 7) BOTTOM NEON EDGE (cyan glow strip) ---
    ctx.save();
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = glowBoost * 0.7;
    ctx.fillStyle = '#21e6ff';
    ctx.fillRect(x, y + h - botBarH, w, botBarH);
    // Inner bright core
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,240,255,0.4)';
    ctx.fillRect(x, y + h - botBarH, w, Math.max(1, botBarH * 0.4));
    ctx.restore();

    // --- 8) RIVETS (small dots along top edge) ---
    ctx.save();
    ctx.fillStyle = '#ff7aed';
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 4;
    const rivetSpacing = 24;
    for (let rx = x + rivetSpacing; rx < x + w - 6; rx += rivetSpacing) {
        ctx.beginPath();
        ctx.arc(rx, y + topBarH + 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- 9) CORNER ACCENTS (small L-brackets at corners) ---
    ctx.save();
    ctx.strokeStyle = '#ff2bd6';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 6;
    const ca = 8; // accent length
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + ca); ctx.lineTo(x, y); ctx.lineTo(x + ca, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - ca, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + ca);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - ca); ctx.lineTo(x, y + h); ctx.lineTo(x + ca, y + h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - ca, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - ca);
    ctx.stroke();
    ctx.restore();

    // --- 10) ANIMATED SCAN-LINE SWEEP (moving highlight) ---
    const localScanX = scanX - x;
    if (localScanX > -30 && localScanX < w + 30) {
        ctx.save();
        const grad = ctx.createLinearGradient(x + localScanX - 25, 0, x + localScanX + 25, 0);
        grad.addColorStop(0, 'rgba(255,43,214,0)');
        grad.addColorStop(0.5, 'rgba(255,43,214,0.18)');
        grad.addColorStop(1, 'rgba(255,43,214,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    // --- 11) PULSING ENERGY DOTS along circuit line (animated) ---
    ctx.save();
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 6 + bassPulse * 4;
    ctx.fillStyle = '#21e6ff';
    const dotSpeed = time * 80;
    const dotSpacing = 60;
    for (let dx = (dotSpeed % dotSpacing); dx < w; dx += dotSpacing) {
        const dotX = x + dx;
        if (dotX > x + 6 && dotX < x + w - 6) {
            ctx.beginPath();
            ctx.arc(dotX, bodyY + Math.floor(bodyH * 0.3), 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

/**
 * Draws a shadow platform with purple/violet cyberpunk style.
 * Same detail level but with shadow-theme colors.
 */
function drawShadowPlatform(x, y, w, h, isShadow, bassPulse, time) {
    const alpha = isShadow ? 1 : 0.15;
    const glowBoost = isShadow ? (22 + bassPulse * 14) : 4;
    const topBarH = 3 + bassPulse * 1;
    const botBarH = 2 + bassPulse * 1;
    const bodyY = y + topBarH;
    const bodyH = h - topBarH - botBarH;

    ctx.globalAlpha = alpha;

    // --- Outer glow ---
    ctx.save();
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = glowBoost + 8;
    ctx.fillStyle = 'rgba(179,136,255,0.03)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.restore();

    // --- Body ---
    ctx.fillStyle = '#1a0a30';
    ctx.fillRect(x, y, w, h);

    // --- Grid pattern ---
    ctx.save();
    ctx.globalAlpha = alpha * 0.1;
    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 0.5;
    const gridSize = 10;
    for (let gx = x + gridSize; gx < x + w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, bodyY);
        ctx.lineTo(gx, bodyY + bodyH);
        ctx.stroke();
    }
    for (let gy = bodyY + gridSize; gy < bodyY + bodyH; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
    }
    ctx.restore();

    // --- Circuit lines ---
    ctx.save();
    ctx.globalAlpha = alpha * (0.2 + bassPulse * 0.12);
    ctx.strokeStyle = '#7c3cff';
    ctx.lineWidth = 0.8;
    const circuitY = bodyY + Math.floor(bodyH * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + 4, circuitY);
    ctx.lineTo(x + w - 4, circuitY);
    ctx.stroke();
    // Circuit nodes
    ctx.fillStyle = '#7c3cff';
    for (let nx = x + 15; nx < x + w - 8; nx += 35) {
        ctx.fillRect(nx - 1, circuitY - 1, 2, 2);
    }
    ctx.restore();

    // --- Diagonal struts ---
    ctx.save();
    ctx.globalAlpha = alpha * 0.25;
    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 1;
    const strutSpacing = 45;
    const strutCount = Math.floor(w / strutSpacing);
    for (let i = 1; i <= strutCount; i++) {
        const sx = x + i * strutSpacing;
        if (sx >= x + w - 4) break;
        ctx.beginPath();
        ctx.moveTo(sx, y + topBarH);
        ctx.lineTo(sx - 10, y + h - botBarH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, y + topBarH);
        ctx.lineTo(sx + 10, y + h - botBarH);
        ctx.stroke();
    }
    ctx.restore();

    // --- Top neon bar ---
    ctx.save();
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = glowBoost;
    ctx.fillStyle = '#b388ff';
    ctx.fillRect(x, y, w, topBarH);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(220,200,255,0.4)';
    ctx.fillRect(x, y, w, Math.max(1, topBarH * 0.35));
    ctx.restore();

    // --- Bottom neon bar ---
    ctx.save();
    ctx.shadowColor = '#7c3cff';
    ctx.shadowBlur = glowBoost * 0.6;
    ctx.fillStyle = '#7c3cff';
    ctx.fillRect(x, y + h - botBarH, w, botBarH);
    ctx.restore();

    // --- Rivets ---
    ctx.save();
    ctx.fillStyle = '#c9a0ff';
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 3;
    for (let rx = x + 20; rx < x + w - 6; rx += 22) {
        ctx.beginPath();
        ctx.arc(rx, y + topBarH + 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- Corner accents ---
    ctx.save();
    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 4;
    const ca = 6;
    ctx.beginPath();
    ctx.moveTo(x, y + ca); ctx.lineTo(x, y); ctx.lineTo(x + ca, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - ca, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + ca);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h - ca); ctx.lineTo(x, y + h); ctx.lineTo(x + ca, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - ca, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - ca);
    ctx.stroke();
    ctx.restore();

    // --- Pulsing energy dots ---
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#7c3cff';
    ctx.shadowBlur = 5 + bassPulse * 3;
    ctx.fillStyle = '#7c3cff';
    const dotSpeed = time * 60;
    const dotSpacing = 55;
    for (let dx = (dotSpeed % dotSpacing); dx < w; dx += dotSpacing) {
        const dotX = x + dx;
        if (dotX > x + 4 && dotX < x + w - 4) {
            ctx.beginPath();
            ctx.arc(dotX, circuitY, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawGems() {
    const { currentLevel, camera } = state;
    for (const gem of currentLevel.gems) {
        if (gem.collected) continue;

        const x = gem.x - camera.x;
        const y = gem.y - camera.y;

        ctx.save();
        ctx.translate(x + 13, y + 13);

        ctx.shadowColor = '#ff2bd6';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#ff2bd6';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffd6fb';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

function drawProjectiles() {
    for (const projectile of state.projectiles) {
        projectile.draw(ctx, state.camera);
    }
}

function drawExit() {
    const { currentLevel, camera } = state;
    const exit = currentLevel.exit;
    const x = exit.x - camera.x;
    const y = exit.y - camera.y;

    // Neon-Sync: exit portal pulses with the beat
    const bassPulse = neonSync.isActive ? neonSync.bassIntensity : 0;
    const portalGlow = 25 + bassPulse * 25;

    ctx.save();

    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = portalGlow;

    ctx.strokeStyle = '#21e6ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, exit.width, exit.height);

    ctx.fillStyle = `rgba(33, 230, 255, ${0.15 + bassPulse * 0.12})`;
    ctx.fillRect(x, y, exit.width, exit.height);

    ctx.fillStyle = '#ff2bd6';
    ctx.font = '14px monospace';
    ctx.fillText('EXIT', x + 16, y + 56);

    ctx.restore();
}

function drawBonusBlocks() {
    const { currentLevel, camera } = state;
    if (!currentLevel.bonusBlocks) return;

    for (const block of currentLevel.bonusBlocks) {
        const bumpOffset = block.bumpTimer > 0
            ? -Math.sin(block.bumpTimer * 40) * 8
            : 0;

        const x = block.x - camera.x;
        const y = block.y - camera.y + bumpOffset;

        ctx.save();

        ctx.shadowColor = block.used ? '#64748b' : '#facc15';
        ctx.shadowBlur = block.used ? 6 : 18;

        ctx.fillStyle = block.used ? '#1e293b' : '#3b0764';
        ctx.fillRect(x, y, block.width, block.height);

        ctx.strokeStyle = block.used ? '#64748b' : '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, block.width, block.height);

        ctx.fillStyle = block.used ? '#64748b' : '#facc15';
        ctx.font = '900 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(block.used ? 'X' : '?', x + block.width / 2, y + 29);

        ctx.restore();
    }
}

/**
 * Draw player with all effect overlays (shadow energy bar, shadow enemy auras).
 * This replaces the prototype patching pattern.
 */
function drawPlayerWithEffects() {
    const { player, camera, currentLevel } = state;
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    // Core player draw
    player.draw(ctx, camera);

    // Shadow energy bar (was shadow-player-effects.js prototype patch)
    drawShadowEnergyBar(ctx, player, screenX, screenY);

    // Shadow enemy auras (was shadow-enemy-effects.js prototype patch)
    drawShadowEnemyAuras(ctx, player, camera, currentLevel);

    // Key portal system rendering (was key-portal-system.js prototype patch)
    drawKeyPortalSystem(ctx, player, camera, currentLevel);
}

function render() {
    const { currentLevel, camera } = state;

    if (state.gameState === 'intro') {
        drawIntro(ctx, state.introTime);
        return;
    }

    if (state.gameState === 'title') {
        drawTitleScreen(ctx);
        return;
    }

    if (state.gameState === 'credits') {
        drawCreditsScreen(ctx);
        return;
    }

    if (state.gameState === 'gameOver') {
        drawBackground();
        drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);
        drawPlatforms();
        drawGems();
        drawExit();
        drawEnemies();
        drawBoss();
        drawParticles(ctx, camera);
        drawPlayerWithEffects();
        drawLevelFxFront(ctx, camera, currentLevel, CONFIG);

        drawGameOverScreen();
        return;
    }

    if (state.gameState === 'levelComplete') {
        drawBackground();
        drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);
        drawPlatforms();
        drawGems();
        drawExit();
        drawEnemies();
        drawBoss();
        drawParticles(ctx, camera);
        drawPlayerWithEffects();
        drawLevelFxFront(ctx, camera, currentLevel, CONFIG);
        drawLevelCompleteScreen();
        return;
    }

    drawBackground();
    drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);

    drawPlatforms();
    drawBonusBlocks();
    drawFloatingItems(ctx, camera);
    drawGems();
    drawExit();
    drawEnemies();
    drawBoss();
    drawBossProjectiles();
    drawEnemyProjectiles();
    drawProjectiles();
    drawParticles(ctx, camera);
    drawPlayerWithEffects();

    drawLevelFxFront(ctx, camera, currentLevel, CONFIG);
    drawHud();

    // Checkpoint indicators
    drawCheckpoints();

    // Hack terminals
    drawHackTerminals(ctx, camera);

    // Pause overlay
    if (state.paused) {
        drawPauseOverlay();
    }

    // Hacking minigame overlay (renders on top of everything)
    if (isHacking()) {
        drawHacking(ctx);
    }
}

// --- Debug weapon switching ---

function switchWeaponForDebug(weaponId) {
    const { player } = state;
    player.setWeapon(weaponId);
    state.weaponHudPulse = 0.45;
    playSound('weaponPickup');

    showCenterMessage(
        getWeaponDisplayName(player.weaponId, player.weaponLevel),
        0.85
    );
}

// --- Game Loop ---

function loop(timestamp) {
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
    state.lastTime = timestamp;
    state.introTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
}

// --- Event Handlers ---

window.addEventListener('keydown', (e) => {
    if (state.gameState === 'intro' && e.code === 'Space') {
        state.gameState = 'title';
        playMusic('title');
        return;
    }

    if (state.gameState === 'title') {
        const action = handleTitleKey(e.code);

        if (action === 'CREDITS') {
            initCreditsScreen();
            stopMusic();
            playMusic('credits');
            state.gameState = 'credits';
        }

        if (action === 'NEW GAME') {
            stopMusic();
            startNewGame();
        }

        if (action === 'CONTINUE') {
            continueFromSave();
        }

        if (action === 'EXIT') {
            state.gameState = 'intro';
            return;
        }

        return;
    }

    if (state.gameState === 'credits' && e.code === 'Escape') {
        stopMusic();
        playMusic('title');
        state.gameState = 'title';
        return;
    }

    if (state.gameState === 'levelComplete' && e.code === 'Enter') {
        loadNextLevel(); // handles stopping old music + starting new
        if (state.gameState === 'credits') {
            playMusic('credits');
            return;
        }
        state.gameState = 'playing';
        return;
    }

    if (state.gameState === 'gameOver') {
        if (e.code === 'Enter' || e.code === 'Space') {
            retryCurrentLevel();
            return;
        }

        if (e.code === 'Escape') {
            stopMusic();
            state.gameState = 'title';
            playMusic('title');
            return;
        }
    }

    if (state.gameState === 'playing') {
        // Hacking minigame: Escape aborts
        if (isHacking() && e.code === 'Escape') {
            abortHacking();
            return;
        }

        if (e.code === 'Digit1') switchWeaponForDebug(WEAPON_IDS.BLASTER);
        if (e.code === 'Digit2') switchWeaponForDebug(WEAPON_IDS.SPREAD);
        if (e.code === 'Digit3') switchWeaponForDebug(WEAPON_IDS.LASER);
        if (e.code === 'Digit4') switchWeaponForDebug(WEAPON_IDS.WAVE);
        if (e.code === 'Digit5') switchWeaponForDebug(WEAPON_IDS.BOUNCE);
        if (e.code === 'Digit6') switchWeaponForDebug(WEAPON_IDS.PLASMA);

        // Pause: Escape or P key
        if (e.code === 'Escape' || e.code === 'KeyP') {
            togglePause();
            return;
        }
    }

    // Unpause: any key while paused
    if (state.paused) {
        if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter' || e.code === 'Space') {
            togglePause();
            return;
        }
    }
});

canvas.addEventListener('click', () => {
    if (state.gameState === 'intro') {
        state.gameState = 'title';
        playMusic('title');
        return;
    }

    if (state.gameState === 'title') {
        const action = handleTitleClick();

        if (action === 'NEW GAME') {
            stopMusic();
            startNewGame();
        }

        if (action === 'CONTINUE') {
            continueFromSave();
        }

        if (action === 'CREDITS') {
            initCreditsScreen();
            stopMusic();
            playMusic('credits');
            state.gameState = 'credits';
        }

        if (action === 'EXIT') {
            state.gameState = 'intro';
        }
    }

    if (state.gameState === 'levelComplete') {
        loadNextLevel(); // handles stopping old music + starting new
        if (state.gameState === 'credits') {
            playMusic('credits');
            return;
        }
        state.gameState = 'playing';
        return;
    }

    if (state.gameState === 'gameOver') {
        retryCurrentLevel();
        return;
    }
});

// --- Continue from Save ---

function continueFromSave() {
    stopMusic();
    const saveData = loadGame();
    if (saveData) {
        // Restore from save: load the saved level
        state.currentLevelIndex = saveData.levelIndex;
        state.currentLevel = getLevel(saveData.levelIndex);
        state.levelBackground.src = state.currentLevel.background;

        // Restore player state
        state.player.lives = saveData.lives;
        state.player.score = saveData.score;
        state.player.weaponId = saveData.weaponId;
        state.player.weaponLevel = saveData.weaponLevel;
        state.player.gems = saveData.gems;
        state.player.keys = saveData.keys ?? 0;
        state.player.x = saveData.checkpointX;
        state.player.y = saveData.checkpointY;
        state.player.prevY = saveData.checkpointY;
        state.player.velocityX = 0;
        state.player.velocityY = 0;
        state.player.energy = 100;
        state.player.invincibleTimer = 0;
        state.player.shootCooldown = 0;
        state.player.shadowShift = false;
        state.player.shadowEnergy = 100;
        state.player.shadowDashTimer = 0;
        state.player.shadowDashCooldown = 0;
        state.player.wallSliding = false;
        state.player.wallSide = null;
        state.player.wallJumpCooldown = 0;
        state.player.resetCombo();

        state.camera.x = 0;
        state.camera.y = 0;
        initLevelFx();
        state.projectiles.length = 0;
        state.bossProjectiles.length = 0;
        state.enemyProjectiles.length = 0;

        // Set checkpoint from save so respawn works correctly
        state.checkpoint = { x: saveData.checkpointX, y: saveData.checkpointY };
        state.checkpointGems = saveData.gems;
        state.checkpointKeys = saveData.keys ?? 0;

        initializeLevelState(state.currentLevel);
        state.levelStats = createLevelStats(state.currentLevel);
        state.gameOverStats = null;
        state.player.levelComplete = false;
        state.player.isGameOver = false;
        state.player.deathsThisLevel = 0;

        playMusic(state.currentLevel.music ?? 'level1');
        state.gameState = 'playing';
    } else {
        // No save available, just start a new game
        startNewGame();
    }
}

// --- Pause System ---

function togglePause() {
    if (state.gameState !== 'playing' && !state.paused) return;

    state.paused = !state.paused;

    if (state.paused) {
        saveGame(state);
        state.pausePreviousState = state.gameState;
    } else {
        state.gameState = state.pausePreviousState ?? 'playing';
        state.pausePreviousState = null;
    }
}

function drawPauseOverlay() {
    const { ctx } = state;

    ctx.save();

    ctx.fillStyle = 'rgba(3, 7, 18, 0.82)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.fillStyle = 'rgba(33, 230, 255, 0.03)';
    for (let i = 0; i < CONFIG.height; i += 4) {
        ctx.fillRect(0, i, CONFIG.width, 1);
    }

    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 52px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', CONFIG.width / 2, CONFIG.height / 2 - 30);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '700 16px monospace';
    ctx.fillText('ESC / P to Resume', CONFIG.width / 2, CONFIG.height / 2 + 20);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.font = '700 13px monospace';
    ctx.fillText('Game Saved', CONFIG.width / 2, CONFIG.height / 2 + 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '700 12px monospace';
    ctx.fillText(
        `Level ${state.currentLevelIndex + 1}: ${state.currentLevel?.name ?? '---'}`,
        CONFIG.width / 2,
        CONFIG.height / 2 + 80
    );

    ctx.textAlign = 'left';
    ctx.restore();
}

// --- Checkpoint System ---

function drawCheckpoints() {
    const { currentLevel: level, camera, player } = state;
    if (!level.checkpoints) return;

    for (const cp of level.checkpoints) {
        const x = cp.x - camera.x;
        const y = cp.y - camera.y;

        const isActive = state.checkpoint && state.checkpoint.x === cp.x && state.checkpoint.y === cp.y;

        ctx.save();

        if (isActive) {
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 16 * pulse;
            ctx.fillStyle = `rgba(34, 197, 94, ${0.3 * pulse})`;
            ctx.fillRect(x, y, cp.width, cp.height);

            ctx.fillStyle = '#22c55e';
            ctx.font = '900 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CP', x + cp.width / 2, y - 6);
        } else if (!cp.activated) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.fillRect(x, y, cp.width, cp.height);
        }

        ctx.restore();

        if (!cp.activated && rectsOverlap(player, cp)) {
            cp.activated = true;
            state.checkpoint = { x: cp.x, y: cp.y - player.height - 4 };
            state.checkpointGems = player.gems;
            state.checkpointKeys = player.keys ?? 0;
            saveGame(state);
            showCenterMessage('CHECKPOINT', 0.9);
            playSound('itemPickup');
        }
    }
}

function rectsOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

requestAnimationFrame(loop);
