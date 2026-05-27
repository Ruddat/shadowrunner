export const level9Boss = {
    name: 'Overlord Core',
    mode: 'boss',
    music: 'level4',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level3-bg.png',

    platforms: [
        // Main arena floor - wider than first boss
        { x: 0, y: 402, width: 1400, height: 40 },

        // Left tactical platform
        { x: 160, y: 312, width: 180, height: 28 },

        // Left high platform
        { x: 380, y: 242, width: 140, height: 26 },

        // Center elevated platform
        { x: 600, y: 282, width: 160, height: 28 },

        // Right high platform
        { x: 840, y: 232, width: 140, height: 26 },

        // Right tactical platform
        { x: 1060, y: 312, width: 180, height: 28 },

        // Small center peak
        { x: 660, y: 172, width: 100, height: 24 },
    ],

    gems: [
        { x: 200, y: 248, collected: false },
        { x: 290, y: 248, collected: false },

        { x: 420, y: 178, collected: false },
        { x: 490, y: 178, collected: false },

        { x: 640, y: 218, collected: false },
        { x: 710, y: 218, collected: false },

        { x: 880, y: 168, collected: false },
        { x: 950, y: 168, collected: false },

        { x: 1120, y: 248, collected: false },
        { x: 1190, y: 248, collected: false },
    ],

    bonusBlocks: [
        {
            x: 200,
            y: 258,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
        {
            x: 440,
            y: 178,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'laser',
        },
        {
            x: 880,
            y: 168,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
        {
            x: 1120,
            y: 258,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'plasma',
        },
        {
            x: 680,
            y: 108,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'life',
        },
    ],

    enemies: [],

    boss: {
        x: 900,
        y: 242,
        width: 130,
        height: 140,

        health: 72,
        maxHealth: 72,

        direction: -1,
        speed: 95,
        baseSpeed: 95,
        minX: 700,
        maxX: 1260,

        active: true,
        shootTimer: 0.8,
        phase: 1,

        contactDamage: 50,

        // The Overlord summons minions during the fight
        endPressureX: 900,
        endPressurePattern: 'spiralBurst',
        endPressureMinShootDelay: 0.28,

        config: {
            phases: [
                {
                    id: 1,
                    hpBelow: 1.0,

                    speed: 95,
                    shootDelay: 0.95,
                    projectileSpeed: 380,
                    damage: 28,

                    pattern: 'double',
                    projectileWidth: 26,
                    projectileHeight: 12,
                    projectileColor: '#7c3aed',
                    projectileGlow: '#7c3aed',

                    fireY: 65,
                    contactDamage: 50,
                    trackPlayer: true,

                    color: '#7c3aed',
                    message: 'OVERLORD CORE ONLINE',
                },

                {
                    id: 2,
                    hpBelow: 0.65,

                    speed: 140,
                    shootDelay: 0.62,
                    projectileSpeed: 450,
                    damage: 36,

                    pattern: 'aimedBurst',
                    projectileWidth: 30,
                    projectileHeight: 12,
                    projectileColor: '#facc15',
                    projectileGlow: '#facc15',

                    fireY: 62,
                    contactDamage: 58,
                    trackPlayer: true,

                    color: '#facc15',
                    message: 'PHASE 2 - PROTOCOL OVERRIDE',
                },

                {
                    id: 3,
                    hpBelow: 0.35,

                    speed: 185,
                    shootDelay: 0.42,
                    projectileSpeed: 520,
                    damage: 44,

                    pattern: 'burst',
                    projectileWidth: 32,
                    projectileHeight: 14,
                    projectileColor: '#ff2bd6',
                    projectileGlow: '#ff2bd6',

                    fireY: 60,
                    contactDamage: 68,
                    trackPlayer: true,

                    color: '#ff2bd6',
                    message: 'CORE UNSTABLE - ENRAGE',
                },

                {
                    id: 4,
                    hpBelow: 0.12,

                    speed: 220,
                    shootDelay: 0.30,
                    projectileSpeed: 580,
                    damage: 52,

                    pattern: 'spiralBurst',
                    projectileWidth: 34,
                    projectileHeight: 14,
                    projectileColor: '#ffffff',
                    projectileGlow: '#ff2bd6',

                    fireY: 58,
                    contactDamage: 78,
                    trackPlayer: true,

                    color: '#ffffff',
                    message: 'FINAL OVERLOAD',
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
        x: 1290,
        y: 302,
        width: 70,
        height: 100,
        locked: true,
    },
};
