# ShadowRunner

[▶️ ShadowRunner jetzt spielen](https://ruddat.github.io/shadowrunner/)

**ShadowRunner** ist ein browserbasiertes 2D-Action-Jump-and-Run im Neon-Retro-Stil.  
Das Spiel läuft direkt im Browser über **HTML5 Canvas** und **modulare JavaScript-Dateien**.

Der aktuelle Fokus liegt auf schnellem Movement, Run-and-Gun-Action, Shadow-Mechaniken, Waffen-Upgrades, Keys, Portalen, Gegnern, Bosskämpfen und einem eigenen Level-Editor.

---

## Live-Demo

Das Spiel ist über GitHub Pages spielbar:

```text
https://ruddat.github.io/shadowrunner/
```

Hinweis: Browser starten Audio meist erst nach einer Benutzeraktion. Ein Klick oder Tastendruck im Spiel reicht normalerweise aus.

---

## Spielkonzept

Du steuerst einen Runner durch futuristische Neon-Level. Du springst über Plattformen, sammelst Gems und Keys, nutzt Waffen-Upgrades, aktivierst Bonusblöcke und kämpfst dich durch normale und Shadow-Gegner.

Der Levelausgang ist als Portal umgesetzt. Je nach Level kann das Portal durch verschiedene Ziele geöffnet werden:

- alle Keys sammeln
- alle Gems sammeln
- alle Gegner besiegen
- oder eine Kombination dieser Bedingungen

Dadurch entstehen verschiedene Lösungswege: Sammelroute, Kampfroute oder Shadow-Route.

---

## Aktuelle Highlights

- HTML5-Canvas-Spiel mit 960×540 Auflösung
- Modulare JavaScript-Struktur
- Intro-, Title-, Credits-, Level-Complete- und Game-Over-Screen
- Kamera-System
- Plattforming mit Gravitation und Kollisionen
- Gems und Keys als Collectibles
- Portal-Exit mit Lock/Unlock-System
- Bonusblöcke mit Rewards
- mehrere Waffentypen
- Waffen-Leveling bis Level 3
- Gegner mit Bewegung und Schusslogik
- Shadow-Gegner
- Shadow Shift
- Shadow Dash
- Shadow-Plattformen
- Level-FX wie Nebel, Sterne, Regen, Scanlines und Neon Dust
- Musik und Soundeffekte über AudioManager
- Boss-Level mit Phasenlogik
- separater Level-Editor

---

## Steuerung

| Aktion | Taste |
|---|---|
| Links laufen | `A` oder `←` |
| Rechts laufen | `D` oder `→` |
| Springen | `W`, `↑` oder `Space` |
| Schießen | `J` oder `Left Ctrl` |
| Shadow Shift halten | `K` oder `Left Shift` |
| Shadow Dash | `L` oder `Right Shift` |
| Debug-Waffen wechseln | `1` bis `6` |

---

## Shadow-System

### Shadow Shift

Mit Shadow Shift wechselt der Spieler kurz in eine Shadow-Ebene.

Effekte:

- andere Player-Farbe
- violette Aura
- Shadow-Energieverbrauch
- leicht schnelleres Movement
- leicht stärkerer Sprung
- weniger eingehender Schaden
- schnellere Schussrate
- Shadow-Plattformen werden aktiv

### Shadow Dash

Der Shadow Dash ist ein kurzer Burst nach vorne.

Eigenschaften:

- funktioniert auch in der Luft
- verbraucht Shadow-Energie
- hat Cooldown
- erzeugt stärkeren Glow
- eignet sich für Ausweichen, weite Sprünge und Speed-Routen

### Shadow-Plattformen

Level können zusätzliche Plattformen definieren:

```js
shadowPlatforms: [
    { x: 930, y: 240, width: 140, height: 24 },
]
```

Diese Plattformen sind nur während Shadow Shift aktiv.

### Shadow-Gegner

Gegner können als Shadow-Gegner markiert werden:

```js
{
    shadowOnly: true,
    x: 360,
    y: 362,
    width: 46,
    height: 50,
    minX: 260,
    maxX: 560,
    speed: 120,
    direction: 1,
    health: 4,
}
```

Sie werden geisterhaft dargestellt und sind im Shadow Mode klarer sichtbar.

---

## Keys und Portal-System

Level können Keys platzieren:

```js
keys: [
    { x: 640, y: 320 },
    { x: 1460, y: 320 },
    { x: 2480, y: 340 },
]
```

Der Exit kann gesperrt sein:

```js
exit: {
    x: 3060,
    y: 302,
    width: 70,
    height: 100,
    locked: true,
    keysRequired: 3,
    unlockMode: 'allGemsOrEnemiesOrKeys',
}
```

Aktuelle Unlock-Modi:

- `allGems`
- `allEnemies`
- `allGemsOrEnemiesOrKeys`

---

## Waffen-System

Aktuelle Waffen:

- Basic Blaster
- Spread Shot
- Neon Laser
- Wave Beam
- Bounce Shot
- Plasma Grenade

Waffen können bis Level 3 verbessert werden. Wenn der Spieler eine Waffenbox aufsammelt, wird zuerst die aktuelle Spezialwaffe hochgelevelt. Erst wenn sie Level 3 erreicht hat, kann eine neue Spezialwaffe übernommen werden.

Beispiel:

```text
Spread LV1 → Waffenbox → Spread LV2 → Waffenbox → Spread LV3 → Waffenbox → Laser LV1
```

---

## Level-Editor

Zusätzlich zum Spiel gibt es einen einfachen Level-Editor:

```text
/editor.html
```

Der Editor unterstützt aktuell:

- Plattformen setzen
- Gems setzen
- Gegner setzen
- Bonusblöcke setzen
- Spawn setzen
- Exit setzen
- Objekte auswählen und verschieben
- Kamera scrollen
- Level-Code exportieren
- Level-Code importieren
- lokales Speichern über localStorage

Geplante Editor-Erweiterungen:

- Shadow-Plattformen direkt im Editor setzen
- Keys setzen
- Portal-Regeln konfigurieren
- Gegner-Optionen bearbeiten
- Test-Button zum direkten Starten eines Levels

---

## Projektstruktur

```text
shadowrunner/
├── index.html
├── editor.html
├── css/
│   ├── game.css
│   └── editor.css
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
│   ├── level4Boss.js
│   ├── level-editor.js
│   ├── shadow-player-effects.js
│   ├── shadow-enemy-effects.js
│   └── key-portal-system.js
└── assets/
    ├── audio/
    ├── backgrounds/
    └── ui/
```

---

## Entwicklungsstand

ShadowRunner ist ein aktiver Prototyp. Viele Systeme sind bereits spielbar, aber noch nicht final balanciert.

Aktuell umgesetzt:

- Core Movement
- Waffen
- Waffen-Leveling
- Gegner
- Boss-Level
- Shadow Shift
- Shadow Dash
- Shadow-Plattformen
- Shadow-Gegner
- Keys
- Portal-Unlock-System
- Level-Editor

---

## Roadmap

### Kurzfristig

- [ ] Key-/Portal-System weiter polishen
- [ ] Shadow-Gegner nur im Shadow Mode verwundbar machen
- [ ] Portal-Opening mit Sound und Partikel-Burst ergänzen
- [ ] Waffen-Level deutlicher im HUD anzeigen
- [ ] Shadow-Energie größer im HUD anzeigen
- [ ] Dash-Trail / Afterimages einbauen
- [ ] Level-Editor um Shadow-Plattformen und Keys erweitern

### Gameplay

- [ ] weitere Gegnertypen
- [ ] fliegende Gegner
- [ ] Schild-Gegner
- [ ] Shadow-only Gems
- [ ] geheime Shadow-Routen
- [ ] Boss mit Shadow-Phase
- [ ] bessere Schwierigkeitskurve

### Effekte & Atmosphäre

- [ ] stärkere Explosionen
- [ ] bessere Muzzle-Flashes
- [ ] Treffer-Feedback verbessern
- [ ] Parallax-Hintergründe ausbauen
- [ ] Level-spezifische FX weiter verfeinern

### Sound

- [ ] Shadow Shift Sound
- [ ] Dash Sound
- [ ] Key Pickup Sound
- [ ] Portal Open Sound
- [ ] Boss-Sounds erweitern
- [ ] Lautstärke-/Mute-System

### Progression

- [ ] Highscore-System
- [ ] Top-10-Liste
- [ ] localStorage-Speicherung
- [ ] Level-Ranking
- [ ] Skill-/Upgrade-System prüfen

---

## Lokaler Start

Einfach lokal über einen kleinen Webserver öffnen, damit JavaScript-Module korrekt geladen werden.

Beispiel mit PHP:

```bash
php -S localhost:8000
```

Dann öffnen:

```text
http://localhost:8000/
```

Level-Editor:

```text
http://localhost:8000/editor.html
```

Alternativ über Laragon, Apache oder GitHub Pages starten.

---

## Lizenz

Noch nicht final festgelegt.
