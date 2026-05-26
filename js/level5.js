export const level5 = {
    "name": "Cyber Alley",
    "spawn": {
        "x": 80,
        "y": 252
    },
    "background": "assets/backgrounds/level2-bg.png",
    "music": "level1",
    "platforms": [
        {
            "x": 0,
            "y": 412,
            "width": 520,
            "height": 40
        },
        {
            "x": 610,
            "y": 372,
            "width": 230,
            "height": 32
        },
        {
            "x": 930,
            "y": 322,
            "width": 210,
            "height": 32
        },
        {
            "x": 1230,
            "y": 382,
            "width": 280,
            "height": 32
        },
        {
            "x": 1620,
            "y": 332,
            "width": 220,
            "height": 32
        },
        {
            "x": 1910,
            "y": 282,
            "width": 230,
            "height": 32
        },
        {
            "x": 2230,
            "y": 352,
            "width": 280,
            "height": 32
        },
        {
            "x": 2620,
            "y": 402,
            "width": 520,
            "height": 40
        },
        {
            "x": 3220,
            "y": 342,
            "width": 260,
            "height": 32
        },
        {
            "x": 3600,
            "y": 292,
            "width": 240,
            "height": 32
        },
        {
            "x": 3920,
            "y": 402,
            "width": 360,
            "height": 40
        }
    ],
    "gems": [
        {
            "x": 170,
            "y": 342,
            "collected": false
        },
        {
            "x": 270,
            "y": 342,
            "collected": false
        },
        {
            "x": 390,
            "y": 342,
            "collected": false
        },
        {
            "x": 665,
            "y": 302,
            "collected": false
        },
        {
            "x": 755,
            "y": 302,
            "collected": false
        },
        {
            "x": 980,
            "y": 252,
            "collected": false
        },
        {
            "x": 1070,
            "y": 252,
            "collected": false
        },
        {
            "x": 1285,
            "y": 312,
            "collected": false
        },
        {
            "x": 1395,
            "y": 312,
            "collected": false
        },
        {
            "x": 1665,
            "y": 262,
            "collected": false
        },
        {
            "x": 1755,
            "y": 262,
            "collected": false
        },
        {
            "x": 1960,
            "y": 212,
            "collected": false
        },
        {
            "x": 2050,
            "y": 212,
            "collected": false
        },
        {
            "x": 2300,
            "y": 282,
            "collected": false
        },
        {
            "x": 2410,
            "y": 282,
            "collected": false
        },
        {
            "x": 2720,
            "y": 332,
            "collected": false
        },
        {
            "x": 2840,
            "y": 332,
            "collected": false
        },
        {
            "x": 2960,
            "y": 332,
            "collected": false
        },
        {
            "x": 3290,
            "y": 272,
            "collected": false
        },
        {
            "x": 3380,
            "y": 272,
            "collected": false
        },
        {
            "x": 3650,
            "y": 222,
            "collected": false
        },
        {
            "x": 3740,
            "y": 222,
            "collected": false
        },
        {
            "x": 4010,
            "y": 332,
            "collected": false
        },
        {
            "x": 4130,
            "y": 332,
            "collected": false
        }
    ],
    "bonusBlocks": [
        {
            "x": 420,
            "y": 292,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "energy"
        },
        {
            "x": 1040,
            "y": 202,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "weapon",
            "weaponId": "spread"
        },
        {
            "x": 2040,
            "y": 160,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "random",
            "randomPool": [
                "gem",
                "energy",
                "weapon",
                "weapon"
            ],
            "weaponId": "wave"
        },
        {
            "x": 2720,
            "y": 260,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "life"
        },
        {
            "x": 3340,
            "y": 232,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "weapon",
            "weaponId": "bounce"
        },
        {
            "x": 3730,
            "y": 192,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "weapon",
            "weaponId": "plasma"
        },
        {
            "x": 2780,
            "y": 260,
            "width": 42,
            "height": 42,
            "used": false,
            "bumpTimer": 0,
            "reward": "gem"
        },
        {
            "x": 2840,
            "y": 260,
            "width": 42,
            "height": 42,
            "used": true,
            "bumpTimer": 0,
            "reward": "gem"
        }
    ],
    "enemies": [
        {
            "x": 700,
            "y": 322,
            "width": 46,
            "height": 50,
            "minX": 630,
            "maxX": 835,
            "speed": 115,
            "direction": 1,
            "health": 1,
            "active": true
        },
        {
            "x": 1010,
            "y": 272,
            "width": 46,
            "height": 50,
            "minX": 940,
            "maxX": 1125,
            "speed": 135,
            "direction": -1,
            "health": 1,
            "active": true
        },
        {
            "x": 1330,
            "y": 332,
            "width": 46,
            "height": 50,
            "minX": 1240,
            "maxX": 1490,
            "speed": 145,
            "direction": 1,
            "health": 2,
            "active": true
        },
        {
            "x": 1690,
            "y": 282,
            "width": 46,
            "height": 50,
            "minX": 1630,
            "maxX": 1810,
            "speed": 150,
            "direction": -1,
            "health": 2,
            "active": true
        },
        {
            "x": 1990,
            "y": 232,
            "width": 46,
            "height": 50,
            "minX": 1920,
            "maxX": 2120,
            "speed": 165,
            "direction": 1,
            "health": 2,
            "active": true
        },
        {
            "x": 2340,
            "y": 302,
            "width": 46,
            "height": 50,
            "minX": 2240,
            "maxX": 2490,
            "speed": 175,
            "direction": -1,
            "health": 2,
            "active": true
        },
        {
            "x": 2760,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 2640,
            "maxX": 3090,
            "speed": 155,
            "direction": 1,
            "health": 3,
            "active": true
        },
        {
            "x": 3010,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 2640,
            "maxX": 3090,
            "speed": 185,
            "direction": -1,
            "health": 3,
            "active": true
        },
        {
            "x": 3310,
            "y": 292,
            "width": 46,
            "height": 50,
            "minX": 3230,
            "maxX": 3470,
            "speed": 180,
            "direction": 1,
            "health": 2,
            "active": true
        },
        {
            "x": 3680,
            "y": 242,
            "width": 46,
            "height": 50,
            "minX": 3610,
            "maxX": 3830,
            "speed": 190,
            "direction": -1,
            "health": 3,
            "active": true
        },
        {
            "x": 4070,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 3940,
            "maxX": 4240,
            "speed": 200,
            "direction": 1,
            "health": 4,
            "active": true
        }
    ],
    "fx": {
        "stars": false,
        "fog": true,
        "rain": true,
        "scanlines": true,
        "neonDust": true
    },
    "exit": {
        "x": 4190,
        "y": 302,
        "width": 70,
        "height": 100,
        "locked": false
    }
};
