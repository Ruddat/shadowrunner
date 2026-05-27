/**
 * levelManager.js - Level state, transitions, pickups
 * Extracted from main.js. Uses state from gameState.js.
 */

import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { state } from './gameState.js';
import { showCenterMessage, completeLevel, createLevelStats } from './screens.js';
import {
    floatingItems,
    resolveReward,
    spawnFloatingItem,
    getPowerupColor,
    POWERUP_TYPES,
} from './powerups.js';
import {
    getWeaponDisplayName,
    WEAPON_IDS,
} from './weapons.js';
import { playSound, stopMusic, playMusic } from './audioManager.js';
import { damageBossInRadius } from './bossSystem.js';
import { initLevelFx } from './levelFx.js';
import { getLevel, LEVEL_COUNT } from './levels.js';

export function initializeLevelState(level) {
    const { player } = state;

    player.deathsThisLevel = 0;

    if (level.enemies) {
        for (const enemy of level.enemies) {
            enemy.maxHealth = enemy.maxHealth ?? enemy.health ?? 1;
            enemy.health = enemy.maxHealth;
            enemy.active = true;

            if (enemy.canShoot) {
                enemy.shootTimer = enemy.shootDelay ?? 1.2;
            }
        }
    }

    if (level.boss) {
        level.boss.maxHealth = level.boss.maxHealth ?? level.boss.health ?? 1;
        level.boss.health = level.boss.maxHealth;
        level.boss.active = level.boss.active ?? true;
    }

    if (level.gems) {
        for (const gem of level.gems) {
            gem.collected = false;
        }
    }

    if (level.bonusBlocks) {
        for (const block of level.bonusBlocks) {
            block.used = false;
            block.bumpTimer = 0;
            block.spawnRequest = null;
        }
    }
}

export function loadNextLevel() {
    const { player, camera, projectiles, bossProjectiles, enemyProjectiles } = state;

    state.currentLevelIndex++;

    // BUG FIX: Detect game completion instead of repeating boss endlessly
    if (state.currentLevelIndex >= LEVEL_COUNT) {
        state.gameState = 'credits';
        return;
    }

    state.currentLevel = getLevel(state.currentLevelIndex);
    state.levelBackground.src = state.currentLevel.background;

    if (state.currentLevel.music) {
        playMusic(state.currentLevel.music);
    }

    player.x = state.currentLevel.spawn.x;
    player.y = state.currentLevel.spawn.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.levelComplete = false;
    player.gems = 0;
    player.keys = 0;  // BUG FIX: Reset keys between levels

    camera.x = 0;
    camera.y = 0;

    initLevelFx();

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    initializeLevelState(state.currentLevel);
    player.deathsThisLevel = 0;
    state.levelStats = createLevelStats(state.currentLevel);
}

export function retryCurrentLevel() {
    const { currentLevel: level, player, camera, projectiles, bossProjectiles, enemyProjectiles } = state;

    stopMusic();

    player.x = level.spawn.x;
    player.y = level.spawn.y;
    player.prevY = level.spawn.y;
    player.velocityX = 0;
    player.velocityY = 0;

    player.lives = 3;
    player.energy = 100;
    player.invincibleTimer = 0;
    player.shootCooldown = 0;

    player.weaponId = WEAPON_IDS.BLASTER;
    player.weaponLevel = 1;

    player.gems = 0;
    player.keys = 0;  // BUG FIX: Reset keys on retry
    player.levelComplete = false;
    player.isGameOver = false;
    player.deathsThisLevel = 0;

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;
    floatingItems.length = 0;

    initializeLevelState(level);
    state.levelStats = createLevelStats(level);
    state.gameOverStats = null;

    camera.x = 0;
    camera.y = 0;

    playMusic(level.music ?? 'level1');
    state.gameState = 'playing';
}

export function updateGems() {
    const { currentLevel: level, player, camera } = state;

    for (const gem of level.gems) {
        if (gem.collected) continue;

        const gemBox = {
            x: gem.x,
            y: gem.y,
            width: 26,
            height: 26,
        };

        if (rectsOverlap(player, gemBox)) {
            gem.collected = true;
            player.gems++;
            showCenterMessage('+ GEM', 0.65);

            burstGem(gem);
        }
    }
}


function burstGem(gem) {
    const { camera } = state;
    const centerX = gem.x + 13;
    const centerY = gem.y + 13;

    spawnParticles(
        centerX,
        centerY,
        28,
        '#ff2bd6'
    );

    spawnParticles(
        centerX,
        centerY,
        12,
        '#ffd6fb'
    );

    camera.shake(3, 0.08);
}

export function updateExit() {
    const { currentLevel: level, player, camera } = state;

    if (player.levelComplete) return;

    if (level.exit.locked) return;

    if (rectsOverlap(player, level.exit)) {
        player.levelComplete = true;

        spawnParticles(
            level.exit.x + level.exit.width / 2,
            level.exit.y + level.exit.height / 2,
            44,
            '#21e6ff'
        );

        camera.shake(10, 0.22);

        // Use game-loop timer instead of setTimeout
        state.pendingLevelComplete = {
            timer: 0.5,
            bossDefeated: false,
        };
    }
}

export function updateBonusBlocks(dt) {
    const { currentLevel: level } = state;
    if (!level.bonusBlocks) return;

    for (const block of level.bonusBlocks) {
        if (block.bumpTimer > 0) {
            block.bumpTimer -= dt;
        }
    }
}

export function updateBonusBlockSpawns() {
    const { currentLevel: level } = state;
    if (!level.bonusBlocks) return;

    for (const block of level.bonusBlocks) {
        if (!block.spawnRequest) continue;

        const reward = resolveReward(
            block.spawnRequest.reward,
            block.spawnRequest.randomPool
        );

        spawnFloatingItem(
            block.spawnRequest.x,
            block.spawnRequest.y,
            reward,
            {
                weaponId: block.spawnRequest.weaponId,
            }
        );

        block.spawnRequest = null;
    }
}

export function updatePowerupPickup() {
    const { player, camera } = state;

    for (const item of floatingItems) {
        if (!item.active) continue;

        if (!rectsOverlap(player, item)) continue;

        item.active = false;
        burstPowerupPickup(item);

        if (item.type === POWERUP_TYPES.GEM) {
            player.gems++;
            playSound('itemPickup');
            showCenterMessage('+ GEM', 0.65);
            return;
        }

        if (item.type === POWERUP_TYPES.LIFE) {
            player.lives = Math.min(player.lives + 1, 9);
            playSound('itemPickup');
            showCenterMessage('1UP', 0.9);
            return;
        }

        if (item.type === POWERUP_TYPES.ENERGY) {
            player.energy = Math.min(player.energy + 25, 100);
            playSound('itemPickup');
            showCenterMessage('ENERGY +25', 0.8);
            return;
        }

        if (item.type === POWERUP_TYPES.WEAPON) {
            player.setWeapon(item.weaponId);
            state.weaponHudPulse = 0.45;
            playSound('weaponPickup');
            showCenterMessage(
                getWeaponDisplayName(player.weaponId, player.weaponLevel),
                1.0
            );
            return;
        }
    }
}

function burstPowerupPickup(item) {
    const { camera } = state;
    const color = getPowerupColor(item);

    spawnParticles(
        item.x + item.width / 2,
        item.y + item.height / 2,
        item.type === POWERUP_TYPES.WEAPON ? 36 : 22,
        color
    );

    if (item.type === POWERUP_TYPES.WEAPON) {
        camera.shake(8, 0.18);
        return;
    }

    if (item.type === POWERUP_TYPES.LIFE) {
        camera.shake(6, 0.16);
        return;
    }

    camera.shake(4, 0.12);
}

export function updateProjectiles(dt) {
    const { currentLevel: level, player, camera, projectiles } = state;

    for (const projectile of projectiles) {
        projectile.update(dt);

        if (
            projectile.x < camera.x - 100 ||
            projectile.x > camera.x + CONFIG.width + 100 ||
            projectile.y > CONFIG.height + 120
        ) {
            projectile.active = false;
            continue;
        }

        for (const enemy of level.enemies) {
            if (enemy.active === false) continue;

            // BUG FIX: Shadow-only enemies can only be hit when player is in shadowShift mode
            if (enemy.shadowOnly && !player.shadowShift) continue;

            if (rectsOverlap(projectile, enemy) && projectile.canHit(enemy)) {
                if (projectile.weaponId === WEAPON_IDS.PLASMA) {
                    explodePlasmaProjectile(projectile);
                    continue;
                }

                projectile.markHit(enemy);

                spawnParticles(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    projectile.weaponId === WEAPON_IDS.LASER ? 24 : 14,
                    projectile.color ?? '#ff003c'
                );

                camera.shake(5, 0.14);

                enemy.health = (enemy.health ?? 1) - projectile.damage;

                if (enemy.health <= 0) {
                    enemy.active = false;

                    spawnParticles(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        projectile.weaponId === WEAPON_IDS.LASER ? 44 : 28,
                        projectile.color ?? '#ff2bd6'
                    );

                    camera.shake(9, 0.22);
                    state.messageTimer = 0.6;
                }

                continue;
            }
        }

        const boss = level.boss;

        if (
            boss &&
            boss.active !== false &&
            projectile.active !== false &&
            rectsOverlap(projectile, boss)
        ) {
            if (projectile.weaponId === WEAPON_IDS.PLASMA) {
                explodePlasmaProjectile(projectile);
                continue;
            }

            projectile.markHit(boss);
            boss.health -= projectile.damage;

            spawnParticles(
                boss.x + boss.width / 2,
                boss.y + boss.height / 2,
                projectile.weaponId === WEAPON_IDS.LASER ? 30 : 18,
                projectile.color ?? '#facc15'
            );

            camera.shake(7, 0.12);

            if (boss.health <= 0) {
                boss.active = false;
                level.exit.locked = false;

                spawnParticles(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2,
                    90,
                    '#ff2bd6'
                );

                spawnParticles(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2,
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
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) {
            projectiles.splice(i, 1);
        }
    }
}

function explodePlasmaProjectile(projectile) {
    const { camera } = state;
    if (projectile.active === false) return;

    const centerX = projectile.x + projectile.width / 2;
    const centerY = projectile.y + projectile.height / 2;
    const radius = getPlasmaExplosionRadius(projectile);

    projectile.active = false;

    spawnParticles(
        centerX,
        centerY,
        projectile.weaponLevel >= 3 ? 80 : projectile.weaponLevel === 2 ? 60 : 42,
        projectile.color ?? '#fb7185'
    );

    damageEnemiesInRadius(centerX, centerY, radius, projectile.damage);
    damageBossInRadius(centerX, centerY, radius, projectile.damage);

    camera.shake(projectile.weaponLevel >= 3 ? 18 : 12, 0.28);
    state.messageTimer = 0.55;
}

function getPlasmaExplosionRadius(projectile) {
    if (projectile.weaponLevel >= 3) return 110;
    if (projectile.weaponLevel === 2) return 88;

    return 68;
}

function damageEnemiesInRadius(centerX, centerY, radius, damage) {
    const { currentLevel: level, player } = state;

    for (const enemy of level.enemies) {
        if (enemy.active === false) continue;

        // BUG FIX: Shadow-only enemies can only be damaged in shadow mode (also blocks AOE)
        if (enemy.shadowOnly && !player.shadowShift) continue;

        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;

        const dx = enemyCenterX - centerX;
        const dy = enemyCenterY - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance > radius) continue;

        const falloff = Math.max(0.45, 1 - distance / radius);
        const finalDamage = damage * falloff;

        enemy.health = (enemy.health ?? 1) - finalDamage;

        spawnParticles(
            enemyCenterX,
            enemyCenterY,
            18,
            '#fb7185'
        );

        if (enemy.health <= 0) {
            enemy.active = false;

            spawnParticles(
                enemyCenterX,
                enemyCenterY,
                34,
                '#ff2bd6'
            );
        }
    }
}

/**
 * Updates the pendingLevelComplete timer. Should be called from the main update loop.
 * Returns true if the level was completed this frame.
 */
export function updatePendingLevelComplete(dt) {
    if (!state.pendingLevelComplete) return false;

    state.pendingLevelComplete.timer -= dt;

    if (state.pendingLevelComplete.timer <= 0) {
        const { bossDefeated } = state.pendingLevelComplete;
        state.pendingLevelComplete = null;
        completeLevel({ bossDefeated });
        return true;
    }

    return false;
}
