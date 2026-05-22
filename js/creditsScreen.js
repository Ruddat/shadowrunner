import { CONFIG } from './config.js';

let scrollY = CONFIG.height + 120;
let creditsTime = 0;
let finaleStarted = false;
const finaleParticles = [];

const credits = [
    {
        type: 'title',
        text: 'SHADOWRUNNER',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'CODING',
    },
    {
        type: 'normal',
        text: 'INGO RUDDAT',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'FAST CODING SESSION',
    },
    {
        type: 'normal',
        text: 'INGO RUDDAT & AI ASSISTANT',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'GAME IDEA',
    },
    {
        type: 'normal',
        text: 'INGO RUDDAT',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'GFX IDEA',
    },
    {
        type: 'normal',
        text: 'INGO RUDDAT',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'SOUNDTRACK',
    },
    {
        type: 'normal',
        text: 'CREATED WITH SUNO',
    },

    {
        type: 'space',
    },

    {
        type: 'section',
        text: 'INSPIRED BY',
    },
    {
        type: 'normal',
        text: 'AMIGA DEMOSCENE',
    },
    {
        type: 'normal',
        text: 'RETRO PLATFORMERS',
    },
    {
        type: 'normal',
        text: 'CYBERPUNK CLASSICS',
    },

    {
        type: 'space',
    },

    {
        type: 'big',
        text: 'THANK YOU',
    },

    {
        type: 'normal',
        text: 'FOR PLAYING',
    },

    {
        type: 'space',
    },

    {
        type: 'normal',
        text: 'SEE YOU IN THE NEON CITY...',
    },
];

export function initCreditsScreen() {
    scrollY = CONFIG.height + 120;
    creditsTime = 0;
    finaleStarted = false;
    finaleParticles.length = 0;
}

export function updateCreditsScreen(dt) {
    creditsTime += dt;

    if (!finaleStarted) {
        scrollY -= 52 * dt;

        if (scrollY < -1450) {
            finaleStarted = true;
            spawnFinaleParticles();
        }

        return;
    }

    updateFinaleParticles(dt);
}

export function drawCreditsScreen(ctx) {
    drawBackground(ctx);
    drawFog(ctx);
    drawStars(ctx);

    if (!finaleStarted) {
        drawCredits(ctx);
    } else {
        drawFinale(ctx);
    }

    drawOverlay(ctx);
}

function drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);

    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(0.5, '#160025');
    gradient.addColorStop(1, '#020617');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

function drawFog(ctx) {
    ctx.save();

    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 6; i++) {
        const x = ((creditsTime * 20 + i * 180) % (CONFIG.width + 320)) - 160;
        const y = 180 + Math.sin(creditsTime * 0.5 + i) * 90;

        const color = i % 2 === 0
            ? '255,43,214'
            : '33,230,255';

        const g = ctx.createRadialGradient(x, y, 10, x, y, 260);

        g.addColorStop(0, `rgba(${color},0.16)`);
        g.addColorStop(1, `rgba(${color},0)`);

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

function drawStars(ctx) {
    ctx.save();

    for (let i = 0; i < 140; i++) {
        const x = (i * 97 + creditsTime * 8) % CONFIG.width;
        const y = (i * 57) % CONFIG.height;

        ctx.globalAlpha = 0.2 + Math.sin(creditsTime * 2 + i) * 0.2;
        ctx.fillStyle = i % 2 === 0 ? '#21e6ff' : '#ffffff';

        ctx.fillRect(x, y, 2, 2);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawCredits(ctx) {
    let y = scrollY;

    ctx.save();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const line of credits) {
        if (line.type === 'space') {
            y += 70;
            continue;
        }

        if (line.type === 'title') {
            ctx.shadowColor = '#ff2bd6';
            ctx.shadowBlur = 35;

            ctx.fillStyle = '#ff2bd6';
            ctx.font = '900 78px Arial';

            const wave = Math.sin(creditsTime * 2) * 10;

            ctx.fillText(line.text, CONFIG.width / 2, y + wave);

            y += 120;
            continue;
        }

        if (line.type === 'big') {
            ctx.shadowColor = '#21e6ff';
            ctx.shadowBlur = 30;

            ctx.fillStyle = '#21e6ff';
            ctx.font = '900 52px Arial';

            const pulse = 1 + Math.sin(creditsTime * 4) * 0.05;

            ctx.save();
            ctx.translate(CONFIG.width / 2, y);
            ctx.scale(pulse, pulse);

            ctx.fillText(line.text, 0, 0);

            ctx.restore();

            y += 90;
            continue;
        }

        if (line.type === 'section') {
            ctx.shadowColor = '#ff2bd6';
            ctx.shadowBlur = 16;

            ctx.fillStyle = '#ff2bd6';
            ctx.font = '900 28px monospace';

            ctx.fillText(line.text, CONFIG.width / 2, y);

            y += 54;
            continue;
        }

        ctx.shadowColor = '#21e6ff';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 22px monospace';

        ctx.fillText(line.text, CONFIG.width / 2, y);

        y += 42;
    }

    ctx.restore();
}

function drawOverlay(ctx) {
    ctx.save();

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';

    for (let y = 0; y < CONFIG.height; y += 4) {
        ctx.fillRect(0, y, CONFIG.width, 1);
    }

    ctx.globalAlpha = 1;

    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 14px monospace';
    ctx.textAlign = 'center';

    const blink = Math.floor(creditsTime * 2) % 2 === 0;

    if (blink) {
        ctx.fillText(
            'PRESS ESC TO RETURN',
            CONFIG.width / 2,
            CONFIG.height - 24
        );
    }

    ctx.restore();
}


function spawnFinaleParticles() {
    finaleParticles.length = 0;

    for (let i = 0; i < 220; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 360;

        finaleParticles.push({
            x: CONFIG.width / 2,
            y: CONFIG.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 5,
            life: 1.8 + Math.random() * 2.2,
            maxLife: 4,
            color: Math.random() > 0.5 ? '#ff2bd6' : '#21e6ff',
        });
    }
}

function updateFinaleParticles(dt) {
    for (const p of finaleParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= 0.985;
        p.vy *= 0.985;

        p.life -= dt;

        if (p.life <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 320;

            p.x = CONFIG.width / 2;
            p.y = CONFIG.height / 2;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 1.8 + Math.random() * 2.2;
            p.color = Math.random() > 0.5 ? '#ff2bd6' : '#21e6ff';
        }
    }
}

function drawFinale(ctx) {
    ctx.save();

    for (const p of finaleParticles) {
        const alpha = Math.max(0, p.life / p.maxLife);

        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    ctx.globalAlpha = 1;

    const pulse = 1 + Math.sin(creditsTime * 4) * 0.05;

    ctx.translate(CONFIG.width / 2, CONFIG.height / 2 - 20);
    ctx.scale(pulse, pulse);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px Arial';
    ctx.fillText('THANK YOU', 0, -25);

    ctx.shadowColor = '#21e6ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#21e6ff';
    ctx.font = '900 24px monospace';
    ctx.fillText('FOR PLAYING SHADOWRUNNER', 0, 35);

    ctx.restore();
}