/**
 * enemySystem.js - Enemy logic extracted from main.js
 * Imports state from gameState.js and destructure what's needed.
 */

import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { showCenterMessage } from './screens.js';

export function updateEnemies(dt) {
    const { currentLevel: level, player, camera } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        enemy.x += enemy.speed * enemy.direction * dt;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }

        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.direction = -1;
        }

        updateEnemyShooter(enemy, dt);

        if (rectsOverlap(player, enemy)) {
            player.hit(level, enemy.contactDamage ?? 30);
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 22, '#facc15');
            camera.shake(12, 0.25);
            showCenterMessage('HIT', 0.65);
        }
    }
}

function updateEnemyShooter(enemy, dt) {
    const { player, enemyProjectiles } = state;

    if (!enemy.canShoot) return;

    const distanceX = Math.abs((enemy.x + enemy.width / 2) - (player.x + player.width / 2));
    const distanceY = Math.abs((enemy.y + enemy.height / 2) - (player.y + player.height / 2));

    const rangeX = enemy.shootRangeX ?? 520;
    const rangeY = enemy.shootRangeY ?? 160;

    if (distanceX > rangeX || distanceY > rangeY) {
        return;
    }

    enemy.shootTimer -= dt;

    if (enemy.shootTimer > 0) {
        return;
    }

    shootEnemyProjectile(enemy);
    enemy.shootTimer = enemy.shootDelay ?? 1.4;
}

function shootEnemyProjectile(enemy) {
    const { player, enemyProjectiles } = state;
    const enemyCenterX = enemy.x + enemy.width / 2;
    const enemyCenterY = enemy.y + enemy.height / 2;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - enemyCenterX;
    const dy = playerCenterY - enemyCenterY;
    const distance = Math.max(1, Math.hypot(dx, dy));

    const speed = enemy.projectileSpeed ?? 330;

    enemyProjectiles.push({
        x: enemyCenterX,
        y: enemyCenterY,
        width: enemy.projectileWidth ?? 18,
        height: enemy.projectileHeight ?? 8,
        vx: (dx / distance) * speed,
        vy: (dy / distance) * speed,
        damage: enemy.projectileDamage ?? 20,
        color: enemy.projectileColor ?? '#ff003c',
        glow: enemy.projectileGlow ?? '#ff003c',
        active: true,
    });

    spawnParticles(enemyCenterX, enemyCenterY, 8, enemy.projectileColor ?? '#ff003c');
}

export function updateEnemyProjectiles(dt) {
    const { currentLevel: level, player, camera, enemyProjectiles } = state;

    for (const shot of enemyProjectiles) {
        if (!shot.active) continue;

        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;

        if (
            shot.x < camera.x - 120 ||
            shot.x > camera.x + CONFIG.width + 120 ||
            shot.y < -120 ||
            shot.y > CONFIG.height + 160
        ) {
            shot.active = false;
            continue;
        }

        if (rectsOverlap(player, shot)) {
            shot.active = false;
            player.hit(level, shot.damage ?? 20);

            spawnParticles(
                player.x + player.width / 2,
                player.y + player.height / 2,
                22,
                shot.color ?? '#ff003c'
            );

            camera.shake(10, 0.2);
            showCenterMessage('HIT', 0.65);
        }
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        if (!enemyProjectiles[i].active) {
            enemyProjectiles.splice(i, 1);
        }
    }
}

export function drawEnemies() {
    const { currentLevel: level, camera, ctx } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        const x = enemy.x - camera.x;
        const y = enemy.y - camera.y;

        ctx.save();

        ctx.shadowColor = '#ff003c';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#1b1b28';
        ctx.fillRect(x, y, enemy.width, enemy.height);

        ctx.fillStyle = '#ff003c';
        ctx.fillRect(x + 10, y + 12, 26, 12);

        ctx.fillStyle = '#21e6ff';
        ctx.fillRect(x + 8, y + 35, 30, 5);

        ctx.restore();
    }
}

export function drawEnemyProjectiles() {
    const { camera, enemyProjectiles, ctx } = state;

    for (const shot of enemyProjectiles) {
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
