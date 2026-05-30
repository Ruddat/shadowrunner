/**
 * sightCones.js — Enemy Vision Cones for Shadowrunner
 *
 * Renders visible sight cones for enemies showing their field of vision.
 * Color-coded by alert state:
 *   - Green: patrol (calm)
 *   - Yellow: suspicious (heard something)
 *   - Red: alert (player spotted!)
 *
 * Also renders the player's stealth indicator (eye icon).
 */

import { STEALTH_CONFIG, canEnemySeePlayer } from './stealthSystem.js';

// ─── Sight Cone Rendering ───────────────────────────────────────────────

const CONE_COLORS = {
    patrol:    { fill: 'rgba(34, 197, 94, 0.06)',   stroke: 'rgba(34, 197, 94, 0.25)'  },
    suspicious:{ fill: 'rgba(250, 204, 21, 0.08)',   stroke: 'rgba(250, 204, 21, 0.35)' },
    alert:     { fill: 'rgba(239, 68, 68, 0.10)',   stroke: 'rgba(239, 68, 68, 0.45)'  },
};

/**
 * Draw sight cones for all enemies in the level.
 */
export function drawSightCones(ctx, camera, level, player) {
    if (!level?.enemies) return;

    for (const enemy of level.enemies) {
        if (!enemy.active && enemy.health !== undefined) continue;
        if (enemy.type === 'turret') {
            drawTurretSightCone(ctx, camera, enemy, player);
        } else {
            drawEnemySightCone(ctx, camera, enemy, player);
        }
    }
}

/**
 * Draw a standard enemy sight cone.
 */
function drawEnemySightCone(ctx, camera, enemy, player) {
    const typeDefaults = STEALTH_CONFIG.enemySight[enemy.type] || STEALTH_CONFIG.enemySight.walker;
    const sightRange = enemy.sightRange ?? typeDefaults.range;
    const sightHalfAngle = enemy.sightHalfAngle ?? typeDefaults.halfAngle;

    const enemyCenterX = camera.screenX(enemy.x + (enemy.width || 46) / 2);
    const enemyCenterY = camera.screenY(enemy.y + (enemy.height || 50) / 2);
    const enemyFacing = enemy.direction ?? 1;
    const facingAngle = enemyFacing > 0 ? 0 : Math.PI;

    const alertState = enemy.alertState || 'patrol';
    const colors = CONE_COLORS[alertState] || CONE_COLORS.patrol;

    // Draw cone
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(enemyCenterX, enemyCenterY);

    // Draw arc from -halfAngle to +halfAngle relative to facing direction
    const startAngle = facingAngle - sightHalfAngle;
    const endAngle = facingAngle + sightHalfAngle;

    // Arc points
    const arcSteps = 16;
    for (let i = 0; i <= arcSteps; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / arcSteps);
        const x = enemyCenterX + Math.cos(angle) * sightRange;
        const y = enemyCenterY + Math.sin(angle) * sightRange;
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw alert indicator above enemy
    if (alertState === 'suspicious') {
        drawAlertIndicator(ctx, enemyCenterX, enemyCenterY - 30, '?', '#facc15');
    } else if (alertState === 'alert') {
        drawAlertIndicator(ctx, enemyCenterX, enemyCenterY - 30, '!', '#ef4444');
    }

    ctx.restore();
}

/**
 * Draw a turret's 360-degree detection radius.
 */
function drawTurretSightCone(ctx, camera, enemy, player) {
    const typeDefaults = STEALTH_CONFIG.enemySight.turret;
    const sightRange = enemy.sightRange ?? typeDefaults.range;

    const enemyCenterX = camera.screenX(enemy.x + (enemy.width || 46) / 2);
    const enemyCenterY = camera.screenY(enemy.y + (enemy.height || 50) / 2);

    const alertState = enemy.alertState || 'patrol';
    const colors = CONE_COLORS[alertState] || CONE_COLORS.patrol;

    ctx.save();

    // Turret has a directional cone based on turretAngle
    const sightHalfAngle = enemy.sightHalfAngle ?? typeDefaults.halfAngle;
    const facingAngle = enemy.turretAngle || 0;

    // Draw cone in turret aim direction
    ctx.beginPath();
    ctx.moveTo(enemyCenterX, enemyCenterY);

    const startAngle = facingAngle - sightHalfAngle;
    const endAngle = facingAngle + sightHalfAngle;

    const arcSteps = 16;
    for (let i = 0; i <= arcSteps; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / arcSteps);
        const x = enemyCenterX + Math.cos(angle) * sightRange;
        const y = enemyCenterY + Math.sin(angle) * sightRange;
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Alert indicator
    if (alertState === 'suspicious') {
        drawAlertIndicator(ctx, enemyCenterX, enemyCenterY - 30, '?', '#facc15');
    } else if (alertState === 'alert') {
        drawAlertIndicator(ctx, enemyCenterX, enemyCenterY - 30, '!', '#ef4444');
    }

    ctx.restore();
}

/**
 * Draw alert indicator (question mark or exclamation mark) above enemy.
 */
function drawAlertIndicator(ctx, x, y, symbol, color) {
    const time = performance.now() * 0.001;
    const bobY = Math.sin(time * 4) * 2;

    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y + bobY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Symbol
    ctx.fillStyle = color;
    ctx.fillText(symbol, x, y + bobY + 1);

    ctx.restore();
}

// ─── Shadow Area Rendering (debug/visual) ───────────────────────────────

/**
 * Draw shadow areas with subtle visual effect.
 * Called during level rendering to show dark zones.
 */
export function drawShadowAreas(ctx, camera, level) {
    const areas = level._computedShadowAreas;
    if (!areas || areas.length === 0) return;

    ctx.save();

    for (const area of areas) {
        const sx = camera.screenX(area.x);
        const sy = camera.screenY(area.y);

        // Only draw if visible on screen
        if (sx + area.width < 0 || sx > 960) continue;

        // Subtle shadow overlay
        const gradient = ctx.createLinearGradient(sx, sy, sx, sy + area.height);
        gradient.addColorStop(0, 'rgba(10, 0, 30, 0.15)');
        gradient.addColorStop(0.5, 'rgba(10, 0, 30, 0.25)');
        gradient.addColorStop(1, 'rgba(10, 0, 30, 0.10)');

        ctx.fillStyle = gradient;
        ctx.fillRect(sx, sy, area.width, area.height);

        // Subtle purple edge glow at the top of shadow areas
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + area.width, sy);
        ctx.stroke();
    }

    ctx.restore();
}

// ─── Stealth HUD Indicator ──────────────────────────────────────────────

/**
 * Draw stealth indicator on the HUD.
 * Shows eye icon: open (exposed) or closed (hidden).
 */
export function drawStealthHUD(ctx, player, stealthState) {
    if (!stealthState) return;

    const x = 20;
    const y = 90; // Below the lives display
    const hidden = stealthState.hidden;
    const visibility = stealthState.visibility;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, 80, 28, 6);
    } else {
        ctx.rect(x, y, 80, 28);
    }
    ctx.fill();
    ctx.strokeStyle = hidden ? 'rgba(138, 43, 226, 0.6)' : 'rgba(255, 100, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eye icon
    const eyeX = x + 16;
    const eyeY = y + 14;

    // Eye outline
    ctx.beginPath();
    ctx.moveTo(eyeX - 10, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY - 8, eyeX + 10, eyeY);
    ctx.quadraticCurveTo(eyeX, eyeY + 8, eyeX - 10, eyeY);
    ctx.closePath();

    if (hidden) {
        // Hidden — purple eye, closed
        ctx.fillStyle = 'rgba(138, 43, 226, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#8a2be2';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Closed pupil (horizontal line)
        ctx.beginPath();
        ctx.moveTo(eyeX - 5, eyeY);
        ctx.lineTo(eyeX + 5, eyeY);
        ctx.strokeStyle = '#8a2be2';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Exposed — red eye, open
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Open pupil
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    }

    // Status text
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    if (hidden) {
        ctx.fillStyle = '#8a2be2';
        ctx.fillText('SHADOW', x + 32, y + 14);
    } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('EXPOSED', x + 32, y + 14);
    }

    ctx.restore();
}

// ─── Alert Flash Effect ─────────────────────────────────────────────────

let alertFlashTimer = 0;
let alertFlashType = null; // 'detected' or 'lost'

/**
 * Trigger a screen-edge flash when player is detected.
 */
export function triggerAlertFlash(type) {
    alertFlashTimer = 0.5;
    alertFlashType = type;
}

/**
 * Draw alert flash effect (red/yellow screen edge pulse).
 */
export function drawAlertFlash(ctx, dt) {
    if (alertFlashTimer <= 0) return;

    alertFlashTimer -= dt;
    const alpha = alertFlashTimer * 0.6;

    const color = alertFlashType === 'detected'
        ? `rgba(239, 68, 68, ${alpha})`
        : `rgba(250, 204, 21, ${alpha})`;

    ctx.save();

    // Top edge
    const gradient = ctx.createLinearGradient(0, 0, 0, 40);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 960, 40);

    // Bottom edge
    const gradient2 = ctx.createLinearGradient(0, 540, 0, 500);
    gradient2.addColorStop(0, color);
    gradient2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 500, 960, 40);

    ctx.restore();
}
