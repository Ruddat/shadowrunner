export function rectsOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export function resolvePlatformCollision(player, platforms) {
    player.onGround = false;

    for (const platform of platforms) {
        if (!rectsOverlap(player, platform)) continue;

        const previousBottom = player.prevY + player.height;
        const currentBottom = player.y + player.height;

        if (
            player.velocityY >= 0 &&
            previousBottom <= platform.y &&
            currentBottom >= platform.y
        ) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
        }
    }
}

/**
 * Detect if the player is touching a wall on either side.
 * Returns { left: bool, right: bool, wallTouching: 'left'|'right'|null }
 * A "wall" is any platform where the player's side overlaps
 * but they are NOT standing on top of it.
 */
export function detectWallContact(player, platforms) {
    let touchingLeft = false;
    let touchingRight = false;

    const margin = 4; // how close to wall to trigger slide

    for (const platform of platforms) {
        // Skip if player is above or below platform
        if (player.y + player.height <= platform.y + margin) continue;
        if (player.y >= platform.y + platform.height - margin) continue;

        // Check LEFT wall: player's left side touches platform's right side
        const playerLeft = player.x;
        const platformRight = platform.x + platform.width;

        if (
            playerLeft <= platformRight &&
            playerLeft >= platformRight - margin &&
            player.velocityX <= 0
        ) {
            touchingLeft = true;
        }

        // Check RIGHT wall: player's right side touches platform's left side
        const playerRight = player.x + player.width;
        const platformLeft = platform.x;

        if (
            playerRight >= platformLeft &&
            playerRight <= platformLeft + margin &&
            player.velocityX >= 0
        ) {
            touchingRight = true;
        }
    }

    return {
        left: touchingLeft,
        right: touchingRight,
        wallSide: touchingLeft ? 'left' : (touchingRight ? 'right' : null),
    };
}

/**
 * Raycast: check if a line from (x1,y1) to (x2,y2) is blocked by any platform.
 * Uses DDA-style stepping along the line.
 * Returns true if the line of sight is CLEAR (no platform blocks it).
 */
export function raycastClear(x1, y1, x2, y2, platforms) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return true;

    const steps = Math.ceil(distance / 8); // 8px step size
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i < steps; i++) {
        const px = x1 + stepX * i;
        const py = y1 + stepY * i;

        for (const platform of platforms) {
            if (
                px >= platform.x &&
                px <= platform.x + platform.width &&
                py >= platform.y &&
                py <= platform.y + platform.height
            ) {
                return false; // Blocked by platform
            }
        }
    }

    return true; // Clear line of sight
}
