import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tick, key, press, click } from './browser-stubs.js';
const { state } = await import('../js/gameState.js');
const { getLevel, LEVEL_COUNT } = await import('../js/levels.js');
const manager = await import('../js/levelManager.js');
const { generateProceduralLevel } = await import('../js/level5Procedural.js');
const { updateKeyPortalSystem } = await import('../js/key-portal-system.js');
const { completeLevel } = await import('../js/screens.js');
const { saveGame, loadGame, hasSaveGame, saveSettings, loadSettings } = await import('../js/saveSystem.js');
const { updateHazards } = await import('../js/hazards.js');
const { getWorldWidth } = await import('../js/levelBounds.js');
const { updateEnemies } = await import('../js/enemySystem.js');
const { getCurrentMusicName, setMuted, playMusic } = await import('../js/audioManager.js');
await import('../js/main.js');

function startAt(index) {
    manager.startNewGame();
    state.currentLevelIndex = index;
    manager.retryCurrentLevel();
}

test('ten independent stages, registered music, existing assets, final boss', () => {
    assert.equal(LEVEL_COUNT, 10);
    const names = [];
    const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
    for (let i = 0; i < LEVEL_COUNT; i++) {
        const level = getLevel(i);
        names.push(level.name);
        assert.ok(existsSync(new URL('../' + level.background, import.meta.url)), level.background);
        assert.ok(main.includes(`registerMusic('${level.music}'`), level.music);
        const initialLock = level.exit.locked;
        level.gems[0].collected = true;
        level.exit.locked = false;
        assert.ok(!getLevel(i).gems[0].collected);
        assert.equal(getLevel(i).exit.locked, initialLock);
    }
    assert.equal(new Set(names).size, 10);
    assert.equal(getLevel(9).name, 'Overlord Core');
    for (const i of [-1, 10, 0.5, NaN]) assert.equal(getLevel(i), null);
});

test('game loop starts and runs all ten levels without engine exceptions', () => {
    press('Space'); press('Enter');
    assert.equal(state.gameState, 'playing');
    for (let i = 0; i < LEVEL_COUNT; i++) {
        startAt(i);
        tick(40);
        assert.ok(Number.isFinite(state.player.x));
        assert.ok(Number.isFinite(state.player.y));
        // Exercise offscreen enemies and all draw paths, including sprite animations.
        for (const enemy of state.currentLevel.enemies) {
            state.camera.x = Math.max(0, enemy.x - 300);
            state.player.x = enemy.x - 250;
            updateEnemies(1 / 60);
        }
        tick();
    }
});

test('retry restores defeated boss, keys, shields, positions and locked exit', () => {
    startAt(3);
    state.currentLevel.boss.active = false;
    state.currentLevel.boss.health = 0;
    state.currentLevel.exit.locked = false;
    state.checkpoint = { x: 999, y: 10 };
    state.pendingLevelComplete = { timer: 0.1 };
    manager.retryCurrentLevel();
    assert.equal(state.currentLevel.boss.active, true);
    assert.equal(state.currentLevel.boss.health, state.currentLevel.boss.maxHealth);
    assert.equal(state.currentLevel.exit.locked, true);
    assert.equal(state.checkpoint, null);
    assert.equal(state.pendingLevelComplete, null);
    startAt(8);
    state.currentLevel.keys[0].collected = true;
    state.currentLevel.enemies[0].shieldHP = 0;
    state.currentLevel.enemies[0].x += 100;
    manager.retryCurrentLevel();
    assert.ok(!state.currentLevel.keys[0].collected);
    assert.equal(state.currentLevel.enemies[0].shieldHP, 3);
    assert.equal(state.currentLevel.enemies[0].x, 730);
});

test('key counters survive checkpoint deaths and still unlock portal', () => {
    startAt(8);
    const level = state.currentLevel;
    for (const item of level.keys) {
        state.player.x = item.x;
        state.player.y = item.y;
        updateKeyPortalSystem(state.player, level);
        state.checkpoint = { x: 1760, y: 330 };
        state.player.respawn(level);
    }
    assert.equal(state.player.keys, 3);
    assert.equal(level.exit.locked, false);
});

test('save/continue restores pickups, procedural geometry, enemies and position', () => {
    startAt(4);
    const level = state.currentLevel;
    level.keys[0].collected = true;
    level.gems[0].collected = true;
    level.enemies[0].active = false;
    state.player.keys = 1;
    state.player.gems = 1;
    state.player.x = 740;
    state.player.y = 200;
    saveGame(state);
    const data = loadGame();
    assert.equal(data.level.keys[0].collected, true);
    assert.equal(data.level.enemies[0].active, false);
    // Select Continue through the real title event handler.
    state.gameState = 'title'; press('ArrowDown'); press('Enter');
    assert.equal(state.gameState, 'playing');
    assert.equal(state.player.x, 740);
    assert.equal(state.player.keys, 1);
    assert.equal(state.player.gems, 1);
    assert.deepEqual(state.currentLevel.platforms, data.level.platforms);
    assert.equal(state.currentLevel.gems[0].collected, true);
    assert.equal(state.currentLevel.enemies[0].active, false);
    tick(2);
});

test('completed save advances once, transition saves do not skip next level', () => {
    startAt(0);
    completeLevel();
    const score = state.player.score;
    assert.equal(loadGame().completed, true);
    state.gameState = 'title'; press('Enter'); // Continue remains selected
    assert.equal(state.currentLevelIndex, 1);
    assert.equal(state.gameState, 'playing');
    assert.equal(state.player.score, score);
    assert.equal(loadGame().completed, false);
    // Frozen completion screen must not keep simulating/damaging player.
    completeLevel();
    const before = [state.player.x, state.player.y, state.player.energy, state.player.lives];
    tick(60);
    assert.deepEqual([state.player.x, state.player.y, state.player.energy, state.player.lives], before);
});

test('final boss advances to credits, clears save, records final time', () => {
    startAt(9);
    completeLevel({ bossDefeated: true });
    assert.ok(JSON.parse(localStorage.getItem('shadowrunner_speedrun'))[9] >= 0);
    press('Enter');
    assert.equal(state.gameState, 'credits');
    assert.equal(hasSaveGame(), false);
    tick(3);
});

test('invalid saves fail safely; settings updates preserve other options', () => {
    localStorage.setItem('shadowrunner_save', '{broken');
    assert.equal(loadGame(), null);
    startAt(0);
    const valid = loadGame();
    for (const bad of [{ levelIndex: 999 }, { lives: 0 }, { weaponId: 'invalid' }, { level: null }]) {
        localStorage.setItem('shadowrunner_save', JSON.stringify({ ...valid, ...bad }));
        assert.equal(loadGame(), null);
    }
    saveSettings({ speedrunEnabled: true });
    saveSettings({ musicVolume: 0.4 });
    assert.equal(loadSettings().speedrunEnabled, true);
});

test('security cameras keep finite rotating angles, muted music selects new stage', () => {
    startAt(0);
    const camera = { type: 'security_cam', x: 800, y: 100 };
    const level = { hazards: [camera], enemies: [] };
    updateHazards(state.player, level, 1 / 60);
    assert.ok(Number.isFinite(camera._angle));
    setMuted(true); playMusic('level2');
    assert.equal(getCurrentMusicName(), 'level2');
    setMuted(false);
});

test('500 procedural seeds keep exit on last platform and inside dynamic world bounds', () => {
    for (let seed = 0; seed < 500; seed++) {
        const level = generateProceduralLevel(seed);
        const last = level.platforms.at(-1);
        assert.ok(level.exit.x >= last.x, `seed ${seed}`);
        assert.ok(level.exit.x + level.exit.width <= last.x + last.width, `seed ${seed}`);
        assert.equal(level.exit.y + level.exit.height, last.y);
        assert.ok(level.platforms.every(p => p.x + p.width <= getWorldWidth(level)));
    }
});

test('swept collision lands on thin platforms during a fast fall', async () => {
    const { resolvePlatformCollision } = await import('../js/collision.js');
    const player = { x: 20, y: 180, prevY: 50, width: 42, height: 70, velocityY: 1200 };
    resolvePlatformCollision(player, [{ x: 0, y: 140, width: 200, height: 24 }]);
    assert.equal(player.y, 70);
    assert.equal(player.onGround, true);
});

test('checkpoint never activates while paused; activation belongs to update', () => {
    startAt(8);
    const checkpoint = state.currentLevel.checkpoints[0];
    state.player.x = checkpoint.x + 10;
    state.player.y = checkpoint.y + 5;
    state.paused = true;
    tick();
    assert.ok(!checkpoint.activated);
    state.paused = false;
    tick();
    assert.equal(checkpoint.activated, true);
    assert.equal(state.checkpoint.id, 0);
});

test('gamepad menus detect each press once and run without keyboard events', async () => {
    const { setGamepads } = await import('./browser-stubs.js');
    const { initTitleScreen, handleTitleKey } = await import('../js/titleScreen.js');
    const { pollGamepads, getGamepadMenuAction } = await import('../js/input.js');
    const pad = { index: 0, id: 'Test controller', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
    setGamepads([pad]); pollGamepads();
    pad.buttons[13].pressed = true;
    assert.equal(getGamepadMenuAction(), 'down');
    assert.equal(getGamepadMenuAction(), null);
    pad.buttons[13].pressed = false; getGamepadMenuAction();
    initTitleScreen(); state.gameState = 'title';
    pad.buttons[13].pressed = true; tick(4);
    assert.equal(handleTitleKey('Enter'), 'CONTINUE');
    pad.buttons[13].pressed = false; tick();
    setGamepads([]); pollGamepads();
    key('ArrowRight'); key('ArrowRight', 'keyup');
});

test('new game clears old checkpoints, pending completion and temporary buffs', () => {
    state.checkpoint = { x: 900, y: 100 };
    state.pendingLevelComplete = { timer: 0.1 };
    state.player._shieldTimer = 99;
    state.player._speedBoostTimer = 99;
    manager.startNewGame();
    assert.equal(state.checkpoint, null);
    assert.equal(state.pendingLevelComplete, null);
    assert.equal(state.player._shieldTimer, 0);
    assert.equal(state.player._speedBoostTimer, 0);
    tick();
});

test('all campaign floors and 500 generated layouts have a connected jump route', () => {
    function assertConnected(level) {
        const platforms = level.platforms;
        const visited = new Set([0]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const i of [...visited]) {
                for (let j = 0; j < platforms.length; j++) {
                    if (visited.has(j)) continue;
                    const a = platforms[i], b = platforms[j];
                    const rise = a.y - b.y;
                    if (rise > 152) continue;
                    const time = (760 + Math.sqrt(760 ** 2 - 3800 * rise)) / 1900;
                    const gap = Math.max(0, b.x - a.x - a.width, a.x - b.x - b.width);
                    if (gap < 360 * time + 42) { visited.add(j); changed = true; }
                }
            }
        }
        assert.equal(visited.size, platforms.length, level.name);
    }
    for (let i = 0; i < LEVEL_COUNT; i++) assertConnected(getLevel(i));
    for (let seed = 0; seed < 500; seed++) assertConnected(generateProceduralLevel(seed));
});

test('Enter in the between-level shop purchases without skipping the stage', async () => {
    const { openShop, isShopOpen, closeShop } = await import('../js/shopSystem.js');
    startAt(0); completeLevel(); openShop('between');
    press('Enter');
    assert.equal(state.currentLevelIndex, 0);
    assert.equal(state.gameState, 'levelComplete');
    assert.equal(isShopOpen(), true);
    closeShop();
});

test('shadow enemies cannot cause contact damage outside shadow mode', () => {
    startAt(8);
    const enemy = state.currentLevel.enemies.find(e => e.shadowOnly);
    state.player.x = enemy.x;
    state.player.y = enemy.y;
    state.camera.x = enemy.x - 300;
    state.player.energy = 100;
    state.player.shadowShift = false;
    updateEnemies(0);
    assert.equal(state.player.energy, 100);
    state.player.shadowShift = true;
    updateEnemies(0);
    assert.ok(state.player.energy < 100);
});
