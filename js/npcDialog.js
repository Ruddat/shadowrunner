/**
 * npcDialog.js — NPC Dialog System for Shadowrunner
 *
 * Terminal-style NPCs placed in levels with dialog trees.
 * NPCs provide:
 *   - Hints about level secrets, enemy positions, hidden paths
 *   - Mini-quests (kill specific enemy, find item)
 *   - Lore/worldbuilding through conversations
 *   - Shop tips and skill advice
 *
 * NPCs are defined in level data: `npcs: [{x, y, dialogId, ...}]`
 * Dialog trees are defined in this file.
 */

import { state } from './gameState.js';
import { keys, justPressed } from './input.js';
import { CONFIG } from './config.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { playSound } from './audioManager.js';
import { showCenterMessage } from './screens.js';
import { awardXP } from './skillTree.js';

// ─── Dialog Database ────────────────────────────────────────────────────

const DIALOGS = {
    // Level 1 NPCs
    'npc_rooftop_fixer': {
        name: 'VIPER',
        title: 'FIXER',
        greeting: 'Another runner. You look green. Listen up — the corps own the streets, but the rooftops... those are ours. For now.',
        options: [
            {
                text: 'Any tips for a first-timer?',
                response: 'Stick to the shadows. Literally. Your shadow chip lets you slip past their sensors. Use it near those dark zones — the patrol drones cannot see you there. Oh, and watch for the laser grids on the upper levels. They hurt.',
                xp: 10,
            },
            {
                text: 'Who are you?',
                response: 'Name is Viper. I fix things. Connections, jobs, intel. You need something in this city, you come to me. The corps think they run everything. They are wrong. We just let them believe it.',
                xp: 5,
            },
            {
                text: 'What is this place?',
                response: 'Neon District, Sector 7. Arasaka owns the buildings, but they do not patrol the roofs. Too many shadows, they say. That is where you come in. Use the dark. It is your best weapon.',
                xp: 5,
            },
        ],
    },
    'npc_rooftop_hacker': {
        name: 'GHOST',
        title: 'NETRUNNER',
        greeting: 'I intercepted your frequency. You are the new runner, yes? I have been watching the Arasaka traffic on this grid. Something big is happening.',
        options: [
            {
                text: 'What did you find?',
                response: 'They are moving something through the factory district. Weapons, maybe worse. The security is triple-normal. If you are heading there, you will want to hack every terminal you find. Disable their cameras, open their doors. The grid is your friend.',
                xp: 15,
            },
            {
                text: 'Can you help me?',
                response: 'I can give you intel. The rest is up to you. I already flagged the data logs in this sector — grab them. They contain access codes that will make your life easier. And if you find any hack terminals, use them. Trust me.',
                xp: 10,
            },
            {
                text: 'Why help me?',
                response: 'Because the corps took everything from me. My name, my history, my face. Now I am just a ghost in the machine. But ghosts can still fight. You are fighting too. That makes us allies.',
                xp: 5,
            },
        ],
    },
    // Level 2 NPCs
    'npc_alley_dealer': {
        name: 'PIXEL',
        title: 'WEAPONS DEALER',
        greeting: 'Psst. Over here. You look like you could use an upgrade. The shop terminals sell the basic stuff, but I know things they do not.',
        options: [
            {
                text: 'What do you know?',
                response: 'The Militech shipment coming through here? prototype energy weapons. If you find the bonus blocks hidden in this alley, you might get lucky. Also, save your gems for the weapon upgrade at the shop. It is the best investment you will make.',
                xp: 15,
            },
            {
                text: 'Heard about the prototype?',
                response: 'GX-114? Yeah, Militech lost it. Or someone lost it for them. If you find it, do not turn it in. Those things are worth a fortune on the black market. And they shred corporate armor like paper.',
                xp: 10,
            },
            {
                text: 'What is the Shadow Shop?',
                response: 'Black market terminal network. Gem-based economy, no questions asked. The stuff they sell is legit — energy refills, weapon mods, even double-jump implants. Save your gems. The good stuff costs real money.',
                xp: 10,
            },
        ],
    },
    // Level 3 NPCs
    'npc_factory_worker': {
        name: 'KIRA',
        title: 'EX-FACTORY WORKER',
        greeting: 'You should not be here. This place... it is not what they say it is. People disappear in Factory 7.',
        options: [
            {
                text: 'What happened here?',
                response: 'The "accidents" are not accidents. Kang Tao runs experiments on the workers. Neural implants, shadow protocols... I saw people phase through walls. Then I saw them not come back. The data logs in this factory prove everything. Find them.',
                xp: 20,
            },
            {
                text: 'How do I get through?',
                response: 'The security mechs are slow but they hit hard. Use shadow mode to get behind them — their rear sensors are garbage. And there are shadow platforms only visible in shadow mode. They will let you reach areas the corps think are secure.',
                xp: 15,
            },
            {
                text: 'Why are you still here?',
                response: 'Because my daughter is still inside. Somewhere. They took her to the "optimization wing" three months ago. I am not leaving without her. Even if it kills me.',
                xp: 10,
            },
        ],
    },
    // Level 6+ NPCs
    'npc_data_storm_runner': {
        name: 'WRAITH',
        title: 'STORM RUNNER',
        greeting: 'You feel that? The grid is humming. Data storm is coming. Most runners hide when it hits. Not us.',
        options: [
            {
                text: 'What is a data storm?',
                response: 'When the net overloads, everything connected goes haywire. Security systems reboot. Doors open. For about 5 seconds, every locked room in the building becomes accessible. Smart runners time their runs with the storms. Dumb runners get fried by the ICE.',
                xp: 15,
            },
            {
                text: 'Any advice?',
                response: 'Hack everything you can. The tech branch of your neural upgrade tree — invest in it. Faster hacking means more systems under your control before the storm ends. Also, the turrets in this sector have shadow vision. Stay out of their cones even in shadow mode.',
                xp: 15,
            },
        ],
    },
    'npc_void_survivor': {
        name: 'CIPHER',
        title: 'UNKNOWN',
        greeting: 'You should not have come here. But since you are here... I know what you are looking for. The truth about Project Shadowrun.',
        options: [
            {
                text: 'Tell me everything.',
                response: 'The Shadow Protocol was designed to create the perfect infiltrator. A soldier who could walk through walls, become invisible, and kill without leaving a trace. They succeeded. Subject 17 escaped. The corps have been hunting them ever since. The question is... are you Subject 17?',
                xp: 25,
            },
            {
                text: 'What is the Cipher?',
                response: 'Not a what. A who. A child grown in a lab, whose neural patterns can crack any code ever written. Arasaka keeps them below the server farms. Some of us are trying to get them out. If you want to help... keep pushing forward. The deeper you go, the more you will understand.',
                xp: 20,
            },
        ],
    },
};

// ─── Dialog State ───────────────────────────────────────────────────────

let dialogOpen = false;
let currentDialogId = null;
let currentNpc = null;
let selectedOption = 0;
let dialogTime = 0;
let dialogTransition = 0;
let showingResponse = false;
let responseText = '';
let responseXP = 0;
let dialogHistory = []; // track which NPCs player has talked to
let npcNearPlayer = null; // reference to nearby NPC

const DIALOG_SAVE_KEY = 'shadowrunner_npc_dialog';

function loadDialogState() {
    try {
        const raw = localStorage.getItem(DIALOG_SAVE_KEY);
        if (raw) {
            dialogHistory = JSON.parse(raw) || [];
        }
    } catch (_) {}
}

function saveDialogState() {
    try {
        localStorage.setItem(DIALOG_SAVE_KEY, JSON.stringify(dialogHistory));
    } catch (_) {}
}

loadDialogState();

// ─── Public API ─────────────────────────────────────────────────────────

export function isNPCDialogOpen() {
    return dialogOpen;
}

export function openNPCDialog(dialogId, npcRef) {
    const dialog = DIALOGS[dialogId];
    if (!dialog) return false;

    dialogOpen = true;
    currentDialogId = dialogId;
    currentNpc = npcRef;
    selectedOption = 0;
    dialogTime = 0;
    dialogTransition = 0;
    showingResponse = false;
    responseText = '';
    responseXP = 0;

    playSound('menuSelect');
    return true;
}

export function closeNPCDialog() {
    dialogOpen = false;
    currentDialogId = null;
    currentNpc = null;
    showingResponse = false;
    playSound('menuSelect');
}

// ─── NPC Update ─────────────────────────────────────────────────────────

/**
 * Update NPC proximity and interaction.
 * Called from main update loop.
 */
export function updateNPCs(player, level) {
    if (!level.npcs) return;
    if (isNPCDialogOpen()) return;

    npcNearPlayer = null;

    for (const npc of level.npcs) {
        const dist = Math.abs(player.x + player.width / 2 - (npc.x + (npc.width ?? 30) / 2));
        npc.nearPlayer = dist < 80 && Math.abs(player.y + player.height - (npc.y + (npc.height ?? 50))) < 60;

        if (npc.nearPlayer) {
            npcNearPlayer = npc;
        }

        // Interact
        if (npc.nearPlayer && keys.interact) {
            keys.interact = false;
            openNPCDialog(npc.dialogId, npc);
            return;
        }
    }
}

/**
 * Update dialog navigation.
 */
export function updateNPCDialog(dt) {
    if (!dialogOpen) return;

    dialogTime += dt;
    dialogTransition = Math.min(1, dialogTransition + dt * 4);

    if (showingResponse) {
        // Press any key to go back to options
        if (justPressed('interact') || justPressed('jump') || justPressed('shoot')) {
            showingResponse = false;
            playSound('menuMove');
        }
        return;
    }

    const dialog = DIALOGS[currentDialogId];
    if (!dialog) return;

    // Navigate options
    if (justPressed('up') || justPressed('jump')) {
        selectedOption = Math.max(0, selectedOption - 1);
        playSound('menuMove');
    }
    if (justPressed('down') || justPressed('shadow')) {
        selectedOption = Math.min(dialog.options.length - 1, selectedOption + 1);
        playSound('menuMove');
    }

    // Select option
    if (justPressed('interact') || justPressed('shoot')) {
        const option = dialog.options[selectedOption];
        if (option) {
            showingResponse = true;
            responseText = option.response;
            responseXP = option.xp || 0;

            // Award XP for new conversation
            const historyKey = `${currentDialogId}_${selectedOption}`;
            if (!dialogHistory.includes(historyKey)) {
                dialogHistory.push(historyKey);
                saveDialogState();

                if (responseXP > 0) {
                    awardXP(responseXP, 'dialog');
                }
            }

            playSound('itemPickup');
        }
    }

    // Close
    if (justPressed('pause') || justPressed('dash')) {
        closeNPCDialog();
    }
}

// ─── NPC Drawing ────────────────────────────────────────────────────────

/**
 * Draw NPCs in the level.
 */
export function drawNPCs(ctx, camera, level) {
    if (!level.npcs) return;

    for (const npc of level.npcs) {
        const x = npc.x - camera.x;
        const y = npc.y - camera.y;
        const w = npc.width ?? 30;
        const h = npc.height ?? 50;

        // Skip if off-screen
        if (x + w < -20 || x > CONFIG.width + 20) continue;

        const dialog = DIALOGS[npc.dialogId];
        const time = Date.now() * 0.001;

        ctx.save();

        // NPC body (hooded figure)
        const bob = Math.sin(time * 2 + npc.x * 0.01) * 2;

        // Glow
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;

        // Body
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(x + 4, y + 14 + bob, w - 8, h - 14);

        // Hood
        ctx.fillStyle = '#0f2f0f';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + bob);
        ctx.lineTo(x + 2, y + 18 + bob);
        ctx.lineTo(x + w - 2, y + 18 + bob);
        ctx.closePath();
        ctx.fill();

        // Eyes (glowing)
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.fillRect(x + w / 2 - 5, y + 10 + bob, 3, 3);
        ctx.fillRect(x + w / 2 + 2, y + 10 + bob, 3, 3);

        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + bob, w - 4, h);

        // Name label
        if (dialog) {
            ctx.fillStyle = '#22c55e';
            ctx.font = '700 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(dialog.name, x + w / 2, y - 6 + bob);
        }

        // Proximity indicator
        if (npc.nearPlayer) {
            const indicatorPulse = Math.sin(time * 6) * 0.4 + 0.6;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 12 * indicatorPulse;
            ctx.strokeStyle = `rgba(34, 197, 94, ${indicatorPulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2 + bob, w + 4, h + 4);

            // "Press E" prompt
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#22c55e';
            ctx.font = '700 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('E', x + w / 2, y - 16);
        }

        ctx.restore();
    }
}

/**
 * Draw the dialog overlay.
 */
export function drawNPCDialogOverlay(ctx) {
    if (!dialogOpen) return;

    const W = CONFIG.width;
    const H = CONFIG.height;
    const dialog = DIALOGS[currentDialogId];
    if (!dialog) return;

    const t = dialogTransition;
    const ease = easeOutBack(Math.min(1, t));

    ctx.save();

    // Dark overlay
    ctx.fillStyle = `rgba(3, 7, 18, ${0.88 * t})`;
    ctx.fillRect(0, 0, W, H);

    // Scale animation
    ctx.translate(W / 2, H / 2);
    ctx.scale(ease, ease);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = t;

    // Panel dimensions
    const panelW = 700;
    const panelH = 380;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // Panel background
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(5, 12, 5, 0.97)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Inner border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12);

    // NPC Name and Title
    ctx.save();
    const namePulse = Math.sin(dialogTime * 3) * 0.1 + 0.9;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12 * namePulse;
    ctx.fillStyle = '#22c55e';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(dialog.name, panelX + 20, panelY + 34);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.font = '700 12px monospace';
    ctx.fillText(dialog.title, panelX + 20 + ctx.measureText(dialog.name).width + 16, panelY + 34);
    ctx.restore();

    // Divider
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 16, panelY + 48);
    ctx.lineTo(panelX + panelW - 16, panelY + 48);
    ctx.stroke();

    if (showingResponse) {
        // Show NPC response
        drawResponse(ctx, panelX, panelY, panelW, panelH);
    } else {
        // Show greeting + options
        drawGreetingAndOptions(ctx, dialog, panelX, panelY, panelW, panelH);
    }

    // Controls help
    ctx.save();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.06)';
    ctx.fillRect(panelX + 10, panelY + panelH - 36, panelW - 20, 28);

    ctx.fillStyle = '#22c55e';
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    if (showingResponse) {
        ctx.fillText('ENTER: CONTINUE  |  ESC: CLOSE', W / 2, panelY + panelH - 18);
    } else {
        ctx.fillText('W/S: NAVIGATE  |  J/E: SELECT  |  ESC: CLOSE', W / 2, panelY + panelH - 18);
    }
    ctx.restore();

    ctx.restore();
}

function drawGreetingAndOptions(ctx, dialog, panelX, panelY, panelW, panelH) {
    // Greeting text
    ctx.save();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.font = '400 12px monospace';
    ctx.textAlign = 'left';

    const lines = wrapText(ctx, dialog.greeting, panelW - 48);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], panelX + 20, panelY + 68 + i * 16);
    }
    ctx.restore();

    // Options
    const optionsStartY = panelY + 68 + lines.length * 16 + 16;

    for (let i = 0; i < dialog.options.length; i++) {
        const opt = dialog.options[i];
        const oy = optionsStartY + i * 52;
        const isSelected = i === selectedOption;

        ctx.save();

        // Option background
        if (isSelected) {
            const selPulse = Math.sin(dialogTime * 4) * 0.12 + 0.88;
            ctx.fillStyle = `rgba(34, 197, 94, ${0.08 * selPulse})`;
            ctx.fillRect(panelX + 14, oy, panelW - 28, 44);
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 * selPulse})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + 14, oy, panelW - 28, 44);

            // Left accent
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 4;
            ctx.fillRect(panelX + 14, oy, 2, 44);
            ctx.shadowBlur = 0;
        }

        // Option number
        ctx.fillStyle = isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.3)';
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${i + 1}]`, panelX + 24, oy + 18);

        // Option text
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${isSelected ? '700' : '400'} 12px monospace`;
        ctx.fillText(opt.text, panelX + 62, oy + 18);

        // XP reward
        if (opt.xp) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
            ctx.font = '700 9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`+${opt.xp} XP`, panelX + panelW - 24, oy + 18);
        }

        ctx.restore();
    }
}

function drawResponse(ctx, panelX, panelY, panelW, panelH) {
    // NPC response text
    ctx.save();

    // Typing effect (reveal text over time)
    const charsToShow = Math.floor(dialogTime * 80);
    const fullText = responseText;
    const displayText = fullText.substring(0, Math.min(charsToShow, fullText.length));

    ctx.beginPath();
    ctx.rect(panelX + 14, panelY + 52, panelW - 28, panelH - 96);
    ctx.clip();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 13px monospace';
    ctx.textAlign = 'left';

    const lines = wrapText(ctx, displayText, panelW - 48);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], panelX + 20, panelY + 72 + i * 18);
    }

    // Cursor blink
    if (charsToShow < fullText.length || Math.sin(dialogTime * 8) > 0) {
        const lastLine = lines[lines.length - 1] || '';
        const cursorX = panelX + 20 + ctx.measureText(lastLine).width;
        const cursorY = panelY + 72 + (lines.length - 1) * 18;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cursorX, cursorY - 10, 8, 14);
    }

    // XP indicator
    if (responseXP > 0) {
        const xpAlpha = Math.min(1, dialogTime / 0.5);
        ctx.fillStyle = `rgba(250, 204, 21, ${xpAlpha * 0.8})`;
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`+${responseXP} XP`, panelX + panelW - 24, panelY + 42);
    }

    ctx.restore();
}

// ─── Utility ────────────────────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
}

function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
