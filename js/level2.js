export const level2 = {
    name: 'Cyber Alley',

    spawn: {
        x: 80,
        y: 252,
    },

    background: 'assets/backgrounds/level2-bg.png',
    music: 'level2',

    platforms: [
        // Startzone
        { x: 0, y: 412, width: 520, height: 40 },

        // Neon signs / erste Sprungpassage
        { x: 610, y: 372, width: 230, height: 32 },
        { x: 930, y: 322, width: 210, height: 32 },
        { x: 1230, y: 382, width: 280, height: 32 },

        // Engere Alley-Passage
        { x: 1620, y: 332, width: 220, height: 32 },
        { x: 1910, y: 282, width: 230, height: 32 },
        { x: 2230, y: 352, width: 280, height: 32 },

        // Breiter Kampfbereich
        { x: 2620, y: 402, width: 520, height: 40 },
        { x: 3220, y: 342, width: 260, height: 32 },
        { x: 3600, y: 292, width: 240, height: 32 },

        // Finale Dachkante
        { x: 3920, y: 402, width: 360, height: 40 },
    ],

    gems: [
        // Start
        { x: 170, y: 342, collected: false },
        { x: 270, y: 342, collected: false },
        { x: 390, y: 342, collected: false },

        // Plattform 1
        { x: 665, y: 302, collected: false },
        { x: 755, y: 302, collected: false },

        // Höherer Sprung
        { x: 980, y: 252, collected: false },
        { x: 1070, y: 252, collected: false },

        // Riskanter Bogen
        { x: 1285, y: 312, collected: false },
        { x: 1395, y: 312, collected: false },

        // Alley
        { x: 1665, y: 262, collected: false },
        { x: 1755, y: 262, collected: false },

        // Hohe Linie
        { x: 1960, y: 212, collected: false },
        { x: 2050, y: 212, collected: false },

        // Gegnerzone
        { x: 2300, y: 282, collected: false },
        { x: 2410, y: 282, collected: false },

        // Kampfbereich unten
        { x: 2720, y: 332, collected: false },
        { x: 2840, y: 332, collected: false },
        { x: 2960, y: 332, collected: false },

        // Endzone
        { x: 3290, y: 272, collected: false },
        { x: 3380, y: 272, collected: false },

        { x: 3650, y: 222, collected: false },
        { x: 3740, y: 222, collected: false },

        { x: 4010, y: 332, collected: false },
        { x: 4130, y: 332, collected: false },
    ],

    bonusBlocks: [
        // Frühe Hilfe
        {
            x: 420,
            y: 292,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'energy',
        },

        // Erste sinnvolle Waffe für enge Gegnergruppen
        {
            x: 1040,
            y: 202,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'spread',
        },

        // Random-Block in der Mitte
        {
            x: 1880,
            y: 202,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'random',
            randomPool: [
                'gem',
                'energy',
                'weapon',
                'weapon',
            ],
            weaponId: 'wave',
        },

        // Vor dem großen Kampfbereich
        {
            x: 2580,
            y: 302,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'life',
        },

        // Späte schwere Waffe
        {
            x: 3340,
            y: 232,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'bounce',
        },

        // Finale Belohnung / falls Plasma schon eingebaut ist
        {
            x: 3730,
            y: 192,
            width: 42,
            height: 42,
            used: false,
            bumpTimer: 0,
            reward: 'weapon',
            weaponId: 'plasma',
        },
    ],

    enemies: [
        // Erster Gegner: leicht
        {
            x: 700,
            y: 322,
            width: 46,
            height: 50,
            minX: 630,
            maxX: 835,
            speed: 115,
            direction: 1,
            health: 1,
            active: true,
        },

        // Drohne über der ersten Plattform
        {
            type: 'drone',
            canShoot: true,
            shootDelay: 2.0,
            shootRangeX: 350,
            shootRangeY: 200,
            projectileSpeed: 260,
            projectileColor: '#ff6b00',
            x: 780,
            y: 180,
            width: 38,
            height: 38,
            minX: 610,
            maxX: 940,
            speed: 60,
            direction: 1,
            health: 2,
            active: true,
        },

        // Zweiter Gegner: auf hoher Plattform
        {
            x: 1010,
            y: 272,
            width: 46,
            height: 50,
            minX: 940,
            maxX: 1125,
            speed: 135,
            direction: -1,
            health: 1,
            active: true,
        },

        // Schild-Gegner: blockt von vorne
        {
            type: 'shield',
            canShoot: true,
            shootDelay: 2.0,
            shootRangeX: 450,
            shootRangeY: 160,
            projectileSpeed: 300,
            projectileColor: '#3b82f6',
            x: 1350,
            y: 332,
            width: 46,
            height: 50,
            minX: 1240,
            maxX: 1490,
            speed: 80,
            direction: 1,
            health: 3,
            shieldHP: 3,
            active: true,
        },

        // Alley-Druck
        {
            x: 1690,
            y: 282,
            width: 46,
            height: 50,
            minX: 1630,
            maxX: 1810,
            speed: 150,
            direction: -1,
            health: 2,
            active: true,
        },

        {
            x: 1990,
            y: 232,
            width: 46,
            height: 50,
            minX: 1920,
            maxX: 2120,
            speed: 165,
            direction: 1,
            health: 2,
            active: true,
        },

        // Mech im Kampfbereich!
        {
            type: 'mech',
            x: 2760,
            y: 342,
            width: 56,
            height: 64,
            minX: 2640,
            maxX: 3090,
            speed: 60,
            direction: -1,
            health: 6,
            chargeSpeed: 650,
            chargeRange: 380,
            active: true,
        },

        {
            x: 3010,
            y: 352,
            width: 46,
            height: 50,
            minX: 2640,
            maxX: 3090,
            speed: 185,
            direction: -1,
            health: 3,
            active: true,
        },

        // Drohne über dem Kampfbereich
        {
            type: 'drone',
            canShoot: true,
            shootDelay: 1.8,
            shootRangeX: 400,
            shootRangeY: 250,
            projectileSpeed: 300,
            projectileColor: '#ff6b00',
            x: 2900,
            y: 160,
            width: 38,
            height: 38,
            minX: 2620,
            maxX: 3200,
            speed: 80,
            direction: -1,
            health: 2,
            active: true,
        },

        // Finale Plattformen
        {
            x: 3310,
            y: 292,
            width: 46,
            height: 50,
            minX: 3230,
            maxX: 3470,
            speed: 180,
            direction: 1,
            health: 2,
            active: true,
        },

        {
            x: 3680,
            y: 242,
            width: 46,
            height: 50,
            minX: 3610,
            maxX: 3830,
            speed: 190,
            direction: -1,
            health: 3,
            active: true,
        },

        // Turret vor dem Exit
        {
            type: 'turret',
            canShoot: true,
            shootDelay: 0.9,
            shootRangeX: 500,
            shootRangeY: 400,
            projectileSpeed: 360,
            projectileColor: '#a855f7',
            x: 3920,
            y: 352,
            width: 42,
            height: 42,
            minX: 3920,
            maxX: 3962,
            speed: 0,
            direction: 1,
            health: 5,
            active: true,
        },

        {
            x: 4070,
            y: 352,
            width: 46,
            height: 50,
            minX: 3940,
            maxX: 4240,
            speed: 200,
            direction: 1,
            health: 4,
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
        x: 4190,
        y: 302,
        width: 70,
        height: 100,
        locked: false,
    },
};