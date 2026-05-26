export const keys = {
    left: false,
    right: false,
    jump: false,
    shoot: false,
    shadow: false,
    dash: false,
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = true;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = true;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = true;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = false;
    if (e.code === 'KeyJ' || e.code === 'ControlLeft') keys.shoot = false;
    if (e.code === 'KeyK' || e.code === 'ShiftLeft') keys.shadow = false;
    if (e.code === 'KeyL' || e.code === 'ShiftRight') keys.dash = false;
});