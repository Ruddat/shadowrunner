export const particles = [];

export function spawnParticles(x, y, amount = 12, color = '#21e6ff') {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 260,
            vy: (Math.random() - 0.5) * 260,
            size: 2 + Math.random() * 4,
            life: 0.45 + Math.random() * 0.35,
            maxLife: 0.8,
            color,
        });
    }
}

export function updateParticles(dt) {
    for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 420 * dt;
        p.life -= dt;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

export function drawParticles(ctx, camera) {
    ctx.save();

    for (const p of particles) {
        const alpha = Math.max(0, p.life / p.maxLife);

        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = p.color;

        ctx.fillRect(
            p.x - camera.x,
            p.y - camera.y,
            p.size,
            p.size
        );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}