const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

const state = {
    tool: 'select',
    cameraX: 0,
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
    dragging: false,
    dragStart: null,
    selected: null,
    level: createEmptyLevel(),
};

const COLORS = {
    platform: '#64f4ff',
    shadowPlatform: '#b388ff',
    gem: '#ffd166',
    bonusBlock: '#ff3fd5',
    enemy: '#ff4d6d',
    hackTerminal: '#ff6600',
    checkpoint: '#22c55e',
    spawn: '#55ff9c',
    exit: '#b388ff',
    selected: '#ffffff',
};

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
        checkpoints: [],
        fx: {
            stars: false,
            fog: true,
            rain: false,
            scanlines: true,
            neonDust: true,
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
    return { x: snap(sx + state.cameraX), y: snap(sy), sx, sy };
}

function setTool(tool) {
    state.tool = tool;
    document.querySelectorAll('#toolButtons button').forEach((button) => {
        button.classList.toggle('active', button.dataset.tool === tool);
    });
    $('currentToolLabel').textContent = toolLabel(tool);
}

function toolLabel(tool) {
    return {
        select: 'Auswählen',
        platform: 'Plattform',
        shadowPlatform: 'Shadow-Plattform',
        gem: 'Gem',
        bonusBlock: 'Bonusblock',
        enemy: 'Gegner',
        hackTerminal: 'Hack-Terminal',
        checkpoint: 'Checkpoint',
        spawn: 'Spawn',
        exit: 'Exit',
    }[tool] || tool;
}

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
}

function addObject(type, x, y) {
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
        item = {
            x,
            y,
            width: 46,
            height: 50,
            minX: x - 100,
            maxX: x + 160,
            speed: 120,
            direction: 1,
            health: 2,
            active: true,
        };
        state.level.enemies.push(item);
        selectObject('enemies', item);
    }

    if (type === 'hackTerminal') {
        item = {
            x,
            y,
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

    if (type === 'checkpoint') {
        item = { x, y, width: 60, height: 80, activated: false };
        if (!state.level.checkpoints) state.level.checkpoints = [];
        state.level.checkpoints.push(item);
        selectObject('checkpoints', item);
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

function selectObject(group, item) {
    state.selected = { group, item };
    updateSelectionPanel();
}

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
    if (state.level.checkpoints) {
        for (const item of state.level.checkpoints) tests.push({ group: 'checkpoints', item, rect: item });
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
    const { group, item } = state.selected;

    if (Array.isArray(state.level[group])) {
        state.level[group] = state.level[group].filter((entry) => entry !== item);
    }

    state.selected = null;
    updatePanels();
}

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
        checkpoints: 'Checkpoint',
        spawn: 'Spawn',
        exit: 'Exit',
    };
    $('selectedLabel').textContent = labels[group] || group;
    $('selectionHint').textContent = 'Änderungen werden sofort übernommen.';

    const fields = Object.keys(item).filter((key) => typeof item[key] !== 'object');
    for (const key of fields) {
        const label = document.createElement('label');
        label.textContent = key;

        let input;

        // Special dropdown for hackTerminal fields
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
        } else if (group === 'hackTerminals' && (key === 'hacked' || key === 'nearPlayer')) {
            input = document.createElement('select');
            input.innerHTML = '<option value="true">true</option><option value="false">false</option>';
            input.value = String(item[key]);
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
        (state.level.checkpoints || []).length,
        2, // spawn + exit
    ].reduce((a, b) => a + b, 0);
    $('counts').textContent = `${counts} Objekte`;
    $('mouseInfo').textContent = `x: ${state.mouse.worldX} · y: ${state.mouse.worldY} · cam: ${Math.round(state.cameraX)}`;
}

function drawGrid() {
    const g = grid();
    ctx.strokeStyle = 'rgba(100,244,255,.08)';
    ctx.lineWidth = 1;

    const startX = -state.cameraX % g;
    for (let x = startX; x < canvas.width; x += g) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += g) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
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
    ctx.font = '12px monospace';
    ctx.fillText(label, x + 6, item.y + 16);
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

function drawHackTerminal(item) {
    const x = item.x - state.cameraX;
    const w = item.width;
    const h = item.height;
    const color = COLORS.hackTerminal;

    // Terminal body
    ctx.fillStyle = color + '44';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x, item.y, w, h);
    ctx.strokeRect(x, item.y, w, h);

    // Screen area
    ctx.fillStyle = 'rgba(0,255,65,0.15)';
    ctx.fillRect(x + 3, item.y + 3, w - 6, h - 14);

    // Scan line on screen
    const time = Date.now() * 0.001;
    const scanY = item.y + 3 + ((time * 30) % (h - 14));
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.fillRect(x + 3, scanY, w - 6, 2);

    // Indicator lights
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 0 ? '#ff003c' : i === 1 ? '#ff6600' : '#00ff41';
        ctx.beginPath();
        ctx.arc(x + 8 + i * 8, item.y + h - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Label
    ctx.fillStyle = '#eef8ff';
    ctx.font = '9px monospace';
    ctx.fillText('HACK', x + 3, item.y + h - 15);

    // Difficulty/reward info
    ctx.fillStyle = color;
    ctx.font = '9px monospace';
    ctx.fillText(`${item.difficulty || '?'}`, x + w + 4, item.y + 12);
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${item.reward || '?'}`, x + w + 4, item.y + 24);
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

    // CP label
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

function drawSelection() {
    if (!state.selected) return;
    const item = state.selected.item;
    const rect = item.width ? item : { x: item.x - 12, y: item.y - 12, width: 24, height: 24 };
    ctx.strokeStyle = COLORS.selected;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rect.x - state.cameraX - 4, rect.y - 4, rect.width + 8, rect.height + 8);
    ctx.setLineDash([]);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(-state.cameraX, 0, levelWidth(), canvas.height);

    // Draw all object types
    state.level.platforms.forEach((item) => rectWorld(item, COLORS.platform, 'platform'));

    if (state.level.shadowPlatforms) {
        state.level.shadowPlatforms.forEach((item) => rectWorld(item, COLORS.shadowPlatform, 'shadow'));
    }

    state.level.bonusBlocks.forEach((item) => rectWorld(item, COLORS.bonusBlock, item.reward || 'bonus'));

    state.level.enemies.forEach((item) => {
        rectWorld(item, COLORS.enemy, `${item.type || 'enemy'} hp:${item.health}`);
        ctx.strokeStyle = 'rgba(255,77,109,.55)';
        ctx.beginPath();
        ctx.moveTo(item.minX - state.cameraX, item.y + item.height + 8);
        ctx.lineTo(item.maxX - state.cameraX, item.y + item.height + 8);
        ctx.stroke();
    });

    if (state.level.hackTerminals) {
        state.level.hackTerminals.forEach((item) => drawHackTerminal(item));
    }

    if (state.level.checkpoints) {
        state.level.checkpoints.forEach((item) => drawCheckpoint(item));
    }

    state.level.gems.forEach((item) => circleWorld(item, COLORS.gem, 'gem'));
    circleWorld(state.level.spawn, COLORS.spawn, 'spawn');
    rectWorld(state.level.exit, COLORS.exit, 'exit');

    drawSelection();
    requestAnimationFrame(draw);
}

function exportCode() {
    syncLevelFromForm();
    const name = ($('exportName').value || 'level5').replace(/[^a-zA-Z0-9_$]/g, '');

    // Clean up internal editor properties before export
    const cleanLevel = JSON.parse(JSON.stringify(state.level));
    if (cleanLevel.hackTerminals) {
        cleanLevel.hackTerminals.forEach(t => {
            delete t.nearPlayer;
        });
    }

    return `export const ${name} = ${JSON.stringify(cleanLevel, null, 4)};\n`;
}

function importLevel(text) {
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
        checkpoints: parsed.checkpoints || [],
        fx: parsed.fx || createEmptyLevel().fx,
    };
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
}

document.querySelectorAll('#toolButtons button').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
});

canvas.addEventListener('mousemove', (event) => {
    const pos = screenToWorld(event.clientX, event.clientY);
    state.mouse = { x: pos.sx, y: pos.sy, worldX: pos.x, worldY: pos.y };

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

        // Move door/secret positions with hack terminal
        if (state.selected.group === 'hackTerminals') {
            if (item.doorX !== undefined) item.doorX = snap(state.dragStart.doorX + dx);
            if (item.doorY !== undefined) item.doorY = snap(state.dragStart.doorY + dy);
            if (item.secretX !== undefined) item.secretX = snap(state.dragStart.secretX + dx);
            if (item.secretY !== undefined) item.secretY = snap(state.dragStart.secretY + dy);
        }

        updatePanels();
    }

    updatePanels(false);
});

canvas.addEventListener('mousedown', (event) => {
    const pos = screenToWorld(event.clientX, event.clientY);

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

window.addEventListener('mouseup', () => {
    state.dragging = false;
    state.dragStart = null;
});

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.cameraX = Math.max(0, Math.min(levelWidth() - canvas.width, state.cameraX + event.deltaY));
    updatePanels(false);
}, { passive: false });

window.addEventListener('keydown', (event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected();
    if (!state.selected) return;

    const step = event.shiftKey ? grid() * 5 : grid();
    const item = state.selected.item;
    if (event.key === 'ArrowLeft') item.x -= step;
    if (event.key === 'ArrowRight') item.x += step;
    if (event.key === 'ArrowUp') item.y -= step;
    if (event.key === 'ArrowDown') item.y += step;

    // Also move enemy patrol range
    if (state.selected.group === 'enemies') {
        if (event.key === 'ArrowLeft') { item.minX -= step; item.maxX -= step; }
        if (event.key === 'ArrowRight') { item.minX += step; item.maxX += step; }
    }

    updatePanels();
});

$('exportBtn').addEventListener('click', () => {
    $('exportText').value = exportCode();
});

$('copyBtn').addEventListener('click', async () => {
    const code = exportCode();
    $('exportText').value = code;
    await navigator.clipboard.writeText(code);
});

$('saveBtn').addEventListener('click', () => {
    syncLevelFromForm();
    localStorage.setItem('shadowrunner-level-editor', JSON.stringify(state.level));
});

$('loadBtn').addEventListener('click', () => {
    const saved = localStorage.getItem('shadowrunner-level-editor');
    if (saved) importLevel(saved);
});

$('deleteBtn').addEventListener('click', deleteSelected);

$('resetBtn').addEventListener('click', () => {
    state.level = createEmptyLevel();
    state.selected = null;
    syncFormFromLevel();
    updatePanels();
});

$('importBtn').addEventListener('click', () => {
    try {
        importLevel($('importText').value);
    } catch (error) {
        alert('Import fehlgeschlagen: ' + error.message);
    }
});

$('clearImportBtn').addEventListener('click', () => {
    $('importText').value = '';
});

['levelName', 'background', 'music', 'gridSize', 'levelWidth', 'fxStars', 'fxFog', 'fxRain', 'fxScanlines', 'fxNeonDust'].forEach((id) => {
    $(id).addEventListener('input', () => updatePanels(false));
    $(id).addEventListener('change', () => updatePanels(false));
});

syncFormFromLevel();
updatePanels();
draw();
