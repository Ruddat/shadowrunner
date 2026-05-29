export const level1 = {
    "name": "Neon Rooftops",
    "spawn": {
        "x": 280,
        "y": 140
    },
    "background": "assets/backgrounds/level1-bg.png",
    "music": "level1",
    "platforms": [
        {
            "x": 0,
            "y": 412,
            "width": 620,
            "height": 40
        },
        {
            "x": 720,
            "y": 362,
            "width": 260,
            "height": 32
        },
        {
            "x": 1080,
            "y": 312,
            "width": 300,
            "height": 32
        },
        {
            "x": 1500,
            "y": 382,
            "width": 500,
            "height": 40
        },
        {
            "x": 2100,
            "y": 322,
            "width": 300,
            "height": 32
        },
        {
            "x": 2500,
            "y": 402,
            "width": 700,
            "height": 40
        }
    ],
    "shadowPlatforms": [],
    "gems": [
        {
            "x": 240,
            "y": 342
        },
        {
            "x": 330,
            "y": 342
        },
        {
            "x": 760,
            "y": 300
        },
        {
            "x": 820,
            "y": 300
        },
        {
            "x": 1160,
            "y": 242
        },
        {
            "x": 1270,
            "y": 242
        },
        {
            "x": 1620,
            "y": 312
        },
        {
            "x": 1740,
            "y": 312
        },
        {
            "x": 2120,
            "y": 260
        },
        {
            "x": 2580,
            "y": 332
        },
        {
            "x": 2700,
            "y": 332
        },
        {
            "x": 2860,
            "y": 332
        },
        {
            "x": 880,
            "y": 300
        },
        {
            "x": 920,
            "y": 300
        },
        {
            "x": 2200,
            "y": 260
        },
        {
            "x": 2280,
            "y": 260
        },
        {
            "x": 2360,
            "y": 260
        },
        {
            "x": 2800,
            "y": 340
        },
        {
            "x": 2960,
            "y": 340
        }
    ],
    "bonusBlocks": [
        {
            "x": 1180,
            "y": 152,
            "width": 42,
            "height": 42,
            "reward": "weapon",
            "weaponId": "spread"
        },
        {
            "x": 1660,
            "y": 240,
            "width": 42,
            "height": 42,
            "reward": "weapon",
            "weaponId": "laser"
        },
        {
            "x": 2260,
            "y": 202,
            "width": 42,
            "height": 42,
            "reward": "random",
            "randomPool": [
                "gem",
                "energy",
                "life",
                "weapon"
            ],
            "weaponId": "wave"
        },
        {
            "x": 1720,
            "y": 240,
            "width": 42,
            "height": 42,
            "reward": "gem"
        },
        {
            "x": 1780,
            "y": 240,
            "width": 42,
            "height": 42,
            "reward": "gem"
        }
    ],
    "enemies": [
        {
            "type": "turret",
            "canShoot": true,
            "shootDelay": 1,
            "shootRangeX": 600,
            "shootRangeY": 400,
            "projectileSpeed": 380,
            "projectileColor": "#a855f7",
            "x": 2720,
            "y": 360,
            "width": 42,
            "height": 42,
            "minX": 2720,
            "maxX": 2760,
            "speed": 0,
            "direction": 1,
            "health": 4
        }
    ],
    "hackTerminals": [
        {
            "x": 2180,
            "y": 260,
            "width": 36,
            "height": 52,
            "difficulty": "easy",
            "reward": "secret_area",
            "targetId": "deactivate",
            "hacked": false
        }
    ],
    "checkpoints": [
        {
            "x": 1880,
            "y": 300,
            "width": 60,
            "height": 80
        }
    ],
    "keys": [
        {
            "x": 640,
            "y": 320
        },
        {
            "x": 1540,
            "y": 300
        },
        {
            "x": 2480,
            "y": 340
        }
    ],
    "fx": {
        "stars": false,
        "fog": false,
        "rain": false,
        "scanlines": false,
        "neonDust": false,
        "sparks": true,
        "warningLights": true
    },
    "exit": {
        "x": 3060,
        "y": 302,
        "width": 70,
        "height": 100,
        "locked": true,
        "keysRequired": 3,
        "unlockMode": "allGems"
    },
    "shopTerminals": [
        {
            "x": 2080,
            "y": 262,
            "width": 44,
            "height": 60,
            "singleUse": false,
            "nearPlayer": false
        }
    ]
};
