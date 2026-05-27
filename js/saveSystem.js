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
            version: 2,
            timestamp: Date.now(),
            levelIndex: currentLevelIndex,
            score: player.score ?? 0,
            lives: player.lives,
            weaponId: player.weaponId,
            weaponLevel: player.weaponLevel,
            gems: player.gems,
            keys: player.keys ?? 0,
            // Checkpoint position within current level
            checkpointX: state.checkpoint?.x ?? currentLevel.spawn.x,
            checkpointY: state.checkpoint?.y ?? currentLevel.spawn.y,
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
        if (saveData.version !== 2) {
            console.warn('[SaveSystem] Save version mismatch, discarding');
            deleteSave();
            return null;
        }

        console.log('[SaveSystem] Game loaded from level', saveData.levelIndex);
        return saveData;
    } catch (err) {
        console.warn('[SaveSystem] Could not load:', err.message);
        return null;
    }
}

/**
 * Check if a save game exists.
 */
export function hasSaveGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.version === 2;
    } catch (_) {
        return false;
    }
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
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
