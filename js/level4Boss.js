export const level4Boss = {
    name: 'Factory Guardian',
    mode: 'boss',
    music: 'level4',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level3-bg.png',

    platforms: [
        { x: 0, y: 402, width: 1200, height: 40 },
        { x: 260, y: 302, width: 180, height: 28 },
        { x: 720, y: 302, width: 180, height: 28 },
    ],

    gems: [],

    bonusBlocks: [
        {
            x: 520,
            y: 250,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
    ],

    enemies: [],

    boss: {
        x: 820,
        y: 282,
        width: 110,
        height: 120,
        health: 30,
        maxHealth: 30,
        direction: -1,
        speed: 90,
        minX: 720,
        maxX: 1040,
        active: true,
        shootTimer: 1.2,
        phase: 1,
    },

    fx: {
        stars: false,
        fog: true,
        rain: true,
        scanlines: true,
        neonDust: true,
    },

    exit: {
        x: 1080,
        y: 302,
        width: 70,
        height: 100,
        locked: true,
    },
};