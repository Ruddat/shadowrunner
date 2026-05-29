/**
 * spriteManager.js — Sprite sheet loading and animation system.
 * Loads a sprite sheet image and provides frame-by-frame animation playback.
 * Supports both multi-row (player) and single-row with startFrame (enemies) layouts.
 */

export class SpriteSheet {
    /**
     * @param {string} src - Path to the sprite sheet image
     * @param {number} frameWidth - Width of each frame in pixels
     * @param {number} frameHeight - Height of each frame in pixels
     * @param {object} animations - { animName: { row, frames, speed, startFrame? } }
     *   startFrame: offset into the row (for single-row sheets with sequential frames)
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

        const start = anim.startFrame ?? 0;
        const row = anim.row ?? 0;

        return {
            sx: (start + frameIndex) * this.frameWidth,
            sy: row * this.frameHeight,
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
    constructor(defaultAnim = 'idle') {
        this.current = defaultAnim;
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

            // Loop back to start (or hold on last frame for one-shot animations)
            if (this.frameIndex >= anim.frames) {
                if (anim.hold) {
                    this.frameIndex = anim.frames - 1;
                    this.paused = true;
                } else {
                    this.frameIndex = 0;
                }
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
        this.paused = false;
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

// ─── Enemy Sprite Instances ──────────────────────────────────────────
//
// Enemy sprite sheets are single-row (row: 0) with sequential frames:
//   frames 0-1 = idle (2f), frames 2-3 = walk (2f), frames 4 = attack (1f), frame 5 = death (1f)
// Animations use `startFrame` to offset into the row.
//

const enemySprites = {};

export function initEnemySprites() {
    // Walker — corporate security guard
    enemySprites.walker = new SpriteSheet(
        'assets/sprites/enemies/walker_spritesheet.png',
        176,   // frameWidth
        265,   // frameHeight
        {
            idle:    { row: 0, startFrame: 0, frames: 2, speed: 0.25 },
            walk:    { row: 0, startFrame: 2, frames: 2, speed: 0.18 },
            attack:  { row: 0, startFrame: 4, frames: 1, speed: 0.10 },
            death:   { row: 0, startFrame: 5, frames: 1, speed: 0.10, hold: true },
        }
    );

    // Shield — riot shield enforcer
    enemySprites.shield = new SpriteSheet(
        'assets/sprites/enemies/shield_spritesheet.png',
        197,   // frameWidth
        254,   // frameHeight
        {
            idle:    { row: 0, startFrame: 0, frames: 2, speed: 0.25 },
            walk:    { row: 0, startFrame: 2, frames: 2, speed: 0.20 },
            attack:  { row: 0, startFrame: 4, frames: 1, speed: 0.10 },
            death:   { row: 0, startFrame: 5, frames: 1, speed: 0.10, hold: true },
        }
    );

    // Mech — charging mech suit
    enemySprites.mech = new SpriteSheet(
        'assets/sprites/enemies/mech_spritesheet.png',
        220,   // frameWidth
        244,   // frameHeight
        {
            idle:    { row: 0, startFrame: 0, frames: 2, speed: 0.25 },
            walk:    { row: 0, startFrame: 2, frames: 2, speed: 0.22 },
            charge:  { row: 0, startFrame: 4, frames: 2, speed: 0.06 },
            death:   { row: 0, startFrame: 5, frames: 1, speed: 0.10, hold: true },
        }
    );

    // Ninja — stealth assassin
    enemySprites.ninja = new SpriteSheet(
        'assets/sprites/enemies/ninja_spritesheet.png',
        247,   // frameWidth
        257,   // frameHeight
        {
            idle:    { row: 0, startFrame: 0, frames: 2, speed: 0.20 },
            walk:    { row: 0, startFrame: 2, frames: 2, speed: 0.12 },
            attack:  { row: 0, startFrame: 4, frames: 1, speed: 0.08 },
            death:   { row: 0, startFrame: 5, frames: 1, speed: 0.10, hold: true },
        }
    );

    return enemySprites;
}

/**
 * Get the sprite sheet for a specific enemy type.
 * @param {string} type - Enemy type (walker, shield, mech, ninja)
 * @returns {SpriteSheet|null}
 */
export function getEnemySprite(type) {
    return enemySprites[type] ?? null;
}

/**
 * Check if enemy sprites are loaded and ready.
 * @returns {boolean}
 */
export function enemySpritesReady() {
    return Object.values(enemySprites).every(s => s.loaded);
}
