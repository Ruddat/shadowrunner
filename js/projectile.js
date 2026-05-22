export class Projectile {
    constructor(x, y, direction, weaponLevel = 1) {
        this.x = x;
        this.y = y;

        this.width = weaponLevel >= 2 ? 30 : 22;
        this.height = weaponLevel >= 3 ? 12 : 8;

        this.direction = direction;
        this.speed = 720 + weaponLevel * 40;
        this.damage = weaponLevel >= 3 ? 2 : 1;

        this.weaponLevel = weaponLevel;
        this.active = true;
    }

    update(dt) {
        this.x += this.speed * this.direction * dt;
    }

    draw(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;

        ctx.save();

        ctx.shadowColor = this.weaponLevel >= 3 ? '#facc15' : '#21e6ff';
        ctx.shadowBlur = 16;

        ctx.fillStyle = this.weaponLevel >= 3 ? '#facc15' : '#21e6ff';
        ctx.fillRect(x, y, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 2, this.width - 8, 2);

        ctx.restore();
    }
}