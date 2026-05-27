import { level1 } from './level1.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { level4Boss } from './level4Boss.js';
import { generateProceduralLevel } from './level5Procedural.js';
import { level6 } from './level6.js';
import { level7 } from './level7.js';
import { level8 } from './level8.js';
import { level9Boss } from './level9Boss.js';

// Levels 0-3 are static, level 4 (index 4) is procedurally generated,
// levels 5-7 are new hand-crafted levels, level 8 is the second boss
const STATIC_LEVELS = [
    level1,
    level2,
    level3,
    level4Boss,
];

// New levels after the procedural level
const POST_PROC_LEVELS = [
    level6,
    level7,
    level8,
    level9Boss,
];

export const LEVEL_COUNT = STATIC_LEVELS.length + 1 + POST_PROC_LEVELS.length; // 9 levels total (0-8)

// Cache the generated procedural level for the current session
let cachedProceduralLevel = null;

/**
 * Get a level by index. Index 4 generates a procedural level.
 * Indices 5-7 are new hand-crafted levels, index 8 is the second boss.
 * The procedural level is generated once per session and cached.
 */
export function getLevel(index) {
    if (index < 0 || index >= LEVEL_COUNT) return null;

    if (index < STATIC_LEVELS.length) {
        return STATIC_LEVELS[index];
    }

    // Index 4: procedural level - generate once, cache for the session
    if (index === STATIC_LEVELS.length) {
        if (!cachedProceduralLevel) {
            cachedProceduralLevel = generateProceduralLevel();
        }
        return cachedProceduralLevel;
    }

    // Indices 5-8: new levels after procedural
    const postIndex = index - STATIC_LEVELS.length - 1;
    if (postIndex >= 0 && postIndex < POST_PROC_LEVELS.length) {
        return POST_PROC_LEVELS[postIndex];
    }

    return null;
}

/**
 * Force regeneration of the procedural level (e.g. on New Game).
 * Called when starting a new game so each playthrough feels different.
 */
export function regenerateProceduralLevel() {
    cachedProceduralLevel = generateProceduralLevel();
}
