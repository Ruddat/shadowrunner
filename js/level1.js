export const level1 = {
    name: 'Neon Rooftops',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level1-bg.png',
    music: 'level1',

    platforms: [
        { x: 0, y: 412, width: 620, height: 40 },
        { x: 720, y: 362, width: 260, height: 32 },
        { x: 1080, y: 312, width: 300, height: 32 },
        { x: 1500, y: 382, width: 500, height: 40 },
        { x: 2100, y: 322, width: 300, height: 32 },
        { x: 2500, y: 402, width: 700, height: 40 },
    ],

    gems: [
        { x: 240, y: 342, collected: false },
        { x: 330, y: 342, collected: false },

        { x: 790, y: 292, collected: false },
        { x: 890, y: 292, collected: false },

        { x: 1160, y: 242, collected: false },
        { x: 1270, y: 242, collected: false },

        { x: 1620, y: 312, collected: false },
        { x: 1740, y: 312, collected: false },

        { x: 2180, y: 252, collected: false },

        { x: 2580, y: 332, collected: false },
        { x: 2700, y: 332, collected: false },
        { x: 2860, y: 332, collected: false },
    ],

    bonusBlocks: [
        {
            x: 520,
            y: 282,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'gem',
        },

        // Erste echte Waffe: Spread Shot
        {
            x: 1180,
            y: 152,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'spread',
        },

        // Zweiter Waffen-/Powerup-Block: später im Level mehr Druck
        {
            x: 1740,
            y: 252,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'laser',
        },

        // Optionaler Random-Block Richtung Ende
        {
            x: 2260,
            y: 202,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'random',
            randomPool: [
                'gem',
                'energy',
                'life',
                'weapon',
            ],
            weaponId: 'wave',
        },
    ],

    enemies: [
        {
            x: 820,
            y: 312,
            width: 46,
            height: 50,
            minX: 730,
            maxX: 930,
            speed: 90,
            direction: 1,
            health: 2,
        },
        {
            x: 1660,
            y: 332,
            width: 46,
            height: 50,
            minX: 1520,
            maxX: 1960,
            speed: 120,
            direction: 1,
            health: 3,
        },
        {
            x: 2660,
            y: 352,
            width: 46,
            height: 50,
            minX: 2520,
            maxX: 3050,
            speed: 140,
            direction: -1,
            health: 4,
        },
    ],

    fx: {
        stars: true,
        fog: true,
        rain: false,
        scanlines: true,
        neonDust: true,
    },

    exit: {
        x: 3060,
        y: 302,
        width: 70,
        height: 100,
        locked: false,
    },
};