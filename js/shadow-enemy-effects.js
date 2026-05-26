import { Player } from './player.js';

const originalDraw = Player.prototype.draw;

Player.prototype.draw = function drawWithShadowEnemyAura(ctx, camera) {
    originalDraw.call(this, ctx, camera);

    if (!window.currentLevel?.enemies) {
        return;
    }

    for (const enemy of window.currentLevel.enemies) {
        if (!enemy.shadowOnly) continue;

        const screenX = enemy.x - camera.x;
        const screenY = enemy.y - camera.y;

        ctx.save();

        const visible = this.shadowShift;

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
};