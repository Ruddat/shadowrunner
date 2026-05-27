export const level3 = {
    name: 'Neon Factory',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level3-bg.png',

    platforms: [
        { x: 0, y: 412, width: 500, height: 40 },

        { x: 620, y: 362, width: 210, height: 32 },
        { x: 920, y: 312, width: 190, height: 32 },
        { x: 1210, y: 372, width: 260, height: 32 },

        { x: 1580, y: 292, width: 220, height: 32 },
        { x: 1900, y: 352, width: 260, height: 32 },
        { x: 2260, y: 272, width: 230, height: 32 },

        { x: 2620, y: 382, width: 360, height: 40 },
        { x: 3120, y: 332, width: 280, height: 32 },
        { x: 3540, y: 402, width: 620, height: 40 },
    ],

    gems: [
        { x: 180, y: 342, collected: false },
        { x: 300, y: 342, collected: false },

        { x: 680, y: 292, collected: false },
        { x: 760, y: 292, collected: false },

        { x: 965, y: 242, collected: false },
        { x: 1045, y: 242, collected: false },

        { x: 1280, y: 302, collected: false },
        { x: 1380, y: 302, collected: false },

        { x: 1640, y: 222, collected: false },
        { x: 1720, y: 222, collected: false },

        { x: 1970, y: 282, collected: false },
        { x: 2360, y: 202, collected: false },

        { x: 2720, y: 312, collected: false },
        { x: 2860, y: 312, collected: false },

        { x: 3220, y: 262, collected: false },

        { x: 3660, y: 332, collected: false },
        { x: 3820, y: 332, collected: false },
        { x: 3980, y: 332, collected: false },
    ],

    bonusBlocks: [
        {
            x: 760,
            y: 282,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },
        {
            x: 1320,
            y: 242,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'random',
        },
        {
            x: 2320,
            y: 192,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
        },
        {
            x: 3200,
            y: 242,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'life',
        },
    ],

    enemies: [
        {
            x: 690,
            y: 312,
            width: 46,
            height: 50,
            minX: 630,
            maxX: 820,
            speed: 130,
            direction: 1,
            health: 1,
            active: true,
        },
        {
            x: 1260,
            y: 322,
            width: 46,
            height: 50,
            minX: 1220,
            maxX: 1460,
            speed: 145,
            direction: -1,
            health: 1,
            active: true,
        },
        {
            x: 1950,
            y: 302,
            width: 46,
            height: 50,
            minX: 1910,
            maxX: 2150,
            speed: 160,
            direction: 1,
            health: 2,
            active: true,
        },
        {
            x: 2700,
            y: 332,
            width: 46,
            height: 50,
            minX: 2640,
            maxX: 2960,
            speed: 170,
            direction: -1,
            health: 2,
            active: true,
        },
        {
            x: 3660,
            y: 352,
            width: 46,
            height: 50,
            minX: 3560,
            maxX: 4140,
            speed: 185,
            direction: 1,
            health: 3,
            active: true,
        },
    ],

    fx: {
        stars: false,
        fog: true,
        rain: true,
        scanlines: true,
        neonDust: true,
    },

    exit: {
        x: 4060,
        y: 302,
        width: 70,
        height: 100,
        locked: false,
    },
};