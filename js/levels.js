import { level1 } from './level1.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { level4Boss } from './level4Boss.js';
import { generateProceduralLevel } from './level5Procedural.js';

// Levels 0-3 are static, level 4 (index 4) is procedurally generated
const STATIC_LEVELS = [
    level1,
    level2,
    level3,
    level4Boss,
];

export const LEVEL_COUNT = STATIC_LEVELS.length + 1; // 5 levels total (0-4)

// Cache the generated procedural level for the current session
let cachedProceduralLevel = null;

/**
 * Get a level by index. Index 4 generates a procedural level.
 * The procedural level is generated once per session and cached.
 */
export function getLevel(index) {
    if (index < 0 || index >= LEVEL_COUNT) return null;

    if (index < STATIC_LEVELS.length) {
        return STATIC_LEVELS[index];
    }

    // Index 4: procedural level - generate once, cache for the session
    if (!cachedProceduralLevel) {
        cachedProceduralLevel = generateProceduralLevel();
    }

    return cachedProceduralLevel;
}

/**
 * Force regeneration of the procedural level (e.g. on New Game).
 * Called when starting a new game so each playthrough feels different.
 */
export function regenerateProceduralLevel() {
    cachedProceduralLevel = generateProceduralLevel();
}
