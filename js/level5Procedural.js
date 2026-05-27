/**
 * level5Procedural.js - Procedural Level Generator
 * Creates a unique, playable level every time after the boss fight.
 *
 * Design principles:
 * - Every platform is reachable (jump validation)
 * - Difficulty escalates left-to-right
 * - Shadow-only enemies force use of the shadow mechanic
 * - Shadow platforms create alternate routes
 * - Exit is locked until all enemies are defeated
 * - Each run feels different but always completable
 */

// --- Seeded PRNG (mulberry32) for reproducible levels ---

function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Constants ---

const LEVEL_WIDTH = 4800;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 412;
const PLAYER_HEIGHT = 70;
const PLAYER_WIDTH = 42;

// Physics-derived jump limits (CONFIG.jumpForce=760, CONFIG.gravity=1900, CONFIG.moveSpeed=360)
// Max vertical: v²/(2g) ≈ 152px, horizontal: speed * jump_time ≈ 288px
const MAX_JUMP_HEIGHT = 150;   // slightly below theoretical max for safety
const MAX_JUMP_DISTANCE = 280; // horizontal reach during a full jump

const ENEMY_SIZE = { width: 46, height: 50 };
const BONUS_BLOCK_SIZE = { width: 42, height: 42 };

const WEAPON_POOL = ['spread', 'laser', 'wave', 'bounce', 'plasma'];
const REWARD_POOL = ['gem', 'energy', 'life', 'weapon'];

const LEVEL_NAMES = [
    'Void Nexus',
    'Glitch Sector',
    'Null Horizon',
    'Dark Protocol',
    'Neon Abyss',
    'Shadow Grid',
    'Data Storm',
    'Chrome Void',
    'Pixel Wasteland',
    'Cipher Deep',
];

// --- Main Generator ---

/**
 * Generate a procedural level 5.
 * @param {number} [seed] - Optional seed for reproducibility. Random if omitted.
 * @returns {object} A level object compatible with the game engine.
 */
export function generateProceduralLevel(seed) {
    const actualSeed = seed ?? (Date.now() ^ (Math.random() * 0x100000000));
    const rng = mulberry32(actualSeed);

    const name = LEVEL_NAMES[Math.floor(rng() * LEVEL_NAMES.length)];

    const platforms = generatePlatforms(rng);
    const shadowPlatforms = generateShadowPlatforms(rng, platforms);
    const enemies = generateEnemies(rng, platforms);
    const gems = generateGems(rng, platforms);
    const bonusBlocks = generateBonusBlocks(rng, platforms);
    const keys = generateKeys(rng, platforms);

    const exitX = LEVEL_WIDTH - 120;
    const lastPlatform = platforms[platforms.length - 1];

    return {
        name,
        mode: 'procedural',
        music: 'level1',
        spawn: { x: 80, y: 252 },
        background: 'assets/backgrounds/level3-bg.png',

        platforms,
        shadowPlatforms,
        enemies,
        gems,
        bonusBlocks,
        keys,

        fx: {
            stars: rng() > 0.5,
            fog: true,
            rain: true,
            scanlines: true,
            neonDust: true,
            sparks: rng() > 0.4,
            warningLights: rng() > 0.6,
        },

        exit: {
            x: exitX,
            y: (lastPlatform?.y ?? GROUND_Y) - 100,
            width: 70,
            height: 100,
            locked: true,
            keysRequired: keys.length > 0 ? keys.length : undefined,
            unlockMode: 'allEnemies',
        },
    };
}

// --- Platform Generation ---

function generatePlatforms(rng) {
    const platforms = [];

    // Starting platform - always wide and safe
    platforms.push({
        x: 0,
        y: GROUND_Y,
        width: 400 + Math.floor(rng() * 120),
        height: 40,
    });

    let cursorX = platforms[0].width;
    const sectionCount = 8 + Math.floor(rng() * 5); // 8-12 sections

    for (let section = 1; section <= sectionCount; section++) {
        const progress = section / sectionCount; // 0..1 difficulty ramp

        // First section after starting platform is always flat for a smooth start
        const sectionType = section === 1 ? 'flat' : rollSectionType(rng, progress);

        const sectionPlatforms = buildSection(rng, cursorX, sectionType, progress, section);
        platforms.push(...sectionPlatforms);

        // Advance cursor past this section
        const maxX = Math.max(...sectionPlatforms.map(p => p.x + p.width));
        cursorX = maxX + gapSize(rng, progress);
    }

    // Final exit platform - always solid
    platforms.push({
        x: LEVEL_WIDTH - 280,
        y: GROUND_Y,
        width: 280,
        height: 40,
    });

    // Validate and fix reachability: every platform must be jumpable from the previous one
    clampPlatformReachability(platforms);

    return platforms;
}

/**
 * Ensure every platform is reachable from the previous one.
 * If the vertical or horizontal gap exceeds jump limits,
 * lower the platform or move it closer so the player can always proceed.
 */
function clampPlatformReachability(platforms) {
    for (let i = 1; i < platforms.length; i++) {
        const prev = platforms[i - 1];
        const curr = platforms[i];

        // Calculate horizontal gap (edge of prev to left edge of curr)
        const hGap = curr.x - (prev.x + prev.width);

        // Calculate vertical difference (negative = curr is higher = harder to reach)
        // Player stands at prev.y - PLAYER_HEIGHT, jumps to curr.y - PLAYER_HEIGHT
        const vDiff = (prev.y - PLAYER_HEIGHT) - (curr.y - PLAYER_HEIGHT);
        // vDiff > 0 means curr is higher (player needs to jump up)

        // If horizontal gap is too large, pull the platform closer
        if (hGap > MAX_JUMP_DISTANCE) {
            curr.x = prev.x + prev.width + MAX_JUMP_DISTANCE - 10;
        }

        // If vertical climb is too high for the jump, lower the platform
        // (make curr.y larger = lower on screen = easier to reach)
        if (vDiff > MAX_JUMP_HEIGHT) {
            curr.y = prev.y - MAX_JUMP_HEIGHT + 10;
            // Don't push below ground
            curr.y = Math.min(curr.y, GROUND_Y);
        }

        // Safety: never go above y=100 (too close to ceiling)
        curr.y = Math.max(curr.y, 100);
    }
}

function rollSectionType(rng, progress) {
    const roll = rng();

    // Early sections are easier; later sections mix in harder types
    if (progress < 0.25) {
        if (roll < 0.5) return 'flat';
        if (roll < 0.8) return 'steps-up';
        return 'steps-down';
    }

    if (progress < 0.55) {
        if (roll < 0.25) return 'flat';
        if (roll < 0.5) return 'steps-up';
        if (roll < 0.7) return 'steps-down';
        if (roll < 0.85) return 'pillars';
        return 'canyon';
    }

    // Late game: more vertical and challenging
    if (roll < 0.15) return 'flat';
    if (roll < 0.35) return 'steps-up';
    if (roll < 0.5) return 'steps-down';
    if (roll < 0.7) return 'pillars';
    if (roll < 0.85) return 'canyon';
    return 'tower';
}

function gapSize(rng, progress) {
    const base = 50 + Math.floor(rng() * 70);
    const difficultyBonus = Math.floor(progress * 50);
    // Cap gap so player can always jump across (max horizontal reach ~280px)
    return Math.min(base + difficultyBonus, 220);
}

function buildSection(rng, startX, type, progress, sectionIndex) {
    const platforms = [];

    switch (type) {
        case 'flat': {
            const w = 200 + Math.floor(rng() * 300);
            const y = GROUND_Y - Math.floor(rng() * 40);
            platforms.push({ x: startX, y, width: w, height: 32 });
            break;
        }

        case 'steps-up': {
            const steps = 2 + Math.floor(rng() * 2);
            let x = startX;
            let prevY = GROUND_Y; // starting from ground level
            for (let i = 0; i < steps; i++) {
                const w = 140 + Math.floor(rng() * 100);
                // Each step rises at most MAX_JUMP_HEIGHT so it's always reachable
                const stepRise = 50 + Math.floor(rng() * 60); // 50-110px per step
                const y = Math.max(100, prevY - stepRise);
                platforms.push({ x, y, width: w, height: 32 });
                x += w + 40 + Math.floor(rng() * 40);
                prevY = y;
            }
            break;
        }

        case 'steps-down': {
            const steps = 2 + Math.floor(rng() * 2);
            let x = startX;
            // Start high, descend to ground
            let currentY = GROUND_Y - steps * 60 - Math.floor(rng() * 40);
            currentY = Math.max(100, currentY);
            for (let i = 0; i < steps; i++) {
                const w = 140 + Math.floor(rng() * 120);
                const stepDrop = 50 + Math.floor(rng() * 40); // 50-90px drop per step
                const y = Math.min(GROUND_Y, currentY);
                platforms.push({ x, y, width: w, height: 32 });
                x += w + 50 + Math.floor(rng() * 40);
                currentY += stepDrop;
            }
            break;
        }

        case 'pillars': {
            const count = 3 + Math.floor(rng() * 3);
            let prevPillarY = GROUND_Y;
            for (let i = 0; i < count; i++) {
                const w = 90 + Math.floor(rng() * 60);
                // Each pillar varies at most ±MAX_JUMP_HEIGHT from the previous one
                const rise = Math.floor(rng() * MAX_JUMP_HEIGHT * 0.8); // up to ~120px rise
                const drop = Math.floor(rng() * 80); // up to 80px drop
                const y = Math.max(120, Math.min(GROUND_Y, prevPillarY - rise + drop));
                const gap = 80 + Math.floor(rng() * 80); // 80-160px gap
                const x = startX + i * (w + gap);
                platforms.push({ x, y, width: w, height: 32 });
                prevPillarY = y;
            }
            break;
        }

        case 'canyon': {
            // Two platforms at different heights with a gap
            const w1 = 160 + Math.floor(rng() * 120);
            const w2 = 160 + Math.floor(rng() * 120);
            const y1 = GROUND_Y - 40 - Math.floor(rng() * 60); // 40-100px above ground
            // Second platform must be reachable from the first
            const maxRise = MAX_JUMP_HEIGHT - 20; // safety margin
            const y2 = Math.min(GROUND_Y, y1 + Math.floor(rng() * 80) - Math.floor(rng() * maxRise));
            const gap = 100 + Math.floor(rng() * 80); // 100-180px gap

            platforms.push({ x: startX, y: Math.max(120, y1), width: w1, height: 32 });
            platforms.push({ x: startX + w1 + gap, y: Math.max(120, Math.min(GROUND_Y, y2)), width: w2, height: 32 });
            break;
        }

        case 'tower': {
            // Vertical stack with a wide base - each tier reachable from the one below
            const baseW = 200 + Math.floor(rng() * 150);
            platforms.push({ x: startX, y: GROUND_Y, width: baseW, height: 40 });

            const midX = startX + Math.floor(rng() * 40);
            const midW = 120 + Math.floor(rng() * 80);
            // Mid tier: at most MAX_JUMP_HEIGHT above base
            const midY = GROUND_Y - 80 - Math.floor(rng() * 40); // 80-120px above ground
            platforms.push({ x: midX, y: Math.max(120, midY), width: midW, height: 28 });

            const topX = startX + Math.floor(rng() * 60);
            const topW = 100 + Math.floor(rng() * 60);
            // Top tier: at most MAX_JUMP_HEIGHT above mid tier
            const topY = midY - 80 - Math.floor(rng() * 40); // 80-120px above mid
            platforms.push({ x: topX, y: Math.max(120, topY), width: topW, height: 28 });
            break;
        }
    }

    return platforms;
}

// --- Shadow Platforms ---

function generateShadowPlatforms(rng, platforms) {
    const shadowPlatforms = [];
    const count = 2 + Math.floor(rng() * 4); // 2-5 shadow platforms

    for (let i = 0; i < count; i++) {
        const refPlatform = platforms[1 + Math.floor(rng() * (platforms.length - 2))];
        if (!refPlatform) continue;

        const w = 100 + Math.floor(rng() * 80);
        const y = refPlatform.y - 50 - Math.floor(rng() * 60);
        const x = refPlatform.x + Math.floor(rng() * (refPlatform.width - w));

        shadowPlatforms.push({
            x: Math.max(0, x),
            y: Math.max(80, y),
            width: w,
            height: 24,
        });
    }

    return shadowPlatforms;
}

// --- Enemy Generation ---

function generateEnemies(rng, platforms) {
    const enemies = [];
    // Skip starting platform, use platforms that are wide enough
    const validPlatforms = platforms.filter(
        (p, i) => i > 0 && p.width >= 100 && p.y < GROUND_Y + 10
    );

    const enemyCount = 8 + Math.floor(rng() * 6); // 8-13 enemies

    // Enemy type pool: more variety as difficulty ramps
    // walker is default (no type field), others get explicit type
    const ENEMY_TYPES = ['walker', 'walker', 'drone', 'shield', 'mech', 'turret'];

    for (let i = 0; i < enemyCount; i++) {
        const platform = validPlatforms[i % validPlatforms.length];
        if (!platform) continue;

        const progress = i / enemyCount; // 0..1
        const isShadowOnly = rng() < 0.15 + progress * 0.25; // 15% early → 40% late

        // Roll enemy type based on progress (harder types more likely later)
        let type;
        if (progress < 0.25) {
            // Early: mostly walkers, occasional drones
            type = rng() < 0.7 ? 'walker' : 'drone';
        } else if (progress < 0.5) {
            // Mid: introduce shields and turrets
            const roll = rng();
            if (roll < 0.35) type = 'walker';
            else if (roll < 0.55) type = 'drone';
            else if (roll < 0.75) type = 'shield';
            else if (roll < 0.9) type = 'turret';
            else type = 'mech';
        } else {
            // Late: full mix with mechs
            const roll = rng();
            if (roll < 0.2) type = 'walker';
            else if (roll < 0.4) type = 'drone';
            else if (roll < 0.6) type = 'shield';
            else if (roll < 0.8) type = 'turret';
            else type = 'mech';
        }

        const enemyX = platform.x + 10 + Math.floor(rng() * Math.max(10, platform.width - 60));

        // Type-specific sizing and positioning
        let width, height, enemyY;
        if (type === 'mech') {
            width = 56; height = 64;
            enemyY = platform.y - height;
        } else if (type === 'drone') {
            width = 38; height = 38;
            enemyY = platform.y - height - 60 - Math.floor(rng() * 60); // drones hover above
        } else if (type === 'turret') {
            width = 42; height = 42;
            enemyY = platform.y - height;
        } else {
            width = ENEMY_SIZE.width; height = ENEMY_SIZE.height;
            enemyY = platform.y - height;
        }

        const speed = type === 'turret' ? 0
            : type === 'mech' ? 55 + Math.floor(rng() * 20)
            : type === 'shield' ? 70 + Math.floor(rng() * 30)
            : type === 'drone' ? 60 + Math.floor(rng() * 30)
            : 100 + Math.floor(progress * 120) + Math.floor(rng() * 40);

        const health = type === 'mech' ? 5 + Math.floor(progress * 4)
            : type === 'shield' ? 3 + Math.floor(progress * 2)
            : type === 'turret' ? 4 + Math.floor(progress * 2)
            : type === 'drone' ? 2 + Math.floor(progress * 2)
            : 1 + Math.floor(progress * 4) + (isShadowOnly ? 2 : 0);

        const patrolPadding = 30;
        const minX = type === 'turret' ? enemyX
            : Math.max(platform.x + patrolPadding, enemyX - 60 - Math.floor(rng() * 40));
        const maxX = type === 'turret' ? enemyX + width
            : Math.min(platform.x + platform.width - patrolPadding, enemyX + 60 + Math.floor(rng() * 40));

        const enemy = {
            x: enemyX,
            y: enemyY,
            width,
            height,
            minX,
            maxX,
            speed,
            direction: rng() > 0.5 ? 1 : -1,
            health,
            active: true,
        };

        if (type !== 'walker') {
            enemy.type = type;
        }

        if (isShadowOnly) {
            enemy.shadowOnly = true;
        }

        // Shooting config per type
        if (type === 'walker' || type === 'drone' || type === 'shield') {
            const canShoot = rng() < (type === 'drone' ? 0.65 : 0.2 + progress * 0.35);
            if (canShoot) {
                enemy.canShoot = true;
                enemy.shootDelay = type === 'drone' ? 2.0 - progress * 0.4 + rng() * 0.3
                    : type === 'shield' ? 2.0 - progress * 0.5 + rng() * 0.3
                    : 1.6 - progress * 0.6 + rng() * 0.3;
                enemy.shootRangeX = 420 + Math.floor(rng() * 160);
                enemy.shootRangeY = type === 'drone' ? 220 : 180;
                enemy.projectileSpeed = 320 + Math.floor(progress * 180);
                enemy.projectileColor = type === 'drone' ? '#ff6b00'
                    : type === 'shield' ? '#3b82f6'
                    : isShadowOnly ? '#b388ff' : '#ff003c';
                enemy.projectileDamage = 18 + Math.floor(progress * 16);
            }
        }

        if (type === 'turret') {
            enemy.canShoot = true;
            enemy.shootDelay = 1.0 - progress * 0.3 + rng() * 0.2; // 1.0s → 0.7s
            enemy.shootRangeX = 550 + Math.floor(rng() * 100);
            enemy.shootRangeY = 400;
            enemy.projectileSpeed = 380 + Math.floor(progress * 120);
            enemy.projectileColor = '#a855f7';
            enemy.projectileDamage = 20 + Math.floor(progress * 14);
        }

        if (type === 'mech') {
            enemy.chargeSpeed = 650 + Math.floor(progress * 150);
            enemy.chargeRange = 350 + Math.floor(progress * 100);
        }

        if (type === 'shield') {
            enemy.shieldHP = 3 + Math.floor(progress * 2); // 3-5 shield hits
        }

        enemies.push(enemy);
    }

    return enemies;
}

// --- Gem Generation ---

function generateGems(rng, platforms) {
    const gems = [];

    for (const platform of platforms) {
        // 40-65% chance of gems on each platform
        if (rng() > 0.4 + rng() * 0.25) continue;

        const gemCount = 1 + Math.floor(rng() * 3);
        const spacing = 60;

        for (let g = 0; g < gemCount; g++) {
            const gemX = platform.x + 20 + g * spacing + Math.floor(rng() * 20);
            const gemY = platform.y - 40 - Math.floor(rng() * 20);

            if (gemX + 26 > platform.x + platform.width) break;

            gems.push({
                x: gemX,
                y: gemY,
                collected: false,
            });
        }
    }

    return gems;
}

// --- Bonus Block Generation ---

function generateBonusBlocks(rng, platforms) {
    const blocks = [];
    const blockCount = 3 + Math.floor(rng() * 4); // 3-6 bonus blocks

    // Pick distinct platforms for blocks
    const usedIndices = new Set();
    for (let i = 0; i < blockCount; i++) {
        let platformIndex;
        let attempts = 0;
        do {
            platformIndex = 1 + Math.floor(rng() * (platforms.length - 2));
            attempts++;
        } while (usedIndices.has(platformIndex) && attempts < 20);

        if (attempts >= 20) continue;
        usedIndices.add(platformIndex);

        const platform = platforms[platformIndex];
        if (!platform) continue;

        const blockX = platform.x + 10 + Math.floor(rng() * Math.max(10, platform.width - BONUS_BLOCK_SIZE.width - 20));
        const blockY = platform.y - BONUS_BLOCK_SIZE.height - 4;

        const reward = rollReward(rng, i, blockCount);

        const block = {
            x: blockX,
            y: blockY,
            width: BONUS_BLOCK_SIZE.width,
            height: BONUS_BLOCK_SIZE.height,
            used: false,
            bumpTimer: 0,
            reward: reward.type,
        };

        if (reward.type === 'weapon') {
            block.weaponId = reward.weaponId;
        }

        if (reward.type === 'random') {
            block.randomPool = REWARD_POOL;
            block.weaponId = reward.weaponId;
        }

        blocks.push(block);
    }

    return blocks;
}

function rollReward(rng, index, total) {
    // First blocks are more likely to be energy/weapon, later ones more random
    if (index === 0) {
        return { type: 'energy' };
    }

    if (index === 1) {
        return { type: 'weapon', weaponId: WEAPON_POOL[Math.floor(rng() * WEAPON_POOL.length)] };
    }

    const roll = rng();
    if (roll < 0.25) {
        return { type: 'life' };
    }
    if (roll < 0.55) {
        const weaponId = WEAPON_POOL[Math.floor(rng() * WEAPON_POOL.length)];
        return { type: 'weapon', weaponId };
    }
    if (roll < 0.75) {
        return { type: 'energy' };
    }

    const weaponId = WEAPON_POOL[Math.floor(rng() * WEAPON_POOL.length)];
    return { type: 'random', weaponId };
}

// --- Key Generation ---

function generateKeys(rng, platforms) {
    const keys = [];
    const keyCount = 2 + Math.floor(rng() * 2); // 2-3 keys

    // Place keys on higher/harder-to-reach platforms
    const sortedByHeight = [...platforms]
        .filter((p, i) => i > 0 && p.y < GROUND_Y - 30)
        .sort((a, b) => a.y - b.y); // highest first

    for (let i = 0; i < keyCount && i < sortedByHeight.length; i++) {
        const platform = sortedByHeight[i];
        const keyX = platform.x + Math.floor(platform.width / 2) - 13;
        const keyY = platform.y - 40;

        keys.push({
            x: keyX,
            y: keyY,
            width: 26,
            height: 26,
        });
    }

    return keys;
}
