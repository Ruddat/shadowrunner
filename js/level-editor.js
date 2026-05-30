const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

// --- State ---
const state = {
    tool: 'select',
    cameraX: 0,
    zoom: 1,
    minZoom: 0.25,
    maxZoom: 3,
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
    dragging: false,
    drawing: false,
    drawStart: null,
    dragStart: null,
    selected: null,
    level: createEmptyLevel(),
    undoStack: [],
    redoStack: [],
    maxUndo: 50,
    currentEnemyType: 'walker',
    clipboard: null,
    layerVisibility: {
        platforms: true,
        shadowPlatforms: true,
        gems: true,
        bonusBlocks: true,
        enemies: true,
        hackTerminals: true,
        shopTerminals: true,
        checkpoints: true,
        keys: true,
    },
    autoSaveInterval: null,
    lastAutoSave: null,
};

const COLORS = {
    platform: '#64f4ff',
    shadowPlatform: '#b388ff',
    gem: '#ffd166',
    bonusBlock: '#ff3fd5',
    enemy: '#ff4d6d',
    enemyDrone: '#ff6b00',
    enemyShield: '#3b82f6',
    enemyMech: '#dc2626',
    enemyTurret: '#a855f7',
    enemyNinja: '#22d3ee',
    hackTerminal: '#ff6600',
    shopTerminal: '#c084fc',
    checkpoint: '#22c55e',
    spawn: '#55ff9c',
    exit: '#b388ff',
    key: '#facc15',
    selected: '#ffffff',
    drawing: '#ff2bd6',
};

const ENEMY_TYPES = ['walker', 'drone', 'shield', 'mech', 'turret', 'ninja'];

function createEmptyLevel() {
    return {
        name: 'Neon Factory',
        spawn: { x: 80, y: 252 },
        background: 'assets/backgrounds/level5-bg.png',
        music: 'level5',
        platforms: [
            { x: 0, y: 412, width: 620, height: 40 },
        ],
        shadowPlatforms: [],
        gems: [],
        bonusBlocks: [],
        enemies: [],
        hackTerminals: [],
        shopTerminals: [],
        checkpoints: [],
        keys: [],
        fx: {
            stars: false,
            fog: true,
            rain: false,
            scanlines: true,
            neonDust: true,
            sparks: false,
            warningLights: false,
        },
        exit: { x: 900, y: 312, width: 70, height: 100, locked: false },
    };
}

function $(id) {
    return document.getElementById(id);
}

function grid() {
    return Math.max(5, Number($('gridSize').value || 20));
}

function levelWidth() {
    return Math.max(960, Number($('levelWidth').value || 4600));
}

function snap(value) {
    const g = grid();
    return Math.round(value / g) * g;
}

function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) * (canvas.width / rect.width);
    const sy = (clientY - rect.top) * (canvas.height / rect.height);
    // Apply inverse zoom + camera to get world coordinates
    const worldX = (sx / state.zoom) + state.cameraX;
    const worldY = (sy / state.zoom);
    return { x: snap(worldX), y: snap(worldY), sx, sy };
}

function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('#toolButtons button').forEach((button) => {
        button.classList.toggle('active', button.dataset.tool === tool);
    });
    $('currentToolLabel').textContent = toolLabel(tool);

    // Show/hide enemy type sub-tools
    const enemySubTools = $('enemySubTools');
    if (enemySubTools) {
        enemySubTools.style.display = tool === 'enemy' ? 'block' : 'none';
    }
}

function toolLabel(tool) {
    return {
        select: 'Auswählen',
        platform: 'Plattform',
        shadowPlatform: 'Shadow-Plattf.',
        gem: 'Gem',
        bonusBlock: 'Bonusblock',
        enemy: 'Gegner',
        hackTerminal: 'Hack-Terminal',
        shopTerminal: 'Shop-Terminal',
        checkpoint: 'Checkpoint',
        spawn: 'Spawn',
        exit: 'Exit',
        key: 'Schlüssel',
    }[tool] || tool;
}

function getEnemyColor(type) {
    return {
        drone: COLORS.enemyDrone,
        shield: COLORS.enemyShield,
        mech: COLORS.enemyMech,
        turret: COLORS.enemyTurret,
        ninja: COLORS.enemyNinja,
    }[type] || COLORS.enemy;
}

// --- Zoom ---

function setZoom(newZoom) {
    state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, newZoom));
    $('zoomLevel').textContent = Math.round(state.zoom * 100) + '%';
    applyZoomTransform();
}

function applyZoomTransform() {
    canvas.style.transform = `scale(${state.zoom})`;
    canvas.style.transformOrigin = '0 0';
}

// --- Undo/Redo ---

function saveUndoState() {
    const snapshot = JSON.parse(JSON.stringify(state.level));
    state.undoStack.push(snapshot);
    if (state.undoStack.length > state.maxUndo) {
        state.undoStack.shift();
    }
    state.redoStack = [];
}

function undo() {
    if (state.undoStack.length === 0) return;
    const currentSnapshot = JSON.parse(JSON.stringify(state.level));
    state.redoStack.push(currentSnapshot);
    state.level = state.undoStack.pop();
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
}

function redo() {
    if (state.redoStack.length === 0) return;
    const currentSnapshot = JSON.parse(JSON.stringify(state.level));
    state.undoStack.push(currentSnapshot);
    state.level = state.redoStack.pop();
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
}

// --- Copy/Paste/Duplicate ---

function copySelected() {
    if (!state.selected) return;
    const { group, item } = state.selected;
    state.clipboard = {
        group,
        data: JSON.parse(JSON.stringify(item)),
    };
    showNotification('Kopiert!');
}

function pasteClipboard() {
    if (!state.clipboard) return;
    const { group, data } = state.clipboard;
    const offset = grid();

    if (group === 'spawn' || group === 'exit') {
        // For spawn/exit, just move them
        saveUndoState();
        if (group === 'spawn') {
            state.level.spawn = { x: data.x + offset, y: data.y + offset };
            selectObject('spawn', state.level.spawn);
        } else {
            state.level.exit = { ...data, x: data.x + offset, y: data.y + offset };
            selectObject('exit', state.level.exit);
        }
    } else if (Array.isArray(state.level[group])) {
        saveUndoState();
        const pasted = JSON.parse(JSON.stringify(data));
        pasted.x += offset;
        pasted.y += offset;

        // Shift patrol range for enemies
        if (group === 'enemies') {
            pasted.minX += offset;
            pasted.maxX += offset;
        }

        state.level[group].push(pasted);
        selectObject(group, pasted);
    }

    updatePanels();
    showNotification('Eingefügt!');
}

function duplicateSelected() {
    if (!state.selected) return;
    // Copy then paste
    copySelected();
    pasteClipboard();
}

// --- Sync ---

function syncLevelFromForm() {
    state.level.name = $('levelName').value || 'Untitled Level';
    state.level.background = $('background').value || '';
    state.level.music = $('music').value || 'level1';
    state.level.fx = {
        stars: $('fxStars').checked,
        fog: $('fxFog').checked,
        rain: $('fxRain').checked,
        scanlines: $('fxScanlines').checked,
        neonDust: $('fxNeonDust').checked,
        sparks: $('fxSparks').checked,
        warningLights: $('fxWarningLights').checked,
    };
}

function syncFormFromLevel() {
    $('levelName').value = state.level.name || '';
    $('background').value = state.level.background || '';
    $('music').value = state.level.music || '';
    $('fxStars').checked = !!state.level.fx?.stars;
    $('fxFog').checked = !!state.level.fx?.fog;
    $('fxRain').checked = !!state.level.fx?.rain;
    $('fxScanlines').checked = !!state.level.fx?.scanlines;
    $('fxNeonDust').checked = !!state.level.fx?.neonDust;
    $('fxSparks').checked = !!state.level.fx?.sparks;
    $('fxWarningLights').checked = !!state.level.fx?.warningLights;
}

// --- Object creation ---

function addObject(type, x, y) {
    saveUndoState();
    let item = null;

    if (type === 'platform') {
        item = { x, y, width: 220, height: 32 };
        state.level.platforms.push(item);
        selectObject('platforms', item);
    }

    if (type === 'shadowPlatform') {
        item = { x, y, width: 160, height: 24 };
        if (!state.level.shadowPlatforms) state.level.shadowPlatforms = [];
        state.level.shadowPlatforms.push(item);
        selectObject('shadowPlatforms', item);
    }

    if (type === 'gem') {
        item = { x, y, collected: false };
        state.level.gems.push(item);
        selectObject('gems', item);
    }

    if (type === 'bonusBlock') {
        item = { x, y, width: 42, height: 42, used: false, bumpTimer: 0, reward: 'gem' };
        state.level.bonusBlocks.push(item);
        selectObject('bonusBlocks', item);
    }

    if (type === 'enemy') {
        const enemyType = state.currentEnemyType || 'walker';
        item = createEnemyByType(enemyType, x, y);
        state.level.enemies.push(item);
        selectObject('enemies', item);
    }

    if (type === 'hackTerminal') {
        item = {
            x, y,
            width: 36,
            height: 52,
            difficulty: 'medium',
            reward: 'deactivate_enemies',
            targetId: 'deactivate',
            hacked: false,
            nearPlayer: false,
        };
        if (!state.level.hackTerminals) state.level.hackTerminals = [];
        state.level.hackTerminals.push(item);
        selectObject('hackTerminals', item);
    }

    if (type === 'shopTerminal') {
        item = {
            x, y,
            width: 44,
            height: 60,
            singleUse: false,
            nearPlayer: false,
        };
        if (!state.level.shopTerminals) state.level.shopTerminals = [];
        state.level.shopTerminals.push(item);
        selectObject('shopTerminals', item);
    }

    if (type === 'checkpoint') {
        item = { x, y, width: 60, height: 80, activated: false };
        if (!state.level.checkpoints) state.level.checkpoints = [];
        state.level.checkpoints.push(item);
        selectObject('checkpoints', item);
    }

    if (type === 'key') {
        item = { x, y, width: 26, height: 26, collected: false };
        if (!state.level.keys) state.level.keys = [];
        state.level.keys.push(item);
        selectObject('keys', item);
    }

    if (type === 'spawn') {
        state.level.spawn = { x, y };
        selectObject('spawn', state.level.spawn);
    }

    if (type === 'exit') {
        state.level.exit = { x, y, width: 70, height: 100, locked: false };
        selectObject('exit', state.level.exit);
    }

    updatePanels();
}

function createEnemyByType(type, x, y) {
    const base = {
        x, y,
        width: 46,
        height: 50,
        minX: x - 100,
        maxX: x + 160,
        speed: 120,
        direction: 1,
        health: 2,
        active: true,
    };

    switch (type) {
        case 'drone':
            return {
                ...base,
                type: 'drone',
                y: y - 100,
                width: 38,
                height: 38,
                speed: 65,
                health: 2,
                canShoot: true,
                shootDelay: 2.0,
                shootRangeX: 400,
                shootRangeY: 220,
                projectileSpeed: 280,
                projectileColor: '#ff6b00',
            };
        case 'shield':
            return {
                ...base,
                type: 'shield',
                speed: 80,
                health: 3,
                shieldHP: 4,
                canShoot: true,
                shootDelay: 1.8,
                shootRangeX: 500,
                shootRangeY: 180,
                projectileSpeed: 320,
                projectileColor: '#3b82f6',
            };
        case 'mech':
            return {
                ...base,
                type: 'mech',
                width: 56,
                height: 64,
                speed: 55,
                health: 7,
                chargeSpeed: 700,
                chargeRange: 400,
            };
        case 'turret':
            return {
                ...base,
                type: 'turret',
                width: 42,
                height: 42,
                speed: 0,
                minX: x,
                maxX: x + 42,
                health: 5,
                canShoot: true,
                shootDelay: 0.85,
                shootRangeX: 520,
                shootRangeY: 400,
                projectileSpeed: 400,
                projectileColor: '#a855f7',
            };
        case 'ninja':
            return {
                ...base,
                type: 'ninja',
                width: 42,
                height: 50,
                speed: 170,
                health: 3,
                canShoot: true,
                shootDelay: 1.6,
                shootRangeX: 400,
                shootRangeY: 200,
                projectileSpeed: 380,
                projectileColor: '#22d3ee',
            };
        default:
            return {
                ...base,
                canShoot: false,
            };
    }
}

function selectObject(group, item) {
    state.selected = { group, item };
    updateSelectionPanel();
    updateObjectList();
}

// --- Hit testing ---

function hitTest(worldX, worldY) {
    const tests = [];

    for (const item of state.level.platforms) tests.push({ group: 'platforms', item, rect: item });
    if (state.level.shadowPlatforms) {
        for (const item of state.level.shadowPlatforms) tests.push({ group: 'shadowPlatforms', item, rect: item });
    }
    for (const item of state.level.bonusBlocks) tests.push({ group: 'bonusBlocks', item, rect: item });
    for (const item of state.level.enemies) tests.push({ group: 'enemies', item, rect: item });
    if (state.level.hackTerminals) {
        for (const item of state.level.hackTerminals) tests.push({ group: 'hackTerminals', item, rect: item });
    }
    if (state.level.shopTerminals) {
        for (const item of state.level.shopTerminals) tests.push({ group: 'shopTerminals', item, rect: item });
    }
    if (state.level.checkpoints) {
        for (const item of state.level.checkpoints) tests.push({ group: 'checkpoints', item, rect: item });
    }
    if (state.level.keys) {
        for (const item of state.level.keys) tests.push({ group: 'keys', item, rect: { x: item.x, y: item.y, width: item.width ?? 26, height: item.height ?? 26 } });
    }
    tests.push({ group: 'exit', item: state.level.exit, rect: state.level.exit });
    tests.push({ group: 'spawn', item: state.level.spawn, rect: { x: state.level.spawn.x - 10, y: state.level.spawn.y - 10, width: 20, height: 20 } });
    for (const item of state.level.gems) tests.push({ group: 'gems', item, rect: { x: item.x - 12, y: item.y - 12, width: 24, height: 24 } });

    for (let i = tests.length - 1; i >= 0; i--) {
        const test = tests[i];
        const r = test.rect;
        if (worldX >= r.x && worldX <= r.x + r.width && worldY >= r.y && worldY <= r.y + r.height) {
            return { group: test.group, item: test.item };
        }
    }

    return null;
}

function deleteSelected() {
    if (!state.selected) return;
    saveUndoState();
    const { group, item } = state.selected;

    if (Array.isArray(state.level[group])) {
        state.level[group] = state.level[group].filter((entry) => entry !== item);
    }

    state.selected = null;
    updatePanels();
}

// --- Selection panel ---

function updateSelectionPanel() {
    const wrap = $('selectionFields');
    wrap.innerHTML = '';

    if (!state.selected) {
        $('selectedLabel').textContent = 'keine Auswahl';
        $('selectionHint').textContent = 'Wähle ein Objekt aus, um Werte exakt zu bearbeiten.';
        return;
    }

    const { group, item } = state.selected;
    const labels = {
        platforms: 'Plattform',
        shadowPlatforms: 'Shadow-Plattform',
        gems: 'Gem',
        bonusBlocks: 'Bonusblock',
        enemies: 'Gegner',
        hackTerminals: 'Hack-Terminal',
        shopTerminals: 'Shop-Terminal',
        checkpoints: 'Checkpoint',
        keys: 'Schlüssel',
        spawn: 'Spawn',
        exit: 'Exit',
    };
    $('selectedLabel').textContent = labels[group] || group;
    $('selectionHint').textContent = 'Änderungen werden sofort übernommen.';

    // Special fields for enemy type
    if (group === 'enemies') {
        addEnemyTypeSelector(wrap, item);
    }

    // Special fields for exit
    if (group === 'exit') {
        addExitFields(wrap, item);
    }

    const fields = Object.keys(item).filter((key) => {
        if (key.startsWith('_')) return false;
        if (typeof item[key] === 'object' && !Array.isArray(item[key])) return false;
        return true;
    });

    for (const key of fields) {
        const label = document.createElement('label');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'field-name';
        nameSpan.textContent = key;
        label.appendChild(nameSpan);

        let input;

        if (group === 'hackTerminals' && key === 'difficulty') {
            input = document.createElement('select');
            input.innerHTML = '<option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>';
            input.value = item[key];
        } else if (group === 'hackTerminals' && key === 'reward') {
            input = document.createElement('select');
            input.innerHTML = '<option value="deactivate_enemies">deactivate_enemies</option><option value="open_door">open_door</option><option value="secret_area">secret_area</option>';
            input.value = item[key];
        } else if (group === 'hackTerminals' && key === 'targetId') {
            input = document.createElement('select');
            input.innerHTML = '<option value="deactivate">deactivate</option><option value="door">door</option><option value="secret">secret</option><option value="boss">boss</option>';
            input.value = item[key];
        } else if (group === 'bonusBlocks' && key === 'reward') {
            input = document.createElement('select');
            input.innerHTML = '<option value="gem">gem</option><option value="energy">energy</option><option value="life">life</option><option value="weapon">weapon</option><option value="random">random</option>';
            input.value = item[key];
        } else if (key === 'type' && group === 'enemies') {
            continue; // Handled by addEnemyTypeSelector
        } else if (typeof item[key] === 'boolean') {
            input = document.createElement('select');
            input.innerHTML = '<option value="true">true</option><option value="false">false</option>';
            input.value = String(item[key]);
        } else {
            input = document.createElement('input');
            input.value = item[key];
        }

        input.addEventListener('input', () => {
            if (typeof item[key] === 'number') item[key] = Number(input.value || 0);
            else if (typeof item[key] === 'boolean') item[key] = input.value === 'true';
            else item[key] = input.value;
            updatePanels(false);
        });

        label.appendChild(input);
        wrap.appendChild(label);
    }
}

function addEnemyTypeSelector(wrap, item) {
    const label = document.createElement('label');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'field-name';
    nameSpan.textContent = 'type (Gegner-Typ)';
    label.appendChild(nameSpan);

    const input = document.createElement('select');
    input.innerHTML = ENEMY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    input.value = item.type || 'walker';

    input.addEventListener('change', () => {
        saveUndoState();
        const newType = input.value;
        const x = item.x;
        const y = item.y;
        const newEnemy = createEnemyByType(newType, x, y);

        newEnemy.health = item.health;
        newEnemy.speed = item.speed;
        newEnemy.minX = item.minX;
        newEnemy.maxX = item.maxX;
        if (item.canShoot !== undefined) newEnemy.canShoot = item.canShoot;
        if (item.shadowOnly !== undefined) newEnemy.shadowOnly = item.shadowOnly;

        const enemies = state.level.enemies;
        const idx = enemies.indexOf(item);
        if (idx >= 0) {
            enemies[idx] = newEnemy;
            state.selected.item = newEnemy;
        }

        updatePanels();
    });

    label.appendChild(input);
    wrap.appendChild(label);
}

function addExitFields(wrap, item) {
    const modeLabel = document.createElement('label');
    const modeName = document.createElement('span');
    modeName.className = 'field-name';
    modeName.textContent = 'unlockMode';
    modeLabel.appendChild(modeName);

    const modeInput = document.createElement('select');
    modeInput.innerHTML = `
        <option value="">(keine)</option>
        <option value="allGems">allGems</option>
        <option value="allEnemies">allEnemies</option>
        <option value="allGemsOrEnemiesOrKeys">allGemsOrEnemiesOrKeys</option>
    `;
    modeInput.value = item.unlockMode || '';

    modeInput.addEventListener('change', () => {
        if (modeInput.value) {
            item.unlockMode = modeInput.value;
        } else {
            delete item.unlockMode;
        }
    });

    modeLabel.appendChild(modeInput);
    wrap.appendChild(modeLabel);

    const keysLabel = document.createElement('label');
    const keysName = document.createElement('span');
    keysName.className = 'field-name';
    keysName.textContent = 'keysRequired';
    keysLabel.appendChild(keysName);

    const keysInput = document.createElement('input');
    keysInput.type = 'number';
    keysInput.value = item.keysRequired ?? 0;
    keysInput.min = '0';

    keysInput.addEventListener('input', () => {
        const val = Number(keysInput.value);
        if (val > 0) {
            item.keysRequired = val;
        } else {
            delete item.keysRequired;
        }
    });

    keysLabel.appendChild(keysInput);
    wrap.appendChild(keysLabel);
}

function updatePanels(refreshSelection = true) {
    syncLevelFromForm();
    if (refreshSelection) updateSelectionPanel();

    const counts = [
        state.level.platforms.length,
        (state.level.shadowPlatforms || []).length,
        state.level.gems.length,
        state.level.bonusBlocks.length,
        state.level.enemies.length,
        (state.level.hackTerminals || []).length,
        (state.level.shopTerminals || []).length,
        (state.level.checkpoints || []).length,
        (state.level.keys || []).length,
        2, // spawn + exit
    ].reduce((a, b) => a + b, 0);
    $('counts').textContent = `${counts} Objekte`;
    $('mouseInfo').textContent = `x: ${state.mouse.worldX} · y: ${state.mouse.worldY} · cam: ${Math.round(state.cameraX)} · zoom: ${Math.round(state.zoom * 100)}%`;

    updateObjectList();
}

// --- Object List ---

function updateObjectList() {
    const container = $('objList');
    if (!container) return;

    const filter = ($('objListFilter')?.value || '').toLowerCase();
    container.innerHTML = '';

    const items = [];

    // Collect all objects with their groups
    state.level.platforms.forEach((item, i) => items.push({ group: 'platforms', item, label: `Plattform ${i + 1}`, color: COLORS.platform, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    (state.level.shadowPlatforms || []).forEach((item, i) => items.push({ group: 'shadowPlatforms', item, label: `Shadow ${i + 1}`, color: COLORS.shadowPlatform, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    state.level.gems.forEach((item, i) => items.push({ group: 'gems', item, label: `Gem ${i + 1}`, color: COLORS.gem, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    state.level.bonusBlocks.forEach((item, i) => items.push({ group: 'bonusBlocks', item, label: `Bonus ${i + 1}`, color: COLORS.bonusBlock, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    state.level.enemies.forEach((item, i) => {
        const type = item.type || 'walker';
        items.push({ group: 'enemies', item, label: `${type} ${i + 1}`, color: getEnemyColor(type), pos: `${Math.round(item.x)},${Math.round(item.y)}` });
    });
    (state.level.hackTerminals || []).forEach((item, i) => items.push({ group: 'hackTerminals', item, label: `Hack ${i + 1}`, color: COLORS.hackTerminal, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    (state.level.shopTerminals || []).forEach((item, i) => items.push({ group: 'shopTerminals', item, label: `Shop ${i + 1}`, color: COLORS.shopTerminal, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    (state.level.checkpoints || []).forEach((item, i) => items.push({ group: 'checkpoints', item, label: `CP ${i + 1}`, color: COLORS.checkpoint, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    (state.level.keys || []).forEach((item, i) => items.push({ group: 'keys', item, label: `Schlüssel ${i + 1}`, color: COLORS.key, pos: `${Math.round(item.x)},${Math.round(item.y)}` }));
    items.push({ group: 'spawn', item: state.level.spawn, label: 'Spawn', color: COLORS.spawn, pos: `${Math.round(state.level.spawn.x)},${Math.round(state.level.spawn.y)}` });
    items.push({ group: 'exit', item: state.level.exit, label: 'Exit', color: COLORS.exit, pos: `${Math.round(state.level.exit.x)},${Math.round(state.level.exit.y)}` });

    $('objListCount').textContent = `(${items.length})`;

    const filtered = filter
        ? items.filter(it => it.label.toLowerCase().includes(filter) || it.group.toLowerCase().includes(filter))
        : items;

    for (const entry of filtered) {
        const div = document.createElement('div');
        div.className = 'obj-list-item';
        if (state.selected && state.selected.item === entry.item) {
            div.classList.add('selected');
        }

        div.innerHTML = `<span class="item-dot" style="background:${entry.color}"></span><span class="item-label">${entry.label}</span><span class="item-pos">${entry.pos}</span>`;

        div.addEventListener('click', () => {
            selectObject(entry.group, entry.item);
            // Center camera on object
            const item = entry.item;
            const itemCenterX = (item.x + (item.width ? item.width / 2 : 0));
            state.cameraX = Math.max(0, Math.min(levelWidth() - canvas.width / state.zoom, itemCenterX - (canvas.width / state.zoom) / 2));
        });

        container.appendChild(div);
    }
}

// --- Level Validation ---

function validateLevel() {
    const results = [];
    const level = state.level;

    // Check spawn is on or near a platform
    const spawnOnPlatform = level.platforms.some(p =>
        level.spawn.x >= p.x && level.spawn.x <= p.x + p.width &&
        Math.abs((level.spawn.y + 70) - p.y) < 20
    );
    if (!spawnOnPlatform) {
        results.push({ type: 'warn', msg: 'Spawn ist nicht auf einer Plattform – Spieler fällt!' });
    }

    // Check exit is reachable (near a platform)
    const exitOnPlatform = level.platforms.some(p =>
        level.exit.x >= p.x - 40 && level.exit.x <= p.x + p.width + 40 &&
        Math.abs(level.exit.y - p.y) < 160
    );
    if (!exitOnPlatform) {
        results.push({ type: 'error', msg: 'Exit ist nicht erreichbar – keine Plattform in der Nähe!' });
    }

    // Check at least 1 platform
    if (level.platforms.length === 0) {
        results.push({ type: 'error', msg: 'Keine Plattformen im Level!' });
    }

    // Check for very short platforms (< 50px)
    level.platforms.forEach((p, i) => {
        if (p.width < 50) results.push({ type: 'warn', msg: `Plattform ${i + 1} ist sehr schmal (${p.width}px)` });
    });

    // Check enemies are on/near platforms
    level.enemies.forEach((e, i) => {
        const type = e.type || 'walker';
        if (type !== 'drone') {
            const nearPlatform = level.platforms.some(p =>
                e.x >= p.x - 20 && e.x <= p.x + p.width + 20 &&
                Math.abs((e.y + e.height) - p.y) < 30
            );
            if (!nearPlatform) {
                results.push({ type: 'warn', msg: `${type} ${i + 1} schwebt in der Luft – wird durch Gravitation fallen!` });
            }
        }
    });

    // Check patrol range makes sense
    level.enemies.forEach((e, i) => {
        if (e.minX >= e.maxX) {
            results.push({ type: 'warn', msg: `Gegner ${i + 1}: minX >= maxX (Patrouille kaputt)` });
        }
    });

    // Check for overlapping platforms
    for (let i = 0; i < level.platforms.length; i++) {
        for (let j = i + 1; j < level.platforms.length; j++) {
            const a = level.platforms[i];
            const b = level.platforms[j];
            if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
                results.push({ type: 'warn', msg: `Plattformen ${i + 1} und ${j + 1} überlappen sich` });
            }
        }
    }

    // Check level width vs exit position
    if (level.exit.x > levelWidth()) {
        results.push({ type: 'error', msg: `Exit ist außerhalb der Level-Breite (${level.exit.x} > ${levelWidth()})` });
    }

    // Check for keys if exit requires them
    if (level.exit.keysRequired > 0 && (!level.keys || level.keys.length < level.exit.keysRequired)) {
        results.push({ type: 'error', msg: `Exit braucht ${level.exit.keysRequired} Schlüssel, aber nur ${level.keys?.length || 0} vorhanden!` });
    }

    // Check for gems if exit requires them
    if (level.exit.unlockMode === 'allGems' && level.gems.length === 0) {
        results.push({ type: 'warn', msg: 'Exit braucht alle Gems, aber es gibt keine Gems!' });
    }

    // No enemies for unlockMode allEnemies
    if (level.exit.unlockMode === 'allEnemies' && level.enemies.length === 0) {
        results.push({ type: 'warn', msg: 'Exit braucht alle Gegner besiegt, aber es gibt keine Gegner – Exit bleibt offen!' });
    }

    // Check shadow-only enemies
    const shadowEnemies = level.enemies.filter(e => e.shadowOnly);
    if (shadowEnemies.length > 0 && !level.shadowPlatforms?.length) {
        results.push({ type: 'warn', msg: `${shadowEnemies.length} Shadow-Gegner, aber keine Shadow-Plattformen` });
    }

    // If no issues
    if (results.length === 0) {
        results.push({ type: 'ok', msg: 'Level sieht gut aus! Keine Probleme gefunden.' });
    }

    return results;
}

function displayValidation(results) {
    const container = $('validationResults');
    container.innerHTML = '';

    for (const result of results) {
        const p = document.createElement('p');
        if (result.type === 'ok') {
            p.className = 'val-ok';
            p.textContent = `✓ ${result.msg}`;
        } else if (result.type === 'warn') {
            p.className = 'val-warn';
            p.innerHTML = `<span class="val-icon">⚠</span> ${result.msg}`;
        } else {
            p.className = 'val-error';
            p.innerHTML = `<span class="val-icon">✕</span> ${result.msg}`;
        }
        container.appendChild(p);
    }
}

// --- Auto-Save ---

function startAutoSave() {
    if (state.autoSaveInterval) clearInterval(state.autoSaveInterval);
    state.autoSaveInterval = setInterval(() => {
        syncLevelFromForm();
        try {
            localStorage.setItem('shadowrunner-level-editor', JSON.stringify(state.level));
            state.lastAutoSave = new Date();
            $('autosaveHint').textContent = `Auto-Save: ${state.lastAutoSave.toLocaleTimeString()}`;
        } catch (e) {
            // Silently fail
        }
    }, 30000); // 30 seconds
}

// --- Drawing ---

function drawGrid() {
    const g = grid();
    ctx.strokeStyle = 'rgba(100,244,255,.08)';
    ctx.lineWidth = 1;

    const viewLeft = state.cameraX;
    const viewRight = state.cameraX + canvas.width / state.zoom;
    const viewTop = 0;
    const viewBottom = canvas.height / state.zoom;

    const startX = -(viewLeft % g);
    for (let x = startX; x < viewRight - viewLeft; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / state.zoom);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height / state.zoom; y += g) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / state.zoom, y);
        ctx.stroke();
    }
}

function rectWorld(item, color, label) {
    const x = item.x - state.cameraX;
    ctx.fillStyle = color + '55';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, item.width, item.height);
    ctx.strokeRect(x, item.y, item.width, item.height);
    ctx.fillStyle = '#eef8ff';
    ctx.font = '11px monospace';
    ctx.fillText(label, x + 4, item.y + 14);
}

function circleWorld(item, color, label) {
    const x = item.x - state.cameraX;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, item.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eef8ff';
    ctx.font = '11px monospace';
    ctx.fillText(label, x + 13, item.y + 4);
}

function drawKeyItem(item) {
    const x = item.x - state.cameraX;
    const w = item.width ?? 26;
    const h = item.height ?? 26;
    const color = COLORS.key;

    ctx.fillStyle = color + '44';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, w, h);
    ctx.strokeRect(x, item.y, w, h);

    ctx.fillStyle = '#050510';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('K', x + w / 2, item.y + h / 2 + 5);
    ctx.textAlign = 'left';
}

function drawHackTerminal(item) {
    const x = item.x - state.cameraX;
    const w = item.width;
    const h = item.height;
    const color = COLORS.hackTerminal;

    ctx.fillStyle = color + '44';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, w, h);
    ctx.strokeRect(x, item.y, w, h);

    ctx.fillStyle = 'rgba(0,255,65,0.15)';
    ctx.fillRect(x + 3, item.y + 3, w - 6, h - 14);

    const time = Date.now() * 0.001;
    const scanY = item.y + 3 + ((time * 30) % (h - 14));
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.fillRect(x + 3, scanY, w - 6, 2);

    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#ff003c' : i === 1 ? '#ff6600' : '#00ff41';
        ctx.beginPath();
        ctx.arc(x + 8 + i * 8, item.y + h - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#eef8ff';
    ctx.font = '9px monospace';
    ctx.fillText('HACK', x + 3, item.y + h - 15);
    ctx.fillStyle = color;
    ctx.fillText(`${item.difficulty || '?'}`, x + w + 4, item.y + 12);
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${item.reward || '?'}`, x + w + 4, item.y + 24);
}

function drawShopTerminal(item) {
    const x = item.x - state.cameraX;
    const w = item.width;
    const h = item.height;
    const color = COLORS.shopTerminal;

    ctx.fillStyle = color + '44';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, w, h);
    ctx.strokeRect(x, item.y, w, h);

    // Screen glow
    ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
    ctx.fillRect(x + 3, item.y + 3, w - 6, h - 14);

    // Animated dollar pulse
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(250, 204, 21, ${0.6 * pulse})`;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$', x + w / 2, item.y + h / 2 + 2);
    ctx.textAlign = 'left';

    // Label
    ctx.fillStyle = '#eef8ff';
    ctx.font = '9px monospace';
    ctx.fillText('SHOP', x + 3, item.y + h - 5);

    // singleUse indicator
    if (item.singleUse) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '8px monospace';
        ctx.fillText('1x', x + w + 4, item.y + 12);
    }
}

function drawCheckpoint(item) {
    const x = item.x - state.cameraX;
    const color = COLORS.checkpoint;

    ctx.fillStyle = color + '22';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(x, item.y, item.width, item.height);
    ctx.strokeRect(x, item.y, item.width, item.height);
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CP', x + item.width / 2, item.y + item.height / 2 + 4);
    ctx.textAlign = 'left';

    if (item.activated) {
        ctx.fillStyle = color + '44';
        ctx.fillRect(x, item.y, item.width, item.height);
    }
}

function drawEnemyOnCanvas(item) {
    const type = item.type || 'walker';
    const color = getEnemyColor(type);
    const x = item.x - state.cameraX;

    // Shadow-only indicator
    if (item.shadowOnly) {
        ctx.fillStyle = 'rgba(179, 136, 255, 0.15)';
        ctx.fillRect(x - 3, item.y - 3, item.width + 6, item.height + 6);
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x - 3, item.y - 3, item.width + 6, item.height + 6);
        ctx.setLineDash([]);
    }

    ctx.fillStyle = color + '55';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, item.width, item.height);
    ctx.strokeRect(x, item.y, item.width, item.height);

    const typeLabels = {
        walker: 'W',
        drone: 'D',
        shield: 'S',
        mech: 'M',
        turret: 'T',
        ninja: 'N',
    };
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(typeLabels[type] || '?', x + item.width / 2, item.y + item.height / 2 + 5);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#eef8ff';
    ctx.font = '10px monospace';
    ctx.fillText(`hp:${item.health}`, x + 2, item.y - 4);

    // Patrol range line
    if (type !== 'turret') {
        ctx.strokeStyle = color + '66';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(item.minX - state.cameraX, item.y + item.height + 8);
        ctx.lineTo(item.maxX - state.cameraX, item.y + item.height + 8);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = color + '88';
        ctx.fillRect(item.minX - state.cameraX - 2, item.y + item.height + 4, 4, 8);
        ctx.fillRect(item.maxX - state.cameraX - 2, item.y + item.height + 4, 4, 8);
    }

    if (item.canShoot) {
        ctx.fillStyle = '#ff003c';
        ctx.beginPath();
        ctx.arc(x + item.width - 2, item.y + 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    if (type === 'shield' && item.shieldHP) {
        ctx.fillStyle = '#60a5fa';
        ctx.font = '9px monospace';
        ctx.fillText(`shield:${item.shieldHP}`, x + item.width + 4, item.y + 12);
    }
}

function drawSelection() {
    if (!state.selected) return;
    const item = state.selected.item;
    let rect;
    if (item.width) {
        rect = item;
    } else if (item.width === 0) {
        rect = { x: item.x - 12, y: item.y - 12, width: 24, height: 24 };
    } else {
        rect = { x: item.x - 12, y: item.y - 12, width: item.width ?? 26, height: item.height ?? 26 };
    }
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rect.x - state.cameraX - 4, rect.y - 4, rect.width + 8, rect.height + 8);
    ctx.setLineDash([]);
}

function drawDrawingPreview() {
    if (!state.drawing || !state.drawStart) return;
    const g = grid();
    const worldPos = { x: state.mouse.worldX, y: state.mouse.worldY };
    const startX = Math.min(state.drawStart.x, worldPos.x);
    const startY = Math.min(state.drawStart.y, worldPos.y);
    const endX = Math.max(state.drawStart.x, worldPos.x);
    const endY = Math.max(state.drawStart.y, worldPos.y);
    const w = Math.max(g, endX - startX);
    const h = Math.max(g, endY - startY);

    ctx.fillStyle = COLORS.drawing + '33';
    ctx.strokeStyle = COLORS.drawing;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.fillRect(startX - state.cameraX, startY, w, h);
    ctx.strokeRect(startX - state.cameraX, startY, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = '#eef8ff';
    ctx.font = '11px monospace';
    ctx.fillText(`${w}x${h}`, startX - state.cameraX + 4, startY + 14);
}

// --- Minimap ---

function drawMinimap() {
    const mCtx = minimapCtx;
    const mW = minimapCanvas.width;
    const mH = minimapCanvas.height;
    const lw = levelWidth();

    mCtx.clearRect(0, 0, mW, mH);

    // Background
    mCtx.fillStyle = 'rgba(5,5,16,0.95)';
    mCtx.fillRect(0, 0, mW, mH);

    const scaleX = mW / lw;
    const scaleY = mH / canvas.height;

    // Platforms
    mCtx.fillStyle = COLORS.platform + '88';
    for (const p of state.level.platforms) {
        mCtx.fillRect(p.x * scaleX, p.y * scaleY, Math.max(1, p.width * scaleX), Math.max(1, p.height * scaleY));
    }

    // Shadow platforms
    if (state.layerVisibility.shadowPlatforms) {
        mCtx.fillStyle = COLORS.shadowPlatform + '66';
        for (const p of (state.level.shadowPlatforms || [])) {
            mCtx.fillRect(p.x * scaleX, p.y * scaleY, Math.max(1, p.width * scaleX), Math.max(1, p.height * scaleY));
        }
    }

    // Enemies
    mCtx.fillStyle = COLORS.enemy + '88';
    for (const e of state.level.enemies) {
        mCtx.fillRect(e.x * scaleX, e.y * scaleY, Math.max(2, e.width * scaleX), Math.max(2, e.height * scaleY));
    }

    // Shop Terminals
    if (state.level.shopTerminals) {
        mCtx.fillStyle = COLORS.shopTerminal + '88';
        for (const s of state.level.shopTerminals) {
            mCtx.fillRect(s.x * scaleX, s.y * scaleY, Math.max(2, s.width * scaleX), Math.max(2, s.height * scaleY));
        }
    }

    // Spawn
    mCtx.fillStyle = COLORS.spawn;
    mCtx.fillRect(state.level.spawn.x * scaleX - 2, state.level.spawn.y * scaleY - 2, 4, 4);

    // Exit
    mCtx.fillStyle = COLORS.exit;
    mCtx.fillRect(state.level.exit.x * scaleX, state.level.exit.y * scaleY, Math.max(3, state.level.exit.width * scaleX), Math.max(3, state.level.exit.height * scaleY));

    // Viewport indicator
    const vpLeft = state.cameraX * scaleX;
    const vpWidth = (canvas.width / state.zoom) * scaleX;
    mCtx.strokeStyle = '#ffffff55';
    mCtx.lineWidth = 1;
    mCtx.strokeRect(vpLeft, 0, vpWidth, mH);

    // Selected object highlight
    if (state.selected) {
        const item = state.selected.item;
        mCtx.strokeStyle = '#ffffff';
        mCtx.lineWidth = 1;
        const sx = item.x * scaleX;
        const sy = item.y * scaleY;
        const sw = Math.max(3, (item.width || 20) * scaleX);
        const sh = Math.max(3, (item.height || 20) * scaleY);
        mCtx.strokeRect(sx - 1, sy - 1, sw + 2, sh + 2);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(state.zoom, state.zoom);

    drawGrid();

    // Level background area
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(-state.cameraX, 0, levelWidth(), canvas.height / state.zoom);

    // Draw all object types (respecting layer visibility)
    if (state.layerVisibility.platforms) {
        state.level.platforms.forEach((item) => rectWorld(item, COLORS.platform, 'platform'));
    }

    if (state.layerVisibility.shadowPlatforms && state.level.shadowPlatforms) {
        state.level.shadowPlatforms.forEach((item) => rectWorld(item, COLORS.shadowPlatform, 'shadow'));
    }

    if (state.layerVisibility.bonusBlocks) {
        state.level.bonusBlocks.forEach((item) => rectWorld(item, COLORS.bonusBlock, item.reward || 'bonus'));
    }

    if (state.layerVisibility.enemies) {
        state.level.enemies.forEach((item) => drawEnemyOnCanvas(item));
    }

    if (state.layerVisibility.hackTerminals && state.level.hackTerminals) {
        state.level.hackTerminals.forEach((item) => drawHackTerminal(item));
    }

    if (state.layerVisibility.shopTerminals && state.level.shopTerminals) {
        state.level.shopTerminals.forEach((item) => drawShopTerminal(item));
    }

    if (state.layerVisibility.checkpoints && state.level.checkpoints) {
        state.level.checkpoints.forEach((item) => drawCheckpoint(item));
    }

    if (state.layerVisibility.keys && state.level.keys) {
        state.level.keys.forEach((item) => drawKeyItem(item));
    }

    if (state.layerVisibility.gems) {
        state.level.gems.forEach((item) => circleWorld(item, COLORS.gem, 'gem'));
    }

    circleWorld(state.level.spawn, COLORS.spawn, 'spawn');
    rectWorld(state.level.exit, COLORS.exit, state.level.exit.locked ? 'LOCKED' : 'exit');

    drawDrawingPreview();
    drawSelection();

    ctx.restore();

    // Minimap (always 1:1)
    drawMinimap();

    requestAnimationFrame(draw);
}

// --- Export/Import ---

function exportCode() {
    syncLevelFromForm();
    const name = ($('exportName').value || 'level5').replace(/[^a-zA-Z0-9_$]/g, '');

    const cleanLevel = JSON.parse(JSON.stringify(state.level));
    if (cleanLevel.hackTerminals) {
        cleanLevel.hackTerminals.forEach(t => {
            delete t.nearPlayer;
        });
    }
    if (cleanLevel.shopTerminals) {
        cleanLevel.shopTerminals.forEach(t => {
            delete t.nearPlayer;
        });
    }
    if (cleanLevel.enemies) {
        cleanLevel.enemies.forEach(e => {
            delete e._gravityInit;
            delete e.velocityY;
            delete e.onGround;
            delete e.prevY;
            delete e._animInit;
            delete e._dying;
            delete e._attacking;
        });
    }
    if (cleanLevel.keys) {
        cleanLevel.keys.forEach(k => {
            delete k.collected;
        });
    }
    if (cleanLevel.gems) {
        cleanLevel.gems.forEach(g => {
            delete g.collected;
        });
    }
    if (cleanLevel.bonusBlocks) {
        cleanLevel.bonusBlocks.forEach(b => {
            delete b.used;
            delete b.bumpTimer;
            delete b.spawnRequest;
        });
    }
    if (cleanLevel.checkpoints) {
        cleanLevel.checkpoints.forEach(c => {
            delete c.activated;
        });
    }
    if (cleanLevel.enemies) {
        cleanLevel.enemies.forEach(e => {
            delete e.active;
        });
    }

    return `export const ${name} = ${JSON.stringify(cleanLevel, null, 4)};\n`;
}

function importLevel(text) {
    saveUndoState();
    let source = text.trim();
    source = source.replace(/^export\s+const\s+[a-zA-Z0-9_$]+\s*=\s*/, '').replace(/;\s*$/, '');
    const parsed = Function(`"use strict"; return (${source});`)();
    state.level = {
        ...createEmptyLevel(),
        ...parsed,
        platforms: parsed.platforms || [],
        shadowPlatforms: parsed.shadowPlatforms || [],
        gems: parsed.gems || [],
        bonusBlocks: parsed.bonusBlocks || [],
        enemies: parsed.enemies || [],
        hackTerminals: parsed.hackTerminals || [],
        shopTerminals: parsed.shopTerminals || [],
        checkpoints: parsed.checkpoints || [],
        keys: parsed.keys || [],
        fx: parsed.fx || createEmptyLevel().fx,
    };
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
}

function showNotification(msg, isError = false) {
    const el = document.createElement('div');
    el.className = 'notification' + (isError ? ' error' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 1200);
}

// --- Event Handlers ---

document.querySelectorAll('#toolButtons button').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
});

canvas.addEventListener('mousemove', (event) => {
    const pos = screenToWorld(event.clientX, event.clientY);
    state.mouse = { x: pos.sx, y: pos.sy, worldX: pos.x, worldY: pos.y };

    // Drag selected object
    if (state.dragging && state.selected && state.dragStart) {
        const dx = pos.x - state.dragStart.x;
        const dy = pos.y - state.dragStart.y;
        const item = state.selected.item;
        item.x = snap(state.dragStart.itemX + dx);
        item.y = snap(state.dragStart.itemY + dy);

        if (state.selected.group === 'enemies') {
            item.minX = snap(state.dragStart.minX + dx);
            item.maxX = snap(state.dragStart.maxX + dx);
        }

        if (state.selected.group === 'hackTerminals') {
            if (item.doorX !== undefined) item.doorX = snap(state.dragStart.doorX + dx);
            if (item.doorY !== undefined) item.doorY = snap(state.dragStart.doorY + dy);
            if (item.secretX !== undefined) item.secretX = snap(state.dragStart.secretX + dx);
            if (item.secretY !== undefined) item.secretY = snap(state.dragStart.secretY + dy);
        }

        updatePanels();
    }

    // Drawing platform/shadowPlatform
    if (state.drawing) {
        updatePanels(false);
    }

    updatePanels(false);
});

canvas.addEventListener('mousedown', (event) => {
    const pos = screenToWorld(event.clientX, event.clientY);

    // Shift+Click: draw platform by dragging
    if (event.shiftKey && (state.tool === 'platform' || state.tool === 'shadowPlatform')) {
        state.drawing = true;
        state.drawStart = { x: pos.x, y: pos.y };
        return;
    }

    if (state.tool === 'select') {
        const found = hitTest(pos.x, pos.y);
        if (found) {
            selectObject(found.group, found.item);
            state.dragging = true;
            state.dragStart = {
                x: pos.x,
                y: pos.y,
                itemX: found.item.x,
                itemY: found.item.y,
                minX: found.item.minX ?? 0,
                maxX: found.item.maxX ?? 0,
                doorX: found.item.doorX,
                doorY: found.item.doorY,
                secretX: found.item.secretX,
                secretY: found.item.secretY,
            };
        } else {
            state.selected = null;
            updatePanels();
        }
        return;
    }

    addObject(state.tool, pos.x, pos.y);
});

canvas.addEventListener('mouseup', (event) => {
    // Finish drawing platform
    if (state.drawing && state.drawStart) {
        const pos = screenToWorld(event.clientX, event.clientY);
        const g = grid();
        const startX = Math.min(state.drawStart.x, pos.x);
        const startY = Math.min(state.drawStart.y, pos.y);
        const endX = Math.max(state.drawStart.x, pos.x);
        const endY = Math.max(state.drawStart.y, pos.y);
        const w = Math.max(g, endX - startX);
        const h = Math.max(g, endY - startY);

        saveUndoState();
        const type = state.tool;
        const item = { x: startX, y: startY, width: w, height: h };

        if (type === 'platform') {
            state.level.platforms.push(item);
            selectObject('platforms', item);
        } else if (type === 'shadowPlatform') {
            if (!state.level.shadowPlatforms) state.level.shadowPlatforms = [];
            state.level.shadowPlatforms.push(item);
            selectObject('shadowPlatforms', item);
        }

        state.drawing = false;
        state.drawStart = null;
        updatePanels();
        return;
    }

    state.dragging = false;
    state.dragStart = null;
});

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    // Ctrl+Wheel = zoom
    if (event.ctrlKey || event.metaKey) {
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        setZoom(state.zoom + delta);
        return;
    }

    // Normal wheel = camera scroll
    state.cameraX = Math.max(0, Math.min(levelWidth() - canvas.width / state.zoom, state.cameraX + event.deltaY));
    updatePanels(false);
}, { passive: false });

// Minimap click to navigate
minimapCanvas.addEventListener('click', (event) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const lw = levelWidth();
    const scaleX = minimapCanvas.width / lw;
    const clickWorldX = mx / scaleX;

    // Center camera on clicked position
    state.cameraX = Math.max(0, Math.min(lw - canvas.width / state.zoom, clickWorldX - (canvas.width / state.zoom) / 2));
    updatePanels(false);
});

window.addEventListener('keydown', (event) => {
    // Undo/Redo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (event.shiftKey) {
            redo();
        } else {
            undo();
        }
        event.preventDefault();
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        redo();
        event.preventDefault();
        return;
    }

    // Copy
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        copySelected();
        event.preventDefault();
        return;
    }

    // Paste
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        pasteClipboard();
        event.preventDefault();
        return;
    }

    // Duplicate
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        duplicateSelected();
        event.preventDefault();
        return;
    }

    // Zoom shortcuts
    if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        setZoom(state.zoom + 0.1);
        event.preventDefault();
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        setZoom(state.zoom - 0.1);
        event.preventDefault();
        return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        setZoom(1);
        event.preventDefault();
        return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;
        deleteSelected();
    }

    if (!state.selected) return;
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;

    const step = event.shiftKey ? grid() * 5 : grid();
    const item = state.selected.item;
    if (event.key === 'ArrowLeft') { saveUndoState(); item.x -= step; }
    if (event.key === 'ArrowRight') { saveUndoState(); item.x += step; }
    if (event.key === 'ArrowUp') { saveUndoState(); item.y -= step; }
    if (event.key === 'ArrowDown') { saveUndoState(); item.y += step; }

    if (state.selected.group === 'enemies') {
        if (event.key === 'ArrowLeft') { item.minX -= step; item.maxX -= step; }
        if (event.key === 'ArrowRight') { item.minX += step; item.maxX += step; }
    }

    updatePanels();
});

// Zoom buttons
$('zoomInBtn').addEventListener('click', () => setZoom(state.zoom + 0.15));
$('zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - 0.15));
$('zoomResetBtn').addEventListener('click', () => setZoom(1));

// Export/Import buttons
$('exportBtn').addEventListener('click', () => {
    $('exportText').value = exportCode();
});

$('copyBtn').addEventListener('click', async () => {
    const code = exportCode();
    $('exportText').value = code;
    await navigator.clipboard.writeText(code);
    showNotification('Kopiert!');
});

$('saveBtn').addEventListener('click', () => {
    syncLevelFromForm();
    localStorage.setItem('shadowrunner-level-editor', JSON.stringify(state.level));
    showNotification('Gespeichert!');
});

$('loadBtn').addEventListener('click', () => {
    const saved = localStorage.getItem('shadowrunner-level-editor');
    if (saved) importLevel(saved);
});

$('deleteBtn').addEventListener('click', deleteSelected);

// Duplicate button
$('duplicateBtn').addEventListener('click', duplicateSelected);

// Validate button
$('validateBtn').addEventListener('click', () => {
    const results = validateLevel();
    displayValidation(results);
});

$('undoBtn')?.addEventListener('click', undo);
$('redoBtn')?.addEventListener('click', redo);

$('resetBtn').addEventListener('click', () => {
    saveUndoState();
    state.level = createEmptyLevel();
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
});

$('importBtn').addEventListener('click', () => {
    try {
        importLevel($('importText').value);
        showNotification('Importiert!');
    } catch (error) {
        showNotification('Import fehlgeschlagen: ' + error.message, true);
    }
});

$('clearImportBtn').addEventListener('click', () => {
    $('importText').value = '';
});

['levelName', 'background', 'music', 'gridSize', 'levelWidth', 'fxStars', 'fxFog', 'fxRain', 'fxScanlines', 'fxNeonDust', 'fxSparks', 'fxWarningLights'].forEach((id) => {
    $(id).addEventListener('input', () => updatePanels(false));
    $(id).addEventListener('change', () => updatePanels(false));
});

// Enemy type selector
const enemyTypeSelect = $('enemyTypeSelect');
if (enemyTypeSelect) {
    enemyTypeSelect.addEventListener('change', () => {
        state.currentEnemyType = enemyTypeSelect.value;
    });
}

// Layer visibility toggles
document.querySelectorAll('#layerToggles input[data-layer]').forEach((input) => {
    input.addEventListener('change', () => {
        state.layerVisibility[input.dataset.layer] = input.checked;
    });
});

// Object list filter
$('objListFilter')?.addEventListener('input', () => updateObjectList());

// --- Initialize ---

syncFormFromLevel();
updatePanels();
setZoom(1);
startAutoSave();
draw();

// Try to auto-load from localStorage
const autoLoad = localStorage.getItem('shadowrunner-level-editor');
if (autoLoad) {
    try {
        importLevel(autoLoad);
    } catch (e) {
        // Silent fail on auto-load
    }
}
