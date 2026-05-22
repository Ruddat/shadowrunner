import { getWeaponStats, WEAPON_IDS } from './weapons.js';

export class Projectile {
    constructor(x, y, direction, weaponId = WEAPON_IDS.BLASTER, weaponLevel = 1, angleOffset = 0) {
        const stats = getWeaponStats(weaponId, weaponLevel);

        this.x = x;
        this.y = y;
        this.baseY = y;

        this.width = stats.width;
        this.height = stats.height;

        this.direction = direction;
        this.weaponId = stats.id;
        this.weaponLevel = weaponLevel;

        this.speed = stats.projectileSpeed;
        this.damage = stats.damage;

        this.vx = Math.cos(angleOffset) * this.speed * direction;
        this.vy = Math.sin(angleOffset) * this.speed;

        this.color = stats.color;
        this.glow = stats.glow;

        this.pierce = Boolean(stats.pierce);
        this.wave = Boolean(stats.wave);
        this.waveStrength = stats.waveStrength ?? 0;
        this.waveSpeed = stats.waveSpeed ?? 0;
        this.waveTime = 0;

        this.bounces = stats.bounces ?? 0;
        this.hitTargets = new Set();

        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;

        if (this.wave) {
            this.waveTime += dt;
            this.baseY += this.vy * dt;
            this.y = this.baseY + Math.sin(this.waveTime * this.waveSpeed) * this.waveStrength * 0.22;
        } else {
            this.y += this.vy * dt;
        }

        if (this.weaponId === WEAPON_IDS.BOUNCE) {
            if (this.y <= 90 || this.y + this.height >= 520) {
                if (this.bounces > 0) {
                    this.vy *= -1;
                    this.bounces--;
                } else {
                    this.active = false;
                }
            }
        }
    }

    canHit(target) {
        if (!this.pierce) return true;

        const key = target.id ?? `${target.x}:${target.y}:${target.width}:${target.height}`;

        return !this.hitTargets.has(key);
    }

    markHit(target) {
        if (!this.pierce) {
            this.active = false;
            return;
        }

        const key = target.id ?? `${target.x}:${target.y}:${target.width}:${target.height}`;
        this.hitTargets.add(key);
    }

    draw(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;

        ctx.save();

        ctx.shadowColor = this.glow;
        ctx.shadowBlur = this.weaponId === WEAPON_IDS.LASER ? 24 : 16;
        ctx.fillStyle = this.color;

        if (this.weaponId === WEAPON_IDS.WAVE) {
            ctx.beginPath();
            ctx.ellipse(
                x + this.width / 2,
                y + this.height / 2,
                this.width / 2,
                this.height / 2,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(
                x + this.width / 2,
                y + this.height / 2,
                Math.max(3, this.width / 5),
                Math.max(2, this.height / 4),
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else if (this.weaponId === WEAPON_IDS.BOUNCE) {
            ctx.beginPath();
            ctx.arc(
                x + this.width / 2,
                y + this.height / 2,
                this.width / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(
                x + this.width / 2,
                y + this.height / 2,
                Math.max(3, this.width / 5),
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.fillRect(x, y, this.width, this.height);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 4, y + 2, Math.max(2, this.width - 8), 2);
        }

        ctx.restore();
    }
}