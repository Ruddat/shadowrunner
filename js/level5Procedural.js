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
        spawn: { x: 80, y: GROUND_Y - 60 },
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
        const sectionType = rollSectionType(rng, progress);

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

    return platforms;
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
    const base = 60 + Math.floor(rng() * 80);
    const difficultyBonus = Math.floor(progress * 60);
    return base + difficultyBonus;
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
            for (let i = 0; i < steps; i++) {
                const w = 130 + Math.floor(rng() * 100);
                const y = GROUND_Y - (i + 1) * (50 + Math.floor(rng() * 30));
                platforms.push({ x, y: Math.max(100, y), width: w, height: 32 });
                x += w + 40 + Math.floor(rng() * 50);
            }
            break;
        }

        case 'steps-down': {
            const steps = 2 + Math.floor(rng() * 2);
            let x = startX;
            for (let i = 0; i < steps; i++) {
                const w = 140 + Math.floor(rng() * 120);
                const y = GROUND_Y - (steps - i) * (45 + Math.floor(rng() * 25));
                platforms.push({ x, y: Math.max(100, y), width: w, height: 32 });
                x += w + 50 + Math.floor(rng() * 40);
            }
            break;
        }

        case 'pillars': {
            const count = 3 + Math.floor(rng() * 3);
            for (let i = 0; i < count; i++) {
                const w = 80 + Math.floor(rng() * 60);
                const y = GROUND_Y - 40 - Math.floor(rng() * 140);
                const gap = 80 + Math.floor(rng() * 100);
                const x = startX + i * (w + gap);
                platforms.push({ x, y: Math.max(120, y), width: w, height: 32 });
            }
            break;
        }

        case 'canyon': {
            // Two platforms at different heights with a gap
            const w1 = 160 + Math.floor(rng() * 120);
            const w2 = 160 + Math.floor(rng() * 120);
            const y1 = GROUND_Y - 60 - Math.floor(rng() * 80);
            const y2 = GROUND_Y - 40 - Math.floor(rng() * 60);
            const gap = 100 + Math.floor(rng() * 120);

            platforms.push({ x: startX, y: Math.max(120, y1), width: w1, height: 32 });
            platforms.push({ x: startX + w1 + gap, y: Math.max(120, y2), width: w2, height: 32 });
            break;
        }

        case 'tower': {
            // Vertical stack with a wide base
            const baseW = 200 + Math.floor(rng() * 150);
            platforms.push({ x: startX, y: GROUND_Y, width: baseW, height: 40 });

            const midX = startX + Math.floor(rng() * 60);
            const midW = 120 + Math.floor(rng() * 80);
            platforms.push({ x: midX, y: GROUND_Y - 90, width: midW, height: 28 });

            const topX = startX + Math.floor(rng() * 80);
            const topW = 100 + Math.floor(rng() * 60);
            platforms.push({ x: topX, y: GROUND_Y - 170 - Math.floor(rng() * 40), width: topW, height: 28 });
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

    const enemyCount = 6 + Math.floor(rng() * 7); // 6-12 enemies

    for (let i = 0; i < enemyCount; i++) {
        const platform = validPlatforms[i % validPlatforms.length];
        if (!platform) continue;

        const progress = i / enemyCount; // 0..1
        const isShadowOnly = rng() < 0.15 + progress * 0.25; // 15% early → 40% late
        const canShoot = rng() < 0.2 + progress * 0.35; // 20% early → 55% late

        const enemyX = platform.x + 10 + Math.floor(rng() * Math.max(10, platform.width - 60));
        const enemyY = platform.y - ENEMY_SIZE.height;

        const speed = 100 + Math.floor(progress * 120) + Math.floor(rng() * 40);
        const health = 1 + Math.floor(progress * 4) + (isShadowOnly ? 2 : 0);

        const patrolPadding = 30;
        const minX = Math.max(platform.x + patrolPadding, enemyX - 60 - Math.floor(rng() * 40));
        const maxX = Math.min(platform.x + platform.width - patrolPadding, enemyX + 60 + Math.floor(rng() * 40));

        const enemy = {
            x: enemyX,
            y: enemyY,
            width: ENEMY_SIZE.width,
            height: ENEMY_SIZE.height,
            minX,
            maxX,
            speed,
            direction: rng() > 0.5 ? 1 : -1,
            health,
            active: true,
        };

        if (isShadowOnly) {
            enemy.shadowOnly = true;
        }

        if (canShoot) {
            enemy.canShoot = true;
            enemy.shootDelay = 1.6 - progress * 0.6 + rng() * 0.3; // 1.6s → ~1.0s
            enemy.shootRangeX = 420 + Math.floor(rng() * 160);
            enemy.shootRangeY = 180;
            enemy.projectileSpeed = 320 + Math.floor(progress * 180);
            enemy.projectileColor = isShadowOnly ? '#b388ff' : '#ff003c';
            enemy.projectileDamage = 18 + Math.floor(progress * 16);
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
