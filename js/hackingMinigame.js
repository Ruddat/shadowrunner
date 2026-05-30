/**
 * hackingMinigame.js — Matrix-style hacking minigame for Shadowrunner.
 *
 * When the player reaches a Hack Terminal in a level, the game transitions
 * into a node-based network view. The player (as a "deckers" avatar)
 * navigates through connected nodes while ICE (Intrusion Countermeasures)
 * attack. Success opens doors, deactivates enemies, or reveals secrets.
 * Failure triggers an alarm that spawns more enemies.
 *
 * Controls (in hacking mode):
 *   Arrow keys / WASD — Navigate between connected nodes
 *   Space / Enter — Interact with current node (hack, bypass, loot)
 *   Escape — Abort hacking (counts as failure)
 */

import { state } from './gameState.js';
import { keys } from './input.js';
import { CONFIG } from './config.js';
import { playSound } from './audioManager.js';
import { rectsOverlap } from './collision.js';
import { getHackSpeedMultiplier } from './skillTree.js';

// ─── Constants ───────────────────────────────────────────────────────

const MATRIX_GREEN = '#00ff41';
const MATRIX_CYAN = '#00e5ff';
const MATRIX_PINK = '#ff2bd6';
const MATRIX_RED = '#ff003c';
const MATRIX_YELLOW = '#facc15';
const MATRIX_DARK = '#0a0f0a';
const MATRIX_BG = '#020802';

const NODE_TYPES = {
    ENTRY: 'entry',        // Starting node (always safe)
    ROUTER: 'router',      // Neutral pass-through
    DATA: 'data',          // Contains loot (bonus gems/score)
    FIREWALL: 'firewall',  // Must be hacked to proceed (mini challenge)
    ICE_WHITE: 'ice_white', // Slow ICE — easy to dodge
    ICE_GREY: 'ice_grey',  // Medium ICE — moderate threat
    ICE_BLACK: 'ice_black', // Lethal ICE — high damage
    EXIT: 'exit',          // Goal node — reach this to succeed
};

// ─── Hacking State ───────────────────────────────────────────────────

let hackingState = null;   // null = not hacking, object = active minigame

/**
 * Generate a random network for the hacking minigame.
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {object} terminal - The terminal that triggered the hack
 */
export function startHacking(terminal) {
    const difficulty = terminal.difficulty || 'medium';
    const network = generateNetwork(difficulty);

    hackingState = {
        network,
        currentNodeId: 'entry',
        playerHP: 3,
        maxHP: 3,
        timer: getTimerForDifficulty(difficulty),
        maxTimer: getTimerForDifficulty(difficulty),
        difficulty,
        terminal,            // Reference to the terminal in the level
        result: null,        // null | 'success' | 'failure'
        resultTimer: 0,
        hackProgress: 0,     // 0-1 for firewall node hacking
        hackingNode: false,   // Currently hacking a firewall
        alarmLevel: 0,       // Visual alarm intensity
        shakeTimer: 0,
        shakeIntensity: 0,
        particles: [],
        time: 0,
        moveCooldown: 0,
        interactCooldown: 0,
        typedCode: '',       // For firewall minigame
        codeTarget: '',      // Target code to type
        codePosition: 0,
    };

    // Freeze the main game
    state.hackingState = hackingState;

    playSound('menuSelect');
}

export function isHacking() {
    return hackingState !== null;
}

function getTimerForDifficulty(difficulty) {
    // Apply skill: Hack Speed multiplier gives more time (lower mult = faster hacking)
    const hackBonus = 1 / getHackSpeedMultiplier(); // invert: faster speed = more time
    switch (difficulty) {
        case 'easy': return Math.floor(45 * hackBonus);
        case 'medium': return Math.floor(35 * hackBonus);
        case 'hard': return Math.floor(25 * hackBonus);
        default: return Math.floor(35 * hackBonus);
    }
}

// ─── Network Generation ──────────────────────────────────────────────

function generateNetwork(difficulty) {
    const nodes = {};
    const layers = getLayerConfig(difficulty);

    // Build layers of nodes
    const layerNodes = [];

    // Layer 0: Entry
    const entryNode = createNode('entry', 0, 0);
    nodes['entry'] = entryNode;
    layerNodes.push(['entry']);

    // Middle layers
    for (let l = 1; l < layers.count; l++) {
        const nodeCount = layers.nodeCounts[l - 1] || 3;
        const layerIds = [];

        for (let n = 0; n < nodeCount; n++) {
            const id = `n${l}_${n}`;
            const type = pickNodeType(l, layers.count, difficulty);
            const node = createNode(type, l, n);
            nodes[id] = node;
            layerIds.push(id);
        }

        layerNodes.push(layerIds);
    }

    // Last layer: Exit
    const exitId = 'exit';
    nodes[exitId] = createNode('exit', layers.count, 0);
    layerNodes.push([exitId]);

    // Connect layers (each node connects to 1-3 nodes in the next layer)
    for (let l = 0; l < layerNodes.length - 1; l++) {
        const current = layerNodes[l];
        const next = layerNodes[l + 1];

        for (const nodeId of current) {
            // Each node connects to at least 1 and at most 3 nodes in next layer
            const connectCount = Math.min(next.length, 1 + Math.floor(Math.random() * 2));
            const shuffled = [...next].sort(() => Math.random() - 0.5);
            const connections = shuffled.slice(0, connectCount);

            nodes[nodeId].connections.push(...connections);

            // Add reverse connections
            for (const targetId of connections) {
                if (!nodes[targetId].connections.includes(nodeId)) {
                    nodes[targetId].connections.push(nodeId);
                }
            }
        }

        // Ensure every node in next layer has at least one incoming connection
        for (const nextId of next) {
            if (!nodes[nextId].connections.some(id => current.includes(id)) && current.length > 0) {
                const randomParent = current[Math.floor(Math.random() * current.length)];
                nodes[randomParent].connections.push(nextId);
                nodes[nextId].connections.push(randomParent);
            }
        }
    }

    // Position nodes on screen
    positionNodes(nodes, layerNodes);

    // Generate ICE patrol paths
    generateICE(nodes, difficulty);

    return { nodes, layerNodes };
}

function getLayerConfig(difficulty) {
    switch (difficulty) {
        case 'easy': return { count: 4, nodeCounts: [2, 3, 2] };
        case 'medium': return { count: 5, nodeCounts: [3, 3, 4, 3] };
        case 'hard': return { count: 6, nodeCounts: [3, 4, 4, 3, 4] };
        default: return { count: 5, nodeCounts: [3, 3, 4, 3] };
    }
}

function createNode(type, layer, index) {
    return {
        type,
        layer,
        index,
        x: 0,
        y: 0,
        connections: [],
        hacked: type === 'entry',
        ice: null,         // ICE patrolling this node
        looted: false,     // For data nodes
        hackCode: '',      // For firewall nodes — code to type
    };
}

function pickNodeType(layer, totalLayers, difficulty) {
    // First and last layers are always entry/exit
    if (layer === 0) return NODE_TYPES.ENTRY;
    if (layer === totalLayers) return NODE_TYPES.EXIT;

    const rand = Math.random();
    const iceChance = difficulty === 'hard' ? 0.4 : difficulty === 'medium' ? 0.3 : 0.2;

    if (rand < iceChance) {
        // ICE node
        const iceRoll = Math.random();
        if (difficulty === 'hard' && iceRoll < 0.4) return NODE_TYPES.ICE_BLACK;
        if (iceRoll < 0.5) return NODE_TYPES.ICE_GREY;
        return NODE_TYPES.ICE_WHITE;
    }

    if (rand < iceChance + 0.2) return NODE_TYPES.FIREWALL;
    if (rand < iceChance + 0.35) return NODE_TYPES.DATA;

    return NODE_TYPES.ROUTER;
}

function positionNodes(nodes, layerNodes) {
    const padding = 80;
    const width = CONFIG.width - padding * 2;
    const height = CONFIG.height - padding * 2;

    for (let l = 0; l < layerNodes.length; l++) {
        const layerIds = layerNodes[l];
        const x = padding + (width / (layerNodes.length - 1)) * l;

        for (let n = 0; n < layerIds.length; n++) {
            const ySpacing = height / (layerIds.length + 1);
            const y = padding + ySpacing * (n + 1);

            nodes[layerIds[n]].x = x;
            nodes[layerIds[n]].y = y;
        }
    }
}

function generateICE(nodes, difficulty) {
    // ICE objects patrol between connected nodes
    const iceCount = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2;
    const iceList = [];

    const nodeIds = Object.keys(nodes).filter(id => nodes[id].type !== NODE_TYPES.ENTRY && nodes[id].type !== NODE_TYPES.EXIT);

    for (let i = 0; i < iceCount; i++) {
        const startId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        const type = i === 0 && difficulty === 'hard' ? 'black' : i < 2 ? 'grey' : 'white';

        iceList.push({
            type,
            currentNodeId: startId,
            targetNodeId: null,
            progress: 1,  // 0 = at current, 1 = at current
            speed: type === 'black' ? 0.8 : type === 'grey' ? 0.5 : 0.3,
            damage: type === 'black' ? 3 : type === 'grey' ? 2 : 1,
            moveTimer: 2 + Math.random() * 3,
        });
    }

    // Store ICE in the network
    nodes.__ice = iceList;
}

// ─── Update ──────────────────────────────────────────────────────────

export function updateHacking(dt) {
    if (!hackingState) return;

    // Already resolved?
    if (hackingState.result) {
        hackingState.resultTimer -= dt;
        if (hackingState.resultTimer <= 0) {
            finishHacking();
        }
        return;
    }

    hackingState.time += dt;
    hackingState.moveCooldown = Math.max(0, hackingState.moveCooldown - dt);
    hackingState.interactCooldown = Math.max(0, hackingState.interactCooldown - dt);
    hackingState.shakeTimer = Math.max(0, hackingState.shakeTimer - dt);

    // Timer countdown
    hackingState.timer -= dt;
    if (hackingState.timer <= 0) {
        hackingState.timer = 0;
        hackingFailure('TIMEOUT');
        return;
    }

    // Update ICE movement
    updateICE(dt);

    // Check ICE collision with player
    checkICECollision();

    // Update alarm visual
    if (hackingState.alarmLevel > 0) {
        hackingState.alarmLevel = Math.max(0, hackingState.alarmLevel - dt * 0.5);
    }

    // Update particles
    updateHackingParticles(dt);

    // Handle player input
    handleHackingInput(dt);

    // Check if player is at exit and it's reachable
    const currentNode = hackingState.network.nodes[hackingState.currentNodeId];
    if (currentNode.type === NODE_TYPES.EXIT && !hackingState.hackingNode) {
        hackingSuccess();
    }
}

function handleHackingInput(dt) {
    if (hackingState.hackingNode) {
        // Firewall hacking mode — type the code
        handleFirewallInput();
        return;
    }

    if (hackingState.moveCooldown > 0) return;

    const currentNode = hackingState.network.nodes[hackingState.currentNodeId];
    const connections = currentNode.connections;

    // Navigate: left/right selects connection, up/down could be used too
    // We map: left = previous connection, right = next connection, up = confirm move
    // But simpler: arrow keys move in direction of connected node

    let targetId = null;

    if (keys.left || keys.right || keys.jump || keys.up) {
        // Find the best connected node based on direction
        if (keys.right) {
            // Move to a node in a higher layer (toward exit)
            const forward = connections.filter(id => {
                const n = hackingState.network.nodes[id];
                return n.layer > currentNode.layer;
            });
            if (forward.length > 0) {
                targetId = forward[0];
            }
        } else if (keys.left) {
            // Move backward
            const backward = connections.filter(id => {
                const n = hackingState.network.nodes[id];
                return n.layer < currentNode.layer;
            });
            if (backward.length > 0) {
                targetId = backward[0];
            }
        } else if (keys.jump || keys.up) {
            // Up/jump = move to node above (lower y)
            const above = connections.filter(id => {
                const n = hackingState.network.nodes[id];
                return n.y < currentNode.y - 20;
            });
            if (above.length > 0) {
                targetId = above[0];
            } else if (connections.length > 0) {
                targetId = connections[0];
            }
        }

        if (targetId) {
            movePlayerToNode(targetId);
            hackingState.moveCooldown = 0.25;
        }
    }

    // Interact with current node
    if ((keys.shoot || keys.dash) && hackingState.interactCooldown <= 0) {
        interactWithNode(currentNode);
        hackingState.interactCooldown = 0.4;
    }

    // Down key = move to node below
    if (keys.shadow) {
        const below = connections.filter(id => {
            const n = hackingState.network.nodes[id];
            return n.y > currentNode.y + 20;
        });
        if (below.length > 0) {
            movePlayerToNode(below[0]);
            hackingState.moveCooldown = 0.25;
        }
    }
}

function movePlayerToNode(nodeId) {
    const node = hackingState.network.nodes[nodeId];

    // Check if path is blocked by unhacked firewall
    if (node.type === NODE_TYPES.FIREWALL && !node.hacked) {
        // Start hacking the firewall
        hackingState.hackingNode = true;
        hackingState.hackProgress = 0;
        hackingState.currentNodeId = nodeId; // Move to firewall node
        generateHackCode(node);
        playSound('menuMove');
        return;
    }

    hackingState.currentNodeId = nodeId;

    // Trigger node effects
    if (node.type === NODE_TYPES.DATA && !node.looted) {
        node.looted = true;
        // Bonus loot!
        state.player.score += 500;
        spawnHackingParticle(node.x, node.y, MATRIX_YELLOW, 8);
        playSound('itemPickup');
    }

    if (node.type === NODE_TYPES.ICE_WHITE || node.type === NODE_TYPES.ICE_GREY || node.type === NODE_TYPES.ICE_BLACK) {
        // ICE node — ICE attacks immediately if not cleared
        if (!node.hacked) {
            const iceDamage = node.type === NODE_TYPES.ICE_BLACK ? 2 : node.type === NODE_TYPES.ICE_GREY ? 1 : 1;
            playerTakeDamage(iceDamage);
            node.hacked = true; // Can pass through after taking hit
            spawnHackingParticle(node.x, node.y, MATRIX_RED, 12);
        }
    }

    playSound('menuMove');
}

function interactWithNode(node) {
    if (node.type === NODE_TYPES.DATA && !node.looted) {
        node.looted = true;
        state.player.score += 500;
        spawnHackingParticle(node.x, node.y, MATRIX_YELLOW, 8);
        playSound('itemPickup');
    }
}

function generateHackCode(node) {
    // Generate a random code the player must type
    const chars = 'ABCDEF0123456789';
    const length = hackingState.difficulty === 'hard' ? 8 : hackingState.difficulty === 'medium' ? 6 : 4;
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    node.hackCode = code;
    hackingState.codeTarget = code;
    hackingState.codePosition = 0;
    hackingState.typedCode = '';
}

function handleFirewallInput() {
    // During firewall hacking, player types the code shown
    // For simplicity: auto-progress with shoot key, or press directional keys to advance
    // Actually, let's make it a timing-based hack: hold shoot to fill progress bar

    if (keys.shoot) {
        hackingState.hackProgress += 0.02; // Progress per frame while holding shoot

        if (hackingState.hackProgress >= 1) {
            // Firewall hacked!
            const node = hackingState.network.nodes[hackingState.currentNodeId];
            node.hacked = true;
            hackingState.hackingNode = false;
            hackingState.hackProgress = 0;
            spawnHackingParticle(node.x, node.y, MATRIX_GREEN, 15);
            playSound('itemPickup');
        }
    } else {
        // Slow decay when not pressing
        hackingState.hackProgress = Math.max(0, hackingState.hackProgress - 0.005);
    }

    // Cancel hacking with dash
    if (keys.dash) {
        hackingState.hackingNode = false;
        hackingState.hackProgress = 0;
        // Move back to previous layer
        const currentNode = hackingState.network.nodes[hackingState.currentNodeId];
        const backward = currentNode.connections.filter(id => {
            const n = hackingState.network.nodes[id];
            return n.layer < currentNode.layer;
        });
        if (backward.length > 0) {
            hackingState.currentNodeId = backward[0];
        }
    }
}

function updateICE(dt) {
    const iceList = hackingState.network.nodes.__ice;
    if (!iceList) return;

    for (const ice of iceList) {
        ice.moveTimer -= dt;

        if (ice.moveTimer <= 0) {
            // Pick a new target
            const currentNode = hackingState.network.nodes[ice.currentNodeId];
            if (currentNode.connections.length > 0) {
                ice.targetNodeId = currentNode.connections[Math.floor(Math.random() * currentNode.connections.length)];
                ice.progress = 0;
            }
            ice.moveTimer = 1.5 + Math.random() * 3;
        }

        // Move toward target
        if (ice.targetNodeId && ice.progress < 1) {
            ice.progress += ice.speed * dt;
            if (ice.progress >= 1) {
                ice.currentNodeId = ice.targetNodeId;
                ice.targetNodeId = null;
                ice.progress = 1;
            }
        }
    }
}

function checkICECollision() {
    const iceList = hackingState.network.nodes.__ice;
    if (!iceList) return;

    const playerNode = hackingState.network.nodes[hackingState.currentNodeId];

    for (const ice of iceList) {
        let iceX, iceY;

        if (ice.targetNodeId && ice.progress < 1) {
            // ICE is between two nodes
            const fromNode = hackingState.network.nodes[ice.currentNodeId];
            const toNode = hackingState.network.nodes[ice.targetNodeId];
            iceX = fromNode.x + (toNode.x - fromNode.x) * ice.progress;
            iceY = fromNode.y + (toNode.y - fromNode.y) * ice.progress;
        } else {
            const fromNode = hackingState.network.nodes[ice.currentNodeId];
            iceX = fromNode.x;
            iceY = fromNode.y;
        }

        // Check proximity to player
        const dx = iceX - playerNode.x;
        const dy = iceY - playerNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
            // ICE hits player
            playerTakeDamage(ice.damage);
            // Push ICE away
            ice.moveTimer = 3;
            spawnHackingParticle(playerNode.x, playerNode.y, MATRIX_RED, 10);
        }
    }
}

function playerTakeDamage(damage) {
    hackingState.playerHP -= damage;
    hackingState.shakeTimer = 0.3;
    hackingState.shakeIntensity = 8;
    hackingState.alarmLevel = 1;

    if (hackingState.playerHP <= 0) {
        hackingState.playerHP = 0;
        hackingFailure('ICE_DEFEATED');
    }
}

function hackingSuccess() {
    hackingState.result = 'success';
    hackingState.resultTimer = 2.0;

    // Apply success effects
    const terminal = hackingState.terminal;
    terminal.hacked = true;

    // Determine reward
    if (terminal.reward === 'deactivate_enemies' || terminal.targetId === 'deactivate') {
        // Deactivate nearby enemies
        deactivateNearbyEnemies(terminal);
    } else if (terminal.reward === 'open_door' || terminal.targetId === 'door') {
        // Open a path (add platform or remove barrier)
        openHackingDoor(terminal);
    } else if (terminal.reward === 'secret_area' || terminal.targetId === 'secret') {
        // Reveal secret area with weapon upgrade
        revealSecretArea(terminal);
    } else {
        // Default: bonus score + deactivate closest enemy
        state.player.score += 1000;
        deactivateNearbyEnemies(terminal);
    }

    spawnHackingParticle(CONFIG.width / 2, CONFIG.height / 2, MATRIX_GREEN, 30);
    playSound('itemPickup');
}

function hackingFailure(reason) {
    hackingState.result = 'failure';
    hackingState.resultTimer = 2.0;
    hackingState.alarmLevel = 2;

    // Spawn alarm enemies near the terminal
    spawnAlarmEnemies(hackingState.terminal);

    spawnHackingParticle(CONFIG.width / 2, CONFIG.height / 2, MATRIX_RED, 25);
}

function finishHacking() {
    const result = hackingState.result;
    hackingState = null;
    state.hackingState = null;

    if (result === 'success') {
        showCenterMessageExternal('HACK SUCCESSFUL', 1.5);
    } else {
        showCenterMessageExternal('HACK FAILED — ALARM!', 1.5);
    }
}

// ─── Reward / Penalty Effects ────────────────────────────────────────

function deactivateNearbyEnemies(terminal) {
    const level = state.currentLevel;
    if (!level.enemies) return;

    const range = 600;
    let count = 0;

    for (const enemy of level.enemies) {
        if (!enemy.active) continue;
        const dx = Math.abs(enemy.x - terminal.x);
        if (dx < range) {
            enemy.active = false;
            count++;
        }
    }

    // Also deactivate boss if terminal targets it
    if (level.boss && level.boss.active) {
        const dx = Math.abs(level.boss.x - terminal.x);
        if (dx < range * 1.5 || terminal.targetId === 'boss') {
            level.boss.stunTimer = 8; // Stun boss for 8 seconds instead of killing
        }
    }
}

function openHackingDoor(terminal) {
    const level = state.currentLevel;

    // Add a new platform bridging a gap, or remove a barrier
    // We use the terminal's doorX/doorY/doorW/doorH to define the door
    if (terminal.doorX !== undefined) {
        if (!level.hackingDoors) level.hackingDoors = [];
        level.hackingDoors.push({
            x: terminal.doorX,
            y: terminal.doorY,
            width: terminal.doorW || 200,
            height: terminal.doorH || 32,
            opened: true,
        });

        // Add as a platform so player can walk through
        level.platforms.push({
            x: terminal.doorX,
            y: terminal.doorY,
            width: terminal.doorW || 200,
            height: terminal.doorH || 32,
            isHackDoor: true,
        });
    }
}

function revealSecretArea(terminal) {
    const level = state.currentLevel;

    // Add secret platforms and a weapon upgrade
    if (terminal.secretPlatforms) {
        for (const sp of terminal.secretPlatforms) {
            level.platforms.push(sp);
        }
    }

    // Add a weapon upgrade item as a floating item
    if (terminal.secretWeapon) {
        if (!level.hackingSecretItems) level.hackingSecretItems = [];
        level.hackingSecretItems.push({
            x: terminal.secretX || terminal.x,
            y: (terminal.secretY || terminal.y) - 60,
            width: 32,
            height: 32,
            type: 'weapon',
            weaponId: terminal.secretWeapon,
            floatTimer: 0,
            active: true,
        });
    }
}

function spawnAlarmEnemies(terminal) {
    const level = state.currentLevel;
    if (!level.enemies) return;

    // Spawn 2-3 extra enemies near the terminal
    const count = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
        const offsetX = (i - 1) * 150 + (Math.random() * 60 - 30);
        level.enemies.push({
            type: 'walker',
            x: terminal.x + offsetX,
            y: terminal.y - 40,
            width: 36,
            height: 48,
            minX: terminal.x + offsetX - 100,
            maxX: terminal.x + offsetX + 100,
            speed: 120 + Math.random() * 80,
            direction: Math.random() > 0.5 ? 1 : -1,
            health: 60,
            maxHealth: 60,
            active: true,
            canShoot: Math.random() > 0.5,
            shootDelay: 1.5,
            shootRangeX: 400,
            shootRangeY: 150,
            projectileSpeed: 300,
            projectileColor: '#ff003c',
            projectileWidth: 14,
            projectileHeight: 6,
            projectileDamage: 15,
            contactDamage: 25,
            shootTimer: Math.random() * 2,
            isAlarmSpawn: true, // Flag for visual distinction
        });
    }
}

function showCenterMessageExternal(msg, duration) {
    // Use the game's center message system
    if (state.messageTimer !== undefined) {
        state.centerMessage = msg;
        state.messageTimer = duration;
        state.messageDuration = duration;
    }
}

// ─── Particles ───────────────────────────────────────────────────────

function spawnHackingParticle(x, y, color, count) {
    if (!hackingState) return;
    for (let i = 0; i < count; i++) {
        hackingState.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1,
            color,
            size: 2 + Math.random() * 3,
        });
    }
}

function updateHackingParticles(dt) {
    if (!hackingState) return;
    for (let i = hackingState.particles.length - 1; i >= 0; i--) {
        const p = hackingState.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
            hackingState.particles.splice(i, 1);
        }
    }
}

// ─── Render ──────────────────────────────────────────────────────────

export function drawHacking(ctx) {
    if (!hackingState) return;

    const W = CONFIG.width;
    const H = CONFIG.height;

    ctx.save();

    // Screen shake
    if (hackingState.shakeTimer > 0) {
        const shake = hackingState.shakeIntensity * (hackingState.shakeTimer / 0.3);
        ctx.translate(
            (Math.random() - 0.5) * shake * 2,
            (Math.random() - 0.5) * shake * 2
        );
    }

    // === Background ===
    drawMatrixBackground(ctx, W, H, hackingState.time);

    // === Connections ===
    drawConnections(ctx);

    // === Nodes ===
    drawNodes(ctx);

    // === ICE ===
    drawICEEntities(ctx);

    // === Player Avatar ===
    drawPlayerAvatar(ctx);

    // === Firewall hacking overlay ===
    if (hackingState.hackingNode) {
        drawFirewallHacking(ctx, W, H);
    }

    // === Particles ===
    drawHackingParticles(ctx);

    // === HUD ===
    drawHackingHUD(ctx, W, H);

    // === Result overlay ===
    if (hackingState.result) {
        drawResultOverlay(ctx, W, H);
    }

    // === Alarm flash ===
    if (hackingState.alarmLevel > 0) {
        ctx.fillStyle = `rgba(255,0,60,${hackingState.alarmLevel * 0.15})`;
        ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
}

function drawMatrixBackground(ctx, W, H, time) {
    // Dark matrix background
    ctx.fillStyle = MATRIX_BG;
    ctx.fillRect(0, 0, W, H);

    // Falling matrix rain columns
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = MATRIX_GREEN;
    ctx.font = '12px monospace';

    const columnWidth = 20;
    const columns = Math.ceil(W / columnWidth);

    for (let i = 0; i < columns; i++) {
        const x = i * columnWidth;
        const offset = ((time * 80 + i * 37) % (H + 200)) - 100;
        const charCount = 15;

        for (let j = 0; j < charCount; j++) {
            const y = offset - j * 16;
            if (y < -20 || y > H + 20) continue;
            const char = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
            ctx.globalAlpha = Math.max(0.02, 0.08 - j * 0.005);
            ctx.fillText(char, x, y);
        }
    }
    ctx.restore();

    // Scanlines
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // Vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
}

function drawConnections(ctx) {
    const nodes = hackingState.network.nodes;
    const drawn = new Set();

    ctx.save();

    for (const [id, node] of Object.entries(nodes)) {
        if (id === '__ice') continue;

        for (const targetId of node.connections) {
            const key = [id, targetId].sort().join('-');
            if (drawn.has(key)) continue;
            drawn.add(key);

            const target = nodes[targetId];
            if (!target) continue;

            // Determine connection style
            const isPlayerPath = id === hackingState.currentNodeId || targetId === hackingState.currentNodeId;
            const isHacked = (node.hacked || node.type === NODE_TYPES.ENTRY) && (target.hacked || target.type === NODE_TYPES.EXIT);

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);

            if (isPlayerPath) {
                ctx.strokeStyle = MATRIX_CYAN;
                ctx.lineWidth = 2;
                ctx.shadowColor = MATRIX_CYAN;
                ctx.shadowBlur = 8;
            } else if (isHacked) {
                ctx.strokeStyle = 'rgba(0,255,65,0.4)';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = 'rgba(0,255,65,0.15)';
                ctx.lineWidth = 1;
                ctx.shadowBlur = 0;
            }

            ctx.stroke();

            // Animated data pulse along connections
            if (isHacked || isPlayerPath) {
                const pulseT = (hackingState.time * 2) % 1;
                const px = node.x + (target.x - node.x) * pulseT;
                const py = node.y + (target.y - node.y) * pulseT;
                ctx.fillStyle = MATRIX_GREEN;
                ctx.shadowColor = MATRIX_GREEN;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.restore();
}

function drawNodes(ctx) {
    const nodes = hackingState.network.nodes;

    for (const [id, node] of Object.entries(nodes)) {
        if (id === '__ice') continue;

        const isCurrent = id === hackingState.currentNodeId;
        const radius = isCurrent ? 22 : 16;

        ctx.save();

        // Node glow
        let color, glowColor;
        switch (node.type) {
            case NODE_TYPES.ENTRY:
                color = MATRIX_GREEN;
                glowColor = MATRIX_GREEN;
                break;
            case NODE_TYPES.ROUTER:
                color = '#1a4a2a';
                glowColor = MATRIX_GREEN;
                break;
            case NODE_TYPES.DATA:
                color = node.looted ? '#1a3a1a' : MATRIX_YELLOW;
                glowColor = MATRIX_YELLOW;
                break;
            case NODE_TYPES.FIREWALL:
                color = node.hacked ? MATRIX_GREEN : MATRIX_ORANGE;
                glowColor = node.hacked ? MATRIX_GREEN : MATRIX_ORANGE;
                break;
            case NODE_TYPES.ICE_WHITE:
                color = node.hacked ? '#333' : '#ffffff';
                glowColor = '#ffffff';
                break;
            case NODE_TYPES.ICE_GREY:
                color = node.hacked ? '#333' : '#888888';
                glowColor = '#888888';
                break;
            case NODE_TYPES.ICE_BLACK:
                color = node.hacked ? '#333' : MATRIX_RED;
                glowColor = MATRIX_RED;
                break;
            case NODE_TYPES.EXIT:
                color = MATRIX_CYAN;
                glowColor = MATRIX_CYAN;
                break;
            default:
                color = MATRIX_GREEN;
                glowColor = MATRIX_GREEN;
        }

        // Outer glow
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isCurrent ? 20 : 10;

        // Node body
        if (isCurrent) {
            // Pulsing current node
            const pulse = Math.sin(hackingState.time * 6) * 0.3 + 0.7;
            ctx.fillStyle = color;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Main circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner details
        ctx.shadowBlur = 0;
        ctx.fillStyle = MATRIX_DARK;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        // Type icon/label
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = '';
        switch (node.type) {
            case NODE_TYPES.ENTRY: label = 'IN'; break;
            case NODE_TYPES.ROUTER: label = 'R'; break;
            case NODE_TYPES.DATA: label = node.looted ? '$' : 'D'; break;
            case NODE_TYPES.FIREWALL: label = node.hacked ? 'OK' : 'FW'; break;
            case NODE_TYPES.ICE_WHITE: label = 'W'; break;
            case NODE_TYPES.ICE_GREY: label = 'G'; break;
            case NODE_TYPES.ICE_BLACK: label = 'B'; break;
            case NODE_TYPES.EXIT: label = 'OUT'; break;
        }
        ctx.fillText(label, node.x, node.y);

        // Data node sparkle
        if (node.type === NODE_TYPES.DATA && !node.looted) {
            const sparkle = Math.sin(hackingState.time * 4) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(250,204,21,${sparkle * 0.4})`;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 8 + sparkle * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Exit node beacon
        if (node.type === NODE_TYPES.EXIT) {
            const beacon = Math.sin(hackingState.time * 3) * 0.5 + 0.5;
            ctx.strokeStyle = MATRIX_CYAN;
            ctx.globalAlpha = beacon * 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 10 + beacon * 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}

function drawICEEntities(ctx) {
    const iceList = hackingState.network.nodes.__ice;
    if (!iceList) return;

    for (const ice of iceList) {
        let iceX, iceY;

        if (ice.targetNodeId && ice.progress < 1) {
            const fromNode = hackingState.network.nodes[ice.currentNodeId];
            const toNode = hackingState.network.nodes[ice.targetNodeId];
            iceX = fromNode.x + (toNode.x - fromNode.x) * ice.progress;
            iceY = fromNode.y + (toNode.y - fromNode.y) * ice.progress;
        } else {
            const fromNode = hackingState.network.nodes[ice.currentNodeId];
            iceX = fromNode.x;
            iceY = fromNode.y;
        }

        ctx.save();

        // ICE visual
        let color, size;
        switch (ice.type) {
            case 'black':
                color = MATRIX_RED;
                size = 14;
                break;
            case 'grey':
                color = '#888888';
                size = 12;
                break;
            default:
                color = '#ffffff';
                size = 10;
        }

        // Outer threat aura
        const pulse = Math.sin(hackingState.time * 8) * 0.3 + 0.7;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12 * pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(iceX, iceY, size + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // ICE body — diamond shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(iceX, iceY - size);
        ctx.lineTo(iceX + size, iceY);
        ctx.lineTo(iceX, iceY + size);
        ctx.lineTo(iceX - size, iceY);
        ctx.closePath();
        ctx.fill();

        // Inner dark core
        ctx.fillStyle = MATRIX_DARK;
        const innerSize = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(iceX, iceY - innerSize);
        ctx.lineTo(iceX + innerSize, iceY);
        ctx.lineTo(iceX, iceY + innerSize);
        ctx.lineTo(iceX - innerSize, iceY);
        ctx.closePath();
        ctx.fill();

        // ICE label
        ctx.fillStyle = color;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ice.type === 'black' ? 'BLK' : ice.type === 'grey' ? 'GRY' : 'WHT', iceX, iceY);

        ctx.restore();
    }
}

function drawPlayerAvatar(ctx) {
    const node = hackingState.network.nodes[hackingState.currentNodeId];
    if (!node) return;

    ctx.save();

    const pulse = Math.sin(hackingState.time * 5) * 0.2 + 0.8;

    // Player avatar — glowing cyber-skull/decker icon
    ctx.shadowColor = MATRIX_CYAN;
    ctx.shadowBlur = 18 * pulse;

    // Outer ring
    ctx.strokeStyle = MATRIX_CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Inner avatar body
    ctx.fillStyle = MATRIX_CYAN;
    ctx.beginPath();
    ctx.arc(node.x, node.y - 4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillRect(node.x - 5, node.y + 4, 10, 10);

    // Eye visor
    ctx.fillStyle = '#000';
    ctx.fillRect(node.x - 6, node.y - 6, 12, 4);
    ctx.fillStyle = MATRIX_GREEN;
    ctx.fillRect(node.x - 5, node.y - 5, 4, 2);
    ctx.fillRect(node.x + 1, node.y - 5, 4, 2);

    ctx.restore();
}

function drawFirewallHacking(ctx, W, H) {
    // Overlay panel
    const panelW = 400;
    const panelH = 200;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    ctx.save();

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // Panel border
    ctx.shadowColor = MATRIX_ORANGE;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = MATRIX_ORANGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Panel fill
    ctx.fillStyle = 'rgba(10,15,10,0.95)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Title
    ctx.shadowBlur = 0;
    ctx.fillStyle = MATRIX_ORANGE;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIREWALL DETECTED', W / 2, panelY + 30);

    // Instructions
    ctx.fillStyle = MATRIX_GREEN;
    ctx.font = '12px monospace';
    ctx.fillText('Hold [SHOOT/J] to hack — Release to decay', W / 2, panelY + 55);

    // Code display (decorative)
    ctx.fillStyle = 'rgba(0,255,65,0.3)';
    ctx.font = '14px monospace';
    const node = hackingState.network.nodes[hackingState.currentNodeId];
    if (node && node.hackCode) {
        ctx.fillText(`CODE: ${node.hackCode}`, W / 2, panelY + 80);
    }

    // Progress bar
    const barW = panelW - 60;
    const barH = 24;
    const barX = panelX + 30;
    const barY = panelY + 100;

    // Bar background
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(barX, barY, barW, barH);

    // Progress fill
    const fillW = barW * hackingState.hackProgress;
    const progressColor = hackingState.hackProgress > 0.7 ? MATRIX_GREEN :
                          hackingState.hackProgress > 0.3 ? MATRIX_YELLOW : MATRIX_ORANGE;
    ctx.shadowColor = progressColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = progressColor;
    ctx.fillRect(barX, barY, fillW, barH);

    // Bar border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Percentage
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(hackingState.hackProgress * 100)}%`, W / 2, barY + 18);

    // Cancel hint
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText('Press [DASH/L] to cancel', W / 2, panelY + panelH - 20);

    ctx.restore();
}

function drawHackingParticles(ctx) {
    if (!hackingState) return;

    ctx.save();
    for (const p of hackingState.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
}

function drawHackingHUD(ctx, W, H) {
    ctx.save();

    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 44);

    // Title
    ctx.fillStyle = MATRIX_GREEN;
    ctx.shadowColor = MATRIX_GREEN;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('>>> MATRIX INTERFACE v2.1 <<<', 16, 28);

    // Timer
    const timerColor = hackingState.timer < 10 ? MATRIX_RED : MATRIX_GREEN;
    ctx.fillStyle = timerColor;
    ctx.shadowColor = timerColor;
    ctx.shadowBlur = 6;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${Math.ceil(hackingState.timer)}s`, W - 16, 28);

    // HP display
    ctx.textAlign = 'center';
    ctx.fillStyle = MATRIX_CYAN;
    ctx.shadowColor = MATRIX_CYAN;
    ctx.shadowBlur = 4;
    ctx.font = '14px monospace';

    let hpBar = '';
    for (let i = 0; i < hackingState.maxHP; i++) {
        hpBar += i < hackingState.playerHP ? '■ ' : '□ ';
    }
    ctx.fillText(`ICE SHIELD: ${hpBar}`, W / 2, 28);

    // Bottom controls hint
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 36, W, 36);
    ctx.fillStyle = 'rgba(0,255,65,0.6)';
    ctx.shadowBlur = 0;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[←→] Navigate  [↑/SPACE] Forward  [↓/K] Down  [J] Interact/Hack  [ESC] Abort', W / 2, H - 14);

    // Difficulty indicator
    const diffColor = hackingState.difficulty === 'hard' ? MATRIX_RED :
                      hackingState.difficulty === 'medium' ? MATRIX_YELLOW : MATRIX_GREEN;
    ctx.fillStyle = diffColor;
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillText(`DIFF: ${hackingState.difficulty.toUpperCase()}`, 16, H - 14);

    ctx.restore();
}

function drawResultOverlay(ctx, W, H) {
    ctx.save();

    const isSuccess = hackingState.result === 'success';

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // Result text
    const color = isSuccess ? MATRIX_GREEN : MATRIX_RED;
    const text = isSuccess ? '>> HACK SUCCESSFUL <<' : '>> HACK FAILED — ALARM TRIGGERED <<';

    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2 - 20);

    // Subtext
    ctx.shadowBlur = 8;
    ctx.font = '14px monospace';
    if (isSuccess) {
        const terminal = hackingState.terminal;
        let rewardText = 'SCORE +1000';
        if (terminal.reward === 'deactivate_enemies' || terminal.targetId === 'deactivate') {
            rewardText = 'NEARBY ENEMIES DEACTIVATED';
        } else if (terminal.reward === 'open_door' || terminal.targetId === 'door') {
            rewardText = 'DOOR OPENED';
        } else if (terminal.reward === 'secret_area' || terminal.targetId === 'secret') {
            rewardText = 'SECRET AREA REVEALED';
        }
        ctx.fillStyle = MATRIX_CYAN;
        ctx.fillText(rewardText, W / 2, H / 2 + 20);
    } else {
        ctx.fillStyle = MATRIX_RED;
        ctx.fillText('ALARM: Reinforcement enemies spawned!', W / 2, H / 2 + 20);
    }

    // Return hint
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('Returning to game...', W / 2, H / 2 + 60);

    ctx.restore();
}

// ─── Terminal Interaction (in normal gameplay) ───────────────────────

const MATRIX_ORANGE = '#ff6600';

export function updateHackTerminals() {
    if (!state.currentLevel || !state.currentLevel.hackTerminals) return;
    if (hackingState) return; // Already hacking

    const { player } = state;
    const terminals = state.currentLevel.hackTerminals;

    for (const terminal of terminals) {
        if (terminal.hacked) continue;

        // Check player proximity
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const termCenterX = terminal.x + terminal.width / 2;
        const termCenterY = terminal.y + terminal.height / 2;

        const dx = Math.abs(playerCenterX - termCenterX);
        const dy = Math.abs(playerCenterY - termCenterY);

        terminal.nearPlayer = dx < terminal.width + 20 && dy < terminal.height + 30;

        // Interact key (E or F) — we use the 'interact' key from input.js
        if (terminal.nearPlayer && keys.interact) {
            keys.interact = false; // Consume the press
            startHacking(terminal);
            return;
        }
    }
}

export function drawHackTerminals(ctx, camera) {
    if (!state.currentLevel || !state.currentLevel.hackTerminals) return;

    const terminals = state.currentLevel.hackTerminals;
    const time = performance.now() * 0.001;

    for (const terminal of terminals) {
        const x = terminal.x - camera.x;
        const y = terminal.y - camera.y;
        const w = terminal.width;
        const h = terminal.height;

        ctx.save();

        if (terminal.hacked) {
            // Hacked terminal — green, dim
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#0a2a0a';
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = MATRIX_GREEN;
            ctx.lineWidth = 1;
            ctx.shadowColor = MATRIX_GREEN;
            ctx.shadowBlur = 6;
            ctx.strokeRect(x, y, w, h);

            // "HACKED" label
            ctx.fillStyle = MATRIX_GREEN;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('HACKED', x + w / 2, y + h / 2 + 3);
        } else {
            // Active terminal — glowing, pulsing
            const pulse = Math.sin(time * 3) * 0.3 + 0.7;

            // Glow aura
            ctx.shadowColor = MATRIX_ORANGE;
            ctx.shadowBlur = 12 * pulse;

            // Terminal body
            ctx.fillStyle = '#1a0a00';
            ctx.fillRect(x, y, w, h);

            // Screen area
            const screenX = x + 4;
            const screenY = y + 4;
            const screenW = w - 8;
            const screenH = h - 16;
            ctx.fillStyle = `rgba(0,255,65,${0.15 * pulse})`;
            ctx.fillRect(screenX, screenY, screenW, screenH);

            // Scan line on screen
            const scanY = screenY + ((time * 40) % screenH);
            ctx.fillStyle = `rgba(0,255,65,0.3)`;
            ctx.fillRect(screenX, scanY, screenW, 2);

            // Screen text
            ctx.fillStyle = MATRIX_GREEN;
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('> ACCESS_', x + w / 2, screenY + screenH / 2 + 2);

            // Border
            ctx.strokeStyle = MATRIX_ORANGE;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8 * pulse;
            ctx.strokeRect(x, y, w, h);

            // Bottom indicator lights
            for (let i = 0; i < 3; i++) {
                const lightX = x + 8 + i * 10;
                const lightY = y + h - 7;
                ctx.fillStyle = i === 0 ? MATRIX_RED : i === 1 ? MATRIX_ORANGE : MATRIX_GREEN;
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(lightX, lightY, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Interaction prompt
            if (terminal.nearPlayer) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = MATRIX_CYAN;
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';

                const promptPulse = Math.sin(time * 6) * 0.3 + 0.7;
                ctx.globalAlpha = promptPulse;
                ctx.fillText('[E] HACK TERMINAL', x + w / 2, y - 12);
            }
        }

        ctx.restore();
    }
}

// ─── Abort (called from main.js on Escape during hacking) ────────────

export function abortHacking() {
    if (!hackingState) return;
    hackingFailure('ABORTED');
}
