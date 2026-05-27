/**
 * levelFx.js - Level visual effects (stars, fog, neon dust, scanlines)
 * Now powered by Neon-Sync: effects react to music intensity and beats.
 */

import { neonSync } from './neonSync.js';

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

    // Stars pulse with mid-range intensity (twinkling to the beat)
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

    // Fog breathes with bass intensity
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

    // Neon dust glows brighter with overall intensity
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

    // Scanlines thicken/pulse on bass hits
    const lineAlpha = 0.06 + neonSync.bassIntensity * 0.08;
    const lineSpacing = 4 - Math.floor(neonSync.bassIntensity * 1.5); // 2-4px

    ctx.globalAlpha = lineAlpha;
    ctx.fillStyle = '#000';

    for (let y = 0; y < config.height; y += Math.max(2, lineSpacing)) {
        ctx.fillRect(0, y, config.width, 1);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}
