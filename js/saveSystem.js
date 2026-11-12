import { LEVEL_COUNT } from './levels.js';
import { isValidWeaponId } from './weapons.js';

/**
 * saveSystem.js - Save/Load game state via localStorage
 * Auto-saves on level complete, manual save on pause.
 */

const SAVE_KEY = 'shadowrunner_save';
const SETTINGS_KEY = 'shadowrunner_settings';

/**
 * Save current game progress to localStorage.
 * Called automatically on level complete and on pause.
 */
export function saveGame(state) {
    try {
        const { player, currentLevelIndex, currentLevel } = state;

        const saveData = {
            version: 3,
            timestamp: Date.now(),
            levelIndex: currentLevelIndex,
            score: player.score ?? 0,
            lives: player.lives,
            deathsThisLevel: player.deathsThisLevel ?? 0,
            elapsedMs: Math.max(0, performance.now() - (state.levelStats?.startedAt ?? performance.now())),
            weaponId: player.weaponId,
            weaponLevel: player.weaponLevel,
            gems: player.gems,
            keys: player.keys ?? 0,
            // Save world and counters together to prevent duplicate pickups on Continue.
            completed: state.gameState === 'levelComplete',
            x: player.x,
            y: player.y,
            energy: player.energy,
            shadowShift: player.shadowShift,
            shadowEnergy: player.shadowEnergy,
            buffs: {
                _magnetTimer: player._magnetTimer, _shieldTimer: player._shieldTimer,
                _speedBoostTimer: player._speedBoostTimer, _doubleJumpCharges: player._doubleJumpCharges,
            },
            checkpoint: state.checkpoint,
            level: JSON.parse(JSON.stringify(currentLevel, (key, value) =>
                ['anim', '_animInit', 'useSprites', '_computedShadowAreas'].includes(key)
                    ? undefined : value)),
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        console.log('[SaveSystem] Game saved at level', currentLevelIndex);
    } catch (err) {
        console.warn('[SaveSystem] Could not save:', err.message);
    }
}

/**
 * Load saved game state from localStorage.
 * Returns null if no save exists.
 */
export function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;

        const saveData = JSON.parse(raw);

        // Version check
        if (saveData.version !== 2 && saveData.version !== 3) {
            console.warn('[SaveSystem] Save version mismatch, discarding');
            deleteSave();
            return null;
        }

        // The previous eleven-entry campaign had Cipher Deep duplicated at index 3.
        // Legacy saves have no world snapshot: restart that stage without its pickups.
        if (saveData.version === 2) {
            const oldOrder = [0, 1, 2, 8, 3, 4, 5, 6, 7, 9, 8];
            saveData.levelIndex = oldOrder[saveData.levelIndex];
            saveData.gems = 0;
            saveData.keys = 0;
        }
        if (!isValidSave(saveData)) return null;
        console.log('[SaveSystem] Game loaded from level', saveData.levelIndex);
        return saveData;
    } catch (err) {
        console.warn('[SaveSystem] Could not load:', err.message);
        return null;
    }
}

/**
 * Validate the values required to resume a save.
 */
function isValidSave(data) {
    return data && Number.isInteger(data.levelIndex) && data.levelIndex >= 0 &&
        data.levelIndex < LEVEL_COUNT && Number.isInteger(data.lives) && data.lives > 0 &&
        Number.isFinite(data.score) && data.score >= 0 && isValidWeaponId(data.weaponId) &&
        Number.isInteger(data.weaponLevel) && data.weaponLevel >= 1 && data.weaponLevel <= 3 &&
        Number.isInteger(data.gems) && data.gems >= 0 &&
        Number.isInteger(data.keys ?? 0) && (data.keys ?? 0) >= 0 &&
        Number.isFinite(data.elapsedMs ?? 0) && (data.elapsedMs ?? 0) >= 0 &&
        (data.version === 2 || (Number.isFinite(data.x) && Number.isFinite(data.y) &&
            Number.isFinite(data.energy) && data.energy > 0 && data.energy <= 100 && data.level && Array.isArray(data.level.platforms) &&
            Array.isArray(data.level.enemies) && Array.isArray(data.level.gems) &&
            data.level.spawn && data.level.exit));
}

export function hasSaveGame() {
    return loadGame() !== null;
}

/**
 * Delete the save game (used after game completion or when starting truly new).
 */
export function deleteSave() {
    try {
        localStorage.removeItem(SAVE_KEY);
        console.log('[SaveSystem] Save deleted');
    } catch (_) {}
}

/**
 * Save settings (volume, etc.) separately from game progress.
 */
export function saveSettings(settings) {
    try {
        const existing = loadSettings() ?? {};
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...settings }));
    } catch (_) {}
}

/**
 * Load settings from localStorage.
 */
export function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}
