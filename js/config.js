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

    // Shadow Shift bonuses
    shadowSpeedMultiplier: 1.08,    // +8% speed in shadow mode
    shadowDamageReduction: 0.25,    // 25% less damage in shadow mode
    shadowShootRateMultiplier: 0.85, // 15% faster shoot rate in shadow mode

    // Shadow Dash
    shadowDashSpeed: 880,           // horizontal dash speed
    shadowDashCost: 18,             // energy cost
    shadowDashCooldownTime: 0.65,   // cooldown in seconds
    shadowDashAttackDamage: 2,      // damage dealt to enemies during dash

    // Contact damage
    defaultContactDamage: 30,       // default enemy contact damage

    // Collision
    wallContactMargin: 4,           // margin for wall contact detection

    // Viewport culling
    viewportMargin: 200,            // extra pixels beyond viewport for updating enemies

    // Debug
    debugWeaponSwitch: true,        // enable/disable debug weapon switching (1-6 keys)
};
