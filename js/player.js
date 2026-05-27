import { CONFIG } from './config.js';
import { keys } from './input.js';
import { resolvePlatformCollision, detectWallContact } from './collision.js';
import { Projectile } from './projectile.js';
import { getWeaponStats, isValidWeaponId, WEAPON_IDS } from './weapons.js';
import { playSound } from './audioManager.js';
import { spawnParticles } from './particles.js';
import { rectsOverlap } from './collision.js';
import { showCenterMessage } from './screens.js';
import { state } from './gameState.js';

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

        // Wall-Jump / Wall-Slide state
        this.wallSliding = false;
        this.wallSide = null;       // 'left' or 'right'
        this.wallJumpCooldown = 0;  // brief lock after wall-jump to prevent re-grab

        // Combo system
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;        // time since last kill (resets combo if expired)
        this.comboDecayTime = 2.5;  // seconds before combo resets

        this.lives = 3;
        this.invincibleTimer = 0;

        this.shootCooldown = 0;

        this.energy = 100;
        this.shadowShift = false;
        this.shadowEnergy = 100;
        this.shadowDashTimer = 0;
        this.shadowDashCooldown = 0;

        // Dash-Attack: track enemies hit during current dash
        this.dashHitEnemies = new Set();

        this.weaponId = WEAPON_IDS.BLASTER;
        this.weaponLevel = 1;

        this.gems = 0;
        this.keys = 0;
        this.isGameOver = false;
        this.levelComplete = false;

        this.score = 0;
        this.deathsThisLevel = 0;
    }

    update(dt, level) {
        this.prevY = this.y;

        this.updateShadowShift(dt);
        this.updateShadowDash(dt);
        this.syncShadowPlatforms(level);

        // --- Horizontal movement ---
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

        // Wall-Jump cooldown: briefly override movement direction after wall-jump
        if (this.wallJumpCooldown > 0) {
            this.wallJumpCooldown -= dt;
        }

        // --- Jump ---
        if (keys.jump && this.onGround) {
            this.velocityY = this.shadowShift ? -CONFIG.jumpForce * 1.06 : -CONFIG.jumpForce;
            this.onGround = false;
        }

        // --- Wall-Jump / Wall-Slide ---
        this.updateWallSlide(dt, level);

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= dt;
        }

        // --- Gravity ---
        if (this.wallSliding && this.velocityY > 0) {
            // Wall-slide: much slower fall
            this.velocityY += CONFIG.wallSlideGravity * dt;
            this.velocityY = Math.min(this.velocityY, CONFIG.wallSlideThreshold);
        } else {
            this.velocityY += CONFIG.gravity * dt;
        }

        // --- Combo timer decay ---
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }

        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Bonus block head-bump
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

        // --- Dash-Attack: check enemy collisions during dash ---
        if (this.shadowDashTimer > 0) {
            this.checkDashAttack(level);
        } else {
            this.dashHitEnemies.clear();
        }
    }

    // --- Wall-Jump / Wall-Slide ---

    updateWallSlide(dt, level) {
        // Can't wall-slide if on ground
        if (this.onGround) {
            this.wallSliding = false;
            this.wallSide = null;
            return;
        }

        // Can't wall-slide during dash
        if (this.shadowDashTimer > 0) {
            this.wallSliding = false;
            this.wallSide = null;
            return;
        }

        // Can't wall-slide right after a wall-jump (brief grace period)
        if (this.wallJumpCooldown > 0) {
            this.wallSliding = false;
            this.wallSide = null;
            return;
        }

        // Detect wall contact
        const wall = detectWallContact(this, level.platforms);

        // Must be moving toward the wall and falling
        const pressingTowardWall =
            (wall.left && keys.left) ||
            (wall.right && keys.right);

        const isFalling = this.velocityY > 0;

        if (pressingTowardWall && isFalling && wall.wallSide) {
            this.wallSliding = true;
            this.wallSide = wall.wallSide;
        } else {
            this.wallSliding = false;
            this.wallSide = null;
        }

        // Wall-Jump: press jump while wall-sliding
        if (this.wallSliding && keys.jump) {
            // Push away from wall
            const jumpDir = this.wallSide === 'left' ? 1 : -1;
            this.velocityX = jumpDir * CONFIG.wallJumpForceX;
            this.velocityY = -CONFIG.wallJumpForceY;
            this.facing = jumpDir;
            this.wallSliding = false;
            this.wallSide = null;
            this.wallJumpCooldown = 0.18; // brief lock to prevent re-grab

            // Keep the horizontal velocity override for a moment
            // by storing the wall-jump direction
            this._wallJumpDir = jumpDir;
            this._wallJumpTimer = 0.15;

            playSound('shootBounce'); // reuse bounce sound for wall-jump
        }

        // Apply wall-jump momentum override
        if (this._wallJumpTimer > 0) {
            this._wallJumpTimer -= dt;
            // Override horizontal velocity during wall-jump momentum
            this.velocityX = this._wallJumpDir * CONFIG.wallJumpForceX;
        }
    }

    // --- Combo System ---

    registerKill() {
        this.comboCount++;
        this.comboTimer = this.comboDecayTime;

        // Multiplier tiers: 1→x2 at 3 kills, x3 at 6, x5 at 10
        if (this.comboCount >= 10) {
            this.comboMultiplier = 5;
        } else if (this.comboCount >= 6) {
            this.comboMultiplier = 3;
        } else if (this.comboCount >= 3) {
            this.comboMultiplier = 2;
        } else {
            this.comboMultiplier = 1;
        }

        // Bonus points based on multiplier
        const bonusPoints = 100 * this.comboMultiplier;
        this.score += bonusPoints;
    }

    resetCombo() {
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
    }

    // --- Dash-Attack ---

    checkDashAttack(level) {
        const dashDamage = 2;

        // Check enemies
        if (level.enemies) {
            for (const enemy of level.enemies) {
                if (enemy.active === false) continue;
                if (this.dashHitEnemies.has(enemy)) continue;

                if (enemy.shadowOnly && !this.shadowShift) continue;

                const playerBox = {
                    x: this.x,
                    y: this.y,
                    width: this.width,
                    height: this.height,
                };

                if (rectsOverlap(playerBox, enemy)) {
                    this.dashHitEnemies.add(enemy);
                    enemy.health = (enemy.health ?? 1) - dashDamage;

                    spawnParticles(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        18,
                        '#b388ff'
                    );

                    if (enemy.health <= 0) {
                        enemy.active = false;
                        this.registerKill();

                        spawnParticles(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2,
                            34,
                            '#ff2bd6'
                        );

                        const comboText = this.comboMultiplier > 1
                            ? `x${this.comboMultiplier} COMBO!`
                            : 'DASH KILL';
                        showCenterMessage(comboText, 0.7);
                    }
                }
            }
        }

        // Check boss
        const boss = level.boss;
        if (boss && boss.active !== false && !this.dashHitEnemies.has(boss)) {
            const playerBox = {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
            };

            if (rectsOverlap(playerBox, boss)) {
                this.dashHitEnemies.add(boss);
                boss.health -= dashDamage;

                spawnParticles(
                    boss.x + boss.width / 2,
                    boss.y + boss.height / 2,
                    22,
                    '#b388ff'
                );

                showCenterMessage('DASH HIT!', 0.5);
            }
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

            // Reset dash hit list when dash ends
            if (this.shadowDashTimer <= 0) {
                this.dashHitEnemies.clear();
            }
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
            this.dashHitEnemies.clear(); // fresh hit list for this dash
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
        // Use checkpoint position if available, otherwise level spawn
        if (state.checkpoint) {
            this.x = state.checkpoint.x;
            this.y = state.checkpoint.y;
        } else {
            this.x = level.spawn.x;
            this.y = level.spawn.y;
        }
        this.velocityX = 0;
        this.velocityY = 0;
        this.shadowShift = false;
        this.shadowEnergy = 100;
        this.shadowDashTimer = 0;
        this.shadowDashCooldown = 0;
        this.wallSliding = false;
        this.wallSide = null;
        this.wallJumpCooldown = 0;
        this.resetCombo();
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();

        // Shadow Shift / Dash aura
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

        // Wall-slide visual: sparks on the touching side
        if (this.wallSliding) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#facc15';

            const sparkX = this.wallSide === 'left'
                ? screenX - 2
                : screenX + this.width - 2;

            // Animated spark effect
            const sparkPhase = (Date.now() % 200) / 200;
            for (let i = 0; i < 3; i++) {
                const offsetY = (i * 18 + sparkPhase * 12) % 54;
                const sparkSize = 3 + Math.sin(Date.now() / 50 + i) * 2;
                ctx.fillRect(
                    sparkX - sparkSize / 2,
                    screenY + 10 + offsetY,
                    sparkSize,
                    sparkSize
                );
            }
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

