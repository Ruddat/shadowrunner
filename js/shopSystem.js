/**
 * shopSystem.js — In-Game Shop for Shadowrunner
 *
 * Features:
 * - Shop Terminals placed in levels (interact with E/F key)
 * - Between-levels shop after Level Complete
 * - Cyberpunk-themed UI with neon effects
 * - Items: Extra Lives, Energy Refills, Weapon Upgrades, Shadow Boosts,
 *   Magnet, Shield, Double Jump, Speed Boost
 * - Currency: Gems collected during gameplay
 */

import { state } from './gameState.js';
import { keys } from './input.js';
import { CONFIG } from './config.js';
import { playSound } from './audioManager.js';
import { spawnParticles } from './particles.js';
import { showCenterMessage } from './screens.js';
import { rectsOverlap } from './collision.js';
import { getWeaponDisplayName, WEAPON_IDS } from './weapons.js';

// ─── Shop Item Definitions ──────────────────────────────────────────────

const SHOP_ITEMS = [
    {
        id: 'extra_life',
        name: 'EXTRA LIFE',
        description: '+1 Life (max 9)',
        cost: 5,
        icon: '+',
        color: '#22c55e',
        category: 'survival',
        maxPerLevel: 3,
        apply: (player) => {
            player.lives = Math.min(player.lives + 1, 9);
        },
        canBuy: (player) => player.lives < 9,
    },
    {
        id: 'energy_max',
        name: 'ENERGY MAX',
        description: 'Full energy refill',
        cost: 3,
        icon: 'E',
        color: '#21e6ff',
        category: 'survival',
        maxPerLevel: 5,
        apply: (player) => {
            player.energy = 100;
        },
        canBuy: (player) => player.energy < 100,
    },
    {
        id: 'shadow_recharge',
        name: 'SHADOW RECHARGE',
        description: 'Full shadow energy',
        cost: 4,
        icon: 'S',
        color: '#b388ff',
        category: 'survival',
        maxPerLevel: 3,
        apply: (player) => {
            player.shadowEnergy = 100;
        },
        canBuy: (player) => player.shadowEnergy < 100,
    },
    {
        id: 'weapon_upgrade',
        name: 'WEAPON UPGRADE',
        description: 'Upgrade current weapon',
        cost: 8,
        icon: 'W',
        color: '#facc15',
        category: 'offense',
        maxPerLevel: 2,
        apply: (player) => {
            player.upgradeWeapon();
        },
        canBuy: (player) => player.weaponLevel < 3,
    },
    {
        id: 'magnet',
        name: 'GEM MAGNET',
        description: 'Attract gems for 30s',
        cost: 4,
        icon: 'M',
        color: '#ff2bd6',
        category: 'utility',
        maxPerLevel: 2,
        timed: 30,
        apply: (player) => {
            player._magnetTimer = 30;
        },
        canBuy: () => true,
    },
    {
        id: 'shield',
        name: 'SHIELD MODULE',
        description: '50% damage reduction 20s',
        cost: 6,
        icon: 'D',
        color: '#3b82f6',
        category: 'survival',
        maxPerLevel: 2,
        timed: 20,
        apply: (player) => {
            player._shieldTimer = 20;
        },
        canBuy: () => true,
    },
    {
        id: 'speed_boost',
        name: 'SPEED BOOST',
        description: '+30% speed for 25s',
        cost: 3,
        icon: 'V',
        color: '#fb923c',
        category: 'utility',
        maxPerLevel: 3,
        timed: 25,
        apply: (player) => {
            player._speedBoostTimer = 25;
        },
        canBuy: () => true,
    },
    {
        id: 'double_jump',
        name: 'DOUBLE JUMP',
        description: 'Extra mid-air jump (1 use)',
        cost: 5,
        icon: 'J',
        color: '#a855f7',
        category: 'utility',
        maxPerLevel: 2,
        apply: (player) => {
            player._doubleJumpCharges = (player._doubleJumpCharges ?? 0) + 1;
        },
        canBuy: () => true,
    },
];

// ─── Shop State ─────────────────────────────────────────────────────────

let shopState = null; // null = not in shop, object = shop active

export function isShopOpen() {
    return shopState !== null;
}

/**
 * Open the shop (from terminal or between levels).
 * @param {'terminal'|'between'} source - How the shop was opened
 */
export function openShop(source = 'terminal') {
    shopState = {
        source,
        selectedIndex: 0,
        scrollOffset: 0,
        time: 0,
        purchaseFlash: null, // { itemId, timer }
        itemsBoughtThisLevel: {}, // track per-item purchase count
        category: 'all', // 'all', 'survival', 'offense', 'utility'
        transitionIn: 0,
        notification: null, // { text, color, timer }
    };

    playSound('menuSelect');
}

export function closeShop() {
    shopState = null;
}

// ─── Shop Terminal System ───────────────────────────────────────────────

export function updateShopTerminals(player, level) {
    if (!level.shopTerminals) return;
    if (isShopOpen()) return;

    for (const terminal of level.shopTerminals) {
        if (terminal.used) continue;

        // Check proximity
        const dist = Math.abs(player.x + player.width / 2 - (terminal.x + terminal.width / 2));
        terminal.nearPlayer = dist < 80 && Math.abs(player.y + player.height - (terminal.y + terminal.height)) < 60;

        // Interact
        if (terminal.nearPlayer && keys.interact) {
            keys.interact = false; // consume input
            openShop('terminal');
            return;
        }
    }
}

export function drawShopTerminals(ctx, camera) {
    const level = state.currentLevel;
    if (!level.shopTerminals) return;

    for (const terminal of level.shopTerminals) {
        if (terminal.used && terminal.singleUse) continue;

        const x = terminal.x - camera.x;
        const y = terminal.y - camera.y;
        const w = terminal.width;
        const h = terminal.height;

        const time = performance.now() * 0.001;

        ctx.save();

        // Terminal body
        ctx.fillStyle = '#1a0a30';
        ctx.fillRect(x, y, w, h);

        // Border
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Screen glow
        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = 12 * pulse;

        // Screen area
        ctx.fillStyle = `rgba(179, 136, 255, ${0.15 + pulse * 0.1})`;
        ctx.fillRect(x + 4, y + 4, w - 8, h - 20);

        // Shop icon (dollar sign)
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#facc15';
        ctx.font = '900 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', x + w / 2, y + (h - 16) / 2 + 2);

        // Base strip
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2a1a40';
        ctx.fillRect(x, y + h - 16, w, 16);
        ctx.fillStyle = '#b388ff';
        ctx.font = '700 8px monospace';
        ctx.fillText('SHOP', x + w / 2, y + h - 6);

        // Proximity indicator
        if (terminal.nearPlayer) {
            const indicatorPulse = Math.sin(time * 6) * 0.4 + 0.6;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 14 * indicatorPulse;
            ctx.strokeStyle = `rgba(250, 204, 21, ${indicatorPulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);

            // "Press E" prompt
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#facc15';
            ctx.font = '700 10px monospace';
            ctx.fillText('E', x + w / 2, y - 10);
        }

        // Scan line animation
        const scanY = y + 4 + ((time * 40) % (h - 24));
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#b388ff';
        ctx.fillRect(x + 4, scanY, w - 8, 2);
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}

// ─── Shop Update ────────────────────────────────────────────────────────

export function updateShop(dt) {
    if (!shopState) return;

    shopState.time += dt;
    shopState.transitionIn = Math.min(1, shopState.transitionIn + dt * 4);

    // Purchase flash decay
    if (shopState.purchaseFlash) {
        shopState.purchaseFlash.timer -= dt;
        if (shopState.purchaseFlash.timer <= 0) {
            shopState.purchaseFlash = null;
        }
    }

    // Notification decay
    if (shopState.notification) {
        shopState.notification.timer -= dt;
        if (shopState.notification.timer <= 0) {
            shopState.notification = null;
        }
    }

    // Handle input
    handleShopInput(dt);
}

let inputCooldown = 0;

function handleShopInput(dt) {
    if (!shopState) return;

    inputCooldown = Math.max(0, inputCooldown - dt);
    if (inputCooldown > 0) return;

    const items = getFilteredItems();

    // Navigate up/down
    if (keys.up || keys.jump) {
        shopState.selectedIndex = Math.max(0, shopState.selectedIndex - 1);
        inputCooldown = 0.15;
        playSound('menuMove');
        return;
    }

    if (keys.down || keys.shadow) {
        shopState.selectedIndex = Math.min(items.length - 1, shopState.selectedIndex + 1);
        inputCooldown = 0.15;
        playSound('menuMove');
        return;
    }

    // Category filter (left/right)
    if (keys.left) {
        const categories = ['all', 'survival', 'offense', 'utility'];
        const idx = categories.indexOf(shopState.category);
        shopState.category = categories[(idx - 1 + categories.length) % categories.length];
        shopState.selectedIndex = 0;
        inputCooldown = 0.2;
        playSound('menuMove');
        return;
    }

    if (keys.right) {
        const categories = ['all', 'survival', 'offense', 'utility'];
        const idx = categories.indexOf(shopState.category);
        shopState.category = categories[(idx + 1) % categories.length];
        shopState.selectedIndex = 0;
        inputCooldown = 0.2;
        playSound('menuMove');
        return;
    }

    // Buy item
    if (keys.shoot || keys.interact) {
        keys.interact = false;
        attemptPurchase(items[shopState.selectedIndex]);
        inputCooldown = 0.25;
        return;
    }

    // Close shop
    if (keys.dash) {
        closeShop();
        inputCooldown = 0.3;
        playSound('menuSelect');
        return;
    }
}

function getFilteredItems() {
    if (shopState.category === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter(item => item.category === shopState.category);
}

function attemptPurchase(item) {
    if (!item) return;

    const { player } = state;

    // Check purchase count
    const bought = shopState.itemsBoughtThisLevel[item.id] ?? 0;
    if (bought >= item.maxPerLevel) {
        showShopNotification('SOLD OUT', '#ff003c');
        return;
    }

    // Check if can buy (e.g. lives already maxed)
    if (!item.canBuy(player)) {
        showShopNotification('ALREADY MAXED', '#fb923c');
        return;
    }

    // Check gems
    if (player.gems < item.cost) {
        showShopNotification('NOT ENOUGH GEMS', '#ff003c');
        return;
    }

    // Purchase!
    player.gems -= item.cost;
    item.apply(player);

    shopState.itemsBoughtThisLevel[item.id] = bought + 1;
    shopState.purchaseFlash = { itemId: item.id, timer: 0.4 };

    // Visual feedback
    spawnParticles(CONFIG.width / 2, CONFIG.height / 2, 18, item.color);
    playSound('itemPickup');

    showShopNotification(`${item.name} PURCHASED`, item.color);
}

function showShopNotification(text, color) {
    shopState.notification = { text, color, timer: 1.5 };
}

// ─── Shop Rendering ─────────────────────────────────────────────────────

export function drawShop(ctx) {
    if (!shopState) return;

    const W = CONFIG.width;
    const H = CONFIG.height;

    ctx.save();

    // Transition in
    const t = shopState.transitionIn;
    const ease = easeOutBack(t);

    // Dark overlay
    ctx.fillStyle = `rgba(3, 7, 18, ${0.88 * t})`;
    ctx.fillRect(0, 0, W, H);

    // Scan lines
    ctx.save();
    ctx.globalAlpha = 0.06 * t;
    for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = '#b388ff';
        ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // Panel dimensions
    const panelW = 720;
    const panelH = 440;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    // Scale animation
    ctx.translate(W / 2, H / 2);
    ctx.scale(ease, ease);
    ctx.translate(-W / 2, -H / 2);

    ctx.globalAlpha = t;

    // Panel background
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(10, 5, 20, 0.96)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    // Panel border
    ctx.strokeStyle = '#b388ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Inner border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(179, 136, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16);

    // Corner accents
    drawCornerAccents(ctx, panelX, panelY, panelW, panelH, '#b388ff');

    // Title
    ctx.save();
    const titlePulse = Math.sin(shopState.time * 3) * 0.15 + 0.85;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 18 * titlePulse;
    ctx.fillStyle = '#facc15';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHADOW SHOP', W / 2, panelY + 36);

    // Subtitle
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(179, 136, 255, 0.7)';
    ctx.font = '700 12px monospace';
    ctx.fillText('BLACK MARKET SUPPLIES', W / 2, panelY + 58);
    ctx.restore();

    // Gems display
    ctx.save();
    const gemBoxX = panelX + panelW - 160;
    const gemBoxY = panelY + 16;
    ctx.fillStyle = 'rgba(255, 43, 214, 0.12)';
    ctx.fillRect(gemBoxX, gemBoxY, 140, 36);
    ctx.strokeStyle = '#ff2bd6';
    ctx.lineWidth = 1;
    ctx.strokeRect(gemBoxX, gemBoxY, 140, 36);

    // Gem icon
    ctx.fillStyle = '#ff2bd6';
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(gemBoxX + 20, gemBoxY + 8);
    ctx.lineTo(gemBoxX + 30, gemBoxY + 18);
    ctx.moveTo(gemBoxX + 20, gemBoxY + 28);
    ctx.lineTo(gemBoxX + 10, gemBoxY + 18);
    ctx.closePath();
    ctx.fill();

    // Gem diamond shape
    ctx.beginPath();
    ctx.moveTo(gemBoxX + 20, gemBoxY + 8);
    ctx.lineTo(gemBoxX + 30, gemBoxY + 18);
    ctx.lineTo(gemBoxX + 20, gemBoxY + 28);
    ctx.lineTo(gemBoxX + 10, gemBoxY + 18);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.player.gems}`, gemBoxX + 42, gemBoxY + 24);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '700 10px monospace';
    ctx.fillText('GEMS', gemBoxX + 90, gemBoxY + 24);
    ctx.restore();

    // Category tabs
    drawCategoryTabs(ctx, panelX + 20, panelY + 72, panelW - 40);

    // Item list
    drawItemList(ctx, panelX + 20, panelY + 102, panelW - 40, panelH - 155);

    // Controls help
    drawControlsHelp(ctx, panelX, panelY + panelH - 46, panelW);

    // Notification
    if (shopState.notification) {
        drawNotification(ctx, W / 2, panelY + panelH + 10);
    }

    // Purchase flash overlay
    if (shopState.purchaseFlash) {
        const flashAlpha = shopState.purchaseFlash.timer / 0.4 * 0.15;
        ctx.fillStyle = `rgba(179, 136, 255, ${flashAlpha})`;
        ctx.fillRect(panelX, panelY, panelW, panelH);
    }

    ctx.restore();
}

function drawCornerAccents(ctx, x, y, w, h, color) {
    const len = 18;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();

    ctx.restore();
}

function drawCategoryTabs(ctx, x, y, width) {
    const categories = ['all', 'survival', 'offense', 'utility'];
    const tabWidth = width / categories.length;
    const tabHeight = 22;

    ctx.save();

    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const tx = x + i * tabWidth;
        const isActive = shopState.category === cat;

        // Tab background
        ctx.fillStyle = isActive
            ? 'rgba(179, 136, 255, 0.2)'
            : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(tx, y, tabWidth - 2, tabHeight);

        if (isActive) {
            ctx.strokeStyle = '#b388ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, y, tabWidth - 2, tabHeight);

            // Active indicator line
            ctx.fillStyle = '#b388ff';
            ctx.fillRect(tx, y + tabHeight - 2, tabWidth - 2, 2);
        }

        // Tab label
        ctx.fillStyle = isActive ? '#b388ff' : 'rgba(255,255,255,0.4)';
        ctx.font = `${isActive ? '700' : '400'} 10px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat.toUpperCase(), tx + (tabWidth - 2) / 2, y + tabHeight / 2);
    }

    ctx.restore();
}

function drawItemList(ctx, x, y, width, height) {
    const items = getFilteredItems();
    const itemHeight = 52;
    const gap = 4;
    const maxVisible = Math.floor(height / (itemHeight + gap));

    // Adjust scroll to keep selected item visible
    if (shopState.selectedIndex < shopState.scrollOffset) {
        shopState.scrollOffset = shopState.selectedIndex;
    }
    if (shopState.selectedIndex >= shopState.scrollOffset + maxVisible) {
        shopState.scrollOffset = shopState.selectedIndex - maxVisible + 1;
    }

    ctx.save();

    // Clip area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const visualIndex = i - shopState.scrollOffset;
        if (visualIndex < 0 || visualIndex >= maxVisible) continue;

        const iy = y + visualIndex * (itemHeight + gap);
        const isSelected = i === shopState.selectedIndex;
        const bought = shopState.itemsBoughtThisLevel[item.id] ?? 0;
        const isSoldOut = bought >= item.maxPerLevel;
        const canAfford = state.player.gems >= item.cost;
        const canBuyMore = item.canBuy(state.player);

        // Item background
        if (isSelected) {
            const selPulse = Math.sin(shopState.time * 4) * 0.15 + 0.85;
            ctx.fillStyle = `rgba(179, 136, 255, ${0.12 * selPulse})`;
            ctx.fillRect(x, iy, width, itemHeight);

            // Selection border
            ctx.strokeStyle = `rgba(179, 136, 255, ${0.6 * selPulse})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, iy, width, itemHeight);

            // Left accent bar
            ctx.fillStyle = '#b388ff';
            ctx.shadowColor = '#b388ff';
            ctx.shadowBlur = 6;
            ctx.fillRect(x, iy, 3, itemHeight);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(x, iy, width, itemHeight);
        }

        // Purchase flash
        if (shopState.purchaseFlash && shopState.purchaseFlash.itemId === item.id) {
            const flashAlpha = shopState.purchaseFlash.timer / 0.4 * 0.3;
            ctx.fillStyle = `rgba(179, 136, 255, ${flashAlpha})`;
            ctx.fillRect(x, iy, width, itemHeight);
        }

        // Icon box
        const iconBoxSize = 36;
        const iconX = x + 10;
        const iconY = iy + (itemHeight - iconBoxSize) / 2;

        ctx.fillStyle = isSoldOut ? 'rgba(100, 100, 100, 0.2)' : `${item.color}22`;
        ctx.fillRect(iconX, iconY, iconBoxSize, iconBoxSize);
        ctx.strokeStyle = isSoldOut ? '#555' : item.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(iconX, iconY, iconBoxSize, iconBoxSize);

        // Icon letter
        ctx.fillStyle = isSoldOut ? '#555' : item.color;
        ctx.shadowColor = isSoldOut ? 'transparent' : item.color;
        ctx.shadowBlur = isSoldOut ? 0 : 8;
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, iconX + iconBoxSize / 2, iconY + iconBoxSize / 2);
        ctx.shadowBlur = 0;

        // Item name
        const textX = iconX + iconBoxSize + 14;
        ctx.textAlign = 'left';
        ctx.fillStyle = isSoldOut ? '#555' : '#ffffff';
        ctx.font = '700 14px monospace';
        ctx.fillText(item.name, textX, iy + 18);

        // Item description
        ctx.fillStyle = isSoldOut ? '#444' : 'rgba(255,255,255,0.55)';
        ctx.font = '400 10px monospace';
        ctx.fillText(item.description, textX, iy + 34);

        // Purchase count
        if (bought > 0) {
            ctx.fillStyle = 'rgba(179, 136, 255, 0.5)';
            ctx.font = '700 9px monospace';
            ctx.fillText(`${bought}/${item.maxPerLevel}`, textX, iy + 46);
        }

        // Cost (right side)
        const costX = x + width - 90;
        const costY = iy + itemHeight / 2;

        // Cost gem icon
        ctx.fillStyle = isSoldOut ? '#333' : (canAfford ? '#ff2bd6' : '#ff003c');
        ctx.shadowColor = isSoldOut ? 'transparent' : (canAfford ? '#ff2bd6' : '#ff003c');
        ctx.shadowBlur = isSoldOut ? 0 : 6;
        ctx.beginPath();
        ctx.moveTo(costX, costY - 10);
        ctx.lineTo(costX + 10, costY);
        ctx.lineTo(costX, costY + 10);
        ctx.lineTo(costX - 10, costY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Cost number
        ctx.fillStyle = isSoldOut ? '#444' : (canAfford ? '#ffffff' : '#ff003c');
        ctx.font = '900 16px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.cost}`, costX + 16, costY + 5);

        // Sold out overlay
        if (isSoldOut || !canBuyMore) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x, iy, width, itemHeight);

            ctx.fillStyle = canBuyMore ? '#555' : '#fb923c';
            ctx.font = '900 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(canBuyMore ? 'SOLD OUT' : 'MAXED', x + width / 2, iy + itemHeight / 2);
        }
    }

    // Scroll indicators
    if (shopState.scrollOffset > 0) {
        ctx.fillStyle = 'rgba(179, 136, 255, 0.6)';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('^', x + width / 2, y + 8);
    }
    if (shopState.scrollOffset + maxVisible < items.length) {
        ctx.fillStyle = 'rgba(179, 136, 255, 0.6)';
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('v', x + width / 2, y + height - 4);
    }

    ctx.restore();
}

function drawControlsHelp(ctx, x, y, width) {
    ctx.save();

    // Background bar
    ctx.fillStyle = 'rgba(179, 136, 255, 0.06)';
    ctx.fillRect(x + 10, y, width - 20, 36);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 10px monospace';

    const helpItems = [
        { key: 'W/S', desc: 'NAVIGATE' },
        { key: 'A/D', desc: 'CATEGORY' },
        { key: 'J/E', desc: 'BUY' },
        { key: 'L', desc: 'CLOSE' },
    ];

    const spacing = width / helpItems.length;

    for (let i = 0; i < helpItems.length; i++) {
        const hx = x + spacing * i + spacing / 2;

        // Key box
        ctx.fillStyle = 'rgba(179, 136, 255, 0.2)';
        const keyW = ctx.measureText(helpItems[i].key).width + 10;
        ctx.fillRect(hx - 40, y + 6, keyW + 4, 16);

        ctx.fillStyle = '#b388ff';
        ctx.fillText(helpItems[i].key, hx - 40 + (keyW + 4) / 2, y + 14);

        // Description
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(helpItems[i].desc, hx + 10, y + 24);
    }

    ctx.restore();
}

function drawNotification(ctx, centerX, y) {
    if (!shopState.notification) return;

    const { text, color, timer } = shopState.notification;
    const alpha = Math.min(1, timer / 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = 'rgba(5, 5, 16, 0.85)';
    const textWidth = ctx.measureText(text).width + 40;
    ctx.fillRect(centerX - textWidth / 2, y, textWidth, 28);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - textWidth / 2, y, textWidth, 28);

    ctx.fillStyle = color;
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, centerX, y + 14);

    ctx.restore();
}

// ─── Between-Levels Shop ────────────────────────────────────────────────

/**
 * Draw a "Visit Shop" button on the Level Complete screen.
 * Returns true if the button was clicked.
 */
export function drawShopButtonOnLevelComplete(ctx) {
    const W = CONFIG.width;
    const buttonX = W / 2 - 120;
    const buttonY = 478;
    const buttonW = 240;
    const buttonH = 32;

    const time = performance.now() * 0.001;
    const pulse = Math.sin(time * 4) * 0.2 + 0.8;

    ctx.save();

    // Button background
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = 'rgba(179, 136, 255, 0.15)';
    ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

    // Button border
    ctx.strokeStyle = `rgba(179, 136, 255, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(buttonX, buttonY, buttonW, buttonH);

    // Button text
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#b388ff';
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VISIT SHOP (S)', buttonX + buttonW / 2, buttonY + buttonH / 2);

    ctx.restore();

    return { x: buttonX, y: buttonY, width: buttonW, height: buttonH };
}

// ─── Player Buff Integration ────────────────────────────────────────────

/**
 * Apply active shop buffs to the player during update.
 * Called from the main update loop.
 */
export function updatePlayerBuffs(player, dt, level) {
    // Magnet effect: attract nearby gems
    if (player._magnetTimer && player._magnetTimer > 0) {
        player._magnetTimer -= dt;
        if (level.gems) {
            for (const gem of level.gems) {
                if (gem.collected) continue;
                const dx = player.x + player.width / 2 - (gem.x + 13);
                const dy = player.y + player.height / 2 - (gem.y + 13);
                const dist = Math.hypot(dx, dy);
                if (dist < 200 && dist > 5) {
                    const pull = 400 * dt;
                    gem.x += (dx / dist) * pull;
                    gem.y += (dy / dist) * pull;
                }
            }
        }
        if (player._magnetTimer <= 0) {
            player._magnetTimer = 0;
        }
    }

    // Shield effect: reduce incoming damage
    // (handled in player.hit() via _shieldTimer check)

    // Speed boost
    // (handled in player movement via _speedBoostTimer check)

    // Timed buff decay
    if (player._shieldTimer && player._shieldTimer > 0) {
        player._shieldTimer -= dt;
        if (player._shieldTimer <= 0) player._shieldTimer = 0;
    }

    if (player._speedBoostTimer && player._speedBoostTimer > 0) {
        player._speedBoostTimer -= dt;
        if (player._speedBoostTimer <= 0) player._speedBoostTimer = 0;
    }
}

/**
 * Get speed multiplier from shop buffs.
 */
export function getSpeedMultiplier(player) {
    return player._speedBoostTimer > 0 ? 1.3 : 1;
}

/**
 * Get damage reduction from shop buffs (0 = none, 0.5 = 50%).
 */
export function getDamageReduction(player) {
    return player._shieldTimer > 0 ? 0.5 : 0;
}

/**
 * Check and consume a double jump charge.
 * Returns true if a charge was available.
 */
export function tryDoubleJump(player) {
    if (player._doubleJumpCharges && player._doubleJumpCharges > 0) {
        player._doubleJumpCharges--;
        return true;
    }
    return false;
}

/**
 * Draw active buff indicators on the HUD.
 */
export function drawBuffIndicators(ctx, player) {
    const buffs = [];
    if (player._magnetTimer > 0) buffs.push({ name: 'MAG', timer: player._magnetTimer, color: '#ff2bd6', max: 30 });
    if (player._shieldTimer > 0) buffs.push({ name: 'SHD', timer: player._shieldTimer, color: '#3b82f6', max: 20 });
    if (player._speedBoostTimer > 0) buffs.push({ name: 'SPD', timer: player._speedBoostTimer, color: '#fb923c', max: 25 });
    if (player._doubleJumpCharges > 0) buffs.push({ name: `DJx${player._doubleJumpCharges}`, timer: 1, color: '#a855f7', max: 1 });

    if (buffs.length === 0) return;

    const startX = 20;
    const startY = CONFIG.height - 150;

    ctx.save();

    for (let i = 0; i < buffs.length; i++) {
        const buff = buffs[i];
        const bx = startX;
        const by = startY - i * 22;
        const barW = 80;

        // Background
        ctx.fillStyle = 'rgba(3, 7, 18, 0.7)';
        ctx.fillRect(bx, by, barW, 16);

        // Timer bar
        const ratio = buff.timer / buff.max;
        ctx.fillStyle = buff.color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(bx, by, barW * ratio, 16);
        ctx.globalAlpha = 1;

        // Border
        ctx.strokeStyle = buff.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, 16);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(buff.name, bx + 4, by + 11);

        // Timer text
        if (buff.max > 1) {
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.ceil(buff.timer)}s`, bx + barW - 4, by + 11);
        }
    }

    ctx.restore();
}

// ─── Easing ─────────────────────────────────────────────────────────────

function easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// ─── Reset shop purchases for new level ─────────────────────────────────

export function resetShopPurchases() {
    if (shopState) {
        shopState.itemsBoughtThisLevel = {};
    }
}

// ─── Keyboard handler for between-levels shop access ────────────────────

export function handleShopKeyOnLevelComplete(code) {
    if (code === 'KeyS') {
        if (!isShopOpen()) {
            openShop('between');
        } else {
            closeShop();
        }
        return true;
    }
    return false;
}
