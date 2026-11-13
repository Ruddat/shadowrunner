export const level3 = {
    "name": "Neon Factory",
    "spawn": {
        "x": 80,
        "y": 252
    },
    "background": "assets/backgrounds/level3-bg.png",
    "music": "level3",
    "platforms": [
        {
            "x": 0,
            "y": 412,
            "width": 500,
            "height": 40
        },
        {
            "x": 920,
            "y": 312,
            "width": 190,
            "height": 32
        },
        {
            "x": 1220,
            "y": 380,
            "width": 260,
            "height": 32
        },
        {
            "x": 1560,
            "y": 300,
            "width": 220,
            "height": 32
        },
        {
            "x": 1900,
            "y": 352,
            "width": 260,
            "height": 32
        },
        {
            "x": 2260,
            "y": 272,
            "width": 230,
            "height": 32
        },
        {
            "x": 2620,
            "y": 382,
            "width": 360,
            "height": 40
        },
        {
            "x": 3120,
            "y": 332,
            "width": 320,
            "height": 32
        },
        {
            "x": 3540,
            "y": 402,
            "width": 620,
            "height": 40
        },
        {
            "x": 620,
            "y": 380,
            "width": 260,
            "height": 32
        },
        {
            "x": 1480,
            "y": 402,
            "width": 120,
            "height": 40
        }
    ],
    "shadowPlatforms": [
        {
            "x": 3300,
            "y": 150,
            "width": 140,
            "height": 24
        }
    ],
    "gems": [
        {
            "x": 180,
            "y": 340
        },
        {
            "x": 240,
            "y": 340
        },
        {
            "x": 680,
            "y": 292
        },
        {
            "x": 760,
            "y": 292
        },
        {
            "x": 965,
            "y": 242
        },
        {
            "x": 1045,
            "y": 242
        },
        {
            "x": 1320,
            "y": 302
        },
        {
            "x": 1380,
            "y": 302
        },
        {
            "x": 1640,
            "y": 222
        },
        {
            "x": 1720,
            "y": 222
        },
        {
            "x": 1970,
            "y": 282
        },
        {
            "x": 2360,
            "y": 202
        },
        {
            "x": 2720,
            "y": 312
        },
        {
            "x": 2860,
            "y": 312
        },
        {
            "x": 3220,
            "y": 262
        },
        {
            "x": 3660,
            "y": 332
        },
        {
            "x": 3820,
            "y": 332
        },
        {
            "x": 3980,
            "y": 332
        },
        {
            "x": 300,
            "y": 340
        },
        {
            "x": 360,
            "y": 340
        },
        {
            "x": 420,
            "y": 340
        },
        {
            "x": 140,
            "y": 340
        },
        {
            "x": 1260,
            "y": 300
        },
        {
            "x": 1510,
            "y": 360
        },
        {
            "x": 3320,
            "y": 110
        },
        {
            "x": 3380,
            "y": 110
        }
    ],
    "bonusBlocks": [
        {
            "x": 660,
            "y": 220,
            "width": 42,
            "height": 42,
            "reward": "energy"
        },
        {
            "x": 1320,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "random"
        },
        {
            "x": 2320,
            "y": 192,
            "width": 42,
            "height": 42,
            "reward": "weapon"
        },
        {
            "x": 3200,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "life"
        },
        {
            "x": 2000,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 3
        },
        {
            "x": 2660,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "energy",
            "hits": 2
        },
        {
            "x": 720,
            "y": 220,
            "width": 42,
            "height": 42,
            "reward": "random",
            "hits": 1
        },
        {
            "x": 780,
            "y": 220,
            "width": 42,
            "height": 42,
            "reward": "random",
            "hits": 1
        },
        {
            "x": 880,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 1
        },
        {
            "x": 940,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 1
        },
        {
            "x": 3240,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "weapon",
            "hits": 1
        },
        {
            "x": 3280,
            "y": 160,
            "width": 42,
            "height": 42,
            "reward": "energy",
            "hits": 1
        },
        {
            "x": 2720,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "random",
            "hits": 5
        },
        {
            "x": 2780,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 1
        },
        {
            "x": 2840,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 1
        }
    ],
    "enemies": [
        {
            "x": 760,
            "y": 320,
            "width": 46,
            "height": 50,
            "minX": 700,
            "maxX": 880,
            "speed": 130,
            "direction": 1,
            "health": 1
        },
        {
            "type": "drone",
            "canShoot": true,
            "shootDelay": 1.8,
            "shootRangeX": 400,
            "shootRangeY": 200,
            "projectileSpeed": 300,
            "projectileColor": "#ff6b00",
            "x": 1040,
            "y": 80,
            "width": 38,
            "height": 38,
            "minX": 860,
            "maxX": 1420,
            "speed": 75,
            "direction": -1,
            "health": 2
        },
        {
            "x": 1740,
            "y": 260,
            "width": 42,
            "height": 42,
            "minX": 1680,
            "maxX": 1900,
            "speed": 70,
            "direction": 1,
            "health": 3,
            "type": "turret",
            "canShoot": true,
            "shootDelay": 0.85,
            "shootRangeX": 520,
            "shootRangeY": 400,
            "projectileSpeed": 400,
            "projectileColor": "#a855f7"
        },
        {
            "x": 1960,
            "y": 300,
            "width": 46,
            "height": 50,
            "minX": 1920,
            "maxX": 2160,
            "speed": 160,
            "direction": 1,
            "health": 2
        },
        {
            "type": "mech",
            "x": 2720,
            "y": 320,
            "width": 56,
            "height": 64,
            "minX": 2640,
            "maxX": 2980,
            "speed": 55,
            "direction": -1,
            "health": 4,
            "chargeSpeed": 700,
            "chargeRange": 400
        },
        {
            "type": "turret",
            "canShoot": true,
            "shootDelay": 0.8,
            "shootRangeX": 550,
            "shootRangeY": 400,
            "projectileSpeed": 400,
            "projectileColor": "#a855f7",
            "x": 2340,
            "y": 222,
            "width": 42,
            "height": 42,
            "minX": 2340,
            "maxX": 2382,
            "speed": 0,
            "direction": 1,
            "health": 5
        },
        {
            "x": 3660,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 3560,
            "maxX": 4140,
            "speed": 185,
            "direction": 1,
            "health": 3
        },
        {
            "type": "shield",
            "canShoot": true,
            "shootDelay": 1.6,
            "shootRangeX": 500,
            "shootRangeY": 180,
            "projectileSpeed": 340,
            "projectileColor": "#3b82f6",
            "x": 3800,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 3560,
            "maxX": 4060,
            "speed": 75,
            "direction": -1,
            "health": 4,
            "shieldHP": 3
        }
    ],
    "hackTerminals": [
        {
            "x": 1640,
            "y": 240,
            "width": 36,
            "height": 52,
            "difficulty": "medium",
            "reward": "deactivate_enemies",
            "targetId": "deactivate",
            "hacked": false
        }
    ],
    "shopTerminals": [
        {
            "x": 3260,
            "y": 272,
            "width": 44,
            "height": 60,
            "singleUse": false
        }
    ],
    "checkpoints": [
        {
            "x": 2820,
            "y": 300,
            "width": 60,
            "height": 80
        }
    ],
    "keys": [],
    "shadowAreas": [],
    "hazards": [
        {
            "type": "laser_grid",
            "id": "laser_3a",
            "x": 1500,
            "y": 300,
            "width": 4,
            "height": 100,
            "thickness": 4,
            "damage": 18,
            "orientation": "vertical",
            "cycleTime": 2.6,
            "dutyCycle": 0.6,
            "hackable": true,
            "alarmRadius": 320
        },
        {
            "type": "security_cam",
            "id": "cam_3",
            "x": 1700,
            "y": 210,
            "width": 20,
            "height": 16,
            "range": 240,
            "coneAngle": 1.3,
            "startAngle": 0.4,
            "minAngle": -0.5,
            "maxAngle": 0.9,
            "rotateSpeed": 0.65,
            "_direction": 1,
            "hackable": true,
            "alarmRadius": 320
        }
    ],
    "npcs": [
        {
            "x": 1420,
            "y": 320,
            "width": 42,
            "height": 60,
            "name": "Hacker",
            "dialog": [
                "Hey, watch your back out there.",
                "The corps are watching."
            ],
            "type": "info"
        }
    ],
    "dataLogs": [
        {
            "x": 1430,
            "y": 300,
            "width": 30,
            "height": 36,
            "logId": "log_3_1",
            "collected": false
        },
        {
            "x": 3330,
            "y": 90,
            "width": 30,
            "height": 36,
            "logId": "log_3_2",
            "collected": false
        }
    ],
    "fx": {
        "stars": false,
        "fog": true,
        "rain": false,
        "scanlines": false,
        "neonDust": false,
        "sparks": false,
        "warningLights": true
    },
    "exit": {
        "x": 4060,
        "y": 302,
        "width": 70,
        "height": 100,
        "locked": false
    }
};
