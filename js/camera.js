import { CONFIG } from './config.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;

        this.shakeTime = 0;
        this.shakePower = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    follow(target) {
        const targetX = target.x + target.width / 2 - CONFIG.width * 0.42;

        this.x += (targetX - this.x) * 0.08;

        if (this.x < 0) this.x = 0;
        if (this.x > CONFIG.worldWidth - CONFIG.width) {
            this.x = CONFIG.worldWidth - CONFIG.width;
        }
    }

    shake(power = 6, time = 0.18) {
        this.shakePower = power;
        this.shakeTime = time;
    }

    update(dt) {
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;

            this.offsetX = (Math.random() - 0.5) * this.shakePower;
            this.offsetY = (Math.random() - 0.5) * this.shakePower;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    screenX(worldX) {
        return worldX - this.x + this.offsetX;
    }

    screenY(worldY) {
        return worldY - this.y + this.offsetY;
    }
}