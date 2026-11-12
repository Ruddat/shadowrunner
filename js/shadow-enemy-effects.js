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

    const time = Date.now();

    for (const enemy of level.enemies) {
        if (!enemy.shadowOnly) continue;

        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;
        const type = enemy.type ?? 'walker';

        ctx.save();

        const visible = player.shadowShift;
        ctx.globalAlpha = visible ? 1 : 0.22;

        // Ground shadow
        ctx.save();
        ctx.fillStyle = 'rgba(80, 30, 140, 0.12)';
        ctx.beginPath();
        ctx.ellipse(
            screenX + enemy.width / 2,
            screenY + enemy.height + 2,
            enemy.width * 0.4,
            3, 0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

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

            // Subtle purple outline glow
            ctx.shadowColor = '#b388ff';
            ctx.shadowBlur = visible ? 10 : 3;

            sprite.drawFrame(
                ctx,
                screenX + offsetX,
                screenY,
                enemy.anim.current,
                enemy.anim.frameIndex,
                enemy.direction,
                { width: scaledW, height: drawH }
            );

            ctx.shadowBlur = 0;

            // Shadow tint overlay with gradient
            ctx.globalCompositeOperation = 'source-atop';
            if (visible) {
                const tintGrad = ctx.createLinearGradient(
                    screenX + offsetX, screenY,
                    screenX + offsetX, screenY + drawH
                );
                tintGrad.addColorStop(0, 'rgba(100, 60, 255, 0.55)');
                tintGrad.addColorStop(0.5, 'rgba(80, 40, 200, 0.35)');
                tintGrad.addColorStop(1, 'rgba(120, 80, 255, 0.50)');
                ctx.fillStyle = tintGrad;
            } else {
                ctx.fillStyle = 'rgba(30, 15, 60, 0.6)';
            }
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
            // Glowing border outline
            ctx.shadowColor = '#64f4ff';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#64f4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 2, screenY - 2, enemy.width + 4, enemy.height + 4);

            // Pulsing ethereal particles around shadow enemy
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(100, 244, 255, 0.35)';
            for (let i = 0; i < 4; i++) {
                const px = screenX + Math.sin(time * 0.003 + i * 1.7) * enemy.width * 0.5 + enemy.width / 2;
                const py = screenY + ((time * 0.03 + i * 18) % (enemy.height + 10)) - 5;
                const pSize = 1.5 + Math.sin(time * 0.005 + i * 2.3) * 1;
                ctx.beginPath();
                ctx.arc(px, py, pSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
