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