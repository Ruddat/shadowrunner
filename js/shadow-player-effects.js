/**
 * shadow-player-effects.js - Shadow energy bar + Dash cooldown indicator
 * REFACTORED: Removed Player.prototype.draw patch.
 * Now exports drawShadowEnergyBar as a standalone function.
 */

const DASH_COOLDOWN_MAX = 0.65;

export function drawShadowEnergyBar(ctx, player, screenX, screenY) {
    const showEnergyBar = player.shadowEnergy < 100 || player.shadowShift;
    const showDashCooldown = player.shadowDashCooldown > 0;
    const showDashReady = player.shadowDashCooldown <= 0 && player.shadowEnergy >= 18;

    if (!showEnergyBar && !showDashCooldown && !showDashReady) return;

    const width = 54;
    const height = 6;
    const x = screenX + player.width / 2 - width / 2;
    let y = screenY - 14;

    ctx.save();

    // --- Shadow Energy Bar ---
    if (showEnergyBar) {
        const ratio = Math.max(0, Math.min(1, player.shadowEnergy / 100));

        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = player.shadowShift ? 14 : 0;

        ctx.fillStyle = 'rgba(5, 5, 16, 0.86)';
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = player.shadowShift ? '#b388ff' : '#64f4ff';
        ctx.fillRect(x, y, width * ratio, height);

        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        ctx.shadowBlur = 0;
    }

    // --- Dash Cooldown Indicator ---
    y = screenY - (showEnergyBar ? 24 : 12);
    if (showDashCooldown) {
        const cooldownRatio = Math.max(0, Math.min(1, player.shadowDashCooldown / DASH_COOLDOWN_MAX));

        ctx.fillStyle = 'rgba(5, 5, 16, 0.86)';
        ctx.fillRect(x, y, width, 4);

        // Fill: purple during cooldown, fades as it recharges
        ctx.fillStyle = `rgba(124, 60, 255, ${0.3 + cooldownRatio * 0.4})`;
        ctx.fillRect(x, y, width * (1 - cooldownRatio), 4);

        ctx.strokeStyle = 'rgba(124, 60, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, 4);
    } else if (showDashReady && !showEnergyBar) {
        // Quick "DASH READY" flash indicator when energy bar isn't shown
        const flash = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(124, 60, 255, ${0.15 * flash})`;
        ctx.fillRect(x, y, width, 4);
        ctx.strokeStyle = `rgba(124, 60, 255, ${0.3 * flash})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, 4);
    }

    ctx.restore();
}
