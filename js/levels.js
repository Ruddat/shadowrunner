import { level1 } from './level1.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { level4Boss } from './level4Boss.js';
import { generateProceduralLevel } from './level5Procedural.js';
import { level6 } from './level6.js';
import { level7 } from './level7.js';
import { level8 } from './level8.js';
import { level9Boss } from './level9Boss.js';
import { level10 } from './level10.js';

// Ten stages, ending with the Overlord. null marks the generated fifth stage.
const CAMPAIGN = [level1, level2, level3, level4Boss, null,
    level6, level7, level8, level10, level9Boss];
export const LEVEL_COUNT = CAMPAIGN.length;
let cachedProceduralLevel = null;

/** Return a fresh playable instance; gameplay must never mutate the templates. */
export function getLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVEL_COUNT) return null;
    if (CAMPAIGN[index] === null && !cachedProceduralLevel) {
        cachedProceduralLevel = generateProceduralLevel();
    }
    return structuredClone(CAMPAIGN[index] ?? cachedProceduralLevel);
}

export function regenerateProceduralLevel() {
    cachedProceduralLevel = generateProceduralLevel();
}
