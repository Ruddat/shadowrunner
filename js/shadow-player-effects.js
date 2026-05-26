import { Player } from './player.js';

const originalDraw = Player.prototype.draw;

Player.prototype.draw = function drawWithShadowEffects(ctx, camera) {
    originalDraw.call(this, ctx, camera);

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    drawShadowEnergyBar(ctx, this, screenX, screenY);
};

function drawShadowEnergyBar(ctx, player, screenX, screenY) {
    if (player.shadowEnergy >= 100 && !player.shadowShift) return;

    const width = 54;
    const height = 6;
    const x = screenX + player.width / 2 - width / 2;
    const y = screenY - 14;
    const ratio = Math.max(0, Math.min(1, player.shadowEnergy / 100));

    ctx.save();
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = player.shadowShift ? 14 : 0;

    ctx.fillStyle = 'rgba(5, 5, 16, 0.86)';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = player.shadowShift ? '#b388ff' : '#64f4ff';
    ctx.fillRect(x, y, width * ratio, height);

    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
}