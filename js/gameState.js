/**
 * gameState.js - SINGLE SOURCE OF TRUTH for shared game state.
 * All modules import from here instead of using window globals.
 */

export const state = {
    currentLevelIndex: 0,
    currentLevel: null,       // set during init
    player: null,             // set during init
    camera: null,             // set during init
    projectiles: [],
    bossProjectiles: [],
    enemyProjectiles: [],
    gameState: 'intro',
    levelStats: null,
    gameOverStats: null,
    gameOverTimer: 0,
    gameOverSparks: [],
    messageTimer: 0,
    messageDuration: 0,
    centerMessage: '',
    centerMessageY: 0,
    centerMessageVelocityY: 0,
    centerMessageAlpha: 1,
    centerMessageBurstDone: false,
    weaponHudPulse: 0,
    introTime: 0,
    lastTime: 0,
    levelBackground: new Image(),
    hudTopImage: null,
    hudBottomImage: null,
    ctx: null,                // set during init
    pendingLevelComplete: null, // replaces setTimeout for level transitions

    // Checkpoint system
    checkpoint: null,         // { x, y } last checkpoint position
    checkpointGems: 0,       // gems collected at checkpoint time
    checkpointKeys: 0,       // keys at checkpoint time

    // Pause state
    paused: false,
    pausePreviousState: null, // game state before pause

    // Hacking minigame state
    hackingState: null,

    // Shop state
    shopOpen: false,
};
