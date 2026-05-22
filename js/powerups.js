import {
    getRandomWeaponId,
    getWeaponPickupColor,
    getWeaponPickupLabel,
    isValidWeaponId,
} from './weapons.js';

export const floatingItems = [];

export const POWERUP_TYPES = {
    GEM: 'gem',
    LIFE: 'life',
    ENERGY: 'energy',
    WEAPON: 'weapon',
};

export function resolveReward(reward, randomPool = null) {
    if (reward !== 'random') {
        return reward;
    }

    const pool = Array.isArray(randomPool) && randomPool.length
        ? randomPool
        : [
            POWERUP_TYPES.GEM,
            POWERUP_TYPES.GEM,
            POWERUP_TYPES.GEM,
            POWERUP_TYPES.ENERGY,
            POWERUP_TYPES.WEAPON,
            POWERUP_TYPES.LIFE,
        ];

    return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnFloatingItem(x, y, type, options = {}) {
    const weaponId = type === POWERUP_TYPES.WEAPON
        ? resolveWeaponId(options.weaponId)
        : null;

    floatingItems.push({
        x,
        y,
        startY: y,
        width: 28,
        height: 28,
        type,
        weaponId,
        vy: -90,
        life: 0.35,
        active: true,
    });
}

function resolveWeaponId(weaponId) {
    if (isValidWeaponId(weaponId)) {
        return weaponId;
    }

    return getRandomWeaponId();
}

export function updateFloatingItems(dt) {
    for (const item of floatingItems) {
        if (!item.active) continue;

        if (item.life > 0) {
            item.y += item.vy * dt;
            item.life -= dt;
        } else {
            item.y = item.startY - 32 + Math.sin(Date.now() * 0.006) * 4;
        }
    }
}

export function drawFloatingItems(ctx, camera) {
    for (const item of floatingItems) {
        if (!item.active) continue;

        const x = item.x - camera.x;
        const y = item.y - camera.y;

        ctx.save();

        const color = getPowerupColor(item);

        ctx.shadowColor = color;
        ctx.shadowBlur = 18;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, item.width, item.height);

        ctx.fillStyle = '#050510';
        ctx.font = '900 18px monospace';
        ctx.textAlign = 'center';

        ctx.fillText(getPowerupLabel(item), x + item.width / 2, y + 21);

        ctx.restore();
    }
}

export function getPowerupColor(itemOrType) {
    const type = typeof itemOrType === 'string' ? itemOrType : itemOrType.type;

    if (type === POWERUP_TYPES.LIFE) return '#22c55e';
    if (type === POWERUP_TYPES.ENERGY) return '#21e6ff';

    if (type === POWERUP_TYPES.WEAPON) {
        const weaponId = typeof itemOrType === 'string' ? null : itemOrType.weaponId;
        return getWeaponPickupColor(weaponId);
    }

    return '#ff2bd6';
}

export function getPowerupLabel(itemOrType) {
    const type = typeof itemOrType === 'string' ? itemOrType : itemOrType.type;

    if (type === POWERUP_TYPES.LIFE) return '+';
    if (type === POWERUP_TYPES.ENERGY) return 'E';

    if (type === POWERUP_TYPES.WEAPON) {
        const weaponId = typeof itemOrType === 'string' ? null : itemOrType.weaponId;
        return getWeaponPickupLabel(weaponId);
    }

    return '♦';
}