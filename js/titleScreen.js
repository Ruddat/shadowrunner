import { CONFIG } from './config.js';
import { playSound } from './audioManager.js';

const titleImage = new Image();
let titleImageReady = false;

titleImage.onload = () => {
    titleImageReady = true;
};

titleImage.onerror = () => {
    console.error('Title Screen Bild nicht gefunden:', titleImage.src);
};

titleImage.src = 'assets/ui/title-screen.png';

const menuItems = [
    'NEW GAME',
    'CONTINUE',
    'OPTIONS',
    'CREDITS',
    'EXIT',
];

let selectedIndex = 0;
let titleTime = 0;

export function initTitleScreen() {
    selectedIndex = 0;
    titleTime = 0;
}

export function updateTitleScreen(dt) {
    titleTime += dt;
}

export function drawTitleScreen(ctx) {
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    if (titleImageReady) {
        ctx.drawImage(titleImage, 0, 0, CONFIG.width, CONFIG.height);
    } else {
        drawFallbackTitleBackground(ctx);
    }

    drawAnimatedFog(ctx);
    drawNeonParticles(ctx);
    drawLogoFlicker(ctx);
    drawMenuLabels(ctx);
    drawStartHint(ctx);
    drawNeonOverlay(ctx);
}

function drawLogoFlicker(ctx) {
    const flicker = Math.random() > 0.94 ? 0.22 : 0.08;

    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 45;
    ctx.fillStyle = '#ff2bd6';

    ctx.fillRect(330, 56, 300, 90);

    ctx.globalAlpha = flicker * 0.8;
    ctx.shadowColor = '#21e6ff';
    ctx.fillStyle = '#21e6ff';

    ctx.fillRect(365, 125, 245, 70);

    ctx.restore();
}

function drawAnimatedFog(ctx) {
    ctx.save();

    const t = titleTime;

    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 7; i++) {
        const x = ((t * 26 + i * 190) % (CONFIG.width + 320)) - 160;
        const y = 285 + Math.sin(t * 0.7 + i) * 45;

        const color = i % 2 === 0
            ? '255,43,214'
            : '33,230,255';

        const g = ctx.createRadialGradient(x, y, 20, x, y, 260);
        g.addColorStop(0, `rgba(${color},0.22)`);
        g.addColorStop(0.45, `rgba(${color},0.10)`);
        g.addColorStop(1, `rgba(${color},0)`);

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}


function drawNeonParticles(ctx) {
    ctx.save();

    for (let i = 0; i < 45; i++) {
        const x = (i * 97 + titleTime * 22) % CONFIG.width;
        const y = 70 + ((i * 53 + titleTime * 16) % 360);

        ctx.globalAlpha = 0.25 + Math.sin(titleTime * 2 + i) * 0.15;
        ctx.fillStyle = i % 2 === 0 ? '#21e6ff' : '#ff2bd6';
        ctx.fillRect(x, y, 2, 2);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}


function drawMenuLabels(ctx) {
    const startX = CONFIG.width / 2;
    const startY = 228;
    const gap = 56;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < menuItems.length; i++) {
        const y = startY + i * gap;
        const selected = i === selectedIndex;

        ctx.shadowBlur = selected ? 22 : 8;
        ctx.shadowColor = selected ? '#ff2bd6' : '#21e6ff';

        ctx.fillStyle = selected ? '#ffffff' : '#21e6ff';
        const pulse = selected ? 1 + Math.sin(titleTime * 5) * 0.06 : 1;
        ctx.font = selected
            ? `900 ${Math.round(28 * pulse)}px monospace`
            : '800 23px monospace';

        ctx.fillText(menuItems[i], startX, y);

        if (selected) {
            ctx.fillStyle = '#ff2bd6';
            ctx.fillText('>', startX - 170, y);
            ctx.fillText('<', startX + 170, y);
        }
    }

    ctx.restore();
}

function drawStartHint(ctx) {
    const blink = Math.floor(titleTime * 2) % 2 === 0;

    if (!blink) return;

    ctx.save();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 15;
    ctx.font = '900 16px monospace';
    ctx.fillText('ENTER / SPACE TO SELECT', CONFIG.width / 2, CONFIG.height - 28);

    ctx.restore();
}

function drawNeonOverlay(ctx) {
    ctx.save();

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';

    for (let y = 0; y < CONFIG.height; y += 4) {
        ctx.fillRect(0, y, CONFIG.width, 1);
    }

    ctx.globalAlpha = 0.12 + Math.sin(titleTime * 2) * 0.04;
    ctx.fillStyle = '#ff2bd6';
    ctx.fillRect(0, 0, CONFIG.width, 2);

    ctx.restore();
}

export function handleTitleKey(code) {
    if (code === 'ArrowUp' || code === 'KeyW') {
        selectedIndex--;

        if (selectedIndex < 0) {
            selectedIndex = menuItems.length - 1;
        }

        playSound('menuMove');
        return null;
    }

    if (code === 'ArrowDown' || code === 'KeyS') {
        selectedIndex++;

        if (selectedIndex >= menuItems.length) {
            selectedIndex = 0;
        }

        playSound('menuMove');
        return null;
    }

    if (code === 'Enter' || code === 'Space') {
        playSound('menuSelect');
        return menuItems[selectedIndex];
    }

    return null;
}

export function handleTitleClick() {
    playSound('menuSelect');
    return menuItems[selectedIndex];
}


function drawFallbackTitleBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);

    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(0.5, '#19002d');
    gradient.addColorStop(1, '#020617');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOWRUNNER', CONFIG.width / 2, 145);
}