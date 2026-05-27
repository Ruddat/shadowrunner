/**
 * enemySystem.js - Enemy logic with 5 enemy types
 *
 * Types:
 *   walker   (default) - patrols left/right on platforms
 *   drone    - flying enemy, hovers and swoops toward player
 *   shield   - blocks projectiles from front, vulnerable from behind
 *   mech     - charges at high speed when player is in range
 *   turret   - stationary, rotates and shoots at player
 *
 * All enemies share the base properties: x, y, width, height, health, active
 * Plus type-specific properties (see each update/draw function).
 */

import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { showCenterMessage } from './screens.js';
import { playSound } from './audioManager.js';

// --- Main Update ---

export function updateEnemies(dt) {
    const { currentLevel: level, player, camera } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        const type = enemy.type ?? 'walker';

        switch (type) {
            case 'drone':   updateDrone(enemy, dt); break;
            case 'shield':  updateShield(enemy, dt); break;
            case 'mech':    updateMech(enemy, dt); break;
            case 'turret':  updateTurret(enemy, dt); break;
            default:        updateWalker(enemy, dt); break;
        }

        // Contact damage (all types)
        if (rectsOverlap(player, enemy)) {
            player.hit(level, enemy.contactDamage ?? 30);
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 22, '#facc15');
            camera.shake(12, 0.25);
            showCenterMessage('HIT', 0.65);

            // Mech charge impact
            if (type === 'mech' && enemy.charging) {
                enemy.charging = false;
                enemy.chargeCooldown = 1.5;
            }
        }
    }
}

// --- Walker (original enemy) ---

function updateWalker(enemy, dt) {
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
}

// --- Drone: Flying enemy that hovers and swoops ---

function updateDrone(enemy, dt) {
    const { player } = state;

    // Initialize drone-specific state
    if (enemy.hoverY === undefined) {
        enemy.hoverY = enemy.y;
        enemy.hoverPhase = Math.random() * Math.PI * 2;
        enemy.swoopTimer = 0;
        enemy.swooping = false;
    }

    // Hover oscillation
    enemy.hoverPhase += dt * 2.5;
    const hoverOffset = Math.sin(enemy.hoverPhase) * 15;

    // Horizontal patrol
    enemy.x += enemy.speed * enemy.direction * dt;

    if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.direction = 1;
    }
    if (enemy.x + enemy.width >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.width;
        enemy.direction = -1;
    }

    // Swoop attack: dive toward player when nearby
    if (!enemy.swooping) {
        enemy.swoopTimer -= dt;
        const dx = Math.abs((enemy.x + enemy.width / 2) - (player.x + player.width / 2));

        if (dx < 300 && enemy.swoopTimer <= 0) {
            enemy.swooping = true;
            enemy.swoopTargetY = player.y - 10;
            enemy.swoopTimer = 3.0; // cooldown after swoop ends
        }

        enemy.y = enemy.hoverY + hoverOffset;
    } else {
        // Dive toward player Y
        const dy = enemy.swoopTargetY - enemy.y;
        enemy.y += dy * 4 * dt;

        // End swoop after reaching target or timeout
        if (Math.abs(dy) < 10) {
            enemy.swooping = false;
        }
    }

    // Drone shooting (slower than walkers)
    updateEnemyShooter(enemy, dt);
}

// --- Shield: Blocks projectiles from front, vulnerable from behind ---

function updateShield(enemy, dt) {
    const { player } = state;

    // Initialize shield state
    if (enemy.facingPlayer === undefined) {
        enemy.facingPlayer = true;
        enemy.shieldHP = enemy.shieldHP ?? 3; // shield can absorb N hits before breaking
    }

    // Face the player (shield always points toward player)
    const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
    enemy.facingPlayer = dx > 0;
    enemy.direction = enemy.facingPlayer ? 1 : -1;

    // Slow patrol movement
    enemy.x += enemy.speed * enemy.direction * dt;

    if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.direction = 1;
    }
    if (enemy.x + enemy.width >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.width;
        enemy.direction = -1;
    }

    // Shield enemies can shoot too (slower fire rate)
    updateEnemyShooter(enemy, dt);
}

// --- Mech: Charges at high speed when player is in range ---

function updateMech(enemy, dt) {
    const { player } = state;

    // Initialize mech state
    if (enemy.chargeCooldown === undefined) {
        enemy.chargeCooldown = 0;
        enemy.charging = false;
        enemy.chargeSpeed = enemy.chargeSpeed ?? 700;
        enemy.chargeRange = enemy.chargeRange ?? 400;
    }

    // Charge cooldown
    if (enemy.chargeCooldown > 0) {
        enemy.chargeCooldown -= dt;
    }

    if (enemy.charging) {
        // Rush toward player direction
        enemy.x += enemy.direction * enemy.chargeSpeed * dt;

        // Stop charge at boundaries
        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.charging = false;
            enemy.chargeCooldown = 2.0;
        }
        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.charging = false;
            enemy.chargeCooldown = 2.0;
        }

        // Stop charge after traveling some distance
        enemy.chargeDistance = (enemy.chargeDistance ?? 0) + enemy.chargeSpeed * dt;
        if (enemy.chargeDistance > enemy.chargeRange * 1.5) {
            enemy.charging = false;
            enemy.chargeCooldown = 2.0;
            enemy.chargeDistance = 0;
        }
    } else {
        // Normal slow patrol
        enemy.x += enemy.speed * enemy.direction * dt;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }
        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.direction = -1;
        }

        // Detect player in charge range
        const dx = Math.abs((enemy.x + enemy.width / 2) - (player.x + player.width / 2));
        const dy = Math.abs((enemy.y + enemy.height / 2) - (player.y + player.height / 2));

        if (dx < enemy.chargeRange && dy < 120 && enemy.chargeCooldown <= 0) {
            enemy.charging = true;
            enemy.direction = (player.x > enemy.x) ? 1 : -1;
            enemy.chargeDistance = 0;

            // Visual + audio feedback
            playSound('menuSelect'); // warning sound before charge
        }
    }

    // Mechs don't shoot, they charge
}

// --- Turret: Stationary, rotates and shoots at player ---

function updateTurret(enemy, dt) {
    // Turrets don't move, they only shoot
    if (enemy.turretAngle === undefined) {
        enemy.turretAngle = 0; // radians, 0 = right
    }

    const { player } = state;
    const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);

    // Rotate turret toward player
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = targetAngle - enemy.turretAngle;

    // Smooth rotation
    enemy.turretAngle += angleDiff * 3 * dt;

    // Turret shooting (faster than walkers)
    enemy.shootDelay = enemy.shootDelay ?? 1.0;
    updateEnemyShooter(enemy, dt);
}

// --- Shared Shooter Logic ---

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

    // Turrets shoot in their aiming direction, others aim at player
    let vx, vy;
    if (enemy.type === 'turret' && enemy.turretAngle !== undefined) {
        vx = Math.cos(enemy.turretAngle) * speed;
        vy = Math.sin(enemy.turretAngle) * speed;
    } else {
        vx = (dx / distance) * speed;
        vy = (dy / distance) * speed;
    }

    enemyProjectiles.push({
        x: enemyCenterX,
        y: enemyCenterY,
        width: enemy.projectileWidth ?? 18,
        height: enemy.projectileHeight ?? 8,
        vx,
        vy,
        damage: enemy.projectileDamage ?? 20,
        color: enemy.projectileColor ?? '#ff003c',
        glow: enemy.projectileGlow ?? '#ff003c',
        active: true,
    });

    spawnParticles(enemyCenterX, enemyCenterY, 8, enemy.projectileColor ?? '#ff003c');
}

// --- Enemy Projectile Update ---

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

// --- Drawing ---

export function drawEnemies() {
    const { currentLevel: level, camera, ctx, player } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        // Shadow-only enemies drawn by drawShadowEnemyAuras
        if (enemy.shadowOnly) continue;

        const x = enemy.x - camera.x;
        const y = enemy.y - camera.y;
        const type = enemy.type ?? 'walker';

        ctx.save();

        switch (type) {
            case 'drone':   drawDrone(ctx, enemy, x, y); break;
            case 'shield':  drawShield(ctx, enemy, x, y, player); break;
            case 'mech':    drawMech(ctx, enemy, x, y); break;
            case 'turret':  drawTurret(ctx, enemy, x, y); break;
            default:        drawWalker(ctx, enemy, x, y); break;
        }

        ctx.restore();
    }
}

// --- Walker draw (original style) ---

function drawWalker(ctx, enemy, x, y) {
    ctx.shadowColor = '#ff003c';
    ctx.shadowBlur = 18;

    ctx.fillStyle = '#1b1b28';
    ctx.fillRect(x, y, enemy.width, enemy.height);

    ctx.fillStyle = '#ff003c';
    ctx.fillRect(x + 10, y + 12, 26, 12);

    ctx.fillStyle = '#21e6ff';
    ctx.fillRect(x + 8, y + 35, 30, 5);
}

// --- Drone draw: floating eye with propeller ---

function drawDrone(ctx, enemy, x, y) {
    // Glow
    ctx.shadowColor = '#ff6b00';
    ctx.shadowBlur = 22;

    // Body
    ctx.fillStyle = '#1a1025';
    ctx.beginPath();
    ctx.ellipse(x + enemy.width / 2, y + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Propeller (animated)
    const propPhase = Date.now() / 30;
    ctx.strokeStyle = 'rgba(255, 107, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 4 + Math.sin(propPhase) * 3);
    ctx.lineTo(x + enemy.width - 5, y + 4 - Math.sin(propPhase) * 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + enemy.width / 2 - 8, y + 2 + Math.cos(propPhase) * 2);
    ctx.lineTo(x + enemy.width / 2 + 8, y + 2 - Math.cos(propPhase) * 2);
    ctx.stroke();

    // Eye
    ctx.fillStyle = enemy.swooping ? '#ff0000' : '#ff6b00';
    ctx.beginPath();
    ctx.arc(x + enemy.width / 2, y + enemy.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + enemy.width / 2 + 2 * enemy.direction, y + enemy.height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Swoop warning indicator
    if (enemy.swooping) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + enemy.width / 2, y + enemy.height / 2, enemy.width * 0.8, enemy.height * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Shield draw: armored enemy with forward shield ---

function drawShield(ctx, enemy, x, y, player) {
    const shieldOnFront = enemy.shieldHP > 0;

    // Body
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 14;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, enemy.width, enemy.height);

    // Armored chest
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x + 4, y + 8, enemy.width - 8, 24);

    // Eye slit
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + 10, y + 14, 26, 6);

    // Legs
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x + 6, y + 36, 12, 14);
    ctx.fillRect(x + enemy.width - 18, y + 36, 12, 14);

    // Shield (on the side facing the player)
    if (shieldOnFront) {
        const shieldX = enemy.facingPlayer ? (x + enemy.width - 3) : (x - 10);

        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.5)';
        ctx.fillRect(shieldX, y - 4, 12, enemy.height + 8);

        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.strokeRect(shieldX, y - 4, 12, enemy.height + 8);

        // Shield energy indicator
        ctx.fillStyle = '#60a5fa';
        ctx.font = '900 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${enemy.shieldHP}`, shieldX + 6, y + enemy.height + 14);
        ctx.textAlign = 'left';
    } else {
        // Broken shield indicator (dim)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        const brokenX = enemy.facingPlayer ? (x + enemy.width - 3) : (x - 10);
        ctx.fillRect(brokenX, y - 4, 12, enemy.height + 8);
    }
}

// --- Mech draw: big hulking charger ---

function drawMech(ctx, enemy, x, y) {
    // Charging glow
    if (enemy.charging) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 30;
    } else {
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 16;
    }

    // Body (wider and taller than walkers)
    ctx.fillStyle = enemy.charging ? '#2a0a0a' : '#1b0f0f';
    ctx.fillRect(x, y, enemy.width, enemy.height);

    // Armored plating
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x + 4, y + 6, enemy.width - 8, 16);

    // Visor
    ctx.fillStyle = enemy.charging ? '#ff0000' : '#dc2626';
    ctx.fillRect(x + 8, y + 10, 38, 8);

    // Shoulder pads
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x - 4, y + 4, 12, 20);
    ctx.fillRect(x + enemy.width - 8, y + 4, 12, 20);

    // Legs
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(x + 6, y + enemy.height - 18, 14, 18);
    ctx.fillRect(x + enemy.width - 20, y + enemy.height - 18, 14, 18);

    // Charge warning indicator (flashing before charge)
    if (enemy.chargeCooldown > 1.0 && enemy.chargeCooldown < 1.5) {
        const flashAlpha = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha * 0.4})`;
        ctx.fillRect(x - 8, y - 8, enemy.width + 16, enemy.height + 16);
    }

    // Charge trail particles (visual effect during charge)
    if (enemy.charging) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        for (let i = 0; i < 3; i++) {
            const trailX = x + (enemy.direction === 1 ? -i * 12 : enemy.width + i * 12);
            const trailY = y + 10 + i * 15;
            ctx.fillRect(trailX, trailY, 8, 6);
        }
    }
}

// --- Turret draw: stationary gun emplacement ---

function drawTurret(ctx, enemy, x, y) {
    // Base
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;

    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(x + 4, y + enemy.height - 16, enemy.width - 8, 16);

    // Base details
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(x + 8, y + enemy.height - 12, enemy.width - 16, 4);

    // Turret dome
    ctx.fillStyle = '#0f0520';
    ctx.beginPath();
    ctx.arc(x + enemy.width / 2, y + enemy.height / 2, enemy.width / 3, 0, Math.PI * 2);
    ctx.fill();

    // Barrel (rotates toward player)
    const angle = enemy.turretAngle ?? 0;
    const barrelLength = enemy.width / 2 + 8;
    const barrelStartX = x + enemy.width / 2;
    const barrelStartY = y + enemy.height / 2;
    const barrelEndX = barrelStartX + Math.cos(angle) * barrelLength;
    const barrelEndY = barrelStartY + Math.sin(angle) * barrelLength;

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(barrelStartX, barrelStartY);
    ctx.lineTo(barrelEndX, barrelEndY);
    ctx.stroke();

    // Barrel tip glow
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(barrelEndX, barrelEndY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Center eye
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(x + enemy.width / 2, y + enemy.height / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(x + enemy.width / 2 + Math.cos(angle) * 2, y + enemy.height / 2 + Math.sin(angle) * 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
}

// --- Enemy Projectile Draw ---

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

// --- Shield Hit Detection (called from levelManager projectile collision) ---

/**
 * Check if a projectile hits a shield enemy's shield.
 * Returns true if the shield blocks the projectile.
 */
export function isShieldBlocking(enemy, projectile) {
    if ((enemy.type ?? 'walker') !== 'shield') return false;
    if (!enemy.shieldHP || enemy.shieldHP <= 0) return false;

    // Shield is on the side facing the player
    // Projectile must come from the shield side to be blocked
    const projectileComingFromLeft = projectile.vx > 0; // projectile moving right = coming from left
    const projectileComingFromRight = projectile.vx < 0;

    // If enemy faces player (facingPlayer=true → direction=1 → shield on right side)
    if (enemy.facingPlayer && projectileComingFromLeft) {
        return true; // blocked by right-side shield
    }
    if (!enemy.facingPlayer && projectileComingFromRight) {
        return true; // blocked by left-side shield
    }

    return false;
}

/**
 * Apply shield damage. Returns true if shield absorbed the hit.
 */
export function damageShield(enemy) {
    if (!enemy.shieldHP || enemy.shieldHP <= 0) return false;

    enemy.shieldHP--;
    spawnParticles(
        enemy.x + (enemy.facingPlayer ? enemy.width + 5 : -5),
        enemy.y + enemy.height / 2,
        12,
        '#60a5fa'
    );

    if (enemy.shieldHP <= 0) {
        // Shield broken!
        spawnParticles(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            28,
            '#60a5fa'
        );
        showCenterMessage('SHIELD DOWN!', 0.6);
    }

    return true;
}
