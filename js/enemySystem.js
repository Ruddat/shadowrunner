/**
 * enemySystem.js - Enemy logic with 5 enemy types + sprite rendering
 *
 * Types:
 *   walker   (default) - patrols left/right on platforms   [SPRITE]
 *   drone    - flying enemy, hovers and swoops toward player [CANVAS]
 *   shield   - blocks projectiles from front, vulnerable from behind [SPRITE + OVERLAY]
 *   mech     - charges at high speed when player is in range [SPRITE]
 *   turret   - stationary, rotates and shoots at player    [CANVAS]
 *   ninja    - stealth assassin, fast & evasive            [SPRITE]
 *
 * All enemies share the base properties: x, y, width, height, health, active
 * Plus type-specific properties (see each update/draw function).
 * Sprite types get an `anim` (AnimationState) and `useSprites = true`.
 */

import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { showCenterMessage } from './screens.js';
import { isEnemyAlert } from './stealthSystem.js';
import { playSound } from './audioManager.js';
import { getEnemySprite, AnimationState } from './spriteManager.js';

// --- Enemy gravity constants ---
const ENEMY_GRAVITY = 1600;       // slightly less than player gravity
const ENEMY_TERMINAL_VEL = 800;   // max fall speed for enemies

// Ground-based enemy types that need gravity and platform collision
const GROUND_ENEMY_TYPES = new Set(['walker', 'shield', 'mech', 'ninja']);

// --- Main Update ---

export function updateEnemies(dt) {
    const { currentLevel: level, player, camera } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        const type = enemy.type ?? 'walker';

        // Initialize animation state for sprite-based enemies
        initEnemyAnim(enemy, type);

        // Apply gravity to ground-based enemies (walker, shield, mech, ninja)
        // Drones and turrets are flying/stationary — no gravity
        if (GROUND_ENEMY_TYPES.has(type)) {
            updateEnemyGravity(enemy, dt, level);
        }

        switch (type) {
            case 'drone':   updateDrone(enemy, dt); break;
            case 'shield':  updateShield(enemy, dt); break;
            case 'mech':    updateMech(enemy, dt); break;
            case 'turret':  updateTurret(enemy, dt); break;
            case 'ninja':   updateNinja(enemy, dt); break;
            default:        updateWalker(enemy, dt); break;
        }

        // Update sprite animation for sprite-based enemies
        updateEnemyAnim(enemy, type, dt);

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

// --- Enemy Gravity & Platform Collision ---

/**
 * Apply gravity to ground-based enemies and resolve platform collisions.
 * This ensures enemies don't float in the air when placed above platforms
 * or when shadow platforms disappear.
 */
function updateEnemyGravity(enemy, dt, level) {
    // Initialize gravity state
    if (enemy._gravityInit === undefined) {
        enemy._gravityInit = true;
        enemy.velocityY = enemy.velocityY ?? 0;
        enemy.onGround = enemy.onGround ?? false;
        enemy.prevY = enemy.y;
    }

    // Store previous Y for platform collision
    enemy.prevY = enemy.y;

    // Apply gravity
    enemy.velocityY += ENEMY_GRAVITY * dt;
    enemy.velocityY = Math.min(enemy.velocityY, ENEMY_TERMINAL_VEL);

    // Apply vertical velocity
    enemy.y += enemy.velocityY * dt;

    // Resolve platform collisions (uses all current platforms including shadow platforms)
    enemy.onGround = false;
    const platforms = level.platforms || [];
    const shadowPlatforms = level.shadowPlatforms || [];

    // Check regular platforms
    for (const platform of platforms) {
        if (!rectsOverlap(enemy, platform)) continue;

        const previousBottom = enemy.prevY + enemy.height;
        const currentBottom = enemy.y + enemy.height;

        // Only land on top of platforms (falling down onto them)
        if (
            enemy.velocityY >= 0 &&
            previousBottom <= platform.y + 8 &&  // small tolerance for edge cases
            currentBottom >= platform.y
        ) {
            enemy.y = platform.y - enemy.height;
            enemy.velocityY = 0;
            enemy.onGround = true;
        }
    }

    // Check shadow platforms (enemies can stand on them when they are visible)
    // Shadow platforms exist in the level data, so enemies should collide with them
    // regardless of player shadow state - the platforms are solid geometry for enemies
    for (const platform of shadowPlatforms) {
        if (!rectsOverlap(enemy, platform)) continue;

        const previousBottom = enemy.prevY + enemy.height;
        const currentBottom = enemy.y + enemy.height;

        // Only land on top of platforms (falling down onto them)
        if (
            enemy.velocityY >= 0 &&
            previousBottom <= platform.y + 8 &&
            currentBottom >= platform.y
        ) {
            enemy.y = platform.y - enemy.height;
            enemy.velocityY = 0;
            enemy.onGround = true;
        }
    }

    // Fall off the world? Deactivate enemies that fall too far
    if (enemy.y > CONFIG.height + 400) {
        enemy.active = false;
    }
}

// --- Enemy Animation Helpers ---

/** Types that use sprite rendering */
const SPRITE_TYPES = new Set(['walker', 'shield', 'mech', 'ninja']);

function initEnemyAnim(enemy, type) {
    if (enemy._animInit) return;
    enemy._animInit = true;

    if (SPRITE_TYPES.has(type)) {
        enemy.anim = new AnimationState('idle');
        enemy.useSprites = true;
    } else {
        enemy.useSprites = false;
    }
}

function updateEnemyAnim(enemy, type, dt) {
    if (!enemy.useSprites || !enemy.anim) return;

    const sprite = getEnemySprite(type);
    if (!sprite) return;

    // Determine animation state from enemy behavior
    let animName = 'idle';

    if (enemy._dying) {
        animName = 'death';
    } else if (type === 'mech' && enemy.charging) {
        animName = 'charge';
    } else if (enemy._attacking) {
        animName = 'attack';
    } else if (Math.abs(enemy.speed * enemy.direction) > 1) {
        animName = 'walk';
    }

    enemy.anim.play(animName);
    enemy.anim.update(dt, sprite);
}

// --- Walker (original enemy) ---

function updateWalker(enemy, dt) {
    // Only patrol horizontally when on the ground
    if (enemy.onGround !== false) {
        enemy.x += enemy.speed * enemy.direction * dt;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }

        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.direction = -1;
        }
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

    // Slow patrol movement (only on ground)
    if (enemy.onGround !== false) {
        enemy.x += enemy.speed * enemy.direction * dt;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }
        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.direction = -1;
        }
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
        // Normal slow patrol (only on ground)
        if (enemy.onGround !== false) {
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

// --- Ninja: Stealth assassin, fast & evasive ---

function updateNinja(enemy, dt) {
    const { player } = state;

    // Initialize ninja-specific state
    if (enemy.ninjaPhase === undefined) {
        enemy.ninjaPhase = 'stalk';    // stalk | attack | retreat | cloak
        enemy.ninjaTimer = 0;
        enemy.ninjaCloakAlpha = 1;     // 1 = visible, 0 = cloaked
        enemy.ninjaCloaking = false;
        enemy.ninjaSpeed = enemy.speed ?? 180;  // faster than walkers
        enemy.ninjaAttackSpeed = 450;            // lunge speed
        enemy.ninjaRetreatSpeed = 250;
        enemy.ninjaAttackRange = 200;
        enemy.ninjaCloakCooldown = 0;
    }

    enemy.ninjaTimer -= dt;
    if (enemy.ninjaCloakCooldown > 0) enemy.ninjaCloakCooldown -= dt;

    const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.hypot(dx, dy);

    switch (enemy.ninjaPhase) {
        case 'stalk':
            // Slowly approach player, keeping some distance
            enemy.direction = dx > 0 ? 1 : -1;
            // Only stalk when on ground
            if (enemy.onGround !== false) {
                enemy.x += enemy.direction * enemy.ninjaSpeed * 0.5 * dt;

                // Stay within bounds
                if (enemy.x <= enemy.minX) { enemy.x = enemy.minX; enemy.direction = 1; }
                if (enemy.x + enemy.width >= enemy.maxX) { enemy.x = enemy.maxX - enemy.width; enemy.direction = -1; }
            }

            // When close enough, lunge into attack
            if (dist < enemy.ninjaAttackRange && enemy.ninjaTimer <= 0) {
                enemy.ninjaPhase = 'attack';
                enemy.direction = dx > 0 ? 1 : -1;
                enemy.ninjaTimer = 0.4; // attack duration
                enemy._attacking = true;
                playSound('menuSelect');
            }

            // Occasionally cloak when far away
            if (dist > 350 && enemy.ninjaCloakCooldown <= 0 && Math.random() < 0.005) {
                enemy.ninjaPhase = 'cloak';
                enemy.ninjaTimer = 2.0;
            }
            break;

        case 'attack':
            // Fast lunge toward player
            enemy.x += enemy.direction * enemy.ninjaAttackSpeed * dt;

            if (enemy.ninjaTimer <= 0) {
                enemy.ninjaPhase = 'retreat';
                enemy.ninjaTimer = 0.8;
                enemy._attacking = false;
                enemy.direction = dx > 0 ? -1 : 1; // retreat away from player
            }
            break;

        case 'retreat':
            // Quick dash away
            enemy.x += enemy.direction * enemy.ninjaRetreatSpeed * dt;

            if (enemy.x <= enemy.minX) { enemy.x = enemy.minX; enemy.direction = 1; }
            if (enemy.x + enemy.width >= enemy.maxX) { enemy.x = enemy.maxX - enemy.width; enemy.direction = -1; }

            if (enemy.ninjaTimer <= 0) {
                enemy.ninjaPhase = 'stalk';
                enemy.ninjaTimer = 1.5;
            }
            break;

        case 'cloak':
            // Fade out, reposition, fade in
            enemy.ninjaCloaking = true;
            if (enemy.ninjaTimer > 1.0) {
                enemy.ninjaCloakAlpha = Math.max(0, enemy.ninjaCloakAlpha - dt * 3);
            } else if (enemy.ninjaTimer > 0) {
                // Reposition while invisible
                enemy.ninjaCloakAlpha = 0;
                const teleportDir = dx > 0 ? -1 : 1;
                enemy.x += teleportDir * 200 * dt;
                if (enemy.x < enemy.minX) enemy.x = enemy.minX;
                if (enemy.x + enemy.width > enemy.maxX) enemy.x = enemy.maxX - enemy.width;
            }

            if (enemy.ninjaTimer <= 0) {
                enemy.ninjaPhase = 'stalk';
                enemy.ninjaTimer = 1.0;
                enemy.ninjaCloaking = false;
                enemy.ninjaCloakCooldown = 5.0;
            }
            break;
    }

    // Fade back in if not cloaking
    if (!enemy.ninjaCloaking) {
        enemy.ninjaCloakAlpha = Math.min(1, enemy.ninjaCloakAlpha + dt * 4);
    }

    // Ninjas can shoot (throwing stars)
    updateEnemyShooter(enemy, dt);
}

// --- Shared Shooter Logic ---

function updateEnemyShooter(enemy, dt) {
    const { player, enemyProjectiles } = state;

    if (!enemy.canShoot) return;

    // Stealth: enemies only shoot when alert (can see the player)
    if (!isEnemyAlert(enemy)) return;

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
            case 'shield':  drawSpriteOrFallback(ctx, enemy, type, x, y, () => drawShield(ctx, enemy, x, y, player)); break;
            case 'mech':    drawSpriteOrFallback(ctx, enemy, type, x, y, () => drawMech(ctx, enemy, x, y)); break;
            case 'turret':  drawTurret(ctx, enemy, x, y); break;
            case 'ninja':   drawSpriteOrFallback(ctx, enemy, type, x, y, () => drawNinja(ctx, enemy, x, y)); break;
            default:        drawSpriteOrFallback(ctx, enemy, type, x, y, () => drawWalker(ctx, enemy, x, y)); break;
        }

        ctx.restore();
    }
}

// --- Sprite-based drawing with canvas fallback ---

function drawSpriteOrFallback(ctx, enemy, type, x, y, fallbackFn) {
    const sprite = getEnemySprite(type);

    if (enemy.useSprites && sprite && sprite.loaded && enemy.anim) {
        drawEnemySprite(ctx, enemy, sprite, x, y, type);
    } else {
        fallbackFn();
    }
}

function drawEnemySprite(ctx, enemy, sprite, x, y, type) {
    const drawW = enemy.width;
    const drawH = enemy.height;

    // Scale sprite frame to fit the enemy hitbox (align feet)
    const scale = drawH / sprite.frameHeight;
    const scaledW = sprite.frameWidth * scale;
    const offsetX = (drawW - scaledW) / 2;

    // Ninja cloak alpha
    if (type === 'ninja' && enemy.ninjaCloakAlpha !== undefined) {
        ctx.globalAlpha = Math.max(0.05, enemy.ninjaCloakAlpha);
    }

    // Charge warning glow for mech
    if (type === 'mech' && enemy.chargeCooldown > 1.0 && enemy.chargeCooldown < 1.5) {
        const flashAlpha = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(239, 68, 68, ${flashAlpha * 0.4})`;
        ctx.fillRect(x - 8, y - 8, enemy.width + 16, enemy.height + 16);
    }

    // Charge trail for mech
    if (type === 'mech' && enemy.charging) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        for (let i = 0; i < 3; i++) {
            const trailX = x + (enemy.direction === 1 ? -i * 12 : enemy.width + i * 12);
            const trailY = y + 10 + i * 15;
            ctx.fillRect(trailX, trailY, 8, 6);
        }
    }

    // Draw the sprite frame
    sprite.drawFrame(
        ctx,
        x + offsetX,
        y,
        enemy.anim.current,
        enemy.anim.frameIndex,
        enemy.direction,
        { width: scaledW, height: drawH }
    );

    // Ninja afterimage effect during attack
    if (type === 'ninja' && enemy.ninjaPhase === 'attack') {
        ctx.globalAlpha = 0.3;
        sprite.drawFrame(
            ctx,
            x + offsetX - enemy.direction * 15,
            y,
            enemy.anim.current,
            enemy.anim.frameIndex,
            enemy.direction,
            { width: scaledW, height: drawH }
        );
        ctx.globalAlpha = 0.15;
        sprite.drawFrame(
            ctx,
            x + offsetX - enemy.direction * 30,
            y,
            enemy.anim.current,
            enemy.anim.frameIndex,
            enemy.direction,
            { width: scaledW, height: drawH }
        );
        ctx.globalAlpha = 1;
    }

    // Shield overlay (drawn on top of sprite)
    if (type === 'shield') {
        drawShieldOverlay(ctx, enemy, x, y);
    }
}

// --- Shield overlay (drawn on top of the sprite) ---

function drawShieldOverlay(ctx, enemy, x, y) {
    const shieldOnFront = enemy.shieldHP > 0;

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
        ctx.shadowBlur = 0;
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

// --- Ninja draw (canvas fallback) ---

function drawNinja(ctx, enemy, x, y) {
    // Cloak alpha
    if (enemy.ninjaCloakAlpha !== undefined) {
        ctx.globalAlpha = Math.max(0.05, enemy.ninjaCloakAlpha);
    }

    // Body glow
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 18;

    // Body
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(x, y, enemy.width, enemy.height);

    // Cyan fiber-optic lines
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(x + 6, y + 8, 3, 20);
    ctx.fillRect(x + enemy.width - 9, y + 8, 3, 20);

    // Eye slit
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(x + 10, y + 12, 22, 6);

    // Legs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 4, y + 36, 10, 14);
    ctx.fillRect(x + enemy.width - 14, y + 36, 10, 14);

    // Attack effect: blade slash
    if (enemy.ninjaPhase === 'attack') {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 22;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const slashX = enemy.direction === 1 ? x + enemy.width : x;
        ctx.moveTo(slashX, y + 5);
        ctx.lineTo(slashX + enemy.direction * 18, y + 30);
        ctx.stroke();

        // Afterimage
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(x - enemy.direction * 12, y, enemy.width, enemy.height);
    }

    ctx.globalAlpha = 1;
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
