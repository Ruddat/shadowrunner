/**
 * key-portal-system.js - Key pickups, portal overlay, key HUD
 * REFACTORED: Removed Player.prototype.draw patch.
 * Now exports separate updateKeyPortalSystem (GAME LOGIC) and
 * drawKeyPortalSystem (RENDERING) functions.
 * Imports rectsOverlap from collision.js instead of duplicating it.
 */

import { rectsOverlap } from './collision.js';

// --- GAME LOGIC (called from update loop) ---

export function updateKeyPortalSystem(player, level) {
    updateKeyPickups(player, level);
    updateExitUnlock(player, level);
}

function updateKeyPickups(player, level) {
    if (!Array.isArray(level.keys)) return;

    for (const key of level.keys) {
        if (key.collected) continue;

        const keyBox = {
            x: key.x,
            y: key.y,
            width: key.width ?? 26,
            height: key.height ?? 26,
        };

        if (!rectsOverlap(player, keyBox)) continue;

        key.collected = true;
        player.keys = (player.keys ?? 0) + 1;
    }
}

function updateExitUnlock(player, level) {
    if (!level.exit) return;
    if (level.exit.locked === false) return;

    const requiredKeys = level.exit.keysRequired ?? 0;
    const keysOk = requiredKeys <= 0 || (player.keys ?? 0) >= requiredKeys;

    const gemsMode = level.exit.unlockMode === 'allGems' || level.exit.unlockMode === 'allGemsOrEnemiesOrKeys';
    const enemiesMode = level.exit.unlockMode === 'allEnemies' || level.exit.unlockMode === 'allGemsOrEnemiesOrKeys';

    const gemsOk = gemsMode && Array.isArray(level.gems) && level.gems.every(gem => gem.collected);
    const enemiesOk = enemiesMode && Array.isArray(level.enemies) && level.enemies.every(enemy => enemy.active === false);

    if (keysOk || gemsOk || enemiesOk) {
        level.exit.locked = false;
        level.exit.justOpened = true;
        level.exit.openedAt = performance.now();
    }
}

// --- RENDERING (called from render) ---

export function drawKeyPortalSystem(ctx, player, camera, level) {
    drawLevelKeys(ctx, camera, level);
    drawPortalOverlay(ctx, camera, level);
    drawKeyHud(ctx, player, level);
}

function drawLevelKeys(ctx, camera, level) {
    if (!Array.isArray(level.keys)) return;

    const t = performance.now() / 1000;

    for (const key of level.keys) {
        if (key.collected) continue;

        const x = key.x - camera.x;
        const y = key.y - camera.y + Math.sin(t * 5 + key.x * 0.01) * 4;
        const w = key.width ?? 26;
        const h = key.height ?? 26;

        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 6, y + 4, w - 12, h - 8);

        ctx.fillStyle = '#050510';
        ctx.font = '900 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('K', x + w / 2, y + 21);

        ctx.strokeStyle = '#fff3a3';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 2, w - 8, h - 4);
        ctx.restore();
    }
}

function drawPortalOverlay(ctx, camera, level) {
    const exit = level.exit;
    if (!exit) return;

    const x = exit.x - camera.x;
    const y = exit.y - camera.y;
    const centerX = x + exit.width / 2;
    const centerY = y + exit.height / 2;
    const t = performance.now() / 1000;
    const open = exit.locked === false;

    ctx.save();

    ctx.shadowColor = open ? '#21e6ff' : '#facc15';
    ctx.shadowBlur = open ? 34 : 14;

    ctx.strokeStyle = open ? '#21e6ff' : '#facc15';
    ctx.lineWidth = open ? 5 : 3;

    ctx.beginPath();
    ctx.ellipse(
        centerX,
        centerY,
        exit.width * (open ? 0.58 : 0.46),
        exit.height * (open ? 0.58 : 0.44),
        Math.sin(t * 1.8) * 0.08,
        0,
        Math.PI * 2
    );
    ctx.stroke();

    ctx.globalAlpha = open ? 0.32 + Math.sin(t * 8) * 0.08 : 0.14;
    ctx.fillStyle = open ? '#21e6ff' : '#facc15';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, exit.width * 0.42, exit.height * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'PORTAL OPEN' : 'LOCKED', centerX, y - 10);

    ctx.restore();
}

function drawKeyHud(ctx, player, level) {
    const required = level.exit?.keysRequired ?? 0;
    if (required <= 0 && (player.keys ?? 0) <= 0) return;

    const x = 38;
    const y = 150;
    const w = 120;
    const h = 26;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 16, 0.82)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`KEYS ${player.keys ?? 0}/${required}`, x + 10, y + 18);
    ctx.restore();
}
