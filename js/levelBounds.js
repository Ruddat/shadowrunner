import { CONFIG } from './config.js';

export function getWorldWidth(level) {
    if (!level) return CONFIG.worldWidth;
    return Math.max(CONFIG.width, level.worldWidth ?? 0,
        (level.exit?.x ?? 0) + (level.exit?.width ?? 0),
        ...(level.basePlatforms ?? level.platforms ?? []).map(p => p.x + p.width));
}
