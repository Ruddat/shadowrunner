/**
 * shadow-enemy-effects.js - Shadow enemy aura drawing
 * REFACTORED: Removed Player.prototype.draw patch and window.currentLevel usage.
 * Now exports drawShadowEnemyAuras as a standalone function.
 * Accepts level as a parameter instead of using window.currentLevel.
 * Supports sprite-based rendering for shadow-only enemies with sprites.
 */

import { getEnemySprite } from './spriteManager.js';

export function drawShadowEnemyAuras(ctx, player, camera, level) {
    if (!level?.enemies) {
        return;
    }

    for (const enemy of level.enemies) {
        if (!enemy.shadowOnly) continue;

        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;
        const type = enemy.type ?? 'walker';

        ctx.save();

        const visible = player.shadowShift;
        ctx.globalAlpha = visible ? 1 : 0.22;

        // Try sprite rendering first for sprite-based types
        const sprite = getEnemySprite(type);
        const SPRITE_TYPES = new Set(['walker', 'shield', 'mech', 'ninja']);

        if (SPRITE_TYPES.has(type) && sprite && sprite.loaded && enemy.anim) {
            // Draw sprite with shadow tint
            const drawW = enemy.width;
            const drawH = enemy.height;
            const scale = drawH / sprite.frameHeight;
            const scaledW = sprite.frameWidth * scale;
            const offsetX = (drawW - scaledW) / 2;

            sprite.drawFrame(
                ctx,
                screenX + offsetX,
                screenY,
                enemy.anim.current,
                enemy.anim.frameIndex,
                enemy.direction,
                { width: scaledW, height: drawH }
            );

            // Shadow tint overlay
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = visible ? 'rgba(100, 60, 255, 0.5)' : 'rgba(30, 15, 60, 0.6)';
            ctx.fillRect(screenX + offsetX, screenY, scaledW, drawH);
            ctx.globalCompositeOperation = 'source-over';
        } else {
            // Canvas fallback for non-sprite types (drone, turret)
            ctx.shadowColor = '#b388ff';
            ctx.shadowBlur = visible ? 24 : 8;

            ctx.fillStyle = visible ? '#30145f' : '#1b1033';
            ctx.fillRect(screenX, screenY, enemy.width, enemy.height);

            ctx.fillStyle = '#b388ff';
            ctx.fillRect(screenX + 8, screenY + 10, enemy.width - 16, 8);
        }

        if (visible) {
            ctx.strokeStyle = '#64f4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 2, screenY - 2, enemy.width + 4, enemy.height + 4);
        }

        ctx.restore();
    }
}
