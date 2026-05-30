/**
 * hazards.js — Environmental Hazards for Shadowrunner
 *
 * Three hazard types that add depth and make stealth more relevant:
 *   LASER_GRID   — Laser beams that damage and trigger alarms. Can be
 *                   disabled by hacking nearby terminals or passed in
 *                   shadow mode.
 *   SECURITY_CAM — Rotating camera that triggers alerts when player is
 *                   detected in its cone. Can be disabled by hacking.
 *   TRIPWIRE     — Invisible until close, triggers alarm or spawns
 *                   enemies when crossed. Can be spotted with shadow mode.
 *
 * Hazards are defined in level data: `hazards: [{type, x, y, ...}]`
 */

import { state } from './gameState.js';
import { keys } from './input.js';
import { CONFIG } from './config.js';
import { spawnParticles } from './particles.js';
import { playSound } from './audioManager.js';
import { showCenterMessage } from './screens.js';
import { rectsOverlap, raycast } from './collision.js';
import { triggerAlertFlash } from './sightCones.js';

// ─── Hazard Update ──────────────────────────────────────────────────────

/**
 * Update all hazards in the current level.
 * Called from main update loop.
 */
export function updateHazards(player, level, dt) {
    if (!level.hazards) return;

    for (const hazard of level.hazards) {
        if (hazard.disabled) continue;

        switch (hazard.type) {
            case 'laser_grid':
                updateLaserGrid(hazard, player, level, dt);
                break;
            case 'security_cam':
                updateSecurityCam(hazard, player, level, dt);
                break;
            case 'tripwire':
                updateTripwire(hazard, player, level, dt);
                break;
        }
    }
}

// ─── Laser Grid ─────────────────────────────────────────────────────────

function updateLaserGrid(hazard, player, level, dt) {
    // Animate laser flicker
    if (!hazard._init) {
        hazard._init = true;
        hazard._flickerTimer = 0;
        hazard._active = true;
        hazard._cycleTimer = 0;
    }

    hazard._flickerTimer += dt;

    // Cycle on/off if configured
    if (hazard.cycleTime) {
        hazard._cycleTimer += dt;
        const phase = hazard._cycleTimer % hazard.cycleTime;
        hazard._active = phase < (hazard.cycleTime * (hazard.dutyCycle ?? 0.7));
    }

    if (!hazard._active) return;

    // Shadow mode: can pass through lasers without triggering
    if (player.shadowShift && player.shadowEnergy > 0) return;

    // Check collision with player
    const laserRect = getLaserRect(hazard);
    if (laserRect && rectsOverlap(player, laserRect)) {
        // Damage player
        player.hit(level, hazard.damage ?? 15);
        spawnParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
            12,
            '#ef4444'
        );
        playSound('itemPickup'); // reuse sound

        // Trigger alarm if configured
        if (hazard.triggerAlarm !== false) {
            triggerAlarmInArea(hazard, level);
        }

        showCenterMessage('LASER!', 0.4);
    }
}

function getLaserRect(hazard) {
    if (hazard.orientation === 'vertical') {
        return {
            x: hazard.x,
            y: hazard.y,
            width: hazard.thickness ?? 4,
            height: hazard.height ?? 200,
        };
    }
    // Horizontal (default)
    return {
        x: hazard.x,
        y: hazard.y,
        width: hazard.width ?? 200,
        height: hazard.thickness ?? 4,
    };
}

// ─── Security Camera ────────────────────────────────────────────────────

function updateSecurityCam(hazard, player, level, dt) {
    if (!hazard._init) {
        hazard._init = true;
        hazard._angle = hazard.startAngle ?? 0;
        hazard._alertTimer = 0;
        hazard._suspiciousTimer = 0;
        hazard._state = 'patrol'; // patrol, suspicious, alert
    }

    const range = hazard.range ?? 250;
    const halfAngle = (hazard.coneAngle ?? Math.PI / 3) / 2;
    const rotateSpeed = hazard.rotateSpeed ?? 0.8; // rad/s

    // Rotate camera
    if (hazard._state === 'patrol') {
        hazard._angle += rotateSpeed * dt * hazard._direction;

        // Reverse at limits
        const minAngle = hazard.minAngle ?? -Math.PI / 2;
        const maxAngle = hazard.maxAngle ?? Math.PI / 2;
        if (hazard._angle >= maxAngle) {
            hazard._angle = maxAngle;
            hazard._direction = -1;
        }
        if (hazard._angle <= minAngle) {
            hazard._angle = minAngle;
            hazard._direction = 1;
        }
    }

    // Check if player is in camera cone
    const camCenterX = hazard.x + (hazard.width ?? 20) / 2;
    const camCenterY = hazard.y + (hazard.height ?? 16) / 2;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - camCenterX;
    const dy = playerCenterY - camCenterY;
    const dist = Math.hypot(dx, dy);

    // Angle from camera to player
    const angleToPlayer = Math.atan2(dy, dx);

    // Camera faces its _angle direction
    let angleDiff = angleToPlayer - hazard._angle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const inCone = dist < range && Math.abs(angleDiff) < halfAngle;
    const isHidden = state.stealthState?.hidden ?? false;

    if (inCone && !isHidden) {
        // Player detected!
        hazard._suspiciousTimer += dt;

        if (hazard._suspiciousTimer > 1.0) {
            hazard._state = 'alert';
            hazard._alertTimer = 3.0;

            // Trigger alert in area
            if (hazard.triggerAlarm !== false) {
                triggerAlarmInArea(hazard, level);
                triggerAlertFlash();
                showCenterMessage('CAMERA SPOTTED YOU!', 0.6);
            }
        }
    } else {
        hazard._suspiciousTimer = Math.max(0, hazard._suspiciousTimer - dt * 2);

        if (hazard._state === 'alert') {
            hazard._alertTimer -= dt;
            if (hazard._alertTimer <= 0) {
                hazard._state = 'patrol';
            }
        }
    }
}

// ─── Tripwire ───────────────────────────────────────────────────────────

function updateTripwire(hazard, player, level, dt) {
    if (!hazard._init) {
        hazard._init = true;
        hazard._triggered = false;
    }

    if (hazard._triggered) return;

    // Shadow mode reveals tripwires (visual only, still triggers)
    const tripwireRect = {
        x: hazard.x,
        y: hazard.y,
        width: hazard.width ?? 60,
        height: hazard.height ?? 8,
    };

    if (rectsOverlap(player, tripwireRect)) {
        hazard._triggered = true;

        // Effect
        spawnParticles(
            hazard.x + (hazard.width ?? 60) / 2,
            hazard.y + (hazard.height ?? 8) / 2,
            20,
            '#ef4444'
        );

        playSound('itemPickup');

        // Trigger alarm or spawn enemies
        if (hazard.triggerAlarm !== false) {
            triggerAlarmInArea(hazard, level);
            triggerAlertFlash();
        }

        if (hazard.spawnEnemy) {
            // Could spawn additional enemies — for now just alert existing ones
            alertAllEnemies(level);
        }

        showCenterMessage('TRIPWIRE!', 0.5);
    }
}

// ─── Alarm Helpers ──────────────────────────────────────────────────────

function triggerAlarmInArea(hazard, level) {
    const alarmRadius = hazard.alarmRadius ?? 400;
    const hx = hazard.x + (hazard.width ?? 20) / 2;
    const hy = hazard.y + (hazard.height ?? 16) / 2;

    if (level.enemies) {
        for (const enemy of level.enemies) {
            if (enemy.active === false) continue;
            const ex = enemy.x + enemy.width / 2;
            const ey = enemy.y + enemy.height / 2;
            const dist = Math.hypot(ex - hx, ey - hy);

            if (dist < alarmRadius) {
                // Set enemy to alert state
                enemy.alertState = 'alert';
                enemy.alertTimer = 6.0;
                enemy.lastKnownPlayerX = state.player?.x ?? hx;
                enemy.lastKnownPlayerY = state.player?.y ?? hy;
            }
        }
    }
}

function alertAllEnemies(level) {
    if (level.enemies) {
        for (const enemy of level.enemies) {
            if (enemy.active === false) continue;
            enemy.alertState = 'alert';
            enemy.alertTimer = 8.0;
            enemy.lastKnownPlayerX = state.player?.x ?? 0;
            enemy.lastKnownPlayerY = state.player?.y ?? 0;
        }
    }
}

/**
 * Disable a hazard (called from hacking system or skill).
 */
export function disableHazard(hazardId, level) {
    if (!level.hazards) return false;

    for (const hazard of level.hazards) {
        if (hazard.id === hazardId) {
            hazard.disabled = true;
            spawnParticles(
                hazard.x + (hazard.width ?? 20) / 2,
                hazard.y + (hazard.height ?? 16) / 2,
                14,
                '#22c55e'
            );
            showCenterMessage('HAZARD DISABLED', 0.6);
            return true;
        }
    }
    return false;
}

// ─── Hazard Drawing ─────────────────────────────────────────────────────

/**
 * Draw all hazards in the current level.
 * Called from render loop, rendered after platforms but before enemies.
 */
export function drawHazards(ctx, camera, level) {
    if (!level.hazards) return;

    for (const hazard of level.hazards) {
        switch (hazard.type) {
            case 'laser_grid':
                drawLaserGrid(ctx, camera, hazard);
                break;
            case 'security_cam':
                drawSecurityCam(ctx, camera, hazard);
                break;
            case 'tripwire':
                drawTripwire(ctx, camera, hazard);
                break;
        }
    }
}

function drawLaserGrid(ctx, camera, hazard) {
    if (hazard.disabled) return;

    const x = hazard.x - camera.x;
    const y = hazard.y - camera.y;

    if (!hazard._active && hazard.cycleTime) {
        // Draw dim inactive laser
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        if (hazard.orientation === 'vertical') {
            ctx.beginPath();
            ctx.moveTo(x + (hazard.thickness ?? 4) / 2, y);
            ctx.lineTo(x + (hazard.thickness ?? 4) / 2, y + (hazard.height ?? 200));
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(x, y + (hazard.thickness ?? 4) / 2);
            ctx.lineTo(x + (hazard.width ?? 200), y + (hazard.thickness ?? 4) / 2);
            ctx.stroke();
        }
        ctx.restore();
        return;
    }

    const flicker = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;

    ctx.save();

    // Laser glow
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 16 * flicker;

    // Laser beam
    ctx.strokeStyle = `rgba(239, 68, 68, ${flicker})`;
    ctx.lineWidth = hazard.thickness ?? 4;

    if (hazard.orientation === 'vertical') {
        const lx = x + (hazard.thickness ?? 4) / 2;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx, y + (hazard.height ?? 200));
        ctx.stroke();

        // Core bright line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 180, 180, ${flicker * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx, y + (hazard.height ?? 200));
        ctx.stroke();

        // Emitter dots at top and bottom
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(lx, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx, y + (hazard.height ?? 200), 5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const ly = y + (hazard.thickness ?? 4) / 2;
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + (hazard.width ?? 200), ly);
        ctx.stroke();

        // Core bright line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 180, 180, ${flicker * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + (hazard.width ?? 200), ly);
        ctx.stroke();

        // Emitter dots at left and right
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, ly, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + (hazard.width ?? 200), ly, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawSecurityCam(ctx, camera, hazard) {
    if (hazard.disabled) {
        // Draw disabled camera
        const x = hazard.x - camera.x;
        const y = hazard.y - camera.y;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, y, hazard.width ?? 20, hazard.height ?? 16);
        ctx.restore();
        return;
    }

    const x = hazard.x - camera.x;
    const y = hazard.y - camera.y;
    const w = hazard.width ?? 20;
    const h = hazard.height ?? 16;

    const range = hazard.range ?? 250;
    const halfAngle = (hazard.coneAngle ?? Math.PI / 3) / 2;
    const angle = hazard._angle ?? 0;
    const camCX = x + w / 2;
    const camCY = y + h / 2;

    ctx.save();

    // Draw vision cone
    const coneColor = hazard._state === 'alert' ? '#ef4444'
        : hazard._state === 'suspicious' ? '#facc15'
        : '#22c55e';

    ctx.globalAlpha = hazard._state === 'alert' ? 0.15 : 0.08;
    ctx.fillStyle = coneColor;

    ctx.beginPath();
    ctx.moveTo(camCX, camCY);
    ctx.arc(camCX, camCY, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fill();

    // Cone edge lines
    ctx.globalAlpha = hazard._state === 'alert' ? 0.5 : 0.25;
    ctx.strokeStyle = coneColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(camCX, camCY);
    ctx.lineTo(camCX + Math.cos(angle - halfAngle) * range, camCY + Math.sin(angle - halfAngle) * range);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(camCX, camCY);
    ctx.lineTo(camCX + Math.cos(angle + halfAngle) * range, camCY + Math.sin(angle + halfAngle) * range);
    ctx.stroke();

    // Camera body
    ctx.globalAlpha = 1;
    ctx.fillStyle = hazard._state === 'alert' ? '#ef4444' : '#1e293b';
    ctx.shadowColor = hazard._state === 'alert' ? '#ef4444' : '#64748b';
    ctx.shadowBlur = hazard._state === 'alert' ? 10 : 4;
    ctx.fillRect(x, y, w, h);

    // Camera lens
    ctx.shadowBlur = 0;
    ctx.fillStyle = coneColor;
    ctx.beginPath();
    ctx.arc(camCX, camCY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Camera direction indicator
    ctx.strokeStyle = coneColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camCX, camCY);
    ctx.lineTo(camCX + Math.cos(angle) * 12, camCY + Math.sin(angle) * 12);
    ctx.stroke();

    // Alert indicator
    if (hazard._state === 'alert') {
        const alertPulse = Math.sin(Date.now() * 0.01) * 0.4 + 0.6;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12 * alertPulse;
        ctx.font = '900 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', camCX, y - 8);
    } else if (hazard._state === 'suspicious') {
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.font = '900 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', camCX, y - 8);
    }

    ctx.restore();
}

function drawTripwire(ctx, camera, hazard) {
    if (hazard.disabled) return;

    const x = hazard.x - camera.x;
    const y = hazard.y - camera.y;
    const w = hazard.width ?? 60;
    const h = hazard.height ?? 8;

    // Shadow mode reveals tripwires more clearly
    const isShadow = state.player?.shadowShift;
    const alpha = isShadow ? 0.6 : 0.2;

    if (hazard._triggered) {
        // Brief flash then nothing
        return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Tripwire line
    const wireColor = isShadow ? '#fb923c' : '#64748b';
    ctx.strokeStyle = wireColor;
    ctx.shadowColor = wireColor;
    ctx.shadowBlur = isShadow ? 8 : 2;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoints
    ctx.fillStyle = wireColor;
    ctx.fillRect(x - 2, y, 4, h);
    ctx.fillRect(x + w - 2, y, 4, h);

    // Shadow mode warning
    if (isShadow) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fb923c';
        ctx.font = '700 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TRIP', x + w / 2, y - 4);
    }

    ctx.restore();
}

// ─── Hazard Proximity Detection ─────────────────────────────────────────

/**
 * Check if player is near a hackable hazard (for hacking terminal targeting).
 */
export function getNearbyHazard(player, level, maxDist = 120) {
    if (!level.hazards) return null;

    for (const hazard of level.hazards) {
        if (hazard.disabled) continue;
        if (!hazard.hackable) continue;

        const hx = hazard.x + (hazard.width ?? 20) / 2;
        const hy = hazard.y + (hazard.height ?? 16) / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.hypot(hx - px, hy - py);

        if (dist < maxDist) {
            return hazard;
        }
    }
    return null;
}
