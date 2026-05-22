const stars = [];
const fogLayers = [];
const dust = [];

export function initLevelFx() {
    stars.length = 0;
    fogLayers.length = 0;
    dust.length = 0;

    for (let i = 0; i < 140; i++) {
        stars.push({
            x: Math.random() * 4000,
            y: Math.random() * 260,
            size: Math.random() * 1.8 + 0.4,
            speed: Math.random() * 0.12 + 0.03,
        });
    }

    for (let i = 0; i < 8; i++) {
        fogLayers.push({
            x: Math.random() * 1200,
            y: 180 + Math.random() * 210,
            width: 260 + Math.random() * 360,
            height: 50 + Math.random() * 70,
            speed: 8 + Math.random() * 20,
            alpha: 0.035 + Math.random() * 0.045,
        });
    }

    for (let i = 0; i < 90; i++) {
        dust.push({
            x: Math.random() * 4000,
            y: 90 + Math.random() * 380,
            size: Math.random() * 2 + 1,
            speed: 12 + Math.random() * 28,
            alpha: 0.15 + Math.random() * 0.25,
        });
    }
}

export function updateLevelFx(dt, level) {
    if (level.fx?.fog) {
        for (const fog of fogLayers) {
            fog.x -= fog.speed * dt;

            if (fog.x + fog.width < 0) {
                fog.x = 1200 + Math.random() * 400;
                fog.y = 180 + Math.random() * 210;
            }
        }
    }

    if (level.fx?.neonDust) {
        for (const p of dust) {
            p.x -= p.speed * dt;

            if (p.x < -20) {
                p.x = 4000 + Math.random() * 300;
                p.y = 90 + Math.random() * 380;
            }
        }
    }
}

export function drawLevelFxBehind(ctx, camera, level, config) {
    if (level.fx?.stars) {
        drawStars(ctx, camera, config);
    }

    if (level.fx?.fog) {
        drawFog(ctx, camera, config);
    }
}

export function drawLevelFxFront(ctx, camera, level, config) {
    if (level.fx?.neonDust) {
        drawNeonDust(ctx, camera, config);
    }

    if (level.fx?.scanlines) {
        drawScanlines(ctx, config);
    }
}

function drawStars(ctx, camera, config) {
    ctx.save();

    for (const star of stars) {
        const x = (star.x - camera.x * star.speed) % config.width;
        const y = star.y;

        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(x, y, star.size, star.size);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawFog(ctx, camera, config) {
    ctx.save();

    for (const fog of fogLayers) {
        const x = fog.x - camera.x * 0.08;

        const gradient = ctx.createRadialGradient(
            x,
            fog.y,
            10,
            x,
            fog.y,
            fog.width
        );

        gradient.addColorStop(0, `rgba(168, 85, 247, ${fog.alpha})`);
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, config.height);
    }

    ctx.restore();
}

function drawNeonDust(ctx, camera, config) {
    ctx.save();

    for (const p of dust) {
        const x = (p.x - camera.x * 0.35) % config.width;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#21e6ff';
        ctx.fillRect(x, p.y, p.size, p.size);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawScanlines(ctx, config) {
    ctx.save();

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';

    for (let y = 0; y < config.height; y += 4) {
        ctx.fillRect(0, y, config.width, 1);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}