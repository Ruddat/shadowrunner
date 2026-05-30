/**
 * stealthSystem.js — Stealth Mechanics for Shadowrunner
 *
 * Core concept: Player in shadow = invisible to enemies.
 * Shadow sources: shadowShift mode, shadow areas in levels, under platforms.
 *
 * Enemy alert states: patrol → suspicious → alert → combat
 * Sight cones: each enemy has a vision range + angle based on type.
 */

import { state } from './gameState.js';
import { rectsOverlap } from './collision.js';

// ─── Stealth Config ─────────────────────────────────────────────────────

const STEALTH_CONFIG = {
    // Alert state timings
    suspiciousTime: 1.5,       // seconds to go suspicious → alert
    alertDecayTime: 3.0,       // seconds to go alert → suspicious (lost sight)
    suspiciousDecayTime: 2.0,  // seconds to go suspicious → patrol (lost sight)

    // Sight cone defaults per enemy type
    enemySight: {
        walker:  { range: 320, halfAngle: Math.PI / 3, shadowVision: false },
        drone:   { range: 280, halfAngle: Math.PI / 2, shadowVision: false },
        shield:  { range: 250, halfAngle: Math.PI / 4, shadowVision: false },
        mech:    { range: 400, halfAngle: Math.PI / 6, shadowVision: false },
        turret:  { range: 450, halfAngle: Math.PI / 3, shadowVision: true  },
        ninja:   { range: 200, halfAngle: Math.PI / 2, shadowVision: true  },
    },

    // Shadow area detection
    shadowUnderPlatformMinWidth: 80,  // platforms >= this create shadow below
    shadowUnderPlatformHeight: 60,    // how tall the shadow under a platform is

    // Player visibility when NOT in shadow
    playerBaseVisibility: 1.0,
    // Player visibility when IN shadow (shadowShift)
    playerShadowShiftVisibility: 0.0,
    // Player visibility in shadow areas
    playerShadowAreaVisibility: 0.0,

    // Crouch stealth bonus
    crouchVisibilityMultiplier: 0.5,
};

// ─── Shadow Area Computation ────────────────────────────────────────────

/**
 * Compute shadow areas from level platforms.
 * Shadow areas are regions under/behind platforms where light doesn't reach.
 * These are computed once when a level loads.
 */
export function computeShadowAreas(level) {
    const areas = [];

    // 1. Explicit shadowAreas from level data
    if (level.shadowAreas) {
        for (const area of level.shadowAreas) {
            areas.push({ ...area, source: 'explicit' });
        }
    }

    // 2. Auto-generate shadow areas under wide platforms
    const allPlatforms = [...(level.platforms || [])];
    if (level.shadowPlatforms) allPlatforms.push(...level.shadowPlatforms);

    for (const platform of allPlatforms) {
        if (platform.width >= STEALTH_CONFIG.shadowUnderPlatformMinWidth) {
            // Shadow area below the platform
            areas.push({
                x: platform.x,
                y: platform.y + platform.height,
                width: platform.width,
                height: STEALTH_CONFIG.shadowUnderPlatformHeight,
                source: 'under-platform',
            });
        }
    }

    // 3. Areas between platforms that are enclosed (dark corridors)
    // This is a simplification: any area below y=350 with no direct sky access is shadow
    // This makes lower parts of levels naturally darker
    const levelWidth = level.platforms?.reduce((max, p) => Math.max(max, p.x + p.width), 0) || 4000;
    if (levelWidth > 0) {
        // Bottom shadow zone — below ground platforms
        for (const platform of allPlatforms) {
            if (platform.y >= 380 && platform.width >= 200) {
                // This is a ground-level platform, areas below it are shadow
                areas.push({
                    x: platform.x,
                    y: platform.y,
                    width: platform.width,
                    height: platform.height + STEALTH_CONFIG.shadowUnderPlatformHeight,
                    source: 'ground-shadow',
                });
            }
        }
    }

    return areas;
}

// ─── Player Shadow Detection ────────────────────────────────────────────

/**
 * Check if the player is currently in shadow (invisible to enemies).
 * Returns { hidden: boolean, visibility: 0-1, source: string }
 */
export function getPlayerStealthState(player, level) {
    // Priority 1: Shadow Shift (active shadow mode)
    if (player.shadowShift && player.shadowEnergy > 0) {
        return {
            hidden: true,
            visibility: STEALTH_CONFIG.playerShadowShiftVisibility,
            source: 'shadowShift',
        };
    }

    // Priority 2: In a shadow area
    const shadowAreas = level._computedShadowAreas;
    if (shadowAreas && shadowAreas.length > 0) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        for (const area of shadowAreas) {
            if (
                playerCenterX >= area.x &&
                playerCenterX <= area.x + area.width &&
                playerCenterY >= area.y &&
                playerCenterY <= area.y + area.height
            ) {
                return {
                    hidden: true,
                    visibility: STEALTH_CONFIG.playerShadowAreaVisibility,
                    source: 'shadowArea',
                };
            }
        }
    }

    // Not in shadow — visible
    return {
        hidden: false,
        visibility: STEALTH_CONFIG.playerBaseVisibility,
        source: 'exposed',
    };
}

// ─── Enemy Sight Cone Detection ─────────────────────────────────────────

/**
 * Check if an enemy can see the player.
 * Uses distance, angle (cone of vision), line-of-sight, and shadow awareness.
 */
export function canEnemySeePlayer(enemy, player, level) {
    // Skip if enemy is dead/inactive
    if (!enemy.active && enemy.health !== undefined) return false;

    // Get enemy sight properties (merge type defaults with instance overrides)
    const typeDefaults = STEALTH_CONFIG.enemySight[enemy.type] || STEALTH_CONFIG.enemySight.walker;
    const sightRange = enemy.sightRange ?? typeDefaults.range;
    const sightHalfAngle = enemy.sightHalfAngle ?? typeDefaults.halfAngle;
    const hasShadowVision = enemy.shadowVision ?? typeDefaults.shadowVision;

    // Check if player is in shadow — shadow vision enemies can still see
    const stealthState = getPlayerStealthState(player, level);
    if (stealthState.hidden && !hasShadowVision) {
        return false;
    }

    // Distance check
    const enemyCenterX = enemy.x + (enemy.width || 46) / 2;
    const enemyCenterY = enemy.y + (enemy.height || 50) / 2;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - enemyCenterX;
    const dy = playerCenterY - enemyCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > sightRange) return false;

    // Angle check (cone of vision)
    // Enemy facing direction: 1 = right, -1 = left
    const enemyFacing = enemy.direction ?? 1;
    const angleToPlayer = Math.atan2(dy, dx);
    const enemyFacingAngle = enemyFacing > 0 ? 0 : Math.PI;
    let angleDiff = angleToPlayer - enemyFacingAngle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (Math.abs(angleDiff) > sightHalfAngle) return false;

    // Line-of-sight check (raycast through platforms)
    const allPlatforms = [...(level.platforms || [])];
    // Don't include shadowPlatforms in LoS blocking (they're ethereal)
    if (!raycastClear(enemyCenterX, enemyCenterY, playerCenterX, playerCenterY, allPlatforms)) {
        return false;
    }

    return true;
}

/**
 * Simple raycast: check if a line from (x1,y1) to (x2,y2) is blocked by any platform.
 * Uses stepping along the line.
 */
function raycastClear(x1, y1, x2, y2, platforms) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return true;

    const steps = Math.ceil(distance / 8); // 8px step size
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i < steps; i++) {
        const px = x1 + stepX * i;
        const py = y1 + stepY * i;

        // Check if this point is inside any platform
        for (const platform of platforms) {
            if (
                px >= platform.x &&
                px <= platform.x + platform.width &&
                py >= platform.y &&
                py <= platform.y + platform.height
            ) {
                return false; // Blocked
            }
        }
    }

    return true; // Clear line of sight
}

// ─── Alert State Machine ────────────────────────────────────────────────

/**
 * Update enemy alert states based on visibility.
 * Called once per frame for each enemy.
 */
export function updateEnemyAlertState(enemy, player, level, dt) {
    // Initialize alert properties if missing
    if (enemy.alertState === undefined) {
        enemy.alertState = 'patrol';
        enemy.alertTimer = 0;
        enemy.lastKnownPlayerX = null;
        enemy.lastKnownPlayerY = null;
        enemy.lastSawPlayer = 0;
    }

    const canSee = canEnemySeePlayer(enemy, player, level);

    switch (enemy.alertState) {
        case 'patrol':
            if (canSee) {
                enemy.alertState = 'suspicious';
                enemy.alertTimer = 0;
                enemy.lastKnownPlayerX = player.x + player.width / 2;
                enemy.lastKnownPlayerY = player.y + player.height / 2;
            }
            break;

        case 'suspicious':
            if (canSee) {
                enemy.alertTimer += dt;
                enemy.lastKnownPlayerX = player.x + player.width / 2;
                enemy.lastKnownPlayerY = player.y + player.height / 2;
                enemy.lastSawPlayer = 0;

                if (enemy.alertTimer >= STEALTH_CONFIG.suspiciousTime) {
                    enemy.alertState = 'alert';
                    enemy.alertTimer = 0;
                }
            } else {
                // Lost sight — decay back to patrol
                enemy.lastSawPlayer += dt;
                if (enemy.lastSawPlayer >= STEALTH_CONFIG.suspiciousDecayTime) {
                    enemy.alertState = 'patrol';
                    enemy.alertTimer = 0;
                    enemy.lastKnownPlayerX = null;
                    enemy.lastKnownPlayerY = null;
                }
            }
            break;

        case 'alert':
            if (canSee) {
                enemy.lastKnownPlayerX = player.x + player.width / 2;
                enemy.lastKnownPlayerY = player.y + player.height / 2;
                enemy.lastSawPlayer = 0;
            } else {
                // Lost sight — start decay
                enemy.lastSawPlayer += dt;
                if (enemy.lastSawPlayer >= STEALTH_CONFIG.alertDecayTime) {
                    enemy.alertState = 'suspicious';
                    enemy.alertTimer = 0;
                }
            }
            break;
    }

    // Ninja shadow enemies don't use alert states (they have their own phase system)
    if (enemy.type === 'ninja') {
        // Ninjas always know where you are if you're not in shadow
        if (canSee) {
            enemy.alertState = 'alert';
        } else {
            enemy.alertState = 'patrol';
        }
    }
}

// ─── Main Stealth Update ────────────────────────────────────────────────

/**
 * Main stealth update — called once per frame.
 * Updates player stealth state and all enemy alert states.
 */
export function updateStealth(dt) {
    const { player, currentLevel } = state;
    if (!player || !currentLevel) return;

    // Update player stealth state
    const stealthState = getPlayerStealthState(player, currentLevel);
    state.stealthState = stealthState;

    // Update enemy alert states
    if (currentLevel.enemies) {
        for (const enemy of currentLevel.enemies) {
            updateEnemyAlertState(enemy, player, currentLevel, dt);
        }
    }
}

// ─── Stealth HUD Data ───────────────────────────────────────────────────

/**
 * Get data needed for HUD rendering.
 */
export function getStealthHUDData() {
    return state.stealthState || {
        hidden: false,
        visibility: 1,
        source: 'exposed',
    };
}

/**
 * Check if a specific enemy is in combat mode (should actively attack).
 * Used by enemySystem to determine shooting/charging behavior.
 */
export function isEnemyAlert(enemy) {
    return enemy.alertState === 'alert' || enemy.alertState === 'suspicious';
}

/**
 * Get number of enemies currently aware of the player.
 */
export function getAlertCount(level) {
    if (!level?.enemies) return 0;
    return level.enemies.filter(e => e.alertState === 'alert' || e.alertState === 'suspicious').length;
}

// ─── Level Integration ──────────────────────────────────────────────────

/**
 * Initialize stealth system for a level.
 * Call this when a level loads.
 */
export function initStealthForLevel(level) {
    // Compute and cache shadow areas
    level._computedShadowAreas = computeShadowAreas(level);

    // Initialize enemy alert states
    if (level.enemies) {
        for (const enemy of level.enemies) {
            enemy.alertState = 'patrol';
            enemy.alertTimer = 0;
            enemy.lastKnownPlayerX = null;
            enemy.lastKnownPlayerY = null;
            enemy.lastSawPlayer = 0;
        }
    }
}

// Export config for external use (sight cone rendering)
export { STEALTH_CONFIG };
