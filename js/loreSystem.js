/**
 * loreSystem.js — Data Logs & Lore System for Shadowrunner
 *
 * Collectible data logs scattered through levels that tell the story
 * of the Shadowrunner universe. Found logs are saved to localStorage
 * and can be read between missions.
 *
 * Lore is organized into categories:
 *   - CORP_LOG: Megacorp internal memos (darkly humorous corporate evil)
 *   - RUNNER_NOTE: Notes left by other shadowrunners
 *   - NEWS: News headlines from the neon underground
 *   - DELETED: Recovered deleted files (conspiracy material)
 */

import { state } from './gameState.js';
import { rectsOverlap } from './collision.js';
import { spawnParticles } from './particles.js';
import { playSound } from './audioManager.js';
import { showCenterMessage } from './screens.js';
import { keys, justPressed } from './input.js';

// ─── Lore Database ──────────────────────────────────────────────────────

const LORE_ENTRIES = {
    // Level 1 — Neon Rooftops
    'log_1_1': {
        id: 'log_1_1',
        category: 'CORP_LOG',
        title: 'Arasaka Tower — Eviction Notice #4471',
        body: 'NOTICE: Residents of Sector 7-G are hereby evicted effective immediately. Renovation into executive parking is authorized per Directive 2099-VII. Any personal belongings left behind become property of Arasaka Corp. Complaints may be filed at the Customer Satisfaction Terminal on Floor -12. Wait time: 14 months.',
    },
    'log_1_2': {
        id: 'log_1_2',
        category: 'RUNNER_NOTE',
        title: 'Rooftop Route — Safer Than The Streets',
        body: 'If you are reading this, you made it past the rooftop patrols. Good. The streets below are crawling with Arasaka drones tonight. Stick to the high paths — the neon signs mess with their targeting systems. I left supplies near the old water tower. - Ghost',
    },
    'log_1_3': {
        id: 'log_1_3',
        category: 'NEWS',
        title: 'Neon District Blackout — 3rd This Week',
        body: 'SECTOR 9 — Another power grid failure left 200,000 residents without electricity for 18 hours. Arasaka Energy Solutions blamed "outdated infrastructure" and announced a 40% rate increase to fund "modernization." Resident spokesperson declined to comment, citing they were still on hold with customer service.',
    },

    // Level 2 — Cyber Alley
    'log_2_1': {
        id: 'log_2_1',
        category: 'CORP_LOG',
        title: 'Militech — Prototype Recovery Authorization',
        body: 'PRIORITY ALPHA: Field unit 7-B, be advised that prototype weapon shipment GX-114 was intercepted in the Cyber Alley sector. Recover by any means necessary. Civilian casualties are... discouraged but not disallowed. Expense account code: PL4US1BL3_D3N14L.',
    },
    'log_2_2': {
        id: 'log_2_2',
        category: 'DELETED',
        title: '[RECOVERED] Subject 17 — Neural Interface Test',
        body: 'Day 47: Subject 17 successfully integrated with the Shadow Protocol. Neural latency: 0.3ms. Side effects include intermittent phasing and mild reality dissociation. Note: Subject believes they can "see through shadows." Recommend further testing. — Dr. Kessler, Biotech Division [FILE RECOVERED FROM DELETED ARCHIVE]',
    },
    'log_2_3': {
        id: 'log_2_3',
        category: 'RUNNER_NOTE',
        title: 'Dealer Contact — Chrome Alley Back Room',
        body: 'The weapons dealer in the back room of the Chrome Alley bar is legit. Paid 500 credits for a laser mod that the corps charge 5000 for. He does not ask questions. He does not give refunds. Bring cash. Do NOT bring your real ID. — Pixel',
    },

    // Level 3 — Neon Factory
    'log_3_1': {
        id: 'log_3_1',
        category: 'CORP_LOG',
        title: 'Kang Tao — Factory Output Report Q3',
        body: 'Factory 7 output exceeded quota by 12%. Worker mortality rate held steady at 8%. Recommend reducing break time from 4 minutes to 3 minutes to improve efficiency. Note: The "accident" on Line 4 was not an accident. Inform Security Chief Vance his wife has been relocated to a better position. He will understand.',
    },
    'log_3_2': {
        id: 'log_3_2',
        category: 'NEWS',
        title: 'Factory Fire Kills 47 — Arson Suspected',
        body: 'NEON DISTRICT — A fire at Factory Complex 7 killed 47 workers last night. Arasaka officials stated the fire was caused by "faulty wiring" despite multiple witnesses reporting armed corporate security present before the blaze. The factory was scheduled for "repurposing" next month. Investigation ongoing. No, really.',
    },
    'log_3_3': {
        id: 'log_3_3',
        category: 'DELETED',
        title: '[RECOVERED] Project SHADOWRUN — Phase 2',
        body: 'Phase 2 commencing. 12 subjects successfully extracted from the factory. Neural integration progressing. 3 subjects achieved full shadow-phasing. 2 subjects did not survive the process. 1 subject escaped with full capabilities. PRIORITY: Locate and retrieve Subject 17. They are the key to everything. — Director Moss, Black Ops Division [FILE MARKED FOR DESTRUCTION]',
    },

    // Level 6 — Data Storm
    'log_6_1': {
        id: 'log_6_1',
        category: 'CORP_LOG',
        title: 'NetWatch — ICE Upgrade Deployment',
        body: 'All network nodes in Sector 12-15 will receive ICE v4.7 tonight. Expected downtime: 6 seconds. Hacking difficulty will increase by 340%. Any unauthorized data access attempts will be met with neural feedback. Severity: moderate to permanent. Have a productive day.',
    },
    'log_6_2': {
        id: 'log_6_2',
        category: 'RUNNER_NOTE',
        title: 'Storm Protocol — How To Survive The Grid',
        body: 'When the data storm hits, the grid goes haywire. Turrets lose targeting. Security systems reboot. For exactly 4.7 seconds, every door in the building opens. That is your window. I have used it three times. Each time, I wonder if the next storm will be my last. — Wraith',
    },

    // Level 7 — Chrome Void
    'log_7_1': {
        id: 'log_7_1',
        category: 'NEWS',
        title: 'Chrome Void Residents Report Missing Time',
        body: 'SECTOR 18 — Hundreds of residents in the Chrome Void district have reported losing hours or even days of memory. Arasaka Medical attributed this to "industrial solvent exposure" despite zero traces found in blood tests. A former Arasaka researcher, speaking anonymously, claimed it is "neural imprinting research." The researcher has since been unable to remember their own name.',
    },
    'log_7_2': {
        id: 'log_7_2',
        category: 'DELETED',
        title: '[RECOVERED] The Void Protocol — Internal Memo',
        body: 'The Chrome Void experiment is producing results beyond projections. Memory overwrites are now 97% effective. Test subjects cannot recall their own identities after three sessions. Applications: witness elimination, corporate loyalty programming, and the ultimate product — a workforce that does not know it is enslaved. — Project Lead, Neural Architecture Lab [CLASSIFICATION: ULTRA-BLACK]',
    },

    // Level 8 — Cipher Deep
    'log_8_1': {
        id: 'log_8_1',
        category: 'CORP_LOG',
        title: 'Arasaka — Cipher Deep Access Log',
        body: 'SERVER ROOM 7 ACCESS LOG: 03:14 — Maintenance sweep (authorized). 03:17 — Unknown intruder detected (shadow signature). 03:18 — Shadow signature lost. 03:19 — Security team dispatched. 03:22 — Security team reports "nothing found." 03:23 — Shadow signature detected BEHIND security team. Recommend upgrading sensors. Again.',
    },
    'log_8_2': {
        id: 'log_8_2',
        category: 'RUNNER_NOTE',
        title: 'The Cipher — It Is Not What They Told You',
        body: 'I found it. The Cipher. It is not an encryption key. It is a person. A child, grown in a lab, whose neural patterns can crack any code ever written. Arasaka keeps them deep below the server farms. I was hired to extract data. I found something else entirely. I cannot complete this job. But I cannot walk away either. — Cipher',
    },
};

// ─── Collected Logs Storage ─────────────────────────────────────────────

const LORE_SAVE_KEY = 'shadowrunner_lore';

/**
 * Get all collected log IDs from localStorage.
 */
export function getCollectedLogIds() {
    try {
        const raw = localStorage.getItem(LORE_SAVE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

/**
 * Mark a log as collected.
 */
export function collectLog(logId) {
    const collected = getCollectedLogIds();
    if (!collected.includes(logId)) {
        collected.push(logId);
        localStorage.setItem(LORE_SAVE_KEY, JSON.stringify(collected));
    }
}

/**
 * Check if a log has been collected.
 */
export function isLogCollected(logId) {
    return getCollectedLogIds().includes(logId);
}

/**
 * Get a lore entry by ID.
 */
export function getLoreEntry(logId) {
    return LORE_ENTRIES[logId] || null;
}

/**
 * Get all lore entries.
 */
export function getAllLoreEntries() {
    return LORE_ENTRIES;
}

/**
 * Get total number of lore entries in the game.
 */
export function getTotalLogCount() {
    return Object.keys(LORE_ENTRIES).length;
}

// ─── Data Log Pickups in Levels ─────────────────────────────────────────

/**
 * Check and activate data log pickups in the current level.
 * Data logs are defined in level data as `dataLogs` array.
 * Each entry: { x, y, width: 30, height: 36, logId: 'log_1_1', collected: false }
 */
export function updateDataLogs(player, level) {
    if (!level.dataLogs) return;

    for (const log of level.dataLogs) {
        if (log.collected) continue;

        if (rectsOverlap(player, log)) {
            log.collected = true;
            collectLog(log.logId);

            const entry = getLoreEntry(log.logId);
            const title = entry ? entry.title : log.logId;

            showCenterMessage('DATA LOG', 0.8);
            playSound('itemPickup');

            spawnParticles(
                log.x + log.width / 2,
                log.y + log.height / 2,
                16,
                '#facc15'
            );
        }
    }
}

/**
 * Draw data log pickups in the current level.
 */
export function drawDataLogs(ctx, camera, level) {
    if (!level.dataLogs) return;

    const time = Date.now() * 0.001;

    for (const log of level.dataLogs) {
        if (log.collected) continue;

        const x = log.x - camera.x;
        const y = log.y - camera.y;

        // Skip if off-screen
        if (x + log.width < -10 || x > 970) continue;

        const bob = Math.sin(time * 3 + log.x * 0.01) * 3;
        const pulse = Math.sin(time * 4) * 0.3 + 0.7;

        ctx.save();

        // Glow
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12 * pulse;

        // Data chip body
        ctx.fillStyle = `rgba(15, 12, 4, ${0.8 + pulse * 0.2})`;
        ctx.fillRect(x, y + bob, log.width, log.height);

        // Border
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y + bob, log.width, log.height);

        // Data chip icon — horizontal lines inside
        ctx.fillStyle = `rgba(250, 204, 21, ${0.6 + pulse * 0.3})`;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 6, y + bob + 8 + i * 7, log.width - 12, 2);
        }

        // Corner dots
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x + 2, y + bob + 2, 3, 3);
        ctx.fillRect(x + log.width - 5, y + bob + 2, 3, 3);
        ctx.fillRect(x + 2, y + bob + log.height - 5, 3, 3);
        ctx.fillRect(x + log.width - 5, y + bob + log.height - 5, 3, 3);

        ctx.restore();
    }
}

// ─── Lore Reader Screen ─────────────────────────────────────────────────

let loreReaderOpen = false;
let loreReaderScrollY = 0;
let loreReaderSelectedIndex = 0;
let loreReaderViewingEntry = null; // null = list view, entry = detail view

/**
 * Open the lore reader (between missions).
 */
export function openLoreReader() {
    loreReaderOpen = true;
    loreReaderScrollY = 0;
    loreReaderSelectedIndex = 0;
    loreReaderViewingEntry = null;
}

/**
 * Close the lore reader.
 */
export function closeLoreReader() {
    loreReaderOpen = false;
    loreReaderViewingEntry = null;
}

/**
 * Check if the lore reader is open.
 */
export function isLoreReaderOpen() {
    return loreReaderOpen;
}

/**
 * Update lore reader navigation.
 */
export function updateLoreReader(dt) {
    if (!loreReaderOpen) return;

    const collected = getCollectedLogIds();
    if (collected.length === 0) return;

    if (loreReaderViewingEntry) {
        // Detail view: scroll
        if (keys.up) loreReaderScrollY = Math.max(0, loreReaderScrollY - 200 * dt);
        if (keys.down) loreReaderScrollY += 200 * dt;

        // Back to list
        if (keys.interact || keys.pause || keys.jump) {
            loreReaderViewingEntry = null;
            loreReaderScrollY = 0;
        }
    } else {
        // List view: navigate entries
        if (justPressed('up')) {
            loreReaderSelectedIndex = Math.max(0, loreReaderSelectedIndex - 1);
        }
        if (justPressed('down')) {
            loreReaderSelectedIndex = Math.min(collected.length - 1, loreReaderSelectedIndex + 1);
        }

        // Select entry
        if (justPressed('interact') || justPressed('jump')) {
            const logId = collected[loreReaderSelectedIndex];
            if (logId) {
                loreReaderViewingEntry = getLoreEntry(logId);
                loreReaderScrollY = 0;
            }
        }
    }
}

/**
 * Draw the lore reader screen.
 */
export function drawLoreReader(ctx) {
    if (!loreReaderOpen) return;

    const collected = getCollectedLogIds();

    ctx.save();

    // Full-screen dark overlay
    ctx.fillStyle = 'rgba(3, 7, 18, 0.95)';
    ctx.fillRect(0, 0, 960, 540);

    if (loreReaderViewingEntry) {
        drawLoreDetail(ctx, loreReaderViewingEntry);
    } else {
        drawLoreList(ctx, collected);
    }

    ctx.restore();
}

function drawLoreList(ctx, collected) {
    const panelX = 80;
    const panelY = 40;
    const panelW = 800;
    const panelH = 460;

    // Panel background
    ctx.fillStyle = 'rgba(5, 5, 16, 0.95)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Title
    ctx.fillStyle = '#facc15';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DATA LOGS', 480, 80);

    // Count
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 14px monospace';
    ctx.fillText(`${collected.length} / ${getTotalLogCount()} COLLECTED`, 480, 104);

    if (collected.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '700 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No data logs collected yet.', 480, 260);
        ctx.fillText('Explore levels to find data chips.', 480, 286);
    } else {
        // List entries
        const startY = 128;
        const entryH = 42;
        const maxVisible = Math.min(collected.length, 8);
        const scrollOffset = Math.max(0, loreReaderSelectedIndex - maxVisible + 1);

        for (let i = 0; i < maxVisible; i++) {
            const idx = scrollOffset + i;
            if (idx >= collected.length) break;

            const entry = getLoreEntry(collected[idx]);
            if (!entry) continue;

            const y = startY + i * entryH;
            const isSelected = idx === loreReaderSelectedIndex;

            // Selection highlight
            if (isSelected) {
                ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
                ctx.fillRect(panelX + 12, y - 4, panelW - 24, entryH - 4);
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(panelX + 12, y - 4, panelW - 24, entryH - 4);
            }

            // Category badge
            const catColors = {
                'CORP_LOG': '#ef4444',
                'RUNNER_NOTE': '#22c55e',
                'NEWS': '#21e6ff',
                'DELETED': '#a855f7',
            };
            ctx.fillStyle = catColors[entry.category] || '#94a3b8';
            ctx.font = '700 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(entry.category, panelX + 24, y + 10);

            // Title
            ctx.fillStyle = isSelected ? '#facc15' : '#ffffff';
            ctx.font = '700 14px monospace';
            ctx.fillText(entry.title, panelX + 24, y + 28);
        }
    }

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UP/DOWN: Navigate  |  ENTER: Read  |  ESC: Close', 480, 484);
}

function drawLoreDetail(ctx, entry) {
    const panelX = 100;
    const panelY = 50;
    const panelW = 760;
    const panelH = 440;

    // Panel background
    ctx.fillStyle = 'rgba(5, 5, 16, 0.98)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Category-colored top bar
    const catColors = {
        'CORP_LOG': '#ef4444',
        'RUNNER_NOTE': '#22c55e',
        'NEWS': '#21e6ff',
        'DELETED': '#a855f7',
    };
    const catColor = catColors[entry.category] || '#94a3b8';
    ctx.fillStyle = catColor;
    ctx.fillRect(panelX, panelY, panelW, 4);

    ctx.strokeStyle = catColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Category badge
    ctx.fillStyle = catColor;
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(entry.category, panelX + 20, panelY + 30);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px monospace';
    ctx.fillText(entry.title, panelX + 20, panelY + 60);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 72);
    ctx.lineTo(panelX + panelW - 20, panelY + 72);
    ctx.stroke();

    // Body text (with word wrapping and scrolling)
    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX + 16, panelY + 82, panelW - 32, panelH - 120);
    ctx.clip();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 14px monospace';
    ctx.textAlign = 'left';

    const lines = wrapText(ctx, entry.body, panelW - 48);
    const lineHeight = 20;
    const startY = panelY + 96 - loreReaderScrollY;

    for (let i = 0; i < lines.length; i++) {
        const y = startY + i * lineHeight;
        if (y < panelY + 70 || y > panelY + panelH - 30) continue;
        ctx.fillText(lines[i], panelX + 24, y);
    }

    ctx.restore();

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UP/DOWN: Scroll  |  ESC: Back', 480, panelY + panelH - 14);
}

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

// ─── Playstyle Rating ───────────────────────────────────────────────────

/**
 * Calculate playstyle rating based on level performance.
 * Returns { style: string, title: string, color: string, description: string }
 */
export function calculatePlaystyle(score) {
    const { currentLevel: level, player } = state;
    if (!level || !player) return null;

    const enemiesTotal = level.enemies?.length ?? 0;
    const enemiesDefeated = enemiesTotal > 0
        ? level.enemies.filter(e => e.active === false).length
        : 0;
    const killsRatio = enemiesTotal > 0 ? enemiesDefeated / enemiesTotal : 0;

    // Count alert events from enemies
    let alertCount = 0;
    if (level.enemies) {
        for (const enemy of level.enemies) {
            if (enemy.alertState === 'alert' || enemy.alertState === 'suspicious') {
                alertCount++;
            }
            // Count enemies that were ever alerted (they have lastKnownPlayerX set)
            if (enemy.lastKnownPlayerX !== null) {
                alertCount++;
            }
        }
    }

    const deaths = player.deathsThisLevel ?? 0;

    // Ghost: No kills, no alerts, no deaths
    if (killsRatio === 0 && alertCount === 0 && deaths === 0) {
        return {
            style: 'GHOST',
            title: 'Ghost',
            color: '#8a2be2',
            description: 'Unseen. Unheard. The perfect shadow.',
        };
    }

    // Shadow: Very few kills, few alerts, no deaths
    if (killsRatio <= 0.2 && alertCount <= 2 && deaths === 0) {
        return {
            style: 'SHADOW',
            title: 'Shadow',
            color: '#a855f7',
            description: 'A whisper in the dark. They never saw you coming.',
        };
    }

    // Panther: Stealth kills, some alerts
    if (killsRatio <= 0.5 && alertCount <= 4) {
        return {
            style: 'PANTHER',
            title: 'Panther',
            color: '#facc15',
            description: 'Strike from the shadows. Leave no witnesses.',
        };
    }

    // Assault: Lots of kills and alerts
    if (killsRatio > 0.5 || alertCount > 6) {
        return {
            style: 'ASSAULT',
            title: 'Assault',
            color: '#ef4444',
            description: 'No stealth. No mercy. Full frontal assault.',
        };
    }

    // Default: Runner
    return {
        style: 'RUNNER',
        title: 'Runner',
        color: '#21e6ff',
        description: 'Adapt and overcome. A survivor gets the job done.',
    };
}
