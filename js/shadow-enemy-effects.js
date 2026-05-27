/**
 * shadow-enemy-effects.js - Shadow enemy aura drawing
 * REFACTORED: Removed Player.prototype.draw patch and window.currentLevel usage.
 * Now exports drawShadowEnemyAuras as a standalone function.
 * Accepts level as a parameter instead of using window.currentLevel.
 */

export function drawShadowEnemyAuras(ctx, player, camera, level) {
    if (!level?.enemies) {
        return;
    }

    for (const enemy of level.enemies) {
        if (!enemy.shadowOnly) continue;

        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;

        ctx.save();

        const visible = player.shadowShift;

        ctx.globalAlpha = visible ? 1 : 0.22;
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = visible ? 24 : 8;

        ctx.fillStyle = visible ? '#30145f' : '#1b1033';
        ctx.fillRect(screenX, screenY, enemy.width, enemy.height);

        ctx.fillStyle = '#b388ff';
        ctx.fillRect(screenX + 8, screenY + 10, enemy.width - 16, 8);

        if (visible) {
            ctx.strokeStyle = '#64f4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 2, screenY - 2, enemy.width + 4, enemy.height + 4);
        }

        ctx.restore();
    }
}
