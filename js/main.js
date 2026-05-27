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

// --- Update ---

function update(dt) {
    const { player, camera } = state;

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
    const glowBoost = 18 + bassPulse * 20; // 18 → 38 glow
    const topBarHeight = 5 + bassPulse * 2;  // 5 → 7 px
    const edgeBarHeight = 4 + bassPulse * 1; // 4 → 5 px

    for (const platform of currentLevel.platforms) {
        const x = platform.x - camera.x;
        const y = platform.y - camera.y;

        // Shadow platforms have a different visual style
        const isShadowPlatform = platform.height === 24;

        ctx.save();

        if (isShadowPlatform) {
            // Shadow platforms: purple/violet glow, semi-transparent when not in shadow mode
            const alpha = isShadow ? 1 : 0.15;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#b388ff';
            ctx.shadowBlur = isShadow ? (22 + bassPulse * 14) : 4;

            ctx.fillStyle = '#1a0a30';
            ctx.fillRect(x, y, platform.width, platform.height);

            ctx.fillStyle = '#b388ff';
            ctx.fillRect(x, y, platform.width, 4);

            ctx.fillStyle = '#7c3cff';
            ctx.fillRect(x, y + platform.height - 3, platform.width, 3);
        } else {
            ctx.shadowColor = '#ff2bd6';
            ctx.shadowBlur = glowBoost;

            ctx.fillStyle = '#16162e';
            ctx.fillRect(x, y, platform.width, platform.height);

            ctx.fillStyle = '#ff2bd6';
            ctx.fillRect(x, y, platform.width, topBarHeight);

            ctx.fillStyle = '#21e6ff';
            ctx.fillRect(x, y + platform.height - edgeBarHeight, platform.width, edgeBarHeight);
        }

        ctx.restore();
    }
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
            stopMusic();
            playMusic(state.currentLevel.music ?? 'level1');
            state.gameState = 'playing';
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
        stopMusic();
        loadNextLevel();
        // BUG FIX: loadNextLevel may transition to credits if all levels done
        if (state.gameState === 'credits') {
            playMusic('credits');
            return;
        }
        playMusic(state.currentLevel.music ?? 'level1');
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
        if (e.code === 'Digit1') switchWeaponForDebug(WEAPON_IDS.BLASTER);
        if (e.code === 'Digit2') switchWeaponForDebug(WEAPON_IDS.SPREAD);
        if (e.code === 'Digit3') switchWeaponForDebug(WEAPON_IDS.LASER);
        if (e.code === 'Digit4') switchWeaponForDebug(WEAPON_IDS.WAVE);
        if (e.code === 'Digit5') switchWeaponForDebug(WEAPON_IDS.BOUNCE);
        if (e.code === 'Digit6') switchWeaponForDebug(WEAPON_IDS.PLASMA);
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
            stopMusic();
            playMusic(state.currentLevel.music ?? 'level1');
            state.gameState = 'playing';
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
        stopMusic();
        loadNextLevel();
        // BUG FIX: loadNextLevel may transition to credits if all levels done
        if (state.gameState === 'credits') {
            playMusic('credits');
            return;
        }
        playMusic(state.currentLevel.music ?? 'level1');
        state.gameState = 'playing';
        return;
    }

    if (state.gameState === 'gameOver') {
        retryCurrentLevel();
        return;
    }
});

requestAnimationFrame(loop);
