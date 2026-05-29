/**
 * shadow-player-effects.js - Shadow energy bar drawing
 * REFACTORED: Removed Player.prototype.draw patch.
 * Now exports drawShadowEnergyBar as a standalone function.
 */

export function drawShadowEnergyBar(ctx, player, screenX, screenY) {
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
