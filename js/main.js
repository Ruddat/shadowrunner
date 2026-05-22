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
    POWERUP_TYPES,
} from './powerups.js';
import { getWeaponDisplayName, WEAPON_IDS } from './weapons.js';

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

let lastTime = 0;
let messageTimer = 0;
let gameState = 'intro';
let introTime = 0;

registerMusic('title', 'assets/audio/title-theme.mp3');
registerMusic('level1', 'assets/audio/level1-theme.mp3');
registerMusic('level4', 'assets/audio/level4-boss-theme.mp3');

registerSound('menuMove', 'assets/audio/menu-move.mp3');
registerSound('menuSelect', 'assets/audio/menu-select.mp3');

registerMusic('credits', 'assets/audio/credits-theme.mp3');

initIntro();
initTitleScreen();
initCreditsScreen();
initLevelFx();

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
    player.update(dt, currentLevel);

    if (keys.shoot) {
        player.shoot(projectiles);
    }

    camera.follow(player);

    camera.update(dt);
    updateLevelFx(dt, currentLevel);
    updateGems();
    updateExit();
    updateEnemies(dt);
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
            messageTimer = 0.8;

            spawnParticles(gem.x + 13, gem.y + 13, 18, '#ff2bd6');
        }
    }
}

function updateBoss(dt) {
    const boss = currentLevel.boss;

    if (!boss || boss.active === false) return;

    boss.x += boss.speed * boss.direction * dt;

    if (boss.x <= boss.minX) {
        boss.x = boss.minX;
        boss.direction = 1;
    }

    if (boss.x + boss.width >= boss.maxX) {
        boss.x = boss.maxX - boss.width;
        boss.direction = -1;
    }

    if (boss.health <= boss.maxHealth / 2) {
        boss.phase = 2;
        boss.speed = 145;
    }

    boss.shootTimer -= dt;

    if (boss.shootTimer <= 0) {
        shootBossProjectile(boss);
        boss.shootTimer = boss.phase === 2 ? 0.75 : 1.2;
    }

    if (rectsOverlap(player, boss)) {
        player.hit(currentLevel);
        camera.shake(14, 0.25);
        messageTimer = 0.8;
    }
}

function shootBossProjectile(boss) {
    bossProjectiles.push({
        x: boss.x,
        y: boss.y + 55,
        width: 26,
        height: 12,
        speed: boss.phase === 2 ? 420 : 340,
        active: true,
    });
}

function updateBossProjectiles(dt) {
    for (const shot of bossProjectiles) {
        if (!shot.active) continue;

        shot.x -= shot.speed * dt;

        if (shot.x < camera.x - 100) {
            shot.active = false;
        }

        if (rectsOverlap(player, shot)) {
            shot.active = false;
            player.hit(currentLevel);
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 20, '#ff003c');
            camera.shake(12, 0.22);
            messageTimer = 0.8;
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

        if (item.type === POWERUP_TYPES.GEM) {
            player.gems++;
            messageTimer = 0.8;
            return;
        }

        if (item.type === POWERUP_TYPES.LIFE) {
            player.lives = Math.min(player.lives + 1, 9);
            messageTimer = 0.8;
            return;
        }

        if (item.type === POWERUP_TYPES.ENERGY) {
            player.energy = Math.min(player.energy + 25, 100);
            messageTimer = 0.8;
            return;
        }

        if (item.type === POWERUP_TYPES.WEAPON) {
            player.setWeapon(item.weaponId);
            messageTimer = 0.8;
            return;
        }
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
            projectile.x > camera.x + CONFIG.width + 100
        ) {
            projectile.active = false;
            continue;
        }

        for (const enemy of currentLevel.enemies) {
            if (enemy.active === false) continue;

if (rectsOverlap(projectile, enemy) && projectile.canHit(enemy)) {
    projectile.markHit(enemy);

                spawnParticles(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    14,
                    '#ff003c'
                );

                camera.shake(5, 0.14);

                enemy.health = (enemy.health ?? 1) - projectile.damage;

                if (enemy.health <= 0) {
                    enemy.active = false;

                    spawnParticles(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        28,
                        '#ff2bd6'
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
projectile.markHit(boss);
boss.health -= projectile.damage;

            spawnParticles(
                boss.x + boss.width / 2,
                boss.y + boss.height / 2,
                18,
                '#facc15'
            );

            camera.shake(7, 0.12);

            if (boss.health <= 0) {
                boss.active = false;
                currentLevel.exit.locked = false;

                spawnParticles(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2,
                    70,
                    '#ff2bd6'
                );

                camera.shake(18, 0.5);
                messageTimer = 1.2;
            }
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) {
            projectiles.splice(i, 1);
        }
    }
}



function updateExit() {
    if (player.levelComplete) return;

    if (currentLevel.exit.locked) return;


    if (rectsOverlap(player, currentLevel.exit)) {
        player.levelComplete = true;
        messageTimer = 1.5;

        setTimeout(() => {
            loadNextLevel();
        }, 1200);
    }
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

    for (const gem of currentLevel.gems) {
        gem.collected = false;
    }

    for (const enemy of currentLevel.enemies) {
        enemy.active = true;
        enemy.health = enemy.health ?? 1;
    }
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

    if (messageTimer > 0 && player.invincibleTimer > 0) {
        drawCenterMessage('HIT');
    } else if (messageTimer > 0 && !player.levelComplete) {
        drawCenterMessage('+ ITEM');
    }

    if (player.levelComplete) {
        drawCenterMessage('LEVEL COMPLETE');
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

    const scaleX = hudWidth / 860;
    const scaleY = hudHeight / 100;

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



function drawCenterMessage(text) {
    ctx.save();

    ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
    ctx.fillRect(CONFIG.width / 2 - 170, 105, 340, 58);

    ctx.strokeStyle = '#ff2bd6';
    ctx.strokeRect(CONFIG.width / 2 - 170, 105, 340, 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, CONFIG.width / 2, 143);

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

        if (rectsOverlap(player, enemy)) {
            player.hit(currentLevel);
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 22, '#facc15');
            camera.shake(12, 0.25);
            messageTimer = 0.9;
        }
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

        ctx.shadowColor = '#ff003c';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#ff003c';
        ctx.fillRect(x, y, shot.width, shot.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 3, shot.width - 8, 3);

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
    drawProjectiles();
    drawParticles(ctx, camera);
    player.draw(ctx, camera);

    drawLevelFxFront(ctx, camera, currentLevel, CONFIG);
    drawHud();

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

    if (gameState === 'playing') {
        if (e.code === 'Digit1') player.setWeapon(WEAPON_IDS.BLASTER);
        if (e.code === 'Digit2') player.setWeapon(WEAPON_IDS.SPREAD);
        if (e.code === 'Digit3') player.setWeapon(WEAPON_IDS.LASER);
        if (e.code === 'Digit4') player.setWeapon(WEAPON_IDS.WAVE);
        if (e.code === 'Digit5') player.setWeapon(WEAPON_IDS.BOUNCE);
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
});

requestAnimationFrame(loop);