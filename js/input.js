/**
 * input.js - Keyboard + Gamepad input system
 * Maps both keyboard and Gamepad API to a unified `keys` state object.
 * Gamepad is polled every frame via `pollGamepads()`.
 * Supports customizable gamepad button mappings.
 */

export const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false,
    shadow: false,
    dash: false,
    interact: false,
    pause: false,
};

// --- "Just pressed" edge detection for menu navigation ---
const prevKeys = { ...keys };

export function justPressed(action) {
    return keys[action] && !prevKeys[action];
}

export function saveKeySnapshot() {
    for (const k in keys) prevKeys[k] = keys[k];
}

// --- Keyboard ---

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; keys.jump = true; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
    if (e.code === 'Space') keys.jump = true;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = true;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = true;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') keys.interact = true;
    if (e.code === 'Escape' || e.code === 'KeyP') keys.pause = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = false; keys.jump = false; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
    if (e.code === 'Space') keys.jump = false;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = false;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = false;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = false;
    if (e.code === 'KeyE' || e.code === 'KeyF') keys.interact = false;
    if (e.code === 'Escape' || e.code === 'KeyP') keys.pause = false;
});

// --- Gamepad ---

let gamepadConnected = false;
let lastGamepadIndex = -1;
let gamepadId = '';

window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    lastGamepadIndex = e.gamepad.index;
    gamepadId = e.gamepad.id;
    console.log(`[Gamepad] Connected: ${e.gamepad.id} (index ${e.gamepad.index})`);
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index === lastGamepadIndex) {
        gamepadConnected = false;
        lastGamepadIndex = -1;
        gamepadId = '';
    }
    console.log(`[Gamepad] Disconnected: ${e.gamepad.id}`);
});

export function isGamepadConnected() {
    return gamepadConnected;
}

export function getGamepadId() {
    return gamepadId;
}

// --- Customizable Gamepad Bindings ---

const DEFAULT_GP_BINDINGS = {
    jump: [0],          // A/Cross
    shoot: [2, 7],      // X/Square + RT
    shadow: [3, 4],     // Y/Triangle + LB
    dash: [1, 5],       // B/Circle + RB
    interact: [0],      // A/Cross (same as jump)
    pause: [9],         // Start
};

// Current bindings (loaded from localStorage or defaults)
let gpBindings = JSON.parse(JSON.stringify(DEFAULT_GP_BINDINGS));

// Button index → readable name mapping (standard gamepad layout)
const BUTTON_NAMES = [
    'A / Cross', 'B / Circle', 'X / Square', 'Y / Triangle',
    'LB', 'RB', 'LT', 'RT',
    'Back / Select', 'Start', 'L3', 'R3',
    'D-Pad Up', 'D-Pad Down', 'D-Pad Left', 'D-Pad Right',
    'Home / Guide',
];

export function getGamepadButtonName(btnIndex) {
    return BUTTON_NAMES[btnIndex] || `Button ${btnIndex}`;
}

export function getGamepadBindings() {
    return gpBindings;
}

export function setGamepadBinding(action, buttonIndices) {
    gpBindings[action] = buttonIndices;
    persistGamepadBindings();
}

export function resetGamepadBindings() {
    gpBindings = JSON.parse(JSON.stringify(DEFAULT_GP_BINDINGS));
    persistGamepadBindings();
}

export function getDefaultBindings() {
    return DEFAULT_GP_BINDINGS;
}

function persistGamepadBindings() {
    try {
        localStorage.setItem('shadowrunner_gp_bindings', JSON.stringify(gpBindings));
    } catch (_) {}
}

function loadGamepadBindings() {
    try {
        const saved = JSON.parse(localStorage.getItem('shadowrunner_gp_bindings') || '{}');
        if (saved.jump) gpBindings = saved;
    } catch (_) {}
}

// Load on init
loadGamepadBindings();

const AXIS_DEADZONE = 0.25;

// Track which keys are currently held by keyboard, so gamepad
// doesn't falsely reset them when the gamepad is at rest.
const keyboardHeld = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false,
    shadow: false,
    dash: false,
    interact: false,
    pause: false,
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyboardHeld.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyboardHeld.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keyboardHeld.up = true; keyboardHeld.jump = true; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keyboardHeld.down = true;
    if (e.code === 'Space') keyboardHeld.jump = true;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keyboardHeld.shoot = true;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keyboardHeld.shadow = true;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keyboardHeld.dash = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') keyboardHeld.interact = true;
    if (e.code === 'Escape' || e.code === 'KeyP') keyboardHeld.pause = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyboardHeld.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyboardHeld.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keyboardHeld.up = false; keyboardHeld.jump = false; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keyboardHeld.down = false;
    if (e.code === 'Space') keyboardHeld.jump = false;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keyboardHeld.shoot = false;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keyboardHeld.shadow = false;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keyboardHeld.dash = false;
    if (e.code === 'KeyE' || e.code === 'KeyF') keyboardHeld.interact = false;
    if (e.code === 'Escape' || e.code === 'KeyP') keyboardHeld.pause = false;
});

export function pollGamepads() {
    // Proactively scan for gamepads
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    // Auto-detect: if we don't know about a gamepad yet, find one
    if (!gamepadConnected) {
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                gamepadConnected = true;
                lastGamepadIndex = i;
                gamepadId = gamepads[i].id;
                console.log(`[Gamepad] Auto-detected: ${gamepads[i].id} (index ${i})`);
                break;
            }
        }
    }

    if (!gamepadConnected) return;

    const gp = gamepads[lastGamepadIndex];
    if (!gp) {
        gamepadConnected = false;
        lastGamepadIndex = -1;
        gamepadId = '';
        return;
    }

    // Left stick axes
    const axisX = gp.axes[0] ?? 0;
    const axisY = gp.axes[1] ?? 0;

    // D-Pad
    const dpadLeft = gp.buttons[14]?.pressed ?? false;
    const dpadRight = gp.buttons[15]?.pressed ?? false;
    const dpadUp = gp.buttons[12]?.pressed ?? false;
    const dpadDown = gp.buttons[13]?.pressed ?? false;

    // Gamepad contributions from custom bindings
    const gpLeft = axisX < -AXIS_DEADZONE || dpadLeft;
    const gpRight = axisX > AXIS_DEADZONE || dpadRight;
    const gpUp = axisY < -AXIS_DEADZONE || dpadUp;
    const gpDown = axisY > AXIS_DEADZONE || dpadDown;

    // Check custom button bindings for each action
    const gpJump = checkButtons(gp, gpBindings.jump) || gpUp;
    const gpShoot = checkButtons(gp, gpBindings.shoot);
    const gpShadow = checkButtons(gp, gpBindings.shadow);
    const gpDash = checkButtons(gp, gpBindings.dash);
    const gpInteract = checkButtons(gp, gpBindings.interact) || gpJump;
    const gpPause = checkButtons(gp, gpBindings.pause);

    // Merge: key is true if EITHER keyboard or gamepad says so
    keys.left = keyboardHeld.left || gpLeft;
    keys.right = keyboardHeld.right || gpRight;
    keys.up = keyboardHeld.up || gpUp;
    keys.down = keyboardHeld.down || gpDown;
    keys.jump = keyboardHeld.jump || gpJump;
    keys.shoot = keyboardHeld.shoot || gpShoot;
    keys.shadow = keyboardHeld.shadow || gpShadow;
    keys.dash = keyboardHeld.dash || gpDash;
    keys.interact = keyboardHeld.interact || gpInteract;
    keys.pause = keyboardHeld.pause || gpPause;
}

function checkButtons(gp, buttonIndices) {
    if (!buttonIndices) return false;
    for (const idx of buttonIndices) {
        if (gp.buttons[idx]?.pressed) return true;
    }
    return false;
}

/**
 * Get the first pressed gamepad button index (for binding configuration).
 * Returns -1 if no button is pressed.
 */
export function getPressedGamepadButton() {
    if (!gamepadConnected) return -1;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return -1;
    const gp = gamepads[lastGamepadIndex];
    if (!gp) return -1;

    for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i]?.pressed) return i;
    }
    return -1;
}

/**
 * Get gamepad-specific menu navigation actions.
 * Returns 'up', 'down', 'left', 'right', 'confirm', 'back', or null.
 * Uses edge detection (just pressed) for menu navigation.
 */
let prevButtons = {};

export function getGamepadMenuAction() {
    if (!gamepadConnected) return null;

    const gamepads = navigator.getGamepads();
    if (!gamepads) return null;

    const gp = gamepads[lastGamepadIndex];
    if (!gp) return null;

    // D-pad up/down/left/right (edge detection)
    const upPressed = gp.buttons[12]?.pressed || false;
    const downPressed = gp.buttons[13]?.pressed || false;
    const leftPressed = gp.buttons[14]?.pressed || false;
    const rightPressed = gp.buttons[15]?.pressed || false;
    const leftStickY = gp.axes[1] ?? 0;
    const leftStickX = gp.axes[0] ?? 0;
    const stickUp = leftStickY < -AXIS_DEADZONE;
    const stickDown = leftStickY > AXIS_DEADZONE;
    const stickLeft = leftStickX < -AXIS_DEADZONE;
    const stickRight = leftStickX > AXIS_DEADZONE;

    if ((upPressed || stickUp) && !prevButtons.up) return 'up';
    if ((downPressed || stickDown) && !prevButtons.down) return 'down';
    if ((leftPressed || stickLeft) && !prevButtons.left) return 'left';
    if ((rightPressed || stickRight) && !prevButtons.right) return 'right';

    // A/Cross = confirm (edge)
    const confirmPressed = gp.buttons[0]?.pressed || false;
    if (confirmPressed && !prevButtons.confirm) return 'confirm';

    // Start = confirm too
    const startPressed = gp.buttons[9]?.pressed || false;
    if (startPressed && !prevButtons.start) return 'confirm';

    // B/Circle = back
    const backPressed = gp.buttons[1]?.pressed || false;
    if (backPressed && !prevButtons.back) return 'back';

    // Save state for next frame
    prevButtons = {
        up: upPressed || stickUp,
        down: downPressed || stickDown,
        left: leftPressed || stickLeft,
        right: leftPressed || stickRight,
        confirm: confirmPressed,
        start: startPressed,
        back: backPressed,
    };

    return null;
}
