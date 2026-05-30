/**
 * skillTree.js — Cyberpunk Skill Tree System for Shadowrunner
 *
 * Three branches with persistent progression:
 *   SHADOW  — Shadow mode duration, recharge, dash damage, phasing
 *   COMBAT  — Damage, fire rate, combo duration, critical hits
 *   TECH    — Hacking, shop discounts, buff duration, magnet radius
 *
 * XP earned from kills, data logs, combos, and level completion.
 * Skill points spent via the Skill Tree overlay (press T to open).
 * Progress is saved to localStorage.
 */

import { state } from './gameState.js';
import { keys, justPressed } from './input.js';
import { playSound } from './audioManager.js';
import { spawnParticles } from './particles.js';
import { showCenterMessage } from './screens.js';
import { CONFIG } from './config.js';

// ─── Skill Definitions ──────────────────────────────────────────────────

const SKILLS = [
    // === SHADOW BRANCH ===
    {
        id: 'shadow_duration',
        branch: 'SHADOW',
        name: 'SHADOW DURATION',
        description: 'Shadow mode drains 15% slower per level',
        maxLevel: 3,
        cost: 1,
        row: 0, col: 0,
    },
    {
        id: 'shadow_recharge',
        branch: 'SHADOW',
        name: 'SHADOW RECHARGE',
        description: 'Shadow energy recharges 20% faster per level',
        maxLevel: 3,
        cost: 1,
        row: 1, col: 0,
    },
    {
        id: 'shadow_dash_damage',
        branch: 'SHADOW',
        name: 'DASH POWER',
        description: 'Dash attack deals +2 damage per level',
        maxLevel: 2,
        cost: 2,
        row: 2, col: 0,
        requires: 'shadow_duration',
    },
    {
        id: 'shadow_phase',
        branch: 'SHADOW',
        name: 'PHASE WALK',
        description: 'Shadow mode reduces damage by extra 10% per level',
        maxLevel: 2,
        cost: 2,
        row: 3, col: 0,
        requires: 'shadow_recharge',
    },

    // === COMBAT BRANCH ===
    {
        id: 'combat_damage',
        branch: 'COMBAT',
        name: 'WEAPON DAMAGE',
        description: 'All weapons deal +15% damage per level',
        maxLevel: 3,
        cost: 1,
        row: 0, col: 1,
    },
    {
        id: 'combat_fire_rate',
        branch: 'COMBAT',
        name: 'FIRE RATE',
        description: 'Fire 12% faster per level',
        maxLevel: 3,
        cost: 1,
        row: 1, col: 1,
    },
    {
        id: 'combat_combo',
        branch: 'COMBAT',
        name: 'COMBO EXTENSION',
        description: 'Combo window +1s per level',
        maxLevel: 2,
        cost: 2,
        row: 2, col: 1,
        requires: 'combat_damage',
    },
    {
        id: 'combat_crit',
        branch: 'COMBAT',
        name: 'CRITICAL HIT',
        description: '+8% crit chance per level (2x damage)',
        maxLevel: 3,
        cost: 2,
        row: 3, col: 1,
        requires: 'combat_fire_rate',
    },

    // === TECH BRANCH ===
    {
        id: 'tech_hack_speed',
        branch: 'TECH',
        name: 'HACK SPEED',
        description: 'Hacking timer 20% faster per level',
        maxLevel: 3,
        cost: 1,
        row: 0, col: 2,
    },
    {
        id: 'tech_shop_discount',
        branch: 'TECH',
        name: 'SHOP DISCOUNT',
        description: 'Shop prices -1 gem per level',
        maxLevel: 2,
        cost: 1,
        row: 1, col: 2,
    },
    {
        id: 'tech_buff_duration',
        branch: 'TECH',
        name: 'BUFF DURATION',
        description: 'Timed buffs last 25% longer per level',
        maxLevel: 2,
        cost: 2,
        row: 2, col: 2,
        requires: 'tech_hack_speed',
    },
    {
        id: 'tech_magnet',
        branch: 'TECH',
        name: 'GEM MAGNET',
        description: 'Auto-attract gems within +50px per level',
        maxLevel: 2,
        cost: 2,
        row: 3, col: 2,
        requires: 'tech_shop_discount',
    },
];

// ─── Persistent State ───────────────────────────────────────────────────

const SKILL_SAVE_KEY = 'shadowrunner_skills';

let skillLevels = {};  // { skillId: currentLevel }
let skillPoints = 0;
let totalXP = 0;
let xpToNextPoint = 100;  // XP needed for next skill point
let currentXPProgress = 0; // XP accumulated toward next point

// Load from localStorage
function loadSkillState() {
    try {
        const raw = localStorage.getItem(SKILL_SAVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            skillLevels = data.skillLevels || {};
            skillPoints = data.skillPoints || 0;
            totalXP = data.totalXP || 0;
            xpToNextPoint = data.xpToNextPoint || 100;
            currentXPProgress = data.currentXPProgress || 0;
        }
    } catch (_) {}
}

function saveSkillState() {
    try {
        localStorage.setItem(SKILL_SAVE_KEY, JSON.stringify({
            skillLevels,
            skillPoints,
            totalXP,
            xpToNextPoint,
            currentXPProgress,
            version: 1,
        }));
    } catch (_) {}
}

// Initialize on load
loadSkillState();

// ─── XP & Skill Points ──────────────────────────────────────────────────

/**
 * Award XP to the player. Automatically converts XP to skill points.
 * @param {number} amount - XP to award
 * @param {string} source - Source of XP (for display)
 */
export function awardXP(amount, source = '') {
    currentXPProgress += amount;
    totalXP += amount;

    // Check if we earned a skill point
    while (currentXPProgress >= xpToNextPoint) {
        currentXPProgress -= xpToNextPoint;
        skillPoints++;
        xpToNextPoint = Math.floor(xpToNextPoint * 1.3); // scaling cost

        showCenterMessage('SKILL POINT EARNED!', 1.2);
        playSound('itemPickup');
        spawnParticles(CONFIG.width / 2, CONFIG.height / 2, 24, '#facc15');
    }

    saveSkillState();
}

/**
 * Get the current skill point count.
 */
export function getSkillPoints() {
    return skillPoints;
}

/**
 * Get XP progress info.
 */
export function getXPInfo() {
    return {
        total: totalXP,
        current: currentXPProgress,
        next: xpToNextPoint,
        progress: currentXPProgress / xpToNextPoint,
    };
}

// ─── Skill Queries ──────────────────────────────────────────────────────

/**
 * Get the current level of a skill (0 = untrained).
 */
export function getSkillLevel(skillId) {
    return skillLevels[skillId] || 0;
}

/**
 * Check if a skill can be upgraded (meets prerequisites, has points).
 */
export function canUpgradeSkill(skillId) {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;

    const currentLevel = getSkillLevel(skillId);
    if (currentLevel >= skill.maxLevel) return false;
    if (skillPoints < skill.cost) return false;

    // Check prerequisite
    if (skill.requires) {
        const reqSkill = SKILLS.find(s => s.id === skill.requires);
        if (reqSkill && getSkillLevel(skill.requires) < 1) return false;
    }

    return true;
}

/**
 * Upgrade a skill by one level.
 */
export function upgradeSkill(skillId) {
    if (!canUpgradeSkill(skillId)) return false;

    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;

    skillLevels[skillId] = (skillLevels[skillId] || 0) + 1;
    skillPoints -= skill.cost;

    showCenterMessage(`${skill.name} LV${skillLevels[skillId]}`, 0.8);
    playSound('itemPickup');
    spawnParticles(CONFIG.width / 2, CONFIG.height / 2, 16, '#21e6ff');

    saveSkillState();
    return true;
}

/**
 * Get all skill definitions with their current levels.
 */
export function getAllSkills() {
    return SKILLS.map(s => ({
        ...s,
        currentLevel: getSkillLevel(s.id),
    }));
}

// ─── Skill Effect Getters ───────────────────────────────────────────────
// These are called from player.js, shopSystem.js, etc.

/** Shadow mode drain rate multiplier (lower = slower drain) */
export function getShadowDrainMultiplier() {
    const lvl = getSkillLevel('shadow_duration');
    return 1 - lvl * 0.15; // 0.85, 0.70, 0.55
}

/** Shadow recharge rate multiplier (higher = faster recharge) */
export function getShadowRechargeMultiplier() {
    const lvl = getSkillLevel('shadow_recharge');
    return 1 + lvl * 0.20; // 1.2, 1.4, 1.6
}

/** Extra dash attack damage */
export function getExtraDashDamage() {
    return getSkillLevel('shadow_dash_damage') * 2; // +2, +4
}

/** Extra shadow mode damage reduction (additive) */
export function getExtraShadowDamageReduction() {
    return getSkillLevel('shadow_phase') * 0.10; // 0.10, 0.20
}

/** Weapon damage multiplier */
export function getWeaponDamageMultiplier() {
    const lvl = getSkillLevel('combat_damage');
    return 1 + lvl * 0.15; // 1.15, 1.30, 1.45
}

/** Fire rate multiplier (lower = faster) */
export function getFireRateMultiplier() {
    const lvl = getSkillLevel('combat_fire_rate');
    return 1 - lvl * 0.12; // 0.88, 0.76, 0.64
}

/** Extra combo window time (seconds) */
export function getExtraComboTime() {
    return getSkillLevel('combat_combo') * 1.0; // +1s, +2s
}

/** Critical hit chance (0-1) */
export function getCritChance() {
    return getSkillLevel('combat_crit') * 0.08; // 0.08, 0.16, 0.24
}

/** Hack speed multiplier (lower = faster) */
export function getHackSpeedMultiplier() {
    const lvl = getSkillLevel('tech_hack_speed');
    return 1 - lvl * 0.20; // 0.80, 0.60, 0.40
}

/** Shop gem discount */
export function getShopDiscount() {
    return getSkillLevel('tech_shop_discount'); // -1, -2
}

/** Buff duration multiplier */
export function getBuffDurationMultiplier() {
    const lvl = getSkillLevel('tech_buff_duration');
    return 1 + lvl * 0.25; // 1.25, 1.50
}

/** Extra gem attraction radius */
export function getExtraMagnetRadius() {
    return getSkillLevel('tech_magnet') * 50; // +50, +100
}

// ─── Reset Skills ───────────────────────────────────────────────────────

/**
 * Reset all skills (for new game or debug).
 * Optionally refund points.
 */
export function resetSkills(refundPoints = false) {
    if (refundPoints) {
        let totalRefund = 0;
        for (const skillId in skillLevels) {
            const skill = SKILLS.find(s => s.id === skillId);
            if (skill) {
                totalRefund += skillLevels[skillId] * skill.cost;
            }
        }
        skillPoints += totalRefund;
    }
    skillLevels = {};
    saveSkillState();
}

/**
 * Full reset including XP (for New Game).
 */
export function fullResetSkills() {
    skillLevels = {};
    skillPoints = 0;
    totalXP = 0;
    xpToNextPoint = 100;
    currentXPProgress = 0;
    saveSkillState();
}

// ─── Skill Tree Overlay ─────────────────────────────────────────────────

let skillTreeOpen = false;
let selectedBranch = 0; // 0=SHADOW, 1=COMBAT, 2=TECH
let selectedSkillIndex = 0;
let skillTreeTime = 0;
let skillTreeTransition = 0;
let notification = null;

const BRANCHES = ['SHADOW', 'COMBAT', 'TECH'];
const BRANCH_COLORS = {
    SHADOW: '#b388ff',
    COMBAT: '#ef4444',
    TECH: '#21e6ff',
};
const BRANCH_ICONS = {
    SHADOW: '\u25C8', // ◈
    COMBAT: '\u2694', // ⚔
    TECH: '\u2699',   // ⚙
};

/**
 * Open the skill tree overlay.
 */
export function openSkillTree() {
    skillTreeOpen = true;
    skillTreeTransition = 0;
    selectedBranch = 0;
    selectedSkillIndex = 0;
    skillTreeTime = 0;
    playSound('menuSelect');
}

/**
 * Close the skill tree overlay.
 */
export function closeSkillTree() {
    skillTreeOpen = false;
}

/**
 * Check if the skill tree is open.
 */
export function isSkillTreeOpen() {
    return skillTreeOpen;
}

/**
 * Update skill tree navigation.
 */
export function updateSkillTree(dt) {
    if (!skillTreeOpen) return;

    skillTreeTime += dt;
    skillTreeTransition = Math.min(1, skillTreeTransition + dt * 4);

    // Notification decay
    if (notification) {
        notification.timer -= dt;
        if (notification.timer <= 0) notification = null;
    }

    // Branch switching (A/D or Left/Right)
    if (justPressed('left') || justPressed('shadow')) {
        selectedBranch = (selectedBranch - 1 + 3) % 3;
        selectedSkillIndex = 0;
        playSound('menuMove');
    }
    if (justPressed('right') || justPressed('dash')) {
        selectedBranch = (selectedBranch + 1) % 3;
        selectedSkillIndex = 0;
        playSound('menuMove');
    }

    // Skill navigation (W/S or Up/Down)
    const branchSkills = SKILLS.filter(s => s.branch === BRANCHES[selectedBranch]);
    if (justPressed('up') || justPressed('jump')) {
        selectedSkillIndex = Math.max(0, selectedSkillIndex - 1);
        playSound('menuMove');
    }
    if (justPressed('down') || justPressed('interact')) {
        selectedSkillIndex = Math.min(branchSkills.length - 1, selectedSkillIndex + 1);
        playSound('menuMove');
    }

    // Upgrade skill (J/E or Shoot)
    if (justPressed('shoot')) {
        const skill = branchSkills[selectedSkillIndex];
        if (skill) {
            if (canUpgradeSkill(skill.id)) {
                upgradeSkill(skill.id);
            } else {
                const currentLvl = getSkillLevel(skill.id);
                if (currentLvl >= skill.maxLevel) {
                    notification = { text: 'MAX LEVEL', color: '#facc15', timer: 1.2 };
                } else if (skillPoints < skill.cost) {
                    notification = { text: 'NOT ENOUGH POINTS', color: '#ef4444', timer: 1.2 };
                } else if (skill.requires && getSkillLevel(skill.requires) < 1) {
                    notification = { text: 'PREREQUISITE REQUIRED', color: '#fb923c', timer: 1.2 };
                }
                playSound('menuMove');
            }
        }
    }

    // Close (Escape or P)
    if (justPressed('pause')) {
        closeSkillTree();
        playSound('menuSelect');
    }
}

/**
 * Draw the skill tree overlay.
 */
export function drawSkillTree(ctx) {
    if (!skillTreeOpen) return;

    const W = CONFIG.width;
    const H = CONFIG.height;
    const t = skillTreeTransition;
    const ease = easeOutBack(Math.min(1, t));

    ctx.save();

    // Dark overlay
    ctx.fillStyle = `rgba(3, 7, 18, ${0.92 * t})`;
    ctx.fillRect(0, 0, W, H);

    // Scan lines
    ctx.save();
    ctx.globalAlpha = 0.04 * t;
    for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = '#b388ff';
        ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // Scale animation
    ctx.translate(W / 2, H / 2);
    ctx.scale(ease, ease);
    ctx.translate(-W / 2, -H / 2);

    ctx.globalAlpha = t;

    // Panel dimensions
    const panelW = 780;
    const panelH = 460;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // Panel background
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(8, 4, 18, 0.97)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border
    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Inner border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12);

    // Title
    ctx.save();
    const titlePulse = Math.sin(skillTreeTime * 3) * 0.15 + 0.85;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 16 * titlePulse;
    ctx.fillStyle = '#facc15';
    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CYBERNETIC UPGRADES', W / 2, panelY + 30);

    // Skill points display
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#facc15';
    ctx.font = '700 14px monospace';
    ctx.fillText(`${skillPoints} POINTS AVAILABLE`, W / 2, panelY + 54);

    // XP bar
    const xpInfo = getXPInfo();
    const xpBarX = panelX + 30;
    const xpBarY = panelY + 66;
    const xpBarW = panelW - 60;
    const xpBarH = 10;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(xpBarX, xpBarY, xpBarW, xpBarH);

    ctx.fillStyle = '#facc15';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(xpBarX, xpBarY, xpBarW * xpInfo.progress, xpBarH);
    ctx.globalAlpha = t;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(xpBarX, xpBarY, xpBarW, xpBarH);

    ctx.fillStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.font = '700 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`XP: ${Math.floor(xpInfo.current)}/${xpInfo.next}`, xpBarX + xpBarW, xpBarY + 8);
    ctx.restore();

    // Branch tabs
    const tabY = panelY + 84;
    const tabW = panelW / 3;
    for (let i = 0; i < 3; i++) {
        const tabX = panelX + i * tabW;
        const branch = BRANCHES[i];
        const color = BRANCH_COLORS[branch];
        const isActive = i === selectedBranch;

        ctx.save();
        ctx.fillStyle = isActive ? `${color}22` : 'rgba(255,255,255,0.02)';
        ctx.fillRect(tabX + 2, tabY, tabW - 4, 28);

        if (isActive) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(tabX + 2, tabY, tabW - 4, 28);
            ctx.fillStyle = color;
            ctx.fillRect(tabX + 2, tabY + 24, tabW - 4, 4);
        }

        ctx.fillStyle = isActive ? color : 'rgba(255,255,255,0.35)';
        ctx.font = `${isActive ? '700' : '400'} 12px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${BRANCH_ICONS[branch]} ${branch}`, tabX + tabW / 2, tabY + 14);
        ctx.restore();
    }

    // Skill list for selected branch
    const branchSkills = SKILLS.filter(s => s.branch === BRANCHES[selectedBranch]);
    const branchColor = BRANCH_COLORS[BRANCHES[selectedBranch]];
    const listY = tabY + 38;
    const itemH = 72;
    const maxVisible = Math.min(branchSkills.length, 4);

    for (let i = 0; i < maxVisible; i++) {
        const skill = branchSkills[i];
        if (!skill) continue;

        const sy = listY + i * (itemH + 6);
        const isSelected = i === selectedSkillIndex;
        const currentLvl = getSkillLevel(skill.id);
        const isMaxed = currentLvl >= skill.maxLevel;
        const canUpgrade = canUpgradeSkill(skill.id);
        const hasReq = !skill.requires || getSkillLevel(skill.requires) >= 1;

        ctx.save();

        // Skill background
        if (isSelected) {
            const selPulse = Math.sin(skillTreeTime * 4) * 0.12 + 0.88;
            ctx.fillStyle = `${branchColor}15`;
            ctx.fillRect(panelX + 14, sy, panelW - 28, itemH);
            ctx.strokeStyle = `${branchColor}88`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(panelX + 14, sy, panelW - 28, itemH);

            // Left accent
            ctx.fillStyle = branchColor;
            ctx.shadowColor = branchColor;
            ctx.shadowBlur = 6;
            ctx.fillRect(panelX + 14, sy, 3, itemH);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(panelX + 14, sy, panelW - 28, itemH);
        }

        // Level indicator (filled circles)
        const circleStartX = panelX + 28;
        const circleY = sy + 20;
        for (let lvl = 0; lvl < skill.maxLevel; lvl++) {
            const cx = circleStartX + lvl * 22;
            ctx.beginPath();
            ctx.arc(cx + 8, circleY, 7, 0, Math.PI * 2);

            if (lvl < currentLvl) {
                ctx.fillStyle = branchColor;
                ctx.shadowColor = branchColor;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = isMaxed ? 'rgba(250, 204, 21, 0.4)' : (hasReq ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)');
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Skill name
        ctx.fillStyle = isMaxed ? '#facc15' : '#ffffff';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(skill.name, panelX + 28, sy + 46);

        // Level text
        ctx.fillStyle = isMaxed ? '#facc15' : branchColor;
        ctx.font = '700 11px monospace';
        ctx.fillText(`LV ${currentLvl}/${skill.maxLevel}`, panelX + 28, sy + 62);

        // Description
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '400 10px monospace';
        ctx.fillText(skill.description, panelX + 200, sy + 46);

        // Cost (right side)
        const costX = panelX + panelW - 60;
        if (!isMaxed) {
            ctx.fillStyle = canUpgrade ? '#22c55e' : '#ef4444';
            ctx.font = '700 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${skill.cost} PT`, costX, sy + 20);
        } else {
            ctx.fillStyle = '#facc15';
            ctx.font = '700 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('MAX', costX, sy + 20);
        }

        // Requires indicator
        if (skill.requires && !hasReq) {
            const reqSkill = SKILLS.find(s => s.id === skill.requires);
            ctx.fillStyle = '#fb923c';
            ctx.font = '700 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`REQ: ${reqSkill?.name || skill.requires}`, costX, sy + 40);
        }

        ctx.restore();
    }

    // Connector lines between skills
    ctx.save();
    ctx.strokeStyle = `${branchColor}44`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < branchSkills.length - 1; i++) {
        const fromY = listY + i * (itemH + 6) + itemH;
        const toY = listY + (i + 1) * (itemH + 6);
        ctx.beginPath();
        ctx.moveTo(panelX + 34, fromY);
        ctx.lineTo(panelX + 34, toY);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Controls help
    ctx.save();
    ctx.fillStyle = 'rgba(179, 136, 255, 0.06)';
    ctx.fillRect(panelX + 10, panelY + panelH - 40, panelW - 20, 32);

    ctx.textAlign = 'center';
    ctx.font = '700 10px monospace';
    const helpItems = [
        { key: 'A/D', desc: 'BRANCH' },
        { key: 'W/S', desc: 'NAVIGATE' },
        { key: 'J', desc: 'UPGRADE' },
        { key: 'ESC', desc: 'CLOSE' },
    ];
    const spacing = (panelW - 20) / helpItems.length;
    for (let i = 0; i < helpItems.length; i++) {
        const hx = panelX + 10 + spacing * i + spacing / 2;
        ctx.fillStyle = '#b388ff';
        ctx.fillText(helpItems[i].key, hx - 16, panelY + panelH - 24);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(helpItems[i].desc, hx + 16, panelY + panelH - 24);
    }
    ctx.restore();

    // Notification
    if (notification) {
        const alpha = Math.min(1, notification.timer / 0.3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = notification.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = notification.color;
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(notification.text, W / 2, panelY + panelH + 16);
        ctx.restore();
    }

    ctx.restore();
}

// ─── Easing ─────────────────────────────────────────────────────────────

function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ─── HUD Integration ────────────────────────────────────────────────────

/**
 * Draw skill point indicator on the HUD.
 */
export function drawSkillPointHUD(ctx) {
    if (skillPoints <= 0) return;

    const x = 20;
    const y = CONFIG.height - 170;

    ctx.save();

    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8 * pulse;

    ctx.fillStyle = 'rgba(3, 7, 18, 0.8)';
    ctx.fillRect(x, y, 110, 18);

    ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 110, 18);

    ctx.shadowBlur = 6;
    ctx.fillStyle = '#facc15';
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`\u2605 ${skillPoints} SKILL PTS (T)`, x + 4, y + 13);

    ctx.restore();
}
