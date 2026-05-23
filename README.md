# ShadowRunner
[▶️ ShadowRunner jetzt spielen](https://ruddat.github.io/shadowrunner/)


**ShadowRunner** ist ein browserbasiertes 2D-Action-Game im Neon-Retro-Stil.

Das Spiel läuft direkt im Browser über HTML5 Canvas und JavaScript-Module. Ziel ist ein schnelles Arcade-Feeling mit Plattformen, Gegnern, Waffen-Upgrades, Powerups, Level-FX, Bosskämpfen, Musik und klassischen Run-and-Gun-Mechaniken.


---

## 🚀 Live-Demo

Das Spiel ist direkt über GitHub Pages spielbar:

**https://ruddat.github.io/shadowrunner/**

> Hinweis: Beim ersten Laden können Browser Audio erst nach einer Benutzeraktion starten. Ein Klick oder Tastendruck im Spiel reicht normalerweise aus.

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

## 🧩 TODO / Entwicklungsplan

### 🎮 Gameplay

- [ ] Steuerung final abstimmen und dokumentieren
- [ ] Trefferfeedback beim Spieler verbessern
- [ ] Gegner-Kollisionen weiter verfeinern
- [ ] Knockback / Rückstoß bei Treffern einbauen
- [ ] Powerups stärker sichtbar machen
- [ ] Bonusblöcke visuell klarer animieren
- [ ] Waffen-Upgrades im Spiel besser erklären
- [ ] Schwierigkeitskurve pro Level feiner ausbalancieren

### 🔫 Waffen

- [ ] Waffenwerte final balancen
- [ ] Spread Shot optisch stärker machen
- [ ] Laser mit besserem Impact-Effekt versehen
- [ ] Plasma-Explosion erweitern
- [ ] Bounce Shot besser visualisieren
- [ ] Waffen-Level deutlicher im HUD anzeigen
- [ ] seltene Spezialwaffe einbauen

### 👾 Gegner & Bosskämpfe

- [ ] neue Gegnertypen ergänzen
- [ ] fliegende Gegner einbauen
- [ ] Gegner mit Schild einbauen
- [ ] Gegner mit Nahkampfangriff einbauen
- [ ] Boss-Patterns erweitern
- [ ] Boss-Treffer optisch stärker darstellen
- [ ] Boss-Intro vor Kampfbeginn einbauen
- [ ] Boss-Explosion nach Sieg verbessern

### 🌆 Level & Content

- [ ] Level 1 final polishen
- [ ] Level 2 weiter ausbauen
- [ ] Level 3 weiter ausbauen
- [ ] Boss-Level verfeinern
- [ ] neue Plattform-Layouts testen
- [ ] mehr Collectibles platzieren
- [ ] geheime Bereiche einbauen
- [ ] Levelübergänge verbessern

### ⚡ Effekte & Atmosphäre

- [ ] Explosionen erweitern
- [ ] Partikeleffekte ausbauen
- [ ] Screen Shake bei starken Treffern einbauen
- [ ] bessere Muzzle-Flashes für Waffen
- [ ] Neon-Glow an wichtigen Objekten verstärken
- [ ] Regen/Fog/Scanlines je Level optimieren
- [ ] Parallax-Hintergründe prüfen

### 🔊 Sound & Musik

- [ ] weitere Schuss-Sounds ergänzen
- [ ] Treffer-Sounds verbessern
- [ ] Boss-Sounds ergänzen
- [ ] Pickup-Sounds finalisieren
- [ ] Level-Musik sauber loopen
- [ ] Audio-Lautstärke zentral steuerbar machen
- [ ] Mute-Funktion einbauen

### 🖥️ UI / HUD

- [ ] HUD weiter verfeinern
- [ ] Lebensanzeige klarer darstellen
- [ ] Waffenanzeige verbessern
- [ ] Score-Anzeige ausbauen
- [ ] Level-Complete-Screen polishen
- [ ] Game-Over-Screen polishen
- [ ] Pause-Menü einbauen

### 💾 Progress & Highscore

- [ ] Highscore-System einbauen
- [ ] Initialen-Eingabe für Highscore ergänzen
- [ ] Speicherung im Browser über localStorage
- [ ] Top-10-Liste anzeigen
- [ ] Fortschritt optional speichern
- [ ] Reset-Funktion für Highscores

### 📱 Kompatibilität

- [ ] Mobile Darstellung prüfen
- [ ] Touch-Steuerung testen
- [ ] Vollbildmodus ergänzen
- [ ] Browser-Kompatibilität prüfen
- [ ] Performance auf schwächeren Geräten testen

### 📦 GitHub / Release

- [ ] README weiter verbessern
- [ ] Screenshots ergänzen
- [ ] Gameplay-GIF einbauen
- [ ] GitHub Topics setzen
- [ ] Repo-Beschreibung optimieren
- [ ] Lizenzentscheidung treffen
- [ ] erste spielbare Version als Release taggen

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