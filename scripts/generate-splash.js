/**
 * Generate a branded iOS splash (2732x2732) from assets/icon-only.png.
 * Output: assets/splash.png and the three Splash.imageset variants.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const SIZE = 2732;
const LOGO = 720; // logo box

async function main() {
    const root = path.resolve(__dirname, '..');
    const logoPath = path.join(root, 'assets', 'icon-only.png');
    const outPath = path.join(root, 'assets', 'splash.png');

    const c = createCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d');

    // ── Deep dark base ─────────────────────────────────────────────────────
    const base = ctx.createLinearGradient(0, 0, 0, SIZE);
    base.addColorStop(0, '#06060c');
    base.addColorStop(0.55, '#0a0a14');
    base.addColorStop(1, '#020205');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Off-center status aurora (rose) ────────────────────────────────────
    const auroraA = ctx.createRadialGradient(
        SIZE * 0.32, SIZE * 0.38, 0,
        SIZE * 0.32, SIZE * 0.38, SIZE * 0.55
    );
    auroraA.addColorStop(0, 'rgba(244,63,94,0.42)');
    auroraA.addColorStop(0.45, 'rgba(167,139,250,0.18)');
    auroraA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auroraA;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Counter aurora (cyan) ─────────────────────────────────────────────
    const auroraB = ctx.createRadialGradient(
        SIZE * 0.78, SIZE * 0.7, 0,
        SIZE * 0.78, SIZE * 0.7, SIZE * 0.5
    );
    auroraB.addColorStop(0, 'rgba(34,211,238,0.30)');
    auroraB.addColorStop(0.5, 'rgba(34,211,238,0.10)');
    auroraB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auroraB;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Subtle vignette ───────────────────────────────────────────────────
    const vignette = ctx.createRadialGradient(
        SIZE / 2, SIZE / 2, SIZE * 0.22,
        SIZE / 2, SIZE / 2, SIZE * 0.78
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Logo glow halo ────────────────────────────────────────────────────
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, LOGO * 0.95);
    halo.addColorStop(0, 'rgba(244,63,94,0.55)');
    halo.addColorStop(0.4, 'rgba(167,139,250,0.25)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Logo ──────────────────────────────────────────────────────────────
    const logo = await loadImage(logoPath);
    ctx.drawImage(logo, cx - LOGO / 2, cy - LOGO / 2, LOGO, LOGO);

    // ── Wordmark ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 96px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Track 0.18em ≈ widen by re-rendering character by character
    const word = 'SWERVE';
    ctx.shadowColor = 'rgba(244,63,94,0.6)';
    ctx.shadowBlur = 36;
    const trackEm = 0.20;
    const widths = [...word].map(ch => ctx.measureText(ch).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + (word.length - 1) * 96 * trackEm;
    let x = cx - totalW / 2;
    const y = cy + LOGO / 2 + 130;
    [...word].forEach((ch, i) => {
        const w = widths[i];
        ctx.fillText(ch, x + w / 2, y);
        x += w + 96 * trackEm;
    });
    ctx.restore();

    // ── Tagline ───────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.font = '500 38px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drive Smarter.  Ride Safer.', cx, y + 110);

    const buf = await c.encode('png');
    fs.writeFileSync(outPath, buf);

    // Also write the three Splash.imageset variants
    const dest = path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset');
    for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
        fs.writeFileSync(path.join(dest, name), buf);
    }

    console.log('Wrote', outPath, 'and 3 Splash.imageset variants');
}

main().catch(e => { console.error(e); process.exit(1); });
