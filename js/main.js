import { CONFIG } from './config.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { getLevel } from './levels.js';
import { rectsOverlap } from './collision.js';
import { keys } from './input.js';
import { initIntro, updateIntro, drawIntro } from './intro.js';
import { spawnParticles, updateParticles, drawParticles } from './particles.js';
import {
    floatingItems,
    resolveReward,
    spawnFloatingItem,
    updateFloatingItems,
    drawFloatingItems,
    getPowerupColor,
    POWERUP_TYPES,
} from './powerups.js';
import {
    getWeaponDisplayName,
    getWeaponPickupLabel,
    WEAPON_IDS,
} from './weapons.js';

import {
    initLevelFx,
    updateLevelFx,
    drawLevelFxBehind,
    drawLevelFxFront,
} from './levelFx.js';

import {
    registerMusic,
    registerSound,
    playMusic,
    stopMusic,
    playSound,
} from './audioManager.js';

import {
    initTitleScreen,
    updateTitleScreen,
    drawTitleScreen,
    handleTitleKey,
    handleTitleClick,
} from './titleScreen.js';


import {
    initCreditsScreen,
    updateCreditsScreen,
    drawCreditsScreen,
} from './creditsScreen.js';


const levelBackground = new Image();


const hudBottomImage = new Image();
hudBottomImage.src = 'assets/ui/hud-bottom.png';

const hudTopImage = new Image();
hudTopImage.src = 'assets/ui/hud-top.png';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let currentLevelIndex = 0;
let currentLevel = getLevel(currentLevelIndex);
levelBackground.src = currentLevel.background;

const player = new Player(currentLevel.spawn.x, currentLevel.spawn.y);
const camera = new Camera();
const projectiles = [];
const bossProjectiles = [];
const enemyProjectiles = [];

initializeLevelState(currentLevel);

let lastTime = 0;
let messageTimer = 0;
let messageDuration = 0;
let centerMessage = '';
let centerMessageY = 0;
let centerMessageVelocityY = 0;
let centerMessageAlpha = 1;
let centerMessageBurstDone = false;
let weaponHudPulse = 0;
let gameState = 'intro';
let introTime = 0;
let levelStats = null;
let gameOverStats = null;
let gameOverTimer = 0;
const gameOverSparks = [];

const LEVEL_COMPLETE_UI = {
    panel: {
        width: 640,
        height: 460,
        y: 48,
        background: 'rgba(5, 5, 16, 0.95)',
        border: '#21e6ff',
        shadow: '#21e6ff',
    },

    title: {
        y: 112,
        color: '#ff2bd6',
        font: '900 42px monospace',
        text: 'LEVEL COMPLETE',
    },

    subtitle: {
        y: 154,
        color: '#ffffff',
        font: '900 21px monospace',
    },

    rows: {
        startY: 205,
        gap: 32,
        bonusGap: 42,
        leftOffset: 230,
        valueOffset: 230,
        font: '900 18px monospace',
    },

    total: {
        y: 460,
        height: 44,
        background: 'rgba(255, 255, 255, 0.12)',
        labelColor: '#ffffff',
        valueColor: '#21e6ff',
        font: '900 24px monospace',
    },

    footer: {
        y: 500,
        color: '#ffffff',
        subColor: '#94a3b8',
        font: '900 16px monospace',
        subFont: '700 14px monospace',
        text: 'PRESS ENTER OR CLICK TO NEXT LEVEL',
    },
};

const GAME_OVER_UI = {
    panel: {
        width: 620,
        height: 390,
        y: 92,
        background: 'rgba(8, 3, 12, 0.96)',
        border: '#ff003c',
        shadow: '#ff003c',
    },

    title: {
        y: 78,
        text: 'GAME OVER',
        color: '#ff003c',
        font: '900 54px monospace',
    },

    subtitle: {
        y: 118,
        color: '#ffffff',
        font: '900 22px monospace',
    },

    rows: {
        startY: 175,
        gap: 38,
        leftOffset: 130,
        rightOffset: 130,
        font: '900 20px monospace',
    },

    footer: {
        yOffset: 315,
        retryText: 'PRESS ENTER OR CLICK TO RETRY',
        titleText: 'PRESS ESC FOR TITLE SCREEN',
    },
};


registerMusic('title', 'assets/audio/title-theme.mp3');
registerMusic('level1', 'assets/audio/level1-theme.mp3');
registerMusic('level4', 'assets/audio/level4-boss-theme.mp3');
registerMusic('levelComplete', 'assets/audio/level-complete.mp3', false);
registerMusic('gameOver', 'assets/audio/game-over.mp3', false);


registerSound('menuMove', 'assets/audio/menu-move.mp3');
registerSound('menuSelect', 'assets/audio/menu-select.mp3');

registerSound('weaponPickup', 'assets/audio/weapon-pickup.mp3');
registerSound('itemPickup', 'assets/audio/item-pickup.mp3');

registerSound('shootBlaster', 'assets/audio/shoot-blaster.mp3');
registerSound('shootSpread', 'assets/audio/shoot-spread.mp3');
registerSound('shootLaser', 'assets/audio/shoot-laser.mp3');
registerSound('shootWave', 'assets/audio/shoot-wave.mp3');
registerSound('shootBounce', 'assets/audio/shoot-bounce.mp3');
registerSound('shootPlasma', 'assets/audio/shoot-plasma.mp3');

registerMusic('credits', 'assets/audio/credits-theme.mp3');

initIntro();
initTitleScreen();
initCreditsScreen();
initLevelFx();


function createLevelStats(level) {
    return {
        levelName: level.name ?? 'UNKNOWN LEVEL',
        gemsTotal: level.gems?.length ?? 0,
        startedAt: performance.now(),
        completedAt: null,
        enemiesTotal: level.enemies?.length ?? 0,
        bossDefeated: false,
    };
}

function calculateLevelScore() {
    const completedMs = levelStats?.completedAt && levelStats?.startedAt
        ? levelStats.completedAt - levelStats.startedAt
        : 0;

    const seconds = Math.max(1, Math.floor(completedMs / 1000));

    const gemsTotal = levelStats?.gemsTotal ?? currentLevel.gems.length;
    const gemsCollected = currentLevel.gems.filter(gem => gem.collected).length;

    const enemiesTotal = levelStats?.enemiesTotal ?? currentLevel.enemies.length;
    const enemiesLeft = currentLevel.enemies.filter(enemy => enemy.active !== false).length;
    const enemiesDefeated = Math.max(0, enemiesTotal - enemiesLeft);

    const timeBonus = Math.max(0, 6000 - seconds * 45);
    const gemBonus = gemsCollected * 150;
    const enemyBonus = enemiesDefeated * 300;
    const noDeathBonus = player.deathsThisLevel === 0 ? 2500 : 0;

    const total = timeBonus + gemBonus + enemyBonus + noDeathBonus;

    return {
        seconds,
        gemsCollected,
        gemsTotal,
        enemiesDefeated,
        enemiesTotal,
        timeBonus,
        gemBonus,
        enemyBonus,
        noDeathBonus,
        total,
    };
}

function initializeLevelState(level) {

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


levelStats = createLevelStats(currentLevel);

function triggerGameOver() {
    if (gameState === 'gameOver') return;

    gameOverStats = {
        levelName: currentLevel.name ?? 'UNKNOWN LEVEL',
        score: player.score ?? 0,
        gems: player.gems ?? 0,
        reachedLevel: currentLevelIndex + 1,
        enemiesDefeated: currentLevel.enemies
            ? currentLevel.enemies.filter(enemy => enemy.active === false).length
            : 0,
        enemiesTotal: currentLevel.enemies?.length ?? 0,
    };

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    stopMusic();
    playMusic('gameOver');

    gameOverStats = null;
    gameOverTimer = 0;
    gameOverSparks.length = 0;
    gameState = 'gameOver';
}


function updateGameOver(dt) {
    gameOverTimer += dt;

    // Sparks kontrolliert spawnen, nicht komplett wild.
    if (Math.random() < dt * 14) {
        spawnGameOverSpark();
    }

    for (const spark of gameOverSparks) {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        spark.alpha = Math.max(0, spark.life / spark.maxLife);
    }

    for (let i = gameOverSparks.length - 1; i >= 0; i--) {
        if (gameOverSparks[i].life <= 0) {
            gameOverSparks.splice(i, 1);
        }
    }
}

function spawnGameOverSpark() {
    const side = Math.random() < 0.5 ? -1 : 1;

    gameOverSparks.push({
        x: side === -1 ? 80 : CONFIG.width - 80,
        y: 80 + Math.random() * (CONFIG.height - 160),
        vx: side * -(80 + Math.random() * 180),
        vy: -40 + Math.random() * 80,
        size: 2 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.5,
        maxLife: 0.45 + Math.random() * 0.5,
        alpha: 1,
        color: Math.random() < 0.5 ? '#ff003c' : '#fb7185',
    });
}


function update(dt) {
    if (gameState === 'intro') {
        updateIntro(dt);
        return;
    }

    if (gameState === 'title') {
        updateTitleScreen(dt);
        return;
    }
    if (gameState === 'credits') {
        updateCreditsScreen(dt);
        return;
    }

    if (gameState === 'gameOver') {
        updateGameOver(dt);
        return;
    }

    player.update(dt, currentLevel);

    if (player.isGameOver) {
        triggerGameOver();
        return;
    }


    if (keys.shoot) {
        player.shoot(projectiles);
    }

    camera.follow(player);

    camera.update(dt);
    updateLevelFx(dt, currentLevel);
    updateGems();
    updateExit();
    updateEnemies(dt);
    updateEnemyProjectiles(dt);
    updateBoss(dt);
    updateBossProjectiles(dt);
    updateProjectiles(dt);
    updateBonusBlocks(dt);
    updateBonusBlockSpawns();
    updateFloatingItems(dt);
    updatePowerupPickup();

    updateParticles(dt);


    if (messageTimer > 0) {
        messageTimer -= dt;

        if (messageTimer <= 0) {
            messageTimer = 0;
            centerMessage = '';
        }
    }

    updateCenterMessage(dt);

    if (weaponHudPulse > 0) {
        weaponHudPulse -= dt;

        if (weaponHudPulse < 0) {
            weaponHudPulse = 0;
        }
    }

}

function updateBonusBlocks(dt) {
    if (!currentLevel.bonusBlocks) return;

    for (const block of currentLevel.bonusBlocks) {
        if (block.bumpTimer > 0) {
            block.bumpTimer -= dt;
        }
    }
}

function updateGems() {
    for (const gem of currentLevel.gems) {
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



function updateBoss(dt) {
    const boss = currentLevel.boss;

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
    shootBossPattern(boss, endPressureConfig);
        boss.shootTimer = phaseConfig.shootDelay ?? 1.2;
    }

    if (rectsOverlap(player, boss)) {
    player.hit(currentLevel, endPressureConfig.contactDamage ?? boss.contactDamage ?? 45);
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

        camera.shake(selectedPhase.id === 3 ? 18 : 10, 0.28);
    }

    boss.speed = selectedPhase.speed ?? boss.baseSpeed ?? boss.speed;
}

function getBossEndPressureConfig(boss, phaseConfig) {
    const exit = currentLevel.exit;

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



function shootBossPattern(boss, phaseConfig) {
    const pattern = phaseConfig.pattern ?? 'single';

    if (pattern === 'single') {
        shootBossProjectile(boss, phaseConfig, 0);
        return;
    }

    if (pattern === 'double') {
        shootBossProjectile(boss, phaseConfig, -0.14);
        shootBossProjectile(boss, phaseConfig, 0.14);
        return;
    }

    if (pattern === 'triple') {
        shootBossProjectile(boss, phaseConfig, -0.22);
        shootBossProjectile(boss, phaseConfig, 0);
        shootBossProjectile(boss, phaseConfig, 0.22);
        return;
    }

    if (pattern === 'burst') {
        shootBossProjectile(boss, phaseConfig, -0.28);
        shootBossProjectile(boss, phaseConfig, -0.14);
        shootBossProjectile(boss, phaseConfig, 0);
        shootBossProjectile(boss, phaseConfig, 0.14);
        shootBossProjectile(boss, phaseConfig, 0.28);
        return;
    }

    if (pattern === 'aimed') {
        shootBossAimedProjectile(boss, phaseConfig);
        return;
    }

    if (pattern === 'aimedBurst') {
        shootBossAimedProjectile(boss, phaseConfig, -0.18);
        shootBossAimedProjectile(boss, phaseConfig, 0);
        shootBossAimedProjectile(boss, phaseConfig, 0.18);
        return;
    }

    shootBossProjectile(boss, phaseConfig, 0);
}

function shootBossProjectile(boss, phaseConfig, verticalOffset = 0) {
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

function shootBossAimedProjectile(boss, phaseConfig, angleOffset = 0) {
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

function updateBossProjectiles(dt) {
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
            player.hit(currentLevel, shot.damage ?? 35);

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



function updatePowerupPickup() {
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
            weaponHudPulse = 0.45;
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

function showCenterMessage(text, duration = 0.8) {
    centerMessage = text;
    messageTimer = duration;
    messageDuration = duration;

    centerMessageY = 118;
    centerMessageVelocityY = 0;
    centerMessageAlpha = 1;
    centerMessageBurstDone = false;
}

function updateCenterMessage(dt) {
    if (messageTimer <= 0 || !centerMessage) return;

    messageTimer -= dt;

    const elapsed = messageDuration - messageTimer;
    const progress = messageDuration > 0
        ? Math.min(1, elapsed / messageDuration)
        : 1;

    // Erste Hälfte: Meldung steht/floatet leicht.
    // Zweite Hälfte: fällt nach unten und faded aus.
    if (progress > 0.45) {
        centerMessageVelocityY += 520 * dt;
        centerMessageY += centerMessageVelocityY * dt;
        centerMessageAlpha = Math.max(0, 1 - ((progress - 0.45) / 0.55));
    } else {
        centerMessageY = 118 + Math.sin(elapsed * 18) * 3;
    }

    if (messageTimer <= 0 && !centerMessageBurstDone) {
        centerMessageBurstDone = true;

        spawnParticles(
            CONFIG.width / 2,
            centerMessageY + 25,
            22,
            '#ffffff'
        );

        messageTimer = 0;
        centerMessage = '';
        centerMessageAlpha = 1;
        centerMessageVelocityY = 0;
    }
}



function updateBonusBlockSpawns() {
    if (!currentLevel.bonusBlocks) return;

    for (const block of currentLevel.bonusBlocks) {
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

function updateProjectiles(dt) {
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

        for (const enemy of currentLevel.enemies) {
            if (enemy.active === false) continue;

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
                    messageTimer = 0.6;
                }

                continue;
            }
        }

        const boss = currentLevel.boss;

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
                currentLevel.exit.locked = false;

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

                setTimeout(() => {
                    completeLevel({ bossDefeated: true });
                }, 700);
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
    messageTimer = 0.55;
}

function getPlasmaExplosionRadius(projectile) {
    if (projectile.weaponLevel >= 3) return 110;
    if (projectile.weaponLevel === 2) return 88;

    return 68;
}

function damageEnemiesInRadius(centerX, centerY, radius, damage) {
    for (const enemy of currentLevel.enemies) {
        if (enemy.active === false) continue;

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

function damageBossInRadius(centerX, centerY, radius, damage) {
    const boss = currentLevel.boss;

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
        currentLevel.exit.locked = false;

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

        setTimeout(() => {
            completeLevel({ bossDefeated: true });
        }, 700);
    }
}

function updateExit() {
    if (player.levelComplete) return;

    if (currentLevel.exit.locked) return;

    if (rectsOverlap(player, currentLevel.exit)) {
        player.levelComplete = true;

        spawnParticles(
            currentLevel.exit.x + currentLevel.exit.width / 2,
            currentLevel.exit.y + currentLevel.exit.height / 2,
            44,
            '#21e6ff'
        );

        camera.shake(10, 0.22);

        setTimeout(() => {
            completeLevel({ bossDefeated: false });
        }, 500);
    }
}

function drawGameOverScreen() {
    const ui = GAME_OVER_UI;

    const stats = gameOverStats ?? {
        levelName: currentLevel.name ?? 'UNKNOWN LEVEL',
        score: player.score ?? 0,
        gems: player.gems ?? 0,
        reachedLevel: currentLevelIndex + 1,
        enemiesDefeated: 0,
        enemiesTotal: currentLevel.enemies?.length ?? 0,
    };

    const t = gameOverTimer;
    const intro = Math.min(1, t / 0.75);
    const ease = easeOutBack(intro);

    const panelWidth = ui.panel.width;
    const panelHeight = ui.panel.height;

    const panelX = CONFIG.width / 2 - panelWidth / 2;
    const panelY = ui.panel.y;

    const panelCenterX = CONFIG.width / 2;
    const panelCenterY = panelY + panelHeight / 2;

    const glitch = Math.sin(t * 35) * 2 + (Math.random() < 0.08 ? Math.random() * 8 - 4 : 0);
    const flicker = Math.random() < 0.06 ? 0.72 : 1;

    ctx.save();

    // Dark red overlay
    ctx.fillStyle = `rgba(3, 0, 8, ${0.74 + intro * 0.18})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    drawGameOverScanlines(t);
    drawGameOverSparks();

    // Panel Intro: fährt/skaliert rein
    ctx.translate(panelCenterX, panelCenterY);
    ctx.scale(ease, ease);
    ctx.translate(-panelCenterX, -panelCenterY);

    ctx.globalAlpha = intro;

    ctx.shadowColor = ui.panel.shadow;
    ctx.shadowBlur = 26 + Math.sin(t * 9) * 8;

    ctx.fillStyle = ui.panel.background;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = ui.panel.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Zweite dünne Innenkante
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20);

    // Warning side bars
    const barAlpha = 0.25 + Math.sin(t * 8) * 0.15;
    ctx.fillStyle = `rgba(255, 0, 60, ${barAlpha})`;
    ctx.fillRect(panelX + 22, panelY + 28, 6, panelHeight - 56);
    ctx.fillRect(panelX + panelWidth - 28, panelY + 28, 6, panelHeight - 56);

    // Title Glitch
    ctx.textAlign = 'center';
    ctx.font = ui.title.font;

    ctx.globalAlpha = intro * flicker;
    ctx.fillStyle = '#21e6ff';
    ctx.fillText(ui.title.text, CONFIG.width / 2 + glitch + 3, panelY + ui.title.y);

    ctx.fillStyle = '#ff003c';
    ctx.fillText(ui.title.text, CONFIG.width / 2 + glitch, panelY + ui.title.y);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = intro * 0.22;
    ctx.fillText(ui.title.text, CONFIG.width / 2 - glitch - 3, panelY + ui.title.y);

    ctx.globalAlpha = intro;

    // Subtitle
    if (t > 0.35) {
        ctx.fillStyle = ui.subtitle.color;
        ctx.font = ui.subtitle.font;
        ctx.fillText(stats.levelName, CONFIG.width / 2, panelY + ui.subtitle.y);
    }

    const left = panelX + ui.rows.leftOffset;
    const right = panelX + panelWidth - ui.rows.rightOffset;

    let y = panelY + ui.rows.startY;

    drawAnimatedGameOverRow('STAGE', `${stats.reachedLevel}`, '#21e6ff', left, right, y, 0.55);
    y += ui.rows.gap;

    drawAnimatedGameOverRow('SCORE', `${stats.score}`, '#facc15', left, right, y, 0.75);
    y += ui.rows.gap;

    drawAnimatedGameOverRow('GEMS', `${stats.gems}`, '#ff2bd6', left, right, y, 0.95);
    y += ui.rows.gap;

    drawAnimatedGameOverRow(
        'ENEMIES',
        `${stats.enemiesDefeated} / ${stats.enemiesTotal}`,
        '#fb7185',
        left,
        right,
        y,
        1.15
    );

    // Footer blinkt erst später
    const footerY = panelY + ui.footer.yOffset;

    if (t > 1.45) {
        const blink = Math.sin(t * 6) > -0.35 ? 1 : 0.35;

        ctx.globalAlpha = blink;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px monospace';
        ctx.fillText(ui.footer.retryText, CONFIG.width / 2, footerY);

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 14px monospace';
        ctx.fillText(ui.footer.titleText, CONFIG.width / 2, footerY + 28);
    }

    ctx.restore();
}


function drawAnimatedGameOverRow(label, value, color, left, right, y, delay) {
    const local = Math.min(1, Math.max(0, (gameOverTimer - delay) / 0.28));
    if (local <= 0) return;

    const xOffset = (1 - local) * -28;

    ctx.save();
    ctx.globalAlpha = local;

    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = GAME_OVER_UI.rows.font;
    ctx.fillText(label, left + xOffset, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, right - xOffset, y);

    ctx.restore();
}

function drawGameOverScanlines(t) {
    ctx.save();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff003c';

    const offset = Math.floor((t * 80) % 8);

    for (let y = offset; y < CONFIG.height; y += 8) {
        ctx.fillRect(0, y, CONFIG.width, 1);
    }

    // Roter Rand-Puls
    const pulse = 0.08 + Math.sin(t * 5) * 0.04;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff003c';
    ctx.fillRect(0, 0, CONFIG.width, 18);
    ctx.fillRect(0, CONFIG.height - 18, CONFIG.width, 18);
    ctx.fillRect(0, 0, 18, CONFIG.height);
    ctx.fillRect(CONFIG.width - 18, 0, 18, CONFIG.height);

    ctx.restore();
}

function drawGameOverSparks() {
    ctx.save();

    for (const spark of gameOverSparks) {
        ctx.globalAlpha = spark.alpha;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = spark.color;
        ctx.fillRect(spark.x, spark.y, spark.size, spark.size);
    }

    ctx.restore();
}

function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;

    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawGameOverRow(label, value, color, left, right, y) {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = '900 20px monospace';
    ctx.fillText(label, left, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, right, y);
}

function drawLevelCompleteScreen() {
    const ui = LEVEL_COMPLETE_UI;
    const score = levelStats?.score ?? calculateLevelScore();

    const minutes = Math.floor(score.seconds / 60);
    const restSeconds = score.seconds % 60;
    const timeText = `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;

    const panelX = CONFIG.width / 2 - ui.panel.width / 2;
    const panelY = ui.panel.y;

    const rowLeft = CONFIG.width / 2 - ui.rows.leftOffset;
    const rowValueX = CONFIG.width / 2 + ui.rows.valueOffset;

    ctx.save();

    // Dark overlay
    ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Main panel
    ctx.shadowColor = ui.panel.shadow;
    ctx.shadowBlur = 30;

    ctx.fillStyle = ui.panel.background;
    ctx.fillRect(panelX, panelY, ui.panel.width, ui.panel.height);

    ctx.strokeStyle = ui.panel.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, ui.panel.width, ui.panel.height);

    ctx.shadowBlur = 0;

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = ui.title.color;
    ctx.font = ui.title.font;
    ctx.fillText(ui.title.text, CONFIG.width / 2, ui.title.y);

    // Level name
    ctx.fillStyle = ui.subtitle.color;
    ctx.font = ui.subtitle.font;
    ctx.fillText(levelStats?.levelName ?? currentLevel.name ?? 'STAGE CLEAR', CONFIG.width / 2, ui.subtitle.y);

    // Stats
    let y = ui.rows.startY;

    drawResultRow('TIME', timeText, '#21e6ff', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('GEMS', `${score.gemsCollected} / ${score.gemsTotal}`, '#ff2bd6', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('ENEMIES', `${score.enemiesDefeated} / ${score.enemiesTotal}`, '#facc15', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('DEATHS', `${player.deathsThisLevel ?? 0}`, '#fb7185', rowLeft, rowValueX, y);
    y += ui.rows.bonusGap;

    // Bonuses
    drawResultRow('TIME BONUS', `+${score.timeBonus}`, '#21e6ff', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('GEM BONUS', `+${score.gemBonus}`, '#ff2bd6', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('ENEMY BONUS', `+${score.enemyBonus}`, '#facc15', rowLeft, rowValueX, y);
    y += ui.rows.gap;

    drawResultRow('NO DEATH BONUS', `+${score.noDeathBonus}`, '#22c55e', rowLeft, rowValueX, y);

    // Total bar
    const totalX = panelX + 72;
    const totalY = ui.total.y;
    const totalWidth = ui.panel.width - 144;

    ctx.fillStyle = ui.total.background;
    ctx.fillRect(totalX, totalY - 30, totalWidth, ui.total.height);

    ctx.fillStyle = ui.total.labelColor;
    ctx.font = ui.total.font;
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL', totalX + 18, totalY);

    ctx.fillStyle = ui.total.valueColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${score.total}`, totalX + totalWidth - 18, totalY);

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = ui.footer.color;
    ctx.font = ui.footer.font;
    ctx.fillText(ui.footer.text, CONFIG.width / 2, ui.footer.y);

    ctx.fillStyle = ui.footer.subColor;
    ctx.font = ui.footer.subFont;
    ctx.fillText(`TOTAL SCORE: ${player.score ?? 0}`, CONFIG.width / 2, ui.footer.y + 26);

    ctx.restore();
}


function drawResultRow(label, value, color, left, valueX, y) {
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.font = LEVEL_COMPLETE_UI.rows.font;
    ctx.fillText(label, left, y);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(value, valueX, y);
}



function loadNextLevel() {
    currentLevelIndex++;

    currentLevel = getLevel(currentLevelIndex);
    levelBackground.src = currentLevel.background;

    levelBackground.src = currentLevel.background;

    if (currentLevel.music) {
        playMusic(currentLevel.music);
    }


    player.x = currentLevel.spawn.x;
    player.y = currentLevel.spawn.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.levelComplete = false;
    player.gems = 0;

    camera.x = 0;
    camera.y = 0;

    initLevelFx();

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    initializeLevelState(currentLevel);
    player.deathsThisLevel = 0;
    levelStats = createLevelStats(currentLevel);

}

function completeLevel({ bossDefeated = false } = {}) {
    if (gameState === 'levelComplete') return;

    if (levelStats) {
        levelStats.completedAt = performance.now();
        levelStats.bossDefeated = bossDefeated;
    }

    const score = calculateLevelScore();

    if (levelStats && !levelStats.scoreAdded) {
        player.score = (player.score ?? 0) + score.total;
        levelStats.scoreAdded = true;
        levelStats.score = score;
    }

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;

    stopMusic();
    playMusic('levelComplete');

    gameState = 'levelComplete';
}

function drawBackground() {
    ctx.fillStyle = '#060612';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    if (!levelBackground.complete) return;

    const bgWidth = levelBackground.width;
    const bgHeight = levelBackground.height;

    const scale = CONFIG.height / bgHeight;
    const drawWidth = bgWidth * scale;
    const drawHeight = CONFIG.height;

    const scrollX = -(camera.x * 0.25) % drawWidth;

    ctx.drawImage(levelBackground, scrollX, 0, drawWidth, drawHeight);
    ctx.drawImage(levelBackground, scrollX + drawWidth, 0, drawWidth, drawHeight);

    if (scrollX > 0) {
        ctx.drawImage(levelBackground, scrollX - drawWidth, 0, drawWidth, drawHeight);
    }
}

function drawPlatforms() {
    for (const platform of currentLevel.platforms) {
        const x = platform.x - camera.x;
        const y = platform.y - camera.y;

        ctx.save();
        ctx.shadowColor = '#ff2bd6';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#16162e';
        ctx.fillRect(x, y, platform.width, platform.height);

        ctx.fillStyle = '#ff2bd6';
        ctx.fillRect(x, y, platform.width, 5);

        ctx.fillStyle = '#21e6ff';
        ctx.fillRect(x, y + platform.height - 4, platform.width, 4);

        ctx.restore();
    }
}

function drawGems() {
    for (const gem of currentLevel.gems) {
        if (gem.collected) continue;

        const x = gem.x - camera.x;
        const y = gem.y - camera.y;

        ctx.save();
        ctx.translate(x + 13, y + 13);

        ctx.shadowColor = '#ff2bd6';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#ff2bd6';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffd6fb';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of currentLevel.enemies) {
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

function drawProjectiles() {
    for (const projectile of projectiles) {
        projectile.draw(ctx, camera);
    }
}

function drawExit() {
    const exit = currentLevel.exit;
    const x = exit.x - camera.x;
    const y = exit.y - camera.y;

    ctx.save();

    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 25;

    ctx.strokeStyle = '#21e6ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, exit.width, exit.height);

    ctx.fillStyle = 'rgba(33, 230, 255, 0.15)';
    ctx.fillRect(x, y, exit.width, exit.height);

    ctx.fillStyle = '#ff2bd6';
    ctx.font = '14px monospace';
    ctx.fillText('EXIT', x + 16, y + 56);

    ctx.restore();
}

function drawHud() {
    ctx.save();

    drawTopHudImage();

    drawBottomPanel();

    ctx.restore();

    if (player.levelComplete) {
        drawCenterMessage('LEVEL COMPLETE', {
            y: 118,
            alpha: 1,
        });
    } else if (messageTimer > 0 && player.invincibleTimer > 0) {
        drawCenterMessage('HIT', {
            y: centerMessageY || 118,
            alpha: centerMessageAlpha,
        });
    } else if (messageTimer > 0 && centerMessage) {
        drawCenterMessage(centerMessage, {
            y: centerMessageY,
            alpha: centerMessageAlpha,
        });
    }

}

function drawTopHudImage() {
    const hudWidth = CONFIG.width - 36;
    const hudHeight = 150;

    const x = 18;
    const y = 8;

    if (hudTopImage.complete) {
        ctx.drawImage(hudTopImage, x, y, hudWidth, hudHeight);
    }

    drawTopHudValues(x, y, hudWidth, hudHeight);
}

function drawTopHudValues(x, y, hudWidth, hudHeight) {
    ctx.save();

    const scaleX = hudWidth / 1280;
    const scaleY = hudHeight / 220;

    ctx.textBaseline = 'middle';

    // HP Bars
    for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i < player.lives
            ? '#ff2bd6'
            : 'rgba(255,255,255,.10)';

        ctx.fillRect(
            x + (248 + i * 16) * scaleX,
            y + 32 * scaleY,
            13 * scaleX,
            21 * scaleY
        );
    }

    // Energy Bars
    const energyBars = Math.ceil(player.energy / 10);

    for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i < energyBars
            ? '#21e6ff'
            : 'rgba(33,230,255,.12)';

        ctx.fillRect(
            x + (248 + i * 16) * scaleX,
            y + 84 * scaleY,
            13 * scaleX,
            21 * scaleY
        );
    }

    // Gems oben mitte
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
        `${player.gems} / ${currentLevel.gems.length}`,
        x + 610 * scaleX,
        y + 66 * scaleY
    );

    // Score rechts
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 25px monospace';
    ctx.fillText(
        String(player.score ?? 0).padStart(6, '0'),
        x + 1165 * scaleX,
        y + 84 * scaleY
    );

    // Levelname unten rechts
    ctx.font = '900 20px monospace';
    ctx.fillText(
        currentLevel.name ?? 'LEVEL 1',
        x + 1165 * scaleX,
        y + 185 * scaleY
    );

    ctx.restore();
}



function drawPanel(x, y, width, height, color = '#21e6ff') {
    ctx.save();

    ctx.fillStyle = 'rgba(3, 7, 18, 0.82)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x + 10, y - 2, 42, 3);
    ctx.fillRect(x + width - 52, y + height - 1, 42, 3);

    ctx.restore();
}

function drawTopStatusPanel(x, y) {
    drawPanel(x, y, 250, 78, '#21e6ff');

    ctx.fillStyle = 'rgba(15,23,42,.9)';
    ctx.fillRect(x + 10, y + 10, 50, 50);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(x + 10, y + 10, 50, 50);

    ctx.fillStyle = '#ff2bd6';
    ctx.font = '900 20px monospace';
    ctx.fillText('S', x + 28, y + 42);

    drawBars(x + 72, y + 16, 'HP', player.lives, 9, '#ff2bd6', 10);
    drawBars(x + 72, y + 44, 'ENERGY', Math.ceil(player.energy / 10), 10, '#21e6ff', 10);
}

function drawBars(x, y, label, value, max, color, barW = 10) {
    ctx.fillStyle = color;
    ctx.font = '900 13px monospace';
    ctx.fillText(label, x, y + 13);

    for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < value ? color : 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 72 + i * (barW + 4), y + 2, barW, 16);
    }
}

function drawGemCounter(x, y) {
    drawPanel(x, y, 170, 54, '#ff2bd6');

    ctx.save();
    ctx.translate(x + 30, y + 27);

    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff2bd6';

    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px monospace';
    ctx.fillText(`${player.gems} / ${currentLevel.gems.length}`, x + 62, y + 35);
}

function drawScorePanel(x, y) {
    drawPanel(x, y, 168, 90, '#21e6ff');

    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE', x + 84, y + 21);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 21px monospace';
    ctx.fillText(String(player.score ?? 0).padStart(6, '0'), x + 84, y + 48);

    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 13px monospace';
    ctx.fillText('LEVEL', x + 84, y + 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.fillText(currentLevel.name ?? 'LEVEL 1', x + 84, y + 86);

    ctx.textAlign = 'left';
}

function drawBottomPanel() {
    const hudWidth = CONFIG.width - 36;
    const hudHeight = 96;

    const x = 18;
    const y = CONFIG.height - hudHeight;

    if (hudBottomImage.complete) {
        ctx.drawImage(hudBottomImage, x, y, hudWidth, hudHeight);
    }

    drawBottomHudValues(x, y, hudWidth, hudHeight);
}

function getWeaponName() {
    return getWeaponDisplayName(player.weaponId, player.weaponLevel);
}


function drawBottomHudValues(x, y, hudWidth, hudHeight) {
    ctx.save();
    ctx.textBaseline = 'middle';

    if (weaponHudPulse > 0) {
        const pulse = weaponHudPulse / 0.45;
        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 18 + pulse * 24;
    }


    const scaleX = hudWidth / 860;
    const scaleY = hudHeight / 100;

    if (weaponHudPulse > 0) {
        const pulse = weaponHudPulse / 0.45;

        ctx.fillStyle = `rgba(33, 230, 255, ${0.18 + pulse * 0.32})`;
        ctx.fillRect(
            x + 112 * scaleX,
            y + 28 * scaleY,
            245 * scaleX,
            45 * scaleY
        );
    }


    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px monospace';
    ctx.fillText(getWeaponName(), x + 125 * scaleX, y + 45 * scaleY);

    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i < player.weaponLevel * 2
            ? '#21e6ff'
            : 'rgba(33,230,255,.18)';

        ctx.fillRect(
            x + (125 + i * 18) * scaleX,
            y + 60 * scaleY,
            13 * scaleX,
            19 * scaleY
        );
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px monospace';
    ctx.fillText(player.gems, x + 380 * scaleX, y + 57 * scaleY);

    ctx.fillText(`${player.keys ?? 0} / 3`, x + 565 * scaleX, y + 57 * scaleY);

    ctx.fillText(`x ${player.lives}`, x + 750 * scaleX, y + 57 * scaleY);

    ctx.restore();
}



function drawCenterMessage(text, options = {}) {
    const y = options.y ?? 118;
    const alpha = options.alpha ?? 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
    ctx.fillRect(CONFIG.width / 2 - 170, y, 340, 58);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(CONFIG.width / 2 - 170, y, 340, 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, CONFIG.width / 2, y + 38);

    ctx.restore();
}

function updateEnemies(dt) {
    for (const enemy of currentLevel.enemies) {
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
            player.hit(currentLevel, enemy.contactDamage ?? 30);
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 22, '#facc15');
            camera.shake(12, 0.25);
            showCenterMessage('HIT', 0.65);
        }
    }
}

function updateEnemyShooter(enemy, dt) {
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

function updateEnemyProjectiles(dt) {
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
            player.hit(currentLevel, shot.damage ?? 20);

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

function drawEnemyProjectiles() {
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

function drawBonusBlocks() {
    if (!currentLevel.bonusBlocks) return;

    for (const block of currentLevel.bonusBlocks) {
        const bumpOffset = block.bumpTimer > 0
            ? -Math.sin(block.bumpTimer * 40) * 8
            : 0;

        const x = block.x - camera.x;
        const y = block.y - camera.y + bumpOffset;

        ctx.save();

        ctx.shadowColor = block.used ? '#64748b' : '#facc15';
        ctx.shadowBlur = block.used ? 6 : 18;

        ctx.fillStyle = block.used ? '#1e293b' : '#3b0764';
        ctx.fillRect(x, y, block.width, block.height);

        ctx.strokeStyle = block.used ? '#64748b' : '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, block.width, block.height);

        ctx.fillStyle = block.used ? '#64748b' : '#facc15';
        ctx.font = '900 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(block.used ? 'X' : '?', x + block.width / 2, y + 29);

        ctx.restore();
    }
}

function drawBoss() {
    const boss = currentLevel.boss;

    if (!boss || boss.active === false) return;

    const x = boss.x - camera.x;
    const y = boss.y - camera.y;

    ctx.save();

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

    ctx.restore();

    drawBossHealthBar(boss);
}

function drawBossProjectiles() {
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

function drawBossHealthBar(boss) {
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
    ctx.fillText('FACTORY GUARDIAN', CONFIG.width / 2, y - 8);

    ctx.restore();
}

function render() {
    if (gameState === 'intro') {
        drawIntro(ctx, introTime);
        return;
    }

    if (gameState === 'title') {
        drawTitleScreen(ctx);
        return;
    }

    if (gameState === 'credits') {
        drawCreditsScreen(ctx);
        return;
    }

    if (gameState === 'gameOver') {
        drawBackground();
        drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);
        drawPlatforms();
        drawGems();
        drawExit();
        drawEnemies();
        drawBoss();
        drawParticles(ctx, camera);
        player.draw(ctx, camera);
        drawLevelFxFront(ctx, camera, currentLevel, CONFIG);

        drawGameOverScreen();
        return;
    }


    if (gameState === 'levelComplete') {
        drawBackground();
        drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);
        drawPlatforms();
        drawGems();
        drawExit();
        drawEnemies();
        drawBoss();
        drawParticles(ctx, camera);
        player.draw(ctx, camera);
        drawLevelFxFront(ctx, camera, currentLevel, CONFIG);
        drawLevelCompleteScreen();
        return;
    }




    drawBackground();
    drawLevelFxBehind(ctx, camera, currentLevel, CONFIG);

    drawPlatforms();
    drawBonusBlocks();
    drawFloatingItems(ctx, camera);
    drawGems();
    drawExit();
    drawEnemies();
    drawBoss();
    drawBossProjectiles();
    drawEnemyProjectiles();
    drawProjectiles();
    drawParticles(ctx, camera);
    player.draw(ctx, camera);

    drawLevelFxFront(ctx, camera, currentLevel, CONFIG);
    drawHud();

}


function retryCurrentLevel() {
    stopMusic();

    player.x = currentLevel.spawn.x;
    player.y = currentLevel.spawn.y;
    player.prevY = currentLevel.spawn.y;
    player.velocityX = 0;
    player.velocityY = 0;

    player.lives = 3;
    player.energy = 100;
    player.invincibleTimer = 0;
    player.shootCooldown = 0;

    player.weaponId = WEAPON_IDS.BLASTER;
    player.weaponLevel = 1;

    player.gems = 0;
    player.levelComplete = false;
    player.isGameOver = false;
    player.deathsThisLevel = 0;

    projectiles.length = 0;
    bossProjectiles.length = 0;
    enemyProjectiles.length = 0;
    floatingItems.length = 0;

    initializeLevelState(currentLevel);
    levelStats = createLevelStats(currentLevel);
    gameOverStats = null;

    camera.x = 0;
    camera.y = 0;

    playMusic(currentLevel.music ?? 'level1');
    gameState = 'playing';
}


function switchWeaponForDebug(weaponId) {
    player.setWeapon(weaponId);
    weaponHudPulse = 0.45;
    playSound('weaponPickup');

    showCenterMessage(
        getWeaponDisplayName(player.weaponId, player.weaponLevel),
        0.85
    );
}


function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    introTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
    if (gameState === 'intro' && e.code === 'Space') {
        gameState = 'title';
        playMusic('title');
        return;
    }

    if (gameState === 'title') {
        const action = handleTitleKey(e.code);

        if (action === 'CREDITS') {
            initCreditsScreen();
            stopMusic();
            playMusic('credits');
            gameState = 'credits';
        }

        if (action === 'NEW GAME') {
            stopMusic();
            playMusic(currentLevel.music ?? 'level1');
            gameState = 'playing';
        }

        return;
    }

    if (gameState === 'credits' && e.code === 'Escape') {
        stopMusic();
        playMusic('title');
        gameState = 'title';
        return;
    }

    if (gameState === 'levelComplete' && e.code === 'Enter') {
        stopMusic();
        loadNextLevel();
        playMusic(currentLevel.music ?? 'level1');
        gameState = 'playing';
        return;
    }

    if (gameState === 'gameOver') {
        if (e.code === 'Enter' || e.code === 'Space') {
            retryCurrentLevel();
            return;
        }

        if (e.code === 'Escape') {
            stopMusic();
            gameState = 'title';
            playMusic('title');
            return;
        }
    }

    if (gameState === 'playing') {
        if (e.code === 'Digit1') switchWeaponForDebug(WEAPON_IDS.BLASTER);
        if (e.code === 'Digit2') switchWeaponForDebug(WEAPON_IDS.SPREAD);
        if (e.code === 'Digit3') switchWeaponForDebug(WEAPON_IDS.LASER);
        if (e.code === 'Digit4') switchWeaponForDebug(WEAPON_IDS.WAVE);
        if (e.code === 'Digit5') switchWeaponForDebug(WEAPON_IDS.BOUNCE);
        if (e.code === 'Digit6') switchWeaponForDebug(WEAPON_IDS.PLASMA);
    }
});

canvas.addEventListener('click', () => {
    if (gameState === 'intro') {
        gameState = 'title';
        playMusic('title');
        return;
    }

    if (gameState === 'title') {
        const action = handleTitleClick();

        if (action === 'NEW GAME') {
            stopMusic();
            playMusic('level1');
            gameState = 'playing';
        }
    }

    if (gameState === 'levelComplete') {
        stopMusic();
        loadNextLevel();
        playMusic(currentLevel.music ?? 'level1');
        gameState = 'playing';
        return;
    }

    if (gameState === 'gameOver') {
        retryCurrentLevel();
        return;
    }


});

requestAnimationFrame(loop);