/**
 * bossSystem.js - All boss logic extracted from main.js
 * Imports state from gameState.js and destructure what's needed.
 */

import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { showCenterMessage } from './screens.js';

export function updateBoss(dt) {
    const { currentLevel: level, player, camera, bossProjectiles } = state;
    const boss = level.boss;

    if (!boss || boss.active === false) return;

    updateBossPhase(boss);

    const phaseConfig = getBossPhaseConfig(boss);
    const endPressureConfig = getBossEndPressureConfig(boss, phaseConfig);

    boss.x += boss.speed * boss.direction * dt;

    if (boss.x <= boss.minX) {
        boss.x = boss.minX;
        boss.direction = 1;
    }

    if (boss.x + boss.width >= boss.maxX) {
        boss.x = boss.maxX - boss.width;
        boss.direction = -1;
    }

    // Optional: Boss zieht Richtung Spieler leicht nach.
    if (phaseConfig.trackPlayer) {
        const bossCenterX = boss.x + boss.width / 2;
        const playerCenterX = player.x + player.width / 2;

        if (Math.abs(playerCenterX - bossCenterX) > 80) {
            boss.direction = playerCenterX > bossCenterX ? 1 : -1;
        }
    }

    boss.shootTimer -= dt;

    if (boss.shootTimer <= 0) {
        shootBossPattern(boss, endPressureConfig, bossProjectiles);
        boss.shootTimer = phaseConfig.shootDelay ?? 1.2;
    }

    if (rectsOverlap(player, boss)) {
        player.hit(level, endPressureConfig.contactDamage ?? boss.contactDamage ?? 45);
        camera.shake(14, 0.25);
        showCenterMessage('HIT', 0.65);
    }
}

function updateBossPhase(boss) {
    const maxHealth = boss.maxHealth ?? boss.health ?? 1;
    const healthRatio = boss.health / maxHealth;

    const phases = boss.config?.phases;

    if (!phases || phases.length === 0) {
        // Fallback für alte Boss-Daten
        if (boss.health <= maxHealth / 2) {
            boss.phase = 2;
            boss.speed = 145;
        } else {
            boss.phase = 1;
        }

        return;
    }

    let selectedPhase = phases[0];

    for (const phase of phases) {
        if (healthRatio <= phase.hpBelow) {
            selectedPhase = phase;
        }
    }

    if (boss.phase !== selectedPhase.id) {
        boss.phase = selectedPhase.id;

        if (selectedPhase.message) {
            showCenterMessage(selectedPhase.message, 1.0);
        }

        spawnParticles(
            boss.x + boss.width / 2,
            boss.y + boss.height / 2,
            selectedPhase.id === 3 ? 70 : 42,
            selectedPhase.color ?? '#ff003c'
        );

        state.camera.shake(selectedPhase.id === 3 ? 18 : 10, 0.28);
    }

    boss.speed = selectedPhase.speed ?? boss.baseSpeed ?? boss.speed;
}

function getBossEndPressureConfig(boss, phaseConfig) {
    const { currentLevel: level, player } = state;
    const exit = level.exit;

    if (!exit || exit.locked === false) return phaseConfig;

    const playerNearEnd = player.x > (boss.endPressureX ?? CONFIG.worldWidth - 520);

    if (!playerNearEnd) return phaseConfig;

    return {
        ...phaseConfig,
        shootDelay: Math.max(
            boss.endPressureMinShootDelay ?? 0.38,
            (phaseConfig.shootDelay ?? 1.0) * 0.65
        ),
        projectileSpeed: (phaseConfig.projectileSpeed ?? 360) + 80,
        pattern: boss.endPressurePattern ?? phaseConfig.endPressurePattern ?? 'aimedBurst',
        damage: (phaseConfig.damage ?? 30) + 5,
        trackPlayer: true,
    };
}


function getBossPhaseConfig(boss) {
    const phases = boss.config?.phases;

    if (!phases || phases.length === 0) {
        return {
            id: boss.phase ?? 1,
            shootDelay: boss.phase === 2 ? 0.75 : 1.2,
            projectileSpeed: boss.phase === 2 ? 420 : 340,
            damage: boss.phase === 2 ? 40 : 30,
            pattern: boss.phase === 2 ? 'double' : 'single',
            contactDamage: boss.phase === 2 ? 50 : 45,
        };
    }

    return phases.find(phase => phase.id === boss.phase) ?? phases[0];
}


function shootBossPattern(boss, phaseConfig, bossProjectiles) {
    const pattern = phaseConfig.pattern ?? 'single';

    if (pattern === 'single') {
        shootBossProjectile(boss, phaseConfig, 0, bossProjectiles);
        return;
    }

    if (pattern === 'double') {
        shootBossProjectile(boss, phaseConfig, -0.14, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0.14, bossProjectiles);
        return;
    }

    if (pattern === 'triple') {
        shootBossProjectile(boss, phaseConfig, -0.22, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0.22, bossProjectiles);
        return;
    }

    if (pattern === 'burst') {
        shootBossProjectile(boss, phaseConfig, -0.28, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, -0.14, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0.14, bossProjectiles);
        shootBossProjectile(boss, phaseConfig, 0.28, bossProjectiles);
        return;
    }

    if (pattern === 'aimed') {
        shootBossAimedProjectile(boss, phaseConfig, bossProjectiles);
        return;
    }

    if (pattern === 'aimedBurst') {
        shootBossAimedProjectile(boss, phaseConfig, bossProjectiles, -0.18);
        shootBossAimedProjectile(boss, phaseConfig, bossProjectiles, 0);
        shootBossAimedProjectile(boss, phaseConfig, bossProjectiles, 0.18);
        return;
    }

    if (pattern === 'spiralBurst') {
        // 8 projectiles in a spiral pattern
        const baseAngle = Math.atan2(
            state.player.y + state.player.height / 2 - (boss.y + (phaseConfig.fireY ?? 55)),
            state.player.x + state.player.width / 2 - (boss.x + boss.width / 2)
        );
        for (let i = 0; i < 8; i++) {
            const angle = baseAngle + (i * Math.PI * 2 / 8);
            shootBossProjectileAtAngle(boss, phaseConfig, angle, bossProjectiles);
        }
        return;
    }

    shootBossProjectile(boss, phaseConfig, 0, bossProjectiles);
}

function shootBossProjectile(boss, phaseConfig, verticalOffset, bossProjectiles) {
    const speed = phaseConfig.projectileSpeed ?? 360;

    bossProjectiles.push({
        x: boss.x,
        y: boss.y + (phaseConfig.fireY ?? 55),
        width: phaseConfig.projectileWidth ?? 26,
        height: phaseConfig.projectileHeight ?? 12,
        vx: -(speed),
        vy: verticalOffset * speed,
        speed,
        damage: phaseConfig.damage ?? 30,
        color: phaseConfig.projectileColor ?? '#ff003c',
        glow: phaseConfig.projectileGlow ?? '#ff003c',
        active: true,
    });
}

function shootBossAimedProjectile(boss, phaseConfig, bossProjectiles, angleOffset = 0) {
    const { player } = state;
    const bossCenterX = boss.x + boss.width / 2;
    const bossCenterY = boss.y + (phaseConfig.fireY ?? 55);

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - bossCenterX;
    const dy = playerCenterY - bossCenterY;
    const distance = Math.max(1, Math.hypot(dx, dy));

    const speed = phaseConfig.projectileSpeed ?? 390;

    let vx = (dx / distance) * speed;
    let vy = (dy / distance) * speed;

    if (angleOffset !== 0) {
        const cos = Math.cos(angleOffset);
        const sin = Math.sin(angleOffset);

        const rotatedVx = vx * cos - vy * sin;
        const rotatedVy = vx * sin + vy * cos;

        vx = rotatedVx;
        vy = rotatedVy;
    }

    bossProjectiles.push({
        x: bossCenterX,
        y: bossCenterY,
        width: phaseConfig.projectileWidth ?? 24,
        height: phaseConfig.projectileHeight ?? 12,
        vx,
        vy,
        speed,
        damage: phaseConfig.damage ?? 35,
        color: phaseConfig.projectileColor ?? '#ff003c',
        glow: phaseConfig.projectileGlow ?? '#ff003c',
        active: true,
    });
}

/**
 * Shoot a boss projectile at an absolute angle (radians).
 * Used by spiralBurst pattern.
 */
function shootBossProjectileAtAngle(boss, phaseConfig, angle, bossProjectiles) {
    const speed = phaseConfig.projectileSpeed ?? 400;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    bossProjectiles.push({
        x: boss.x + boss.width / 2,
        y: boss.y + (phaseConfig.fireY ?? 55),
        width: phaseConfig.projectileWidth ?? 28,
        height: phaseConfig.projectileHeight ?? 12,
        vx,
        vy,
        speed,
        damage: phaseConfig.damage ?? 40,
        color: phaseConfig.projectileColor ?? '#ff2bd6',
        glow: phaseConfig.projectileGlow ?? '#ff2bd6',
        active: true,
    });
}

export function updateBossProjectiles(dt) {
    const { currentLevel: level, player, camera, bossProjectiles } = state;

    for (const shot of bossProjectiles) {
        if (!shot.active) continue;

        if (typeof shot.vx === 'number' || typeof shot.vy === 'number') {
            shot.x += (shot.vx ?? -shot.speed) * dt;
            shot.y += (shot.vy ?? 0) * dt;
        } else {
            shot.x -= shot.speed * dt;
        }

        if (
            shot.x < camera.x - 140 ||
            shot.x > camera.x + CONFIG.width + 140 ||
            shot.y < -120 ||
            shot.y > CONFIG.height + 180
        ) {
            shot.active = false;
            continue;
        }

        if (rectsOverlap(player, shot)) {
            shot.active = false;
            player.hit(level, shot.damage ?? 35);

            spawnParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                20,
                shot.color ?? '#ff003c'
            );

            camera.shake(12, 0.22);
            showCenterMessage('HIT', 0.65);
        }
    }

    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        if (!bossProjectiles[i].active) {
            bossProjectiles.splice(i, 1);
        }
    }
}

export function damageBossInRadius(centerX, centerY, radius, damage) {
    const { currentLevel: level, camera } = state;
    const boss = level.boss;

    if (!boss || boss.active === false) return;

    const bossCenterX = boss.x + boss.width / 2;
    const bossCenterY = boss.y + boss.height / 2;

    const dx = bossCenterX - centerX;
    const dy = bossCenterY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > radius + boss.width / 2) return;

    const falloff = Math.max(0.5, 1 - distance / (radius + boss.width / 2));
    boss.health -= damage * falloff;

    spawnParticles(
        bossCenterX,
        bossCenterY,
        28,
        '#fb7185'
    );

    if (boss.health <= 0) {
        boss.active = false;
        level.exit.locked = false;

        spawnParticles(
            bossCenterX,
            bossCenterY,
            90,
            '#ff2bd6'
        );

        spawnParticles(
            bossCenterX,
            bossCenterY,
            50,
            '#21e6ff'
        );

        camera.shake(22, 0.65);

        // Use game-loop timer instead of setTimeout
        state.pendingLevelComplete = {
            timer: 0.7,
            bossDefeated: true,
        };
    }
}

export function drawBoss() {
    const { currentLevel: level, camera, ctx } = state;
    const boss = level.boss;

    if (!boss || boss.active === false) return;

    const x = boss.x - camera.x;
    const y = boss.y - camera.y;

    ctx.save();

    // Different visual per boss type (determined by level name)
    const bossName = level.name ?? '';
    if (bossName === 'Overlord Core') {
        drawOverlordCore(ctx, boss, x, y);
    } else {
        drawFactoryGuardian(ctx, boss, x, y);
    }

    ctx.restore();

    drawBossHealthBar(boss);
}

function drawFactoryGuardian(ctx, boss, x, y) {
    ctx.shadowColor = boss.phase === 2 ? '#ff003c' : '#ff2bd6';
    ctx.shadowBlur = 26;

    ctx.fillStyle = '#1f1028';
    ctx.fillRect(x, y, boss.width, boss.height);

    ctx.fillStyle = '#ff003c';
    ctx.fillRect(x + 25, y + 24, 60, 18);

    ctx.fillStyle = '#21e6ff';
    ctx.fillRect(x + 18, y + 78, 74, 10);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 42, y - 18, 26, 18);
}

function drawOverlordCore(ctx, boss, x, y) {
    // Phase-dependent glow
    const glowColor = boss.phase === 4 ? '#ffffff'
        : boss.phase === 3 ? '#ff2bd6'
        : boss.phase === 2 ? '#facc15'
        : '#7c3aed';

    // Pulsing aura
    const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 * pulse;

    // Main body - darker, more menacing
    ctx.fillStyle = '#0a0510';
    ctx.fillRect(x, y, boss.width, boss.height);

    // Core eye - the central weak point
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x + boss.width / 2, y + boss.height / 2, 18 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner pupil
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + boss.width / 2, y + boss.height / 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Circuit patterns on the body
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;

    // Left circuit
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 20);
    ctx.lineTo(x + 30, y + 35);
    ctx.lineTo(x + 30, y + 60);
    ctx.stroke();

    // Right circuit
    ctx.beginPath();
    ctx.moveTo(x + boss.width - 10, y + 20);
    ctx.lineTo(x + boss.width - 30, y + 35);
    ctx.lineTo(x + boss.width - 30, y + 60);
    ctx.stroke();

    // Top energy rings
    ctx.globalAlpha = 1;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(x + boss.width / 2, y - 8, 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + boss.width / 2, y - 8, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Side vents
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - 8, y + 30, 8, 20);
    ctx.fillRect(x + boss.width, y + 30, 8, 20);
    ctx.globalAlpha = 1;

    // Bottom energy lines
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + 15, y + boss.height - 10, boss.width - 30, 3);
    ctx.fillRect(x + 20, y + boss.height - 5, boss.width - 40, 2);
    ctx.globalAlpha = 1;
}

function drawBossHealthBar(boss) {
    const { ctx } = state;
    const w = 420;
    const h = 18;
    const x = CONFIG.width / 2 - w / 2;
    const y = 158;

    const ratio = Math.max(0, boss.health / boss.maxHealth);

    ctx.save();

    ctx.fillStyle = 'rgba(5,5,16,.85)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = boss.phase === 2 ? '#ff003c' : '#ff2bd6';
    ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 14px monospace';
    ctx.textAlign = 'center';
    // Use level name for boss health bar, fallback to FACTORY GUARDIAN
    const bossName = state.currentLevel?.name ?? 'FACTORY GUARDIAN';
    ctx.fillText(bossName, CONFIG.width / 2, y - 8);

    ctx.restore();
}

export function drawBossProjectiles() {
    const { camera, bossProjectiles, ctx } = state;

    for (const shot of bossProjectiles) {
        const x = shot.x - camera.x;
        const y = shot.y - camera.y;

        ctx.save();

        ctx.shadowColor = shot.glow ?? '#ff003c';
        ctx.shadowBlur = 22;

        ctx.fillStyle = shot.color ?? '#ff003c';
        ctx.beginPath();
        ctx.ellipse(
            x + shot.width / 2,
            y + shot.height / 2,
            shot.width / 2,
            Math.max(4, shot.height / 2),
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(
            x + shot.width / 2,
            y + shot.height / 2,
            Math.max(3, shot.width / 5),
            Math.max(2, shot.height / 4),
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }
}
