import { level1 } from './level1.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { level4Boss } from './level4Boss.js';

export const levels = [
    level1,
    level2,
    level3,
    level4Boss,
];

export function getLevel(index) {
    const level = levels[index] ?? levels[levels.length - 1];

    if (typeof window !== 'undefined') {
        window.currentLevel = level;
    }

    return level;
}