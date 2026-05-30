/**
 * screens.js - Game Over, Level Complete, Center Messages
 * Extracted from main.js. Uses state from gameState.js.
 */

import { CONFIG } from './config.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { stopMusic, playMusic } from './audioManager.js';
import { saveGame } from './saveSystem.js';
import { awardXP } from './skillTree.js';

const LEVEL_COMPLETE_UI = {
    panel: {
        width: 640,
        height: 460,
        y: 48,
        background: 'rgba(5, 5, 16, 0.95)',
        border: '#21e6ff',
        shadow: '#21e6ff',
    },

    title: {
        y: 112,
        color: '#ff2bd6',
        font: '900 42px monospace',
        text: 'LEVEL COMPLETE',
    },

    subtitle: {
        y: 154,
        color: '#ffffff',
        font: '900 21px monospace',
    },

    rows: {
        startY: 205,
        gap: 32,
        bonusGap: 42,
        leftOffset: 230,
        valueOffset: 230,
        font: '900 18px monospace',
    },

    total: {
        y: 460,
        height: 44,
        background: 'rgba(255, 255, 255, 0.12)',
        labelColor: '#ffffff',
        valueColor: '#21e6ff',
        font: '900 24px monospace',
    },

    footer: {
        y: 500,
        color: '#ffffff',
        subColor: '#94a3b8',
        font: '900 16px monospace',
        subFont: '700 14px monospace',
        text: 'PRESS ENTER OR CLICK TO NEXT LEVEL',
    },
};

const GAME_OVER_UI = {
    panel: {
        width: 620,
        height: 390,
        y: 92,
        background: 'rgba(8, 3, 12, 0.96)',
        border: '#ff003c',
        shadow: '#ff003c',
    },

    title: {
        y: 78,
        text: 'GAME OVER',
        color: '#ff003c',
        font: '900 54px monospace',
    },

    subtitle: {
        y: 118,
        color: '#ffffff',
        font: '900 22px monospace',
    },

    rows: {
        startY: 175,
        gap: 38,
        leftOffset: 130,
        rightOffset: 130,
        font: '900 20px monospace',
    },

    footer: {
        yOffset: 315,
        retryText: 'PRESS ENTER OR CLICK TO RETRY',
        titleText: 'PRESS ESC FOR TITLE SCREEN',
    },
};

export { LEVEL_COMPLETE_UI, GAME_OVER_UI };

// --- Center Message ---

export function showCenterMessage(text, duration = 0.8) {
    state.centerMessage = text;
    state.messageTimer = duration;
    state.messageDuration = duration;

    state.centerMessageY = 118;
    state.centerMessageVelocityY = 0;
    state.centerMessageAlpha = 1;
    state.centerMessageBurstDone = false;
}

export function updateCenterMessage(dt) {
    if (state.messageTimer <= 0 || !state.centerMessage) return;

    state.messageTimer -= dt;

    const elapsed = state.messageDuration - state.messageTimer;
    const progress = state.messageDuration > 0
        ? Math.min(1, elapsed / state.messageDuration)
        : 1;

    // Erste Hälfte: Meldung steht/floatet leicht.
    // Zweite Hälfte: fällt nach unten und faded aus.
    if (progress > 0.45) {
        state.centerMessageVelocityY += 520 * dt;
        state.centerMessageY += state.centerMessageVelocityY * dt;
        state.centerMessageAlpha = Math.max(0, 1 - ((progress - 0.45) / 0.55));
    } else {
        state.centerMessageY = 118 + Math.sin(elapsed * 18) * 3;
    }

    if (state.messageTimer <= 0 && !state.centerMessageBurstDone) {
        state.centerMessageBurstDone = true;

        spawnParticles(
            CONFIG.width / 2,
            state.centerMessageY + 25,
            22,
            '#ffffff'
        );

        state.messageTimer = 0;
        state.centerMessage = '';
        state.centerMessageAlpha = 1;
        state.centerMessageVelocityY = 0;
    }
}

export function drawCenterMessage(text, options = {}) {
    const { ctx } = state;
    const y = options.y ?? 118;
    const alpha = options.alpha ?? 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
    ctx.fillRect(CONFIG.width / 2 - 170, y, 340, 58);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(CONFIG.width / 2 - 170, y, 340, 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, CONFIG.width / 2, y + 38);

    ctx.restore();
}

// --- Game Over ---

export function triggerGameOver() {
    const { currentLevel: level, player, projectiles, bossProjectiles, enemyProjectiles } = state;

    if (state.gameState === 'gameOver') return;

    // Freeze stats so nothing can accidentally mutate or delete them
    state.gameOverStats = Object.freeze({
        levelName: level.name ?? 'UNKNOWN LEVEL',
        score: player.score ?? 0,
        gems: player.gems ?? 0,
        reachedLevel: state.currentLevelIndex + 1,
        enemiesDefeated: level.enemies
            ? level.enemies.filter(enemy => enemy.active === false).length
            : 0,
        enemiesTotal: level.enemies?.length ?? 0,
    });

    // BUG FIX: Do NOT set gameOverStats = null here.
    // The stats must be preserved for the game over screen to display.
    // (Original code had: gameOverStats = null; right after setting it)
    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    stopMusic();
    playMusic('gameOver');

    state.gameOverTimer = 0;
    state.gameOverSparks.length = 0;
    state.gameState = 'gameOver';
}

export function updateGameOver(dt) {
    state.gameOverTimer += dt;

    // Sparks kontrolliert spawnen, nicht komplett wild.
    if (Math.random() < dt * 14) {
        spawnGameOverSpark();
    }

    for (const spark of state.gameOverSparks) {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        spark.alpha = Math.max(0, spark.life / spark.maxLife);
    }

    for (let i = state.gameOverSparks.length - 1; i >= 0; i--) {
        if (state.gameOverSparks[i].life <= 0) {
            state.gameOverSparks.splice(i, 1);
        }
    }
}

function spawnGameOverSpark() {
    const side = Math.random() < 0.5 ? -1 : 1;

    state.gameOverSparks.push({
        x: side === -1 ? 80 : CONFIG.width - 80,
        y: 80 + Math.random() * (CONFIG.height - 160),
        vx: side * -(80 + Math.random() * 180),
        vy: -40 + Math.random() * 80,
        size: 2 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.5,
        maxLife: 0.45 + Math.random() * 0.5,
        alpha: 1,
        color: Math.random() < 0.5 ? '#ff003c' : '#fb7185',
    });
}

export function drawGameOverScreen() {
    const { ctx, currentLevel: level, player } = state;
    const ui = GAME_OVER_UI;

    const stats = state.gameOverStats ?? {
        levelName: level.name ?? 'UNKNOWN LEVEL',
        score: player.score ?? 0,
        gems: player.gems ?? 0,
        reachedLevel: state.currentLevelIndex + 1,
        enemiesDefeated: level.enemies
            ? level.enemies.filter(e => e.active === false).length
            : 0,
        enemiesTotal: level.enemies?.length ?? 0,
    };

    const t = state.gameOverTimer;
    const intro = Math.min(1, t / 0.75);
    const ease = easeOutBack(intro);

    const panelWidth = ui.panel.width;
    const panelHeight = ui.panel.height;

    const panelX = CONFIG.width / 2 - panelWidth / 2;
    const panelY = ui.panel.y;

    const panelCenterX = CONFIG.width / 2;
    const panelCenterY = panelY + panelHeight / 2;

    const glitch = Math.sin(t * 35) * 2 + (Math.random() < 0.08 ? Math.random() * 8 - 4 : 0);
    const flicker = Math.random() < 0.06 ? 0.72 : 1;

    ctx.save();

    // Dark red overlay
    ctx.fillStyle = `rgba(3, 0, 8, ${0.74 + intro * 0.18})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    drawGameOverScanlines(t);
    drawGameOverSparks();

    // Panel Intro: fährt/skaliert rein
    ctx.translate(panelCenterX, panelCenterY);
    ctx.scale(ease, ease);
    ctx.translate(-panelCenterX, -panelCenterY);

    ctx.globalAlpha = intro;

    ctx.shadowColor = ui.panel.shadow;
    ctx.shadowBlur = 26 + Math.sin(t * 9) * 8;

    ctx.fillStyle = ui.panel.background;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = ui.panel.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Zweite dünne Innenkante
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20);

    // Warning side bars
    const barAlpha = 0.25 + Math.sin(t * 8) * 0.15;
    ctx.fillStyle = `rgba(255, 0, 60, ${barAlpha})`;
    ctx.fillRect(panelX + 22, panelY + 28, 6, panelHeight - 56);
    ctx.fillRect(panelX + panelWidth - 28, panelY + 28, 6, panelHeight - 56);

    // Title Glitch
    ctx.textAlign = 'center';
    ctx.font = ui.title.font;

    ctx.globalAlpha = intro * flicker;
    ctx.fillStyle = '#21e6ff';
    ctx.fillText(ui.title.text, CONFIG.width / 2 + glitch + 3, panelY + ui.title.y);

    ctx.fillStyle = '#ff003c';
    ctx.fillText(ui.title.text, CONFIG.width / 2 + glitch, panelY + ui.title.y);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = intro * 0.22;
    ctx.fillText(ui.title.text, CONFIG.width / 2 - glitch - 3, panelY + ui.title.y);

    ctx.globalAlpha = intro;

    // Subtitle
    if (t > 0.35) {
        ctx.fillStyle = ui.subtitle.color;
        ctx.font = ui.subtitle.font;
        ctx.fillText(stats.levelName, CONFIG.width / 2, panelY + ui.subtitle.y);
    }

    const left = panelX + ui.rows.leftOffset;
    const right = panelX + panelWidth - ui.rows.rightOffset;

    let y = panelY + ui.rows.startY;

    drawAnimatedGameOverRow('STAGE', `${stats.reachedLevel}`, '#21e6ff', left, right, y, 0.55);
    y += ui.rows.gap;

    drawAnimatedGameOverRow('SCORE', `${stats.score}`, '#facc15', left, right, y, 0.75);
    y += ui.rows.gap;

    drawAnimatedGameOverRow('GEMS', `${stats.gems}`, '#ff2bd6', left, right, y, 0.95);
    y += ui.rows.gap;

    drawAnimatedGameOverRow(
        'ENEMIES',
        `${stats.enemiesDefeated} / ${stats.enemiesTotal}`,
        '#fb7185',
        left,
        right,
        y,
        1.15
    );

    // Footer blinkt erst später
    const footerY = panelY + ui.footer.yOffset;

    if (t > 1.45) {
        const blink = Math.sin(t * 6) > -0.35 ? 1 : 0.35;

        ctx.globalAlpha = blink;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px monospace';
        ctx.fillText(ui.footer.retryText, CONFIG.width / 2, footerY);

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 14px monospace';
        ctx.fillText(ui.footer.titleText, CONFIG.width / 2, footerY + 28);
    }

    ctx.restore();
}


function drawAnimatedGameOverRow(label, value, color, left, right, y, delay) {
    const { ctx } = state;
    const local = Math.min(1, Math.max(0, (state.gameOverTimer - delay) / 0.28));
    if (local <= 0) return;

    const xOffset = (1 - local) * -28;

    ctx.save();
    ctx.globalAlpha = local;

    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = GAME_OVER_UI.rows.font;
    ctx.fillText(label, left + xOffset, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, right - xOffset, y);

    ctx.restore();
}

function drawGameOverScanlines(t) {
    const { ctx } = state;
    ctx.save();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff003c';

    const offset = Math.floor((t * 80) % 8);

    for (let y = offset; y < CONFIG.height; y += 8) {
        ctx.fillRect(0, y, CONFIG.width, 1);
    }

    // Roter Rand-Puls
    const pulse = 0.08 + Math.sin(t * 5) * 0.04;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff003c';
    ctx.fillRect(0, 0, CONFIG.width, 18);
    ctx.fillRect(0, CONFIG.height - 18, CONFIG.width, 18);
    ctx.fillRect(0, 0, 18, CONFIG.height);
    ctx.fillRect(CONFIG.width - 18, 0, 18, CONFIG.height);

    ctx.restore();
}

function drawGameOverSparks() {
    const { ctx } = state;
    ctx.save();

    for (const spark of state.gameOverSparks) {
        ctx.globalAlpha = spark.alpha;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x, spark.y, spark.size, spark.size);
    }

    ctx.restore();
}

function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawGameOverRow(label, value, color, left, right, y) {
    const { ctx } = state;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = '900 20px monospace';
    ctx.fillText(label, left, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, right, y);
}

// --- Level Complete ---

export function createLevelStats(level) {
    return {
        levelName: level.name ?? 'UNKNOWN LEVEL',
        gemsTotal: level.gems?.length ?? 0,
        startedAt: performance.now(),
        completedAt: null,
        enemiesTotal: level.enemies?.length ?? 0,
        bossDefeated: false,
    };
}

export function calculateLevelScore() {
    const { currentLevel: level, player, levelStats } = state;

    const completedMs = levelStats?.completedAt && levelStats?.startedAt
        ? levelStats.completedAt - levelStats.startedAt
        : 0;

    const seconds = Math.max(1, Math.floor(completedMs / 1000));

    const gemsTotal = levelStats?.gemsTotal ?? level.gems.length;
    const gemsCollected = level.gems.filter(gem => gem.collected).length;

    const enemiesTotal = levelStats?.enemiesTotal ?? level.enemies.length;
    const enemiesLeft = level.enemies.filter(enemy => enemy.active !== false).length;
    const enemiesDefeated = Math.max(0, enemiesTotal - enemiesLeft);

    const timeBonus = Math.max(0, 6000 - seconds * 45);
    const gemBonus = gemsCollected * 150;
    const enemyBonus = enemiesDefeated * 300;
    const noDeathBonus = player.deathsThisLevel === 0 ? 2500 : 0;

    const total = timeBonus + gemBonus + enemyBonus + noDeathBonus;

    return {
        seconds,
        gemsCollected,
        gemsTotal,
        enemiesDefeated,
        enemiesTotal,
        timeBonus,
        gemBonus,
        enemyBonus,
        noDeathBonus,
        total,
    };
}

export function completeLevel({ bossDefeated = false } = {}) {
    const { player, projectiles, bossProjectiles, enemyProjectiles } = state;

    if (state.gameState === 'levelComplete') return;

    if (state.levelStats) {
        state.levelStats.completedAt = performance.now();
        state.levelStats.bossDefeated = bossDefeated;
    }

    const score = calculateLevelScore();

    if (state.levelStats && !state.levelStats.scoreAdded) {
        player.score = (player.score ?? 0) + score.total;
        state.levelStats.scoreAdded = true;
        state.levelStats.score = score;

        // Award XP for level completion
        awardXP(50, 'level_complete');
    }

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    // Auto-save on level completion
    saveGame(state);

    stopMusic();
    playMusic('levelComplete');

    state.gameState = 'levelComplete';
}

export function drawLevelCompleteScreen() {
    const { ctx, currentLevel: level, player, levelStats } = state;
    const ui = LEVEL_COMPLETE_UI;
    const score = levelStats?.score ?? calculateLevelScore();

    const minutes = Math.floor(score.seconds / 60);
    const restSeconds = score.seconds % 60;
    const timeText = `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;

    const panelX = CONFIG.width / 2 - ui.panel.width / 2;
    const panelY = ui.panel.y;

    const rowLeft = CONFIG.width / 2 - ui.rows.leftOffset;
    const rowValueX = CONFIG.width / 2 + ui.rows.valueOffset;

    ctx.save();

    // Dark overlay
    ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Main panel
    ctx.shadowColor = ui.panel.shadow;
    ctx.shadowBlur = 30;

    ctx.fillStyle = ui.panel.background;
    ctx.fillRect(panelX, panelY, ui.panel.width, ui.panel.height);

    ctx.strokeStyle = ui.panel.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, ui.panel.width, ui.panel.height);

    ctx.shadowBlur = 0;

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = ui.title.color;
    ctx.font = ui.title.font;
    ctx.fillText(ui.title.text, CONFIG.width / 2, ui.title.y);

    // Level name
    ctx.fillStyle = ui.subtitle.color;
    ctx.font = ui.subtitle.font;
    ctx.fillText(levelStats?.levelName ?? level.name ?? 'STAGE CLEAR', CONFIG.width / 2, ui.subtitle.y);

    // Stats
    let y = ui.rows.startY;

    drawResultRow('TIME', timeText, '#21e6ff', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('GEMS', `${score.gemsCollected} / ${score.gemsTotal}`, '#ff2bd6', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('ENEMIES', `${score.enemiesDefeated} / ${score.enemiesTotal}`, '#facc15', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('DEATHS', `${player.deathsThisLevel ?? 0}`, '#fb7185', rowLeft, rowValueX, y);
    y += ui.rows.bonusGap;

    // Bonuses
    drawResultRow('TIME BONUS', `+${score.timeBonus}`, '#21e6ff', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('GEM BONUS', `+${score.gemBonus}`, '#ff2bd6', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('ENEMY BONUS', `+${score.enemyBonus}`, '#facc15', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('NO DEATH BONUS', `+${score.noDeathBonus}`, '#22c55e', rowLeft, rowValueX, y);

    // --- Playstyle Rating ---
    const playstyle = calculatePlaystyleInline(score);
    if (playstyle) {
        y += ui.rows.bonusGap;

        // Playstyle badge
        ctx.save();
        const badgeX = CONFIG.width / 2;
        const badgeY = y;

        // Badge background
        ctx.fillStyle = 'rgba(5, 5, 16, 0.9)';
        ctx.fillRect(badgeX - 160, badgeY - 4, 320, 38);

        // Badge border with playstyle color
        ctx.strokeStyle = playstyle.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(badgeX - 160, badgeY - 4, 320, 38);

        // Style label
        ctx.shadowColor = playstyle.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = playstyle.color;
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(playstyle.style, badgeX - 60, badgeY + 22);

        // Description
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 11px monospace';
        ctx.fillText(playstyle.description, badgeX + 50, badgeY + 20);

        ctx.restore();
    }

    // --- Data Logs Collected ---
    const logsInfo = getLoreCountInfo();
    y += 46;
    drawResultRow('DATA LOGS', `${logsInfo.collected} / ${logsInfo.total}`, '#facc15', rowLeft, rowValueX, y);

    // Total bar
    const totalX = panelX + 72;
    const totalY = ui.total.y;
    const totalWidth = ui.panel.width - 144;

    ctx.fillStyle = ui.total.background;
    ctx.fillRect(totalX, totalY - 30, totalWidth, ui.total.height);

    ctx.fillStyle = ui.total.labelColor;
    ctx.font = ui.total.font;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL', totalX + 18, totalY);

    ctx.fillStyle = ui.total.valueColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${score.total}`, totalX + totalWidth - 18, totalY);

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = ui.footer.color;
    ctx.font = ui.footer.font;
    ctx.fillText(ui.footer.text, CONFIG.width / 2, ui.footer.y);

    ctx.fillStyle = ui.footer.subColor;
    ctx.font = ui.footer.subFont;
    ctx.fillText(`TOTAL SCORE: ${player.score ?? 0}`, CONFIG.width / 2, ui.footer.y + 26);

    ctx.restore();
}


function drawResultRow(label, value, color, left, valueX, y) {
    const { ctx } = state;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.font = LEVEL_COMPLETE_UI.rows.font;
    ctx.fillText(label, left, y);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(value, valueX, y);
}

// ─── Inline Playstyle Rating (avoids circular dependency) ────────────────

function calculatePlaystyleInline() {
    const { currentLevel: level, player } = state;
    if (!level || !player) return null;

    const enemiesTotal = level.enemies?.length ?? 0;
    const enemiesDefeated = enemiesTotal > 0
        ? level.enemies.filter(e => e.active === false).length
        : 0;
    const killsRatio = enemiesTotal > 0 ? enemiesDefeated / enemiesTotal : 0;

    let alertCount = 0;
    if (level.enemies) {
        for (const enemy of level.enemies) {
            if (enemy.alertState === 'alert' || enemy.alertState === 'suspicious') alertCount++;
            if (enemy.lastKnownPlayerX !== null) alertCount++;
        }
    }

    const deaths = player.deathsThisLevel ?? 0;

    if (killsRatio === 0 && alertCount === 0 && deaths === 0) {
        return { style: 'GHOST', color: '#8a2be2', description: 'Unseen. Unheard. The perfect shadow.' };
    }
    if (killsRatio <= 0.2 && alertCount <= 2 && deaths === 0) {
        return { style: 'SHADOW', color: '#a855f7', description: 'A whisper in the dark. They never saw you coming.' };
    }
    if (killsRatio <= 0.5 && alertCount <= 4) {
        return { style: 'PANTHER', color: '#facc15', description: 'Strike from the shadows. Leave no witnesses.' };
    }
    if (killsRatio > 0.5 || alertCount > 6) {
        return { style: 'ASSAULT', color: '#ef4444', description: 'No stealth. No mercy. Full frontal assault.' };
    }
    return { style: 'RUNNER', color: '#21e6ff', description: 'Adapt and overcome. A survivor gets the job done.' };
}

// ─── Lore Count Info (reads localStorage directly to avoid circular dep) ──

function getLoreCountInfo() {
    try {
        const raw = localStorage.getItem('shadowrunner_lore');
        const collected = raw ? JSON.parse(raw) : [];
        // Total defined in loreSystem.js — keep in sync
        const total = 14;
        return { collected: collected.length, total };
    } catch (_) {
        return { collected: 0, total: 14 };
    }
}
