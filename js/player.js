import { CONFIG } from './config.js';
import { keys } from './input.js';
import { resolvePlatformCollision } from './collision.js';
import { Projectile } from './projectile.js';
import { getWeaponStats, isValidWeaponId, WEAPON_IDS } from './weapons.js';
import { playSound } from './audioManager.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.prevY = y;

        this.width = 42;
        this.height = 70;

        this.velocityX = 0;
        this.velocityY = 0;

        this.onGround = false;
        this.facing = 1;

        this.lives = 3;
        this.invincibleTimer = 0;

        this.shootCooldown = 0;

        this.energy = 100;
        this.shadowShift = false;
        this.shadowEnergy = 100;
        this.shadowDashTimer = 0;
        this.shadowDashCooldown = 0;
        this.weaponId = WEAPON_IDS.BLASTER;
        this.weaponLevel = 1;

        this.gems = 0;
        this.keys = 0;
        this.isGameOver = false;
        this.levelComplete = false;

        this.score = 0;
        this.deathsThisLevel = 0;

        // REMOVED: window.shadowRunnerPlayer = this;
        // Other modules now access the player via state.player from gameState.js
    }

    update(dt, level) {
        this.prevY = this.y;

        this.updateShadowShift(dt);
        this.updateShadowDash(dt);
        this.syncShadowPlatforms(level);

        this.velocityX = 0;

        if (keys.left) {
            this.velocityX = -CONFIG.moveSpeed;
            this.facing = -1;
        }

        if (keys.right) {
            this.velocityX = CONFIG.moveSpeed;
            this.facing = 1;
        }

        if (this.shadowShift) {
            this.velocityX *= 1.08;
        }

        if (this.shadowDashTimer > 0) {
            this.velocityX += this.facing * 880;
        }

        if (keys.jump && this.onGround) {
            this.velocityY = this.shadowShift ? -CONFIG.jumpForce * 1.06 : -CONFIG.jumpForce;
            this.onGround = false;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        this.velocityY += CONFIG.gravity * dt;

        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        if (this.velocityY < 0 && level.bonusBlocks) {
            for (const block of level.bonusBlocks) {
                const hitFromBelow =
                    this.x < block.x + block.width &&
                    this.x + this.width > block.x &&
                    this.y <= block.y + block.height &&
                    this.prevY >= block.y + block.height;

                if (hitFromBelow) {
                    this.y = block.y + block.height;
                    this.velocityY = 120;

                    if (!block.used) {
                        block.used = true;
                        block.bumpTimer = 0.18;

                        block.spawnRequest = {
                            x: block.x + 7,
                            y: block.y - 4,
                            reward: block.reward,
                            weaponId: block.weaponId ?? null,
                            randomPool: block.randomPool ?? null,
                        };
                    }
                }
            }
        }

        if (this.x < 0) this.x = 0;
        if (this.x > CONFIG.worldWidth - this.width) {
            this.x = CONFIG.worldWidth - this.width;
        }

        resolvePlatformCollision(this, level.platforms);

        if (this.y > CONFIG.height + 300) {
            this.energy = 0;
            this.hit(level, 999);
        }
    }

    updateShadowShift(dt) {
        if (keys.shadow && this.shadowEnergy > 0) {
            this.shadowShift = true;
            this.shadowEnergy = Math.max(0, this.shadowEnergy - 28 * dt);
            return;
        }

        this.shadowShift = false;
        this.shadowEnergy = Math.min(100, this.shadowEnergy + 14 * dt);
    }

    updateShadowDash(dt) {
        if (this.shadowDashCooldown > 0) {
            this.shadowDashCooldown -= dt;
        }

        if (this.shadowDashTimer > 0) {
            this.shadowDashTimer -= dt;
        }

        if (
            keys.dash &&
            this.shadowDashCooldown <= 0 &&
            this.shadowEnergy >= 18
        ) {
            this.shadowDashTimer = 0.12;
            this.shadowDashCooldown = 0.65;
            this.shadowEnergy -= 18;
            this.shadowShift = true;
        }
    }

    syncShadowPlatforms(level) {
        if (!level.basePlatforms) {
            level.basePlatforms = [...level.platforms];
        }

        if (this.shadowShift && level.shadowPlatforms?.length) {
            level.platforms = [
                ...level.basePlatforms,
                ...level.shadowPlatforms,
            ];
            return;
        }

        level.platforms = level.basePlatforms;
    }

    hit(level, damage = 25) {
        if (this.isGameOver) return;
        if (this.invincibleTimer > 0) return;

        const finalDamage = this.shadowShift ? damage * 0.75 : damage;

        this.energy = Math.max(0, this.energy - finalDamage);
        this.invincibleTimer = 1.0;

        if (this.energy > 0) {
            return;
        }

        this.lives--;
        this.deathsThisLevel++;
        this.energy = 100;
        this.invincibleTimer = 1.4;

        if (this.lives <= 0) {
            this.lives = 0;
            this.energy = 0;
            this.isGameOver = true;
            return;
        }

        this.respawn(level);
    }

    shoot(projectiles) {
        if (this.shootCooldown > 0) return;

        const weapon = getWeaponStats(this.weaponId, this.weaponLevel);

        const startX = this.facing === 1
            ? this.x + this.width
            : this.x - weapon.width;

        const startY = this.y + 32;

        const bulletCount = weapon.bullets ?? 1;
        const centerIndex = (bulletCount - 1) / 2;

        for (let i = 0; i < bulletCount; i++) {
            const angleOffset = (i - centerIndex) * (weapon.spread ?? 0);

            projectiles.push(
                new Projectile(
                    startX,
                    startY,
                    this.facing,
                    this.weaponId,
                    this.weaponLevel,
                    angleOffset
                )
            );
        }
        this.playWeaponSound();
        this.shootCooldown = this.shadowShift ? weapon.fireRate * 0.85 : weapon.fireRate;
    }

    playWeaponSound() {
        if (this.weaponId === WEAPON_IDS.SPREAD) {
            playSound('shootSpread');
            return;
        }

        if (this.weaponId === WEAPON_IDS.LASER) {
            playSound('shootLaser');
            return;
        }

        if (this.weaponId === WEAPON_IDS.WAVE) {
            playSound('shootWave');
            return;
        }

        if (this.weaponId === WEAPON_IDS.BOUNCE) {
            playSound('shootBounce');
            return;
        }

        if (this.weaponId === WEAPON_IDS.PLASMA) {
            playSound('shootPlasma');
            return;
        }

        playSound('shootBlaster');
    }

    setWeapon(weaponId) {
        if (!isValidWeaponId(weaponId)) return;

        if (this.weaponId === weaponId) {
            this.upgradeWeapon();
            return;
        }

        if (this.weaponId !== WEAPON_IDS.BLASTER && this.weaponLevel < 3) {
            this.upgradeWeapon();
            return;
        }

        this.weaponId = weaponId;
        this.weaponLevel = 1;
    }

    upgradeWeapon() {
        this.weaponLevel = Math.min(this.weaponLevel + 1, 3);
    }

    respawn(level) {
        this.x = level.spawn.x;
        this.y = level.spawn.y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.shadowShift = false;
        this.shadowEnergy = 100;
        this.shadowDashTimer = 0;
        this.shadowDashCooldown = 0;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        if (this.shadowShift || this.shadowDashTimer > 0) {
            ctx.shadowColor = '#7c3cff';
            ctx.shadowBlur = this.shadowDashTimer > 0 ? 52 : 34;
            ctx.fillStyle = this.shadowDashTimer > 0
                ? 'rgba(124, 60, 255, 0.34)'
                : 'rgba(124, 60, 255, 0.22)';

            ctx.beginPath();
            ctx.ellipse(
                screenX + this.width / 2,
                screenY + this.height / 2,
                this.width * 1.15,
                this.height * 0.82,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.shadowColor = this.shadowShift ? '#64f4ff' : '#ff2bd6';
        ctx.shadowBlur = this.shadowShift ? 26 : 18;

        ctx.fillStyle = this.shadowShift ? '#101033' : '#111827';
        ctx.fillRect(screenX, screenY, this.width, this.height);

        ctx.fillStyle = this.shadowShift ? '#64f4ff' : '#ff2bd6';
        ctx.fillRect(screenX + 8, screenY + 12, 26, 10);

        ctx.fillStyle = this.shadowShift ? '#b388ff' : '#21e6ff';
        ctx.fillRect(
            screenX + (this.facing === 1 ? 30 : 4),
            screenY + 28,
            10,
            8
        );

        ctx.restore();
    }
}
