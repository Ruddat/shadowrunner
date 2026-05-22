export const WEAPON_IDS = {
    BLASTER: 'blaster',
    SPREAD: 'spread',
    LASER: 'laser',
    WAVE: 'wave',
    BOUNCE: 'bounce',
};

export const WEAPONS = {
    [WEAPON_IDS.BLASTER]: {
        id: WEAPON_IDS.BLASTER,
        name: 'BASIC BLASTER',
        shortName: 'BLASTER',
        damage: 1,
        fireRate: 0.24,
        projectileSpeed: 720,
        bullets: 1,
        spread: 0,
        width: 22,
        height: 8,
        color: '#21e6ff',
        glow: '#21e6ff',
    },

    [WEAPON_IDS.SPREAD]: {
        id: WEAPON_IDS.SPREAD,
        name: 'SPREAD SHOT',
        shortName: 'SPREAD',
        damage: 1,
        fireRate: 0.28,
        projectileSpeed: 650,
        bullets: 3,
        spread: 0.28,
        width: 18,
        height: 7,
        color: '#ff2bd6',
        glow: '#ff2bd6',
    },

    [WEAPON_IDS.LASER]: {
        id: WEAPON_IDS.LASER,
        name: 'NEON LASER',
        shortName: 'LASER',
        damage: 2,
        fireRate: 0.18,
        projectileSpeed: 900,
        bullets: 1,
        spread: 0,
        width: 44,
        height: 5,
        color: '#facc15',
        glow: '#facc15',
        pierce: true,
    },

    [WEAPON_IDS.WAVE]: {
        id: WEAPON_IDS.WAVE,
        name: 'WAVE BEAM',
        shortName: 'WAVE',
        damage: 1,
        fireRate: 0.16,
        projectileSpeed: 700,
        bullets: 1,
        spread: 0,
        width: 24,
        height: 12,
        color: '#a855f7',
        glow: '#a855f7',
        wave: true,
        waveStrength: 90,
        waveSpeed: 18,
    },

    [WEAPON_IDS.BOUNCE]: {
        id: WEAPON_IDS.BOUNCE,
        name: 'BOUNCE SHOT',
        shortName: 'BOUNCE',
        damage: 1,
        fireRate: 0.22,
        projectileSpeed: 620,
        bullets: 1,
        spread: 0,
        width: 18,
        height: 18,
        color: '#22c55e',
        glow: '#22c55e',
        bounces: 3,
    },
};

export const WEAPON_PICKUP_POOL = [
    WEAPON_IDS.SPREAD,
    WEAPON_IDS.LASER,
    WEAPON_IDS.WAVE,
    WEAPON_IDS.BOUNCE,
];

export function getWeapon(weaponId) {
    return WEAPONS[weaponId] ?? WEAPONS[WEAPON_IDS.BLASTER];
}

export function isValidWeaponId(weaponId) {
    return Boolean(WEAPONS[weaponId]);
}

export function getRandomWeaponId() {
    return WEAPON_PICKUP_POOL[Math.floor(Math.random() * WEAPON_PICKUP_POOL.length)];
}

export function getWeaponStats(weaponId, weaponLevel = 1) {
    const base = getWeapon(weaponId);
    const level = Math.max(1, Math.min(weaponLevel, 3));
    const stats = { ...base };

    stats.damage = base.damage + (level >= 3 ? 1 : 0);
    stats.projectileSpeed = base.projectileSpeed + (level - 1) * 45;
    stats.fireRate = Math.max(0.09, base.fireRate - (level - 1) * 0.025);
    stats.width = base.width + (level - 1) * 5;
    stats.height = base.height + (level >= 3 ? 3 : 0);

    if (weaponId === WEAPON_IDS.SPREAD) {
        stats.bullets = level === 1 ? 3 : level === 2 ? 5 : 7;
        stats.spread = level === 1 ? 0.28 : level === 2 ? 0.22 : 0.18;
        stats.damage = 1;
    }

    if (weaponId === WEAPON_IDS.LASER) {
        stats.damage = level === 1 ? 2 : level === 2 ? 3 : 4;
        stats.width = level === 1 ? 44 : level === 2 ? 58 : 74;
        stats.height = level === 1 ? 5 : level === 2 ? 7 : 9;
        stats.pierce = true;
    }

    if (weaponId === WEAPON_IDS.WAVE) {
        stats.damage = level >= 3 ? 2 : 1;
        stats.waveStrength = base.waveStrength + (level - 1) * 28;
        stats.width = base.width + (level - 1) * 6;
    }

    if (weaponId === WEAPON_IDS.BOUNCE) {
        stats.damage = level >= 3 ? 2 : 1;
        stats.bounces = base.bounces + (level - 1);
    }

    return stats;
}

export function getWeaponDisplayName(weaponId, weaponLevel = 1) {
    const weapon = getWeapon(weaponId);
    return `${weapon.name} LV${Math.max(1, Math.min(weaponLevel, 3))}`;
}

export function getWeaponPickupLabel(weaponId) {
    const weapon = getWeapon(weaponId);
    return weapon.shortName.slice(0, 1);
}

export function getWeaponPickupColor(weaponId) {
    return getWeapon(weaponId).color;
}