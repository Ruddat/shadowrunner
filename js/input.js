/**
 * input.js - Keyboard + Gamepad input system
 * Maps both keyboard and Gamepad API to a unified `keys` state object.
 * Gamepad is polled every frame via `pollGamepads()`.
 */

export const keys = {
    left: false,
    right: false,
    jump: false,
    shoot: false,
    shadow: false,
    dash: false,
    interact: false,
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
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = true;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = true;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = true;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') keys.interact = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = false;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = false;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = false;
    if (e.code === 'KeyE' || e.code === 'KeyF') keys.interact = false;
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

/**
 * Poll all connected gamepads and map buttons/axes to the `keys` object.
 * Should be called once per frame (from the game loop).
 *
 * IMPORTANT: We proactively scan navigator.getGamepads() every frame,
 * because the 'gamepadconnected' event is unreliable in many browsers
 * (Chrome/Edge only fire it after user presses a button on the controller).
 *
 * Standard mapping (Xbox/PS layout):
 *   Axes:   0 = Left Stick X, 1 = Left Stick Y
 *   Buttons: 0=A/Cross, 1=B/Circle, 2=X/Square, 3=Y/Triangle
 *            4=LB, 5=RB, 6=LT, 7=RT
 *            8=Back/Select, 9=Start, 10=L3, 11=R3
 *            12=DpadUp, 13=DpadDown, 14=DpadLeft, 15=DpadRight
 *            16=Home/Guide
 *
 * Mapping:
 *   Move:    Left Stick / DPad
 *   Jump:    A / Cross (btn 0)
 *   Shoot:   X / Square (btn 2) or RT (btn 7)
 *   Shadow:  Y / Triangle (btn 3) or LB (btn 4)
 *   Dash:    B / Circle (btn 1) or RB (btn 5)
 *   Interact:A / Cross (btn 0) — same as jump, context-sensitive
 *   Menu:    Start (btn 9) = pause
 */
const AXIS_DEADZONE = 0.25;

// Track which keys are currently held by keyboard, so gamepad
// doesn't falsely reset them when the gamepad is at rest.
const keyboardHeld = {
    left: false,
    right: false,
    jump: false,
    shoot: false,
    shadow: false,
    dash: false,
    interact: false,
};

// Patch keyboard listeners to track held state
const origKeydown = window.onkeydown;
const origKeyup = window.onkeyup;

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyboardHeld.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyboardHeld.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keyboardHeld.jump = true;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keyboardHeld.shoot = true;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keyboardHeld.shadow = true;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keyboardHeld.dash = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') keyboardHeld.interact = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyboardHeld.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyboardHeld.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keyboardHeld.jump = false;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keyboardHeld.shoot = false;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keyboardHeld.shadow = false;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keyboardHeld.dash = false;
    if (e.code === 'KeyE' || e.code === 'KeyF') keyboardHeld.interact = false;
});

export function pollGamepads() {
    // Proactively scan for gamepads — don't rely solely on the event
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
        // Gamepad gone (disconnected without event)
        gamepadConnected = false;
        lastGamepadIndex = -1;
        gamepadId = '';
        return;
    }

    // Left stick X-axis → left/right
    const axisX = gp.axes[0] ?? 0;
    const axisY = gp.axes[1] ?? 0;

    // Gamepad contribution: only set true if gamepad input is active,
    // never overwrite a keyboard-held key with false
    const gpLeft = axisX < -AXIS_DEADZONE || (gp.buttons[14]?.pressed ?? false);
    const gpRight = axisX > AXIS_DEADZONE || (gp.buttons[15]?.pressed ?? false);
    const gpJump = gp.buttons[0]?.pressed ?? false;
    const gpShoot = (gp.buttons[2]?.pressed ?? false) || (gp.buttons[7]?.pressed ?? false);
    const gpShadow = (gp.buttons[3]?.pressed ?? false) || (gp.buttons[4]?.pressed ?? false);
    const gpDash = (gp.buttons[1]?.pressed ?? false) || (gp.buttons[5]?.pressed ?? false);
    const gpInteract = gp.buttons[0]?.pressed ?? false;

    // Merge: key is true if EITHER keyboard or gamepad says so
    keys.left = keyboardHeld.left || gpLeft;
    keys.right = keyboardHeld.right || gpRight;
    keys.jump = keyboardHeld.jump || gpJump;
    keys.shoot = keyboardHeld.shoot || gpShoot;
    keys.shadow = keyboardHeld.shadow || gpShadow;
    keys.dash = keyboardHeld.dash || gpDash;
    keys.interact = keyboardHeld.interact || gpInteract;
}

/**
 * Get gamepad-specific menu navigation actions.
 * Returns 'up', 'down', 'confirm', 'back', or null.
 * Uses edge detection (just pressed) for menu navigation.
 */
let prevButtons = {};

export function getGamepadMenuAction() {
    if (!gamepadConnected) return null;

    const gamepads = navigator.getGamepads();
    if (!gamepads) return null;

    const gp = gamepads[lastGamepadIndex];
    if (!gp) return null;

    const action = null;

    // D-pad up/down (edge detection)
    const upPressed = gp.buttons[12]?.pressed || false;
    const downPressed = gp.buttons[13]?.pressed || false;
    const leftStickY = gp.axes[1] ?? 0;
    const stickUp = leftStickY < -AXIS_DEADZONE;
    const stickDown = leftStickY > AXIS_DEADZONE;

    if ((upPressed || stickUp) && !prevButtons.up) return 'up';
    if ((downPressed || stickDown) && !prevButtons.down) return 'down';

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
        confirm: confirmPressed,
        start: startPressed,
        back: backPressed,
    };

    return action;
}
