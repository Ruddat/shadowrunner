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
            "width": 480,
            "height": 40
        },
        {
            "x": 180,
            "y": 280,
            "width": 120,
            "height": 28
        },
        {
            "x": 620,
            "y": 372,
            "width": 200,
            "height": 32
        },
        {
            "x": 960,
            "y": 322,
            "width": 220,
            "height": 32
        },
        {
            "x": 1280,
            "y": 402,
            "width": 260,
            "height": 40
        },
        {
            "x": 1620,
            "y": 352,
            "width": 180,
            "height": 32
        },
        {
            "x": 1860,
            "y": 312,
            "width": 140,
            "height": 28
        },
        {
            "x": 2060,
            "y": 362,
            "width": 140,
            "height": 28
        },
        {
            "x": 2260,
            "y": 302,
            "width": 140,
            "height": 28
        },
        {
            "x": 2480,
            "y": 402,
            "width": 480,
            "height": 40
        },
        {
            "x": 2600,
            "y": 300,
            "width": 160,
            "height": 28
        },
        {
            "x": 3040,
            "y": 352,
            "width": 200,
            "height": 32
        },
        {
            "x": 3060,
            "y": 220,
            "width": 140,
            "height": 28
        },
        {
            "x": 3300,
            "y": 280,
            "width": 220,
            "height": 32
        },
        {
            "x": 3560,
            "y": 402,
            "width": 360,
            "height": 40
        }
    ],
    "shadowPlatforms": [],
    "gems": [
        { "x": 240, "y": 342 },
        { "x": 330, "y": 342 },
        { "x": 210, "y": 230 },
        { "x": 250, "y": 230 },
        { "x": 710, "y": 330 },
        { "x": 1040, "y": 262 },
        { "x": 1320, "y": 360 },
        { "x": 1400, "y": 360 },
        { "x": 1480, "y": 360 },
        { "x": 1700, "y": 310 },
        { "x": 1900, "y": 270 },
        { "x": 2100, "y": 320 },
        { "x": 2300, "y": 260 },
        { "x": 2520, "y": 360 },
        { "x": 2820, "y": 360 },
        { "x": 2620, "y": 258 },
        { "x": 2700, "y": 258 },
        { "x": 3080, "y": 310 },
        { "x": 3080, "y": 178 },
        { "x": 3120, "y": 178 },
        { "x": 3160, "y": 178 },
        { "x": 3380, "y": 238 },
        { "x": 3620, "y": 360 },
        { "x": 3780, "y": 360 }
    ],
    "bonusBlocks": [
        {
            "x": 220,
            "y": 180,
            "width": 42,
            "height": 42,
            "reward": "weapon",
            "weaponId": "spread"
        },
        {
            "x": 1400,
            "y": 300,
            "width": 42,
            "height": 42,
            "reward": "random",
            "randomPool": ["gem", "energy", "life"],
            "weaponId": "wave"
        },
        {
            "x": 2160,
            "y": 210,
            "width": 42,
            "height": 42,
            "reward": "life"
        },
        {
            "x": 2660,
            "y": 200,
            "width": 42,
            "height": 42,
            "reward": "weapon",
            "weaponId": "laser"
        },
        {
            "x": 3120,
            "y": 130,
            "width": 42,
            "height": 42,
            "reward": "random",
            "randomPool": ["gem", "energy", "life", "weapon"],
            "weaponId": "plasma"
        },
        {
            "x": 3380,
            "y": 190,
            "width": 42,
            "height": 42,
            "reward": "gem",
            "hits": 3
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
            "x": 1040,
            "y": 280,
            "width": 42,
            "height": 42,
            "minX": 1040,
            "maxX": 1040,
            "speed": 0,
            "direction": 1,
            "health": 4
        },
        {
            "x": 1320,
            "y": 360,
            "width": 46,
            "height": 50,
            "minX": 1280,
            "maxX": 1500,
            "speed": 130,
            "direction": 1,
            "health": 2,
            "active": true
        },
        {
            "x": 2100,
            "y": 312,
            "width": 46,
            "height": 50,
            "minX": 2060,
            "maxX": 2200,
            "speed": 150,
            "direction": -1,
            "health": 2,
            "active": true
        },
        {
            "x": 2600,
            "y": 352,
            "width": 46,
            "height": 50,
            "minX": 2480,
            "maxX": 2860,
            "speed": 140,
            "direction": -1,
            "health": 3,
            "active": true
        },
        {
            "type": "turret",
            "canShoot": true,
            "shootDelay": 0.9,
            "shootRangeX": 550,
            "shootRangeY": 400,
            "projectileSpeed": 400,
            "projectileColor": "#a855f7",
            "x": 3380,
            "y": 238,
            "width": 42,
            "height": 42,
            "minX": 3380,
            "maxX": 3380,
            "speed": 0,
            "direction": 1,
            "health": 4
        }
    ],
    "hackTerminals": [
        {
            "x": 2300,
            "y": 250,
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
            "x": 1660,
            "y": 272,
            "width": 60,
            "height": 80
        },
        {
            "x": 3080,
            "y": 272,
            "width": 60,
            "height": 80
        }
    ],
    "keys": [
        {
            "x": 1460,
            "y": 350
        },
        {
            "x": 2700,
            "y": 350
        },
        {
            "x": 3100,
            "y": 168
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
        "x": 3820,
        "y": 302,
        "width": 70,
        "height": 100,
        "locked": true,
        "keysRequired": 3,
        "unlockMode": "allGemsOrEnemiesOrKeys"
    },
    "shopTerminals": [
        {
            "x": 1700,
            "y": 292,
            "width": 44,
            "height": 60,
            "singleUse": false,
            "nearPlayer": false
        }
    ],
    "dataLogs": [
        {
            "x": 1340,
            "y": 330,
            "width": 30,
            "height": 36,
            "logId": "log_1_1",
            "collected": false
        },
        {
            "x": 2640,
            "y": 228,
            "width": 30,
            "height": 36,
            "logId": "log_1_2",
            "collected": false
        },
        {
            "x": 3080,
            "y": 148,
            "width": 30,
            "height": 36,
            "logId": "log_1_3",
            "collected": false
        }
    ],
    "hazards": [
        {
            "type": "security_cam",
            "id": "cam_1",
            "x": 1860,
            "y": 290,
            "width": 20,
            "height": 16,
            "range": 220,
            "coneAngle": 1.2,
            "startAngle": 0.3,
            "minAngle": -0.6,
            "maxAngle": 0.8,
            "rotateSpeed": 0.6,
            "_direction": 1,
            "hackable": true,
            "alarmRadius": 300
        },
        {
            "type": "tripwire",
            "id": "trip_1",
            "x": 1280,
            "y": 392,
            "width": 80,
            "height": 8,
            "triggerAlarm": true,
            "alarmRadius": 400
        }
    ],
    "npcs": [
        {
            "x": 100,
            "y": 362,
            "width": 30,
            "height": 50,
            "dialogId": "npc_rooftop_fixer",
            "nearPlayer": false
        },
        {
            "x": 3000,
            "y": 302,
            "width": 30,
            "height": 50,
            "dialogId": "npc_rooftop_hacker",
            "nearPlayer": false
        }
    ]
};
