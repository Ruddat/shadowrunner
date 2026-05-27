export const CONFIG = {
    width: 960,
    height: 540,

    gravity: 1900,
    moveSpeed: 360,
    jumpForce: 760,

    // Wall-Jump / Wall-Slide
    wallSlideGravity: 280,      // much slower fall when sliding
    wallJumpForceX: 520,        // horizontal push away from wall
    wallJumpForceY: 720,        // vertical boost (slightly less than normal jump)
    wallSlideThreshold: 80,     // min fall speed before slide activates

    worldWidth: 5200,
    groundY: 460,
};