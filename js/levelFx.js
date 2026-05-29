/**
 * levelFx.js - Level visual effects (stars, fog, neon dust, scanlines, rain, sparks, warning lights)
 * Now powered by Neon-Sync: effects react to music intensity and beats.
 */

import { neonSync } from './neonSync.js';

const stars = [];
const fogLayers = [];
const dust = [];
const raindrops = [];
const rainSplashes = [];
const sparkParticles = [];
const warningLights = [];

export function initLevelFx() {
    stars.length = 0;
    fogLayers.length = 0;
    dust.length = 0;
    raindrops.length = 0;
    rainSplashes.length = 0;
    sparkParticles.length = 0;
    warningLights.length = 0;

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

    // Rain drops (200 for dense cyberpunk rain)
    for (let i = 0; i < 200; i++) {
        raindrops.push(createRaindrop());
    }

    // Warning lights (positioned along top of level)
    for (let i = 0; i < 6; i++) {
        warningLights.push({
            x: 80 + i * 700 + Math.random() * 200,
            y: 10 + Math.random() * 40,
            phase: Math.random() * Math.PI * 2,
            speed: 1.5 + Math.random() * 2,
            color: i % 3 === 0 ? '#ff003c' : i % 3 === 1 ? '#facc15' : '#ff6b00',
            size: 8 + Math.random() * 6,
        });
    }
}

function createRaindrop() {
    return {
        x: Math.random() * 1200,
        y: Math.random() * -200 - 20,
        length: 12 + Math.random() * 18,
        speed: 600 + Math.random() * 400,
        alpha: 0.15 + Math.random() * 0.25,
        wind: -30 - Math.random() * 40,
    };
}

function createRainSplash(x, y) {
    return {
        x,
        y,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 3,
    };
}

function createSpark(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.2 + Math.random() * 0.5,
        maxLife: 0.2 + Math.random() * 0.5,
        size: 1 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#facc15' : '#ff6b00',
    };
}

export function updateLevelFx(dt, level) {
    // Neon-Sync speed multiplier: music intensity drives particle speed
    const speedBoost = 1 + neonSync.intensity * 1.2;

    if (level.fx?.fog) {
        for (const fog of fogLayers) {
            fog.x -= fog.speed * speedBoost * dt;

            if (fog.x + fog.width < 0) {
                fog.x = 1200 + Math.random() * 400;
                fog.y = 180 + Math.random() * 210;
            }
        }
    }

    if (level.fx?.neonDust) {
        for (const p of dust) {
            p.x -= p.speed * speedBoost * dt;

            if (p.x < -20) {
                p.x = 4000 + Math.random() * 300;
                p.y = 90 + Math.random() * 380;
            }
        }
    }

    // Rain update
    if (level.fx?.rain) {
        for (const drop of raindrops) {
            drop.x += drop.wind * dt;
            drop.y += drop.speed * dt;

            // Hit ground → splash
            if (drop.y > 530) {
                if (Math.random() < 0.3) {
                    rainSplashes.push(createRainSplash(drop.x, 528));
                }
                Object.assign(drop, createRaindrop());
                drop.y = -20 - Math.random() * 40;
            }
        }

        // Update splashes
        for (let i = rainSplashes.length - 1; i >= 0; i--) {
            rainSplashes[i].life -= dt;
            if (rainSplashes[i].life <= 0) {
                rainSplashes.splice(i, 1);
            }
        }
    }

    // Sparks update
    if (level.fx?.sparks) {
        // Spawn new sparks occasionally
        if (Math.random() < dt * 8) {
            const sx = Math.random() * 1100;
            const sy = 100 + Math.random() * 380;
            sparkParticles.push(createSpark(sx, sy));
        }

        for (let i = sparkParticles.length - 1; i >= 0; i--) {
            const s = sparkParticles[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 300 * dt; // gravity
            s.life -= dt;
            if (s.life <= 0) {
                sparkParticles.splice(i, 1);
            }
        }
    }

    // Warning lights update — just time-based, nothing to update per frame
}

export function drawLevelFxBehind(ctx, camera, level, config) {
    if (level.fx?.stars) {
        drawStars(ctx, camera, config);
    }

    if (level.fx?.rain) {
        drawRain(ctx, camera, config);
    }

    if (level.fx?.fog) {
        drawFog(ctx, camera, config);
    }

    if (level.fx?.warningLights) {
        drawWarningLights(ctx, camera, config);
    }
}

export function drawLevelFxFront(ctx, camera, level, config) {
    if (level.fx?.neonDust) {
        drawNeonDust(ctx, camera, config);
    }

    if (level.fx?.sparks) {
        drawSparks(ctx, camera, config);
    }

    if (level.fx?.scanlines) {
        drawScanlines(ctx, config);
    }

    // Beat flash overlay: subtle full-screen pulse on every detected beat
    if (neonSync.isActive && neonSync.timeSinceBeat < 0.15) {
        const flashAlpha = (1 - neonSync.timeSinceBeat / 0.15) * 0.06 * neonSync.bassIntensity;
        if (flashAlpha > 0.005) {
            ctx.save();
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = '#b388ff';
            ctx.fillRect(0, 0, config.width, config.height);
            ctx.restore();
        }
    }
}

function drawStars(ctx, camera, config) {
    ctx.save();

    const starAlpha = 0.35 + neonSync.midIntensity * 0.5;
    const starSizeBoost = 1 + neonSync.bassIntensity * 0.6;

    for (const star of stars) {
        const x = (star.x - camera.x * star.speed) % config.width;
        const y = star.y;

        ctx.globalAlpha = starAlpha;
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(x, y, star.size * starSizeBoost, star.size * starSizeBoost);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawFog(ctx, camera, config) {
    ctx.save();

    const fogAlphaBoost = 1 + neonSync.bassIntensity * 2.5;

    for (const fog of fogLayers) {
        const x = fog.x - camera.x * 0.08;

        const alpha = Math.min(0.18, fog.alpha * fogAlphaBoost);

        const gradient = ctx.createRadialGradient(
            x,
            fog.y,
            10,
            x,
            fog.y,
            fog.width
        );

        gradient.addColorStop(0, `rgba(168, 85, 247, ${alpha})`);
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, config.width, config.height);
    }

    ctx.restore();
}

function drawNeonDust(ctx, camera, config) {
    ctx.save();

    const alphaBoost = 1 + neonSync.intensity * 1.8;
    const sizeBoost = 1 + neonSync.bassIntensity * 0.8;

    for (const p of dust) {
        const x = (p.x - camera.x * 0.35) % config.width;

        ctx.globalAlpha = Math.min(0.85, p.alpha * alphaBoost);
        ctx.fillStyle = neonSync.beat ? '#b388ff' : '#21e6ff';
        ctx.fillRect(x, p.y, p.size * sizeBoost, p.size * sizeBoost);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawScanlines(ctx, config) {
    ctx.save();

    const lineAlpha = 0.06 + neonSync.bassIntensity * 0.08;
    const lineSpacing = 4 - Math.floor(neonSync.bassIntensity * 1.5);

    ctx.globalAlpha = lineAlpha;
    ctx.fillStyle = '#000';

    for (let y = 0; y < config.height; y += Math.max(2, lineSpacing)) {
        ctx.fillRect(0, y, config.width, 1);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// --- Rain Effect ---

function drawRain(ctx, camera, config) {
    const time = performance.now() * 0.001;

    ctx.save();

    // Rain streaks
    for (const drop of raindrops) {
        const x = drop.x - (camera.x * 0.3) % config.width;
        const y = drop.y;

        // Wrap horizontally
        const wx = ((x % config.width) + config.width) % config.width;

        ctx.globalAlpha = drop.alpha;
        ctx.strokeStyle = '#7c9cbf';
        ctx.lineWidth = 1;

        // Rain streak: slight angle from wind
        const windOffset = drop.wind * 0.02;
        ctx.beginPath();
        ctx.moveTo(wx, y);
        ctx.lineTo(wx + windOffset, y + drop.length);
        ctx.stroke();

        // Occasional brighter rain
        if (drop.alpha > 0.35) {
            ctx.globalAlpha = drop.alpha * 0.4;
            ctx.strokeStyle = '#a0c4e8';
            ctx.beginPath();
            ctx.moveTo(wx + 1, y);
            ctx.lineTo(wx + 1 + windOffset, y + drop.length);
            ctx.stroke();
        }
    }

    // Rain splashes
    for (const splash of rainSplashes) {
        const ratio = splash.life / splash.maxLife;
        const sx = splash.x - (camera.x * 0.3) % config.width;
        const wx = ((sx % config.width) + config.width) % config.width;

        ctx.globalAlpha = ratio * 0.5;
        ctx.strokeStyle = '#7c9cbf';
        ctx.lineWidth = 1;

        // Splash ring
        const radius = splash.size * (1 - ratio) * 4;
        ctx.beginPath();
        ctx.arc(wx, splash.y, radius, Math.PI, Math.PI * 2);
        ctx.stroke();
    }

    // Rain fog / mist at ground level
    ctx.globalAlpha = 0.06 + neonSync.bassIntensity * 0.03;
    ctx.fillStyle = '#4a6a8a';
    ctx.fillRect(0, config.height - 80, config.width, 80);

    ctx.globalAlpha = 1;
    ctx.restore();
}

// --- Sparks Effect ---

function drawSparks(ctx, camera, config) {
    ctx.save();

    for (const s of sparkParticles) {
        const ratio = s.life / s.maxLife;
        const x = s.x - camera.x * 0.5;
        const y = s.y;

        // Only draw if on screen
        if (x < -20 || x > config.width + 20 || y < -20 || y > config.height + 20) continue;

        ctx.globalAlpha = ratio;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 6 * ratio;
        ctx.fillStyle = s.color;

        // Spark as small bright dot with trail
        ctx.beginPath();
        ctx.arc(x, y, s.size * ratio, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        ctx.globalAlpha = ratio * 0.4;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - s.vx * 0.02, y - s.vy * 0.02);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
}

// --- Warning Lights Effect ---

function drawWarningLights(ctx, camera, config) {
    const time = performance.now() * 0.001;

    ctx.save();

    for (const light of warningLights) {
        const x = light.x - camera.x * 0.15;
        const y = light.y;

        // Only draw if roughly on screen
        if (x < -100 || x > config.width + 100) continue;

        const phase = Math.sin(time * light.speed + light.phase);
        const isOn = phase > 0.2;

        if (!isOn) continue;

        const intensity = (phase - 0.2) / 0.8; // 0..1

        // Light housing
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x - 4, y - 4, light.size + 8, light.size + 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 4, y - 4, light.size + 8, light.size + 8);

        // Light glow
        ctx.shadowColor = light.color;
        ctx.shadowBlur = 20 * intensity;
        ctx.fillStyle = light.color;
        ctx.globalAlpha = intensity * 0.9;

        ctx.beginPath();
        ctx.arc(x + light.size / 2, y + light.size / 2, light.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Light cone (downward beam)
        ctx.globalAlpha = intensity * 0.04;
        ctx.fillStyle = light.color;
        ctx.beginPath();
        ctx.moveTo(x, y + light.size);
        ctx.lineTo(x - 40, config.height);
        ctx.lineTo(x + light.size + 40, config.height);
        ctx.lineTo(x + light.size, y + light.size);
        ctx.closePath();
        ctx.fill();

        // Lens flare
        ctx.globalAlpha = intensity * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + light.size / 2, y + light.size / 2, light.size / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}
