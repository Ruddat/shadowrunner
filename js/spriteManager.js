/**
 * spriteManager.js — Sprite sheet loading and animation system.
 * Loads a sprite sheet image and provides frame-by-frame animation playback.
 */

export class SpriteSheet {
    /**
     * @param {string} src - Path to the sprite sheet image
     * @param {number} frameWidth - Width of each frame in pixels
     * @param {number} frameHeight - Height of each frame in pixels
     * @param {object} animations - { animName: { row, frames, speed } }
     */
    constructor(src, frameWidth, frameHeight, animations) {
        this.image = new Image();
        this.image.src = src;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animations = animations;
        this.loaded = false;

        this.image.addEventListener('load', () => {
            this.loaded = true;
        });
    }

    /**
     * Get the source rectangle for a specific animation frame.
     * @param {string} animName - Animation state name
     * @param {number} frameIndex - Frame index within the animation
     * @returns {{ sx: number, sy: number, sw: number, sh: number }}
     */
    getFrameRect(animName, frameIndex) {
        const anim = this.animations[animName];
        if (!anim) return { sx: 0, sy: 0, sw: this.frameWidth, sh: this.frameHeight };

        return {
            sx: frameIndex * this.frameWidth,
            sy: anim.row * this.frameHeight,
            sw: this.frameWidth,
            sh: this.frameHeight,
        };
    }

    /**
     * Draw a specific animation frame onto the canvas.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {string} animName - Animation state name
     * @param {number} frameIndex - Frame index
     * @param {number} facing - 1 = right, -1 = left (horizontal flip)
     * @param {object} options - Optional overrides
     */
    drawFrame(ctx, x, y, animName, frameIndex, facing = 1, options = {}) {
        if (!this.loaded) return;

        const anim = this.animations[animName];
        if (!anim) return;

        // Clamp frame index
        const fi = Math.min(frameIndex, anim.frames - 1);
        const rect = this.getFrameRect(animName, fi);

        const drawWidth = options.width || this.frameWidth;
        const drawHeight = options.height || this.frameHeight;

        ctx.save();

        if (facing === -1) {
            // Flip horizontally: translate to center, scale -1, draw offset
            ctx.translate(x + drawWidth, y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image,
                rect.sx, rect.sy, rect.sw, rect.sh,
                0, 0, drawWidth, drawHeight
            );
        } else {
            ctx.drawImage(
                this.image,
                rect.sx, rect.sy, rect.sw, rect.sh,
                x, y, drawWidth, drawHeight
            );
        }

        ctx.restore();
    }
}

/**
 * AnimationState — tracks current animation and frame progression.
 */
export class AnimationState {
    constructor() {
        this.current = 'idle';
        this.frameIndex = 0;
        this.timer = 0;
        this.paused = false;
    }

    /**
     * Update animation timer and advance frame.
     * @param {number} dt - Delta time in seconds
     * @param {SpriteSheet} sheet - The sprite sheet for frame data
     */
    update(dt, sheet) {
        if (this.paused || !sheet.loaded) return;

        const anim = sheet.animations[this.current];
        if (!anim || anim.frames <= 1) return;

        this.timer += dt;

        if (this.timer >= anim.speed) {
            this.timer -= anim.speed;
            this.frameIndex++;

            // Loop back to start
            if (this.frameIndex >= anim.frames) {
                this.frameIndex = 0;
            }
        }
    }

    /**
     * Switch to a different animation. Resets frame if it's a new animation.
     * @param {string} animName - New animation state
     */
    play(animName) {
        if (this.current === animName) return;
        this.current = animName;
        this.frameIndex = 0;
        this.timer = 0;
    }
}

// ─── Player Sprite Instance ──────────────────────────────────────────

let playerSprite = null;

export function initPlayerSprite() {
    playerSprite = new SpriteSheet(
        'assets/sprites/player/spritesheet.png',
        160,   // frameWidth
        280,   // frameHeight
        {
            idle:      { row: 0, frames: 3, speed: 0.15 },
            run:       { row: 1, frames: 6, speed: 0.08 },
            jump:      { row: 2, frames: 3, speed: 0.10 },
            shoot:     { row: 3, frames: 3, speed: 0.10 },
            dash:      { row: 4, frames: 2, speed: 0.10 },
            wallslide: { row: 5, frames: 2, speed: 0.10 },
        }
    );

    return playerSprite;
}

export function getPlayerSprite() {
    return playerSprite;
}
