export const level4Boss = {
    name: 'Factory Guardian',
    mode: 'boss',
    music: 'level4',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level3-bg.png',

    platforms: [
        // Main arena floor
        { x: 0, y: 402, width: 1200, height: 40 },

        // Left safe/risk platform
        { x: 210, y: 312, width: 190, height: 28 },

        // Middle tactical platform
        { x: 500, y: 252, width: 170, height: 28 },

        // Right pressure platform near boss
        { x: 770, y: 312, width: 190, height: 28 },

        // Small escape ledge
        { x: 1010, y: 252, width: 120, height: 26 },
    ],

    gems: [
        { x: 260, y: 248, collected: false },
        { x: 335, y: 248, collected: false },

        { x: 545, y: 188, collected: false },
        { x: 615, y: 188, collected: false },

        { x: 825, y: 248, collected: false },
        { x: 900, y: 248, collected: false },
    ],

    bonusBlocks: [
        {
            x: 250,
            y: 258,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
        {
            x: 560,
            y: 198,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'laser',
        },
        {
            x: 840,
            y: 258,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
        {
            x: 1045,
            y: 198,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'plasma',
        },
    ],

    enemies: [],

    boss: {
        x: 835,
        y: 282,
        width: 112,
        height: 120,

        health: 52,
        maxHealth: 52,

        direction: -1,
        speed: 88,
        baseSpeed: 88,
        minX: 680,
        maxX: 1085,

        active: true,
        shootTimer: 1.0,
        phase: 1,

        contactDamage: 45,

        // Boss wird härter, wenn Spieler rechts Druck macht / Richtung Exit kommt.
        endPressureX: 780,
        endPressurePattern: 'aimedBurst',
        endPressureMinShootDelay: 0.32,

        config: {
            phases: [
                {
                    id: 1,
                    hpBelow: 1.0,

                    speed: 88,
                    shootDelay: 1.05,
                    projectileSpeed: 355,
                    damage: 26,

                    pattern: 'single',
                    projectileWidth: 28,
                    projectileHeight: 12,
                    projectileColor: '#ff003c',
                    projectileGlow: '#ff003c',

                    fireY: 58,
                    contactDamage: 45,
                    trackPlayer: false,

                    color: '#ff003c',
                    message: 'GUARDIAN ONLINE',
                },

                {
                    id: 2,
                    hpBelow: 0.62,

                    speed: 132,
                    shootDelay: 0.68,
                    projectileSpeed: 430,
                    damage: 34,

                    pattern: 'double',
                    projectileWidth: 30,
                    projectileHeight: 12,
                    projectileColor: '#facc15',
                    projectileGlow: '#facc15',

                    fireY: 58,
                    contactDamage: 52,
                    trackPlayer: true,

                    color: '#facc15',
                    message: 'PHASE 2 - OVERDRIVE',
                },

                {
                    id: 3,
                    hpBelow: 0.28,

                    speed: 172,
                    shootDelay: 0.44,
                    projectileSpeed: 505,
                    damage: 42,

                    pattern: 'aimedBurst',
                    projectileWidth: 32,
                    projectileHeight: 14,
                    projectileColor: '#fb7185',
                    projectileGlow: '#fb7185',

                    fireY: 56,
                    contactDamage: 62,
                    trackPlayer: true,

                    color: '#fb7185',
                    message: 'ENRAGE MODE',
                },

                {
                    id: 4,
                    hpBelow: 0.12,

                    speed: 205,
                    shootDelay: 0.34,
                    projectileSpeed: 560,
                    damage: 48,

                    pattern: 'burst',
                    projectileWidth: 34,
                    projectileHeight: 14,
                    projectileColor: '#ffffff',
                    projectileGlow: '#ff003c',

                    fireY: 56,
                    contactDamage: 70,
                    trackPlayer: true,

                    color: '#ffffff',
                    message: 'FINAL WARNING',
                },
            ],
        },
    },

    fx: {
        stars: false,
        fog: true,
        rain: true,
        scanlines: true,
        neonDust: true,
        sparks: true,
        warningLights: true,
    },

    exit: {
        x: 1090,
        y: 302,
        width: 70,
        height: 100,
        locked: true,
    },
};