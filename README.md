# ShadowRunner

**ShadowRunner** ist ein browserbasiertes 2D-Action-Game im Neon-Retro-Stil.

Das Spiel läuft direkt im Browser über HTML5 Canvas und JavaScript-Module. Ziel ist ein schnelles Arcade-Feeling mit Plattformen, Gegnern, Waffen-Upgrades, Powerups, Level-FX, Bosskämpfen, Musik und klassischen Run-and-Gun-Mechaniken.

---

## 🎮 Spielkonzept

Du steuerst einen Runner durch futuristische Neon-Level, sammelst Gems, findest Waffen-Upgrades, aktivierst Bonusblöcke und kämpfst dich durch Gegner bis zum Levelausgang.

Das Spiel setzt auf direkte Steuerung, schnelles Feedback, sichtbare Powerups und klare Levelprogression.

---

## ✨ Aktuelle Features

- HTML5-Canvas-Spiel mit 960x540 Auflösung
- Modularer JavaScript-Aufbau
- Intro-Screen
- Title-Screen
- Credits-Screen
- Kamera-System
- Spielerbewegung mit Gravitation und Sprungmechanik
- Plattform-Level
- Gems / Collectibles
- Bonusblöcke mit Rewards
- Powerups
- mehrere Waffentypen
- Gegner mit Bewegung und Schusslogik
- Level-FX wie Nebel, Sterne, Regen, Scanlines, Neon Dust und Warnlichter
- Musik und Soundeffekte über AudioManager
- Level-Complete-Screen
- Game-Over-Screen
- Boss-Level mit Phasenlogik

---

## 🧱 Projektstruktur

```text
shadowrunner/
├── index.html
├── css/
│   └── game.css
├── js/
│   ├── main.js
│   ├── config.js
│   ├── player.js
│   ├── camera.js
│   ├── collision.js
│   ├── input.js
│   ├── intro.js
│   ├── titleScreen.js
│   ├── creditsScreen.js
│   ├── particles.js
│   ├── powerups.js
│   ├── weapons.js
│   ├── audioManager.js
│   ├── levelFx.js
│   ├── levels.js
│   ├── level1.js
│   ├── level2.js
│   ├── level3.js
│   └── level4Boss.js
└── assets/
    ├── audio/
    ├── backgrounds/
    └── ui/