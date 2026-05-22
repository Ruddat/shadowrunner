export const level2 = {
    name: 'Cyber Alley',

    spawn: {
        x: 80,
        y: 252,
    },

    background: 'assets/backgrounds/level2-bg.png',

    platforms: [
        { x: 0, y: 412, width: 520, height: 40 },

        { x: 620, y: 362, width: 220, height: 32 },
        { x: 930, y: 312, width: 220, height: 32 },
        { x: 1240, y: 372, width: 280, height: 32 },

        { x: 1620, y: 302, width: 210, height: 32 },
        { x: 1920, y: 252, width: 230, height: 32 },
        { x: 2260, y: 342, width: 320, height: 32 },

        { x: 2700, y: 402, width: 620, height: 40 },
    ],

    gems: [
        { x: 180, y: 342, collected: false },
        { x: 290, y: 342, collected: false },

        { x: 680, y: 292, collected: false },
        { x: 760, y: 292, collected: false },

        { x: 980, y: 242, collected: false },
        { x: 1060, y: 242, collected: false },

        { x: 1300, y: 302, collected: false },
        { x: 1410, y: 302, collected: false },

        { x: 1680, y: 232, collected: false },
        { x: 1990, y: 182, collected: false },
        { x: 2360, y: 272, collected: false },

        { x: 2820, y: 332, collected: false },
        { x: 2960, y: 332, collected: false },
        { x: 3120, y: 332, collected: false },
    ],

    enemies: [
        {
            x: 700,
            y: 312,
            width: 46,
            height: 50,
            minX: 630,
            maxX: 830,
            speed: 110,
            direction: 1,
            health: 1,
            active: true,
        },
        {
            x: 1320,
            y: 322,
            width: 46,
            height: 50,
            minX: 1260,
            maxX: 1500,
            speed: 130,
            direction: -1,
            health: 1,
            active: true,
        },
        {
            x: 2350,
            y: 292,
            width: 46,
            height: 50,
            minX: 2280,
            maxX: 2560,
            speed: 150,
            direction: 1,
            health: 2,
            active: true,
        },
        {
            x: 2920,
            y: 352,
            width: 46,
            height: 50,
            minX: 2740,
            maxX: 3250,
            speed: 160,
            direction: -1,
            health: 2,
            active: true,
        },
    ],

fx: {
    stars: false,
    fog: true,
    rain: true,
    scanlines: true,
    neonDust: false,
},


    exit: {
        x: 3240,
        y: 302,
        width: 70,
        height: 100,
    },
};