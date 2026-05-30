# ShadowRunner

**ShadowRunner** ist ein browserbasiertes 2D-Action-Jump-and-Run im Cyberpunk-Neon-Stil.
Das Spiel laeuft direkt im Browser ueber **HTML5 Canvas** (960x540) und **modulare ES6-JavaScript-Dateien**.

Du steuerst einen Runner durch futuristische Neon-Level, kaempfst gegen Gegner und Bosse, nutzt Shadow-Mechaniken, hackst Terminals, kaufst Upgrades im Shop und sammelst Gems, Keys und Waffen-Upgrades.

---

## Spielen

Das Spiel ist ueber GitHub Pages spielbar:

```text
https://ruddat.github.io/shadowrunner/
```

Hinweis: Browser starten Audio meist erst nach einer Benutzeraktion. Ein Klick oder Tastendruck im Spiel reicht normalerweise aus.

---

## Features

### Core

- HTML5-Canvas-Spiel mit 960x540 Aufloesung (16:9)
- Modulare ES6-JavaScript-Struktur (30+ Module)
- 9 Level: 4 hand-crafted, 1 prozedural generiert, 3 weitere hand-crafted, 2 Boss-Level
- Intro-, Title-, Credits-, Level-Complete- und Game-Over-Screen
- Kamera-System mit Shake-Effekten
- Plattforming mit Gravitation und Kollisionen
- Save/Load-System ueber localStorage (Auto-Save bei Pause)
- Pause-System mit Save-Funktion
- Speedrun-Timer (optional, einschaltbar in Options)
- Gamepad-Support mit anpassbaren Tastenbelegungen

### Movement

- Laufen, Springen, Schiessen
- Wall-Slide: An Waenden langsam herabgleiten
- Wall-Jump: Von Waenden abspringen
- Shadow Shift: Wechsel in Shadow-Ebene (schneller, staerker, weniger Schaden)
- Shadow Dash: Kurzer Burst nach vorne, funktioniert auch in der Luft
- Dash-Attack: Gegner werden beim Dash getroffen (2 Schaden)

### Gegner (6 Typen)

| Typ | Beschreibung |
|---|---|
| Walker | Laeuft patrouillierend hin und her |
| Drone | Fliegt, schiesst aus der Luft |
| Shield | Hat ein Schild, muss von hinten getroffen werden |
| Mech | Stuermt auf den Spieler zu, viel HP |
| Turret | Stationaeres Geschuetz, schnelle Schussrate |
| Ninja | Schneller Shadow-Gegner, nur im Shadow Mode verwundbar |

Shadow-Gegner (`shadowOnly: true`) sind nur im Shadow Shift sichtbar und verwundbar.

### Combo-System

Schnelle Kills in Folge erhoehen den Combo-Multiplikator:

- 3 Kills in Folge: x2 Multiplikator
- 6 Kills in Folge: x3 Multiplikator
- 10 Kills in Folge: x5 Multiplikator

Der Combo zerfaellt nach 2,5 Sekunden ohne Kill. Bonus-Punkte basierend auf dem Multiplikator.

### Waffen-System

6 Waffentypen, jeweils bis Level 3 upgradebar:

| Waffe | Beschreibung |
|---|---|
| Basic Blaster | Standard-Projektil |
| Spread Shot | Mehrere Projektile in einem Facher |
| Neon Laser | Pierce durch Gegner |
| Wave Beam | Wellenfoermiges Projektil |
| Bounce Shot | Prallt von Plattformen ab |
| Plasma Grenade | Explodiert bei Treffer (AOE-Schaden) |

Waffen-Leveling: Wenn der Spieler eine Waffenbox aufsammelt, wird zuerst die aktuelle Spezialwaffe hochgelevelt. Erst wenn sie Level 3 erreicht hat, kann eine neue Spezialwaffe uebernommen werden.

```text
Spread LV1 → Waffenbox → Spread LV2 → Waffenbox → Spread LV3 → Waffenbox → Laser LV1
```

### Shadow-System

#### Shadow Shift

Mit `K` oder `Left Shift` in die Shadow-Ebene wechseln. Effekte:

- Andere Player-Farbe und violette Aura
- Shadow-Energieverbrauch (regeneriert automatisch)
- Leicht schnelleres Movement (+8%)
- Leicht staerkere Sprungkraft (+6%)
- 25% weniger eingehender Schaden
- 15% schnellere Schussrate
- Shadow-Plattformen werden aktiv
- Shadow-Gegner werden sichtbar und verwundbar

#### Shadow Dash

Mit `L` oder `Right Shift` einen kurzen Burst nach vorne ausfuehren.

- Funktioniert auch in der Luft
- Verbraucht 18 Shadow-Energie
- Cooldown: 0,65 Sekunden
- Dash-Attack: Gegner im Dash-Pfad bekommen 2 Schaden
- Erzeugt starken violetten Glow

#### Shadow-Plattformen

Level koennen zusaetzliche Plattformen definieren, die nur waehrend Shadow Shift sichtbar und begehbar sind:

```js
shadowPlatforms: [
    { x: 930, y: 240, width: 140, height: 24 },
]
```

### Keys und Portal-System

Level koennen Keys platzieren. Der Exit kann gesperrt sein und verschiedene Unlock-Modi haben:

```js
exit: {
    x: 3060, y: 302, width: 70, height: 100,
    locked: true,
    keysRequired: 3,
    unlockMode: 'allGemsOrEnemiesOrKeys',
}
```

Unlock-Modi:

- `allGems` - Alle Gems sammeln
- `allEnemies` - Alle Gegner besiegen
- `allGemsOrEnemiesOrKeys` - Alle Gems ODER alle Gegner ODER alle Keys

Dadurch entstehen verschiedene Loesungswege: Sammelroute, Kampfroute oder Shadow-Route.

### Bonusbloecke

Bloecke, die von unten getroffen werden und Rewards droppen:

```js
bonusBlocks: [
    { x: 200, y: 200, width: 42, height: 42, reward: 'gem' },
    { x: 400, y: 200, width: 42, height: 42, reward: 'weapon', weaponId: 3 },
    { x: 600, y: 200, width: 42, height: 42, reward: 'random', randomPool: ['gem','energy','life'] },
]
```

Verfuegbare Rewards: `gem`, `energy`, `life`, `weapon`, `random`

### Hacking Minigame

Hack-Terminals in Leveln starten ein Matrix-artiges Minispiel:

- **Netzwerk-Ansicht**: Verbundene Knoten, die man navigiert
- **Knoten-Typen**: Entry, Router, Data (Loot), Firewall, ICE (White/Grey/Black), Exit
- **Firewall hacken**: J/Space halten, um Fortschrittsbalken zu fuellen
- **ICE**: Patrouilliert im Netzwerk, macht Schaden bei Kontakt
- **Schwierigkeitsgrade**: easy (45s), medium (35s), hard (25s)
- **Erfolg**: Gegner deaktivieren, Tueren oeffnen, geheime Bereiche freilegen
- **Misserfolg**: Alarm loest zusaetzliche Gegner aus

Terminal in Level-Daten:

```js
hackTerminals: [
    {
        x: 800, y: 350, width: 36, height: 52,
        difficulty: 'medium',       // easy | medium | hard
        reward: 'deactivate_enemies', // deactivate_enemies | open_door | secret_area
        targetId: 'deactivate',     // deactivate | door | secret | boss
    },
]
```

### Shop-System

Waehrend des Spiels und zwischen Leveln gibt es einen Shop, in dem man Gems fuer Upgrades ausgibt:

| Item | Kosten | Effekt |
|---|---|---|
| EXTRA LIFE | 5 Gems | +1 Leben (max 9) |
| ENERGY MAX | 3 Gems | Volle Energie |
| SHADOW RECHARGE | 4 Gems | Volle Shadow-Energie |
| WEAPON UPGRADE | 8 Gems | Aktuelle Waffe upgraden |
| GEM MAGNET | 4 Gems | Zieht Gems an (30s) |
| SHIELD MODULE | 6 Gems | 50% Schadensreduktion (20s) |
| SPEED BOOST | 3 Gems | +30% Geschwindigkeit (25s) |
| DOUBLE JUMP | 5 Gems | Ein extra Sprung in der Luft |

Shop-Terminals in Leveln:

```js
shopTerminals: [
    { x: 1200, y: 350, width: 44, height: 64 },
]
```

Shop oeffnen: `E` oder `F` am Terminal. Zwischen Leveln: `S` druecken.

Aktive Buffs werden als Timer-Balken im HUD angezeigt.

### Checkpoint-System

Checkpoints in Leveln speichern den Fortschritt:

```js
checkpoints: [
    { x: 1400, y: 332, width: 60, height: 80, activated: false },
]
```

Beim Durchlaufen wird der Checkpoint aktiviert, das Spiel gespeichert und der Respawn-Punkt gesetzt.

### Neon-Sync

Musik-gesteuerte visuelle Effekte: Plattformen pulsiert mit dem Bass, Camera-Shake auf Beats, Exit-Portal pulsiert im Rhythmus. Analysiert Audio in Echtzeit ueber Web Audio API.

### Level-FX

Jeder Level kann visuelle Effekte aktivieren:

```js
fx: {
    stars: false,
    fog: true,
    rain: false,
    scanlines: true,
    neonDust: true,
    sparks: false,
    warningLights: false,
}
```

### Gegner-Sprites

Unterschiedliche Sprite-Sheets fuer jeden Gegnertyp:

- `walker_spritesheet.png` - Laufender Gegner
- `drone_spritesheet.png` - Drohne
- `shield_spritesheet.png` - Schild-Gegner
- `mech_spritesheet.png` - Mech
- `ninja_spritesheet.png` - Ninja

Spieler-Sprites: `run`, `idle`, `jump`, `dash`, `wallslide`, `shoot` Animationen.

---

## Steuerung

### Tastatur

| Aktion | Taste |
|---|---|
| Links laufen | `A` oder `←` |
| Rechts laufen | `D` oder `→` |
| Springen | `W`, `↑` oder `Space` |
| Schiessen | `J` oder `Left Ctrl` |
| Shadow Shift halten | `K` oder `Left Shift` |
| Shadow Dash | `L` oder `Right Shift` |
| Interagieren (Hack/Shop) | `E`, `F` oder `Enter` |
| Pause | `Esc` oder `P` |
| Options | `Esc`/`P` waehrend Pause, dann `Enter`/`Space` |
| Debug-Waffen wechseln | `1` bis `6` |

### Gamepad

Gamepad wird automatisch erkannt. Standard-Belegung:

| Aktion | Button |
|---|---|
| Springen | A / Cross |
| Schiessen | X / Square oder RT |
| Shadow Shift | Y / Triangle oder LB |
| Shadow Dash | B / Circle oder RB |
| Interagieren | A / Cross |
| Pause | Start |

Tastenbelegung kann im Options-Menue angepasst werden.

### Shop-Steuerung

| Aktion | Taste |
|---|---|
| Navigieren | `W`/`S` oder Pfeiltasten |
| Kategorie wechseln | `A`/`D` |
| Kaufen | `J`/`E` |
| Shop schliessen | `L` |

### Hacking-Steuerung

| Aktion | Taste |
|---|---|
| Zwischen Knoten navigieren | Pfeiltasten / `W`/`A`/`S`/`D` |
| Firewall hacken | `J`/`Space` halten |
| Hack abbrechen | `L`/`Dash` |
| Hacking abbrechen | `Esc` |

---

## Level-Editor

Separater Editor unter `/editor.html` zum Bauen und Exportieren von Leveln.

### Verfuegbare Werkzeuge

| Werkzeug | Beschreibung |
|---|---|
| Auswaehlen | Objekte auswaehlen und verschieben |
| Plattform | Normale Plattform setzen (Drag-Groesse) |
| Shadow-Plattf. | Shadow-Plattform setzen |
| Gem | Gem setzen |
| Bonusblock | Bonusblock setzen (Reward konfigurierbar) |
| Gegner | Gegner setzen (Typ auswaehlbar: Walker, Drone, Shield, Mech, Turret, Ninja) |
| Hack-Terminal | Hack-Terminal setzen (Schwierigkeit, Reward, Target) |
| Checkpoint | Checkpoint setzen |
| Schluessel | Key setzen |
| Spawn | Spawn-Punkt setzen |
| Exit | Exit setzen (Unlock-Modus, KeysRequired konfigurierbar) |

### Editor-Features

- **Drag-to-Draw**: Plattformen durch Ziehen auf die gewuenschte Groesse erstellen
- **Grid-Snapping**: Alle Objekte rasten am Grid ein (Groesse einstellbar)
- **Zoom**: Mausrad+Strg oder Zoom-Buttons (25% bis 300%)
- **Minimap**: Uebersicht ueber das gesamte Level
- **Undo/Redo**: Strg+Z / Strg+Y (bis 50 Schritte)
- **Copy/Paste**: Strg+C / Strg+V zum Kopieren/Einfuegen
- **Duplikat**: Strg+D zum Duplizieren der Auswahl
- **Loeschen**: Entf-Taste
- **Layer-Sichtbarkeit**: Einzelne Layer ein-/ausblenden
- **Objekt-Liste**: Alle Objekte mit Filter, Klick springt zur Position
- **Level-Validierung**: Prueft auf Probleme (Spawn auf Plattform, Exit erreichbar, etc.)
- **Auto-Save**: Alle 30 Sekunden automatische Speicherung
- **Export**: JS-Level-Code erzeugen und kopieren
- **Import**: JS-Level-Code einfuegen und importieren
- **Lokales Speichern/Laden**: Ueber localStorage

### Level-Datenstruktur

Ein Level wird als JavaScript-Objekt exportiert:

```js
export const level5 = {
    name: 'Neon Factory',
    spawn: { x: 80, y: 252 },
    background: 'assets/backgrounds/level5-bg.png',
    music: 'level5',
    platforms: [
        { x: 0, y: 412, width: 620, height: 40 },
    ],
    shadowPlatforms: [
        { x: 930, y: 240, width: 140, height: 24 },
    ],
    gems: [
        { x: 400, y: 340 },
    ],
    bonusBlocks: [
        { x: 200, y: 200, width: 42, height: 42, reward: 'gem' },
    ],
    enemies: [
        { type: 'walker', x: 500, y: 362, width: 46, height: 50, minX: 400, maxX: 700, speed: 120, direction: 1, health: 2, active: true },
        { type: 'drone', x: 800, y: 200, width: 38, height: 38, speed: 65, health: 2, canShoot: true, shootDelay: 2.0, ... },
        { type: 'shield', x: 1200, y: 362, width: 46, height: 50, speed: 80, health: 3, shieldHP: 4, canShoot: true, ... },
        { type: 'mech', x: 1600, y: 348, width: 56, height: 64, speed: 55, health: 7, chargeSpeed: 700, ... },
        { type: 'turret', x: 2000, y: 370, width: 42, height: 42, speed: 0, health: 5, canShoot: true, shootDelay: 0.85, ... },
        { type: 'ninja', x: 2400, y: 362, width: 42, height: 50, speed: 170, health: 3, shadowOnly: true, ... },
    ],
    hackTerminals: [
        { x: 800, y: 350, width: 36, height: 52, difficulty: 'medium', reward: 'deactivate_enemies', targetId: 'deactivate', hacked: false },
    ],
    checkpoints: [
        { x: 1400, y: 332, width: 60, height: 80, activated: false },
    ],
    keys: [
        { x: 640, y: 320, width: 26, height: 26, collected: false },
    ],
    fx: {
        stars: false,
        fog: true,
        rain: false,
        scanlines: true,
        neonDust: true,
        sparks: false,
        warningLights: false,
    },
    exit: {
        x: 3060, y: 302, width: 70, height: 100,
        locked: true,
        keysRequired: 3,
        unlockMode: 'allGemsOrEnemiesOrKeys',
    },
};
```

---

## Projektstruktur

```text
shadowrunner/
├── index.html              # Hauptspiel
├── editor.html             # Level-Editor
├── LICENSE
├── README.md
├── css/
│   ├── game.css            # Spiel-Styles
│   └── editor.css          # Editor-Styles
├── js/
│   ├── main.js             # Game-Loop, Init, Render-Orchestrierung
│   ├── config.js           # Spiel-Konstanten (Gravity, Speed, etc.)
│   ├── gameState.js        # Zentraler State (Single Source of Truth)
│   ├── player.js           # Player-Klasse (Movement, Shadow, Wall-Jump, Combo)
│   ├── camera.js           # Kamera-System mit Shake
│   ├── collision.js        # Kollisionserkennung, Raycast
│   ├── input.js            # Keyboard + Gamepad Input mit Custom Bindings
│   ├── levels.js           # Level-Registry (9 Level, 1 prozedural)
│   ├── level1.js           # Level 1
│   ├── level2.js           # Level 2
│   ├── level3.js           # Level 3
│   ├── level4Boss.js       # Level 4 - Boss-Level
│   ├── level5Procedural.js # Level 5 - Prozedural generiert
│   ├── level6.js           # Level 6
│   ├── level7.js           # Level 7
│   ├── level8.js           # Level 8
│   ├── level9Boss.js       # Level 9 - Zweiter Boss
│   ├── levelManager.js     # Level-Zustaende, Transitions, Pickups
│   ├── level-editor.js     # Level-Editor
│   ├── enemySystem.js      # Gegner-KI, Projektile, Schild-Logik
│   ├── bossSystem.js       # Boss-KI, Phasen, Projektile
│   ├── weapons.js          # Waffen-Definitionen und Stats
│   ├── projectile.js       # Projektil-Klasse
│   ├── powerups.js         # Floating Items, Reward-System
│   ├── particles.js        # Partikel-System
│   ├── screens.js          # Level-Complete, Game-Over, Messages
│   ├── hudSystem.js        # HUD, Speedrun-Timer
│   ├── audioManager.js     # Musik & Sound, Volume-Controls
│   ├── hackingMinigame.js  # Matrix-Hacking Minispiel
│   ├── shopSystem.js       # In-Game Shop (Terminals + Between-Levels)
│   ├── saveSystem.js       # Save/Load ueber localStorage
│   ├── optionsMenu.js      # Options-Menue (Volume, Fullscreen, Gamepad)
│   ├── intro.js            # Intro-Sequenz
│   ├── titleScreen.js      # Title-Screen mit Menue
│   ├── creditsScreen.js    # Credits-Screen
│   ├── spriteManager.js    # Sprite-Animations-System
│   ├── levelFx.js          # Level-Visualeffekte (Nebel, Regen, etc.)
│   ├── neonSync.js         # Musik-gesteuerte visuelle Effekte
│   ├── shadow-player-effects.js  # Shadow-Energie-Balken
│   ├── shadow-enemy-effects.js   # Shadow-Gegner-Auren
│   └── key-portal-system.js      # Keys + Portal-Unlock-Logik
├── assets/
│   ├── audio/              # Musik & Soundeffekte (.mp3)
│   ├── backgrounds/        # Level-Hintergruende (.png)
│   ├── sprites/
│   │   ├── player/         # Spieler-Sprites (run, idle, jump, dash, wallslide, shoot)
│   │   └── enemies/        # Gegner-Spritesheets + Frame-Daten
│   └── ui/                 # HUD-Elemente, Title-Screen
└── sprites/
    └── enemies/            # Zusaetzliche Gegner-Sprites
```

---

## Options-Menue

Ueber das Pause-Menue oder den Title-Screen erreichbar:

- **Master Volume**: Gesamtlautstaerke (0-100%)
- **Music Volume**: Musik-Lautstaerke (0-100%)
- **SFX Volume**: Soundeffekt-Lautstaerke (0-100%)
- **Mute**: Alle Audio-Ausgabe stumm schalten
- **Fullscreen**: Vollbild-Modus umschalten
- **Gamepad Config**: Tastenbelegung fuer Gamepad anpassen
- **Speedrun Timer**: Speedrun-Timer im HUD ein-/ausschalten

Einstellungen werden in localStorage gespeichert.

---

## Entwicklungsstand

ShadowRunner ist ein aktiver Prototyp. Viele Systeme sind bereits spielbar, aber noch nicht final balanciert.

### Implementiert

- Core Movement (Laufen, Springen, Wall-Slide, Wall-Jump)
- 6 Waffentypen mit Leveling bis LV3
- 6 Gegnertypen (Walker, Drone, Shield, Mech, Turret, Ninja)
- 2 Boss-Level mit Phasenlogik
- Shadow Shift + Shadow Dash + Dash-Attack
- Shadow-Plattformen und Shadow-Gegner
- Combo-System (x2/x3/x5 Multiplikator)
- Checkpoint-System
- Keys und Portal-Unlock-System
- Hacking Minigame (Matrix-Stil)
- Shop-System (8 Items, in-Level + Between-Levels)
- Save/Load-System
- Options-Menue (Volume, Fullscreen, Gamepad, Speedrun)
- Gamepad-Support mit Custom Bindings
- Neon-Sync (Musik-gesteuerte Visualeffekte)
- 9 Level (inkl. 1 prozedural generiert)
- Sprite-Animationen (Player + Gegner)
- Level-Editor mit allen Features
- Partikel-System
- Buff-Indikatoren im HUD

---

## Roadmap

### Kurzfristig

- [ ] Laser-Grid und Tripwire als Hazard-Typen im Editor
- [ ] Shop-Terminals im Level-Editor
- [ ] Bonusbloecke mit Multi-Hit (hitsLeft) im Editor
- [ ] Portal-Opening mit Sound und Partikel-Burst
- [ ] Waffen-Level deutlicher im HUD anzeigen
- [ ] Shadow-Energie groesser im HUD anzeigen
- [ ] Dash-Trail / Afterimages einbauen

### Gameplay

- [ ] Weitere Hazard-Typen (Laser-Grid, Tripwire, Falling Blocks)
- [ ] Shadow-only Gems
- [ ] Geheime Shadow-Routen
- [ ] Boss mit Shadow-Phase
- [ ] Bessere Schwierigkeitskurve
- [ ] Mehr Level (10+)

### Effekte & Atmosphaere

- [ ] Staerkere Explosionen
- [ ] Bessere Muzzle-Flashes
- [ ] Treffer-Feedback verbessern
- [ ] Parallax-Hintergruende ausbauen
- [ ] Level-spezifische FX weiter verfeinern

### Progression

- [ ] Highscore-System
- [ ] Top-10-Liste
- [ ] Level-Ranking
- [ ] Mehr Shop-Items

---

## Lokaler Start

Lokal ueber einen Webserver starten, damit JavaScript-Module korrekt geladen werden.

Beispiel mit PHP:

```bash
php -S localhost:8000
```

Dann oeffnen:

```text
http://localhost:8000/
```

Level-Editor:

```text
http://localhost:8000/editor.html
```

Alternativ ueber Python:

```bash
python3 -m http.server 8000
```

Oder ueber Laragon, Apache oder GitHub Pages starten.

---

## Architektur

### Module-System

Alle JavaScript-Dateien nutzen ES6-Module (`import`/`export`). Der zentrale State liegt in `gameState.js` als Single Source of Truth. Module importieren den State und arbeiten darauf, anstatt globale Variablen zu nutzen.

### Game-Loop

```text
requestAnimationFrame
    → update(dt)      # Physik, Input, KI, Kollisionen
    → render()        # Hintergrund, Plattformen, Entities, FX, HUD
```

`dt` ist auf max 33ms gecappt (ca. 30 FPS Mindestfrequenz).

### State-Maschine

```text
intro → title → playing → levelComplete → playing → ... → credits
                      ↘ gameOver → playing (Retry) / title (Esc)
```

Waehrend `playing` koennen folgende Overlay-Zustaende aktiv sein:

- **Pause** (Esc/P) → friert alles, speichert Spiel
- **Hacking** (Terminal-Interaktion) → friert Gameplay, Minispiel laeuft
- **Shop** (Terminal/Level-Complete) → friert Gameplay, Shop laeuft
- **Options** (aus Pause/Title) → friert alles

---

## Lizenz

Noch nicht final festgelegt.
