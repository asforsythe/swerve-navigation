const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

let createCanvas, loadImage;
try {
  ({ createCanvas, loadImage } = require('@napi-rs/canvas'));
} catch (e) {
  console.warn('[Swerve] @napi-rs/canvas not available — share-card endpoint disabled');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// ── Share Card Endpoint ────────────────────────────────────────────────────────
app.post('/api/share-card', async (req, res) => {
  if (!createCanvas) {
    return res.status(503).json({ error: 'canvas not available' });
  }

  const {
    from, to, ssi, category, hazardType, traction,
    distance, duration, centerLng, centerLat,
  } = req.body;

  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0e';
  ctx.fillRect(0, 0, W, H);

  // SSI-based accent color
  const ssiNum = parseInt(ssi, 10) || 0;
  const ssiColor =
    ssiNum >= 85 ? '#34d399' :
    ssiNum >= 70 ? '#3b82f6' :
    ssiNum >= 55 ? '#fbbf24' :
    ssiNum >= 30 ? '#f97316' : '#ef4444';

  // Right panel: Mapbox static map
  if (mapboxToken && centerLng != null && centerLat != null) {
    try {
      const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${centerLng},${centerLat},12/800x630@2x?access_token=${mapboxToken}`;
      const mapImg = await loadImage(mapUrl);
      ctx.drawImage(mapImg, 400, 0, 800, 630);
      // Fade from left
      const fadeGrad = ctx.createLinearGradient(400, 0, 850, 0);
      fadeGrad.addColorStop(0, 'rgba(10,10,14,1)');
      fadeGrad.addColorStop(0.45, 'rgba(10,10,14,0.4)');
      fadeGrad.addColorStop(1, 'rgba(10,10,14,0.0)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(400, 0, 800, 630);
    } catch (e) {
      // Fallback: subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0a0a0e');
      bgGrad.addColorStop(1, '#0d1a26');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // SSI accent bar (left edge)
  const barGrad = ctx.createLinearGradient(0, 0, 0, H);
  barGrad.addColorStop(0, ssiColor);
  barGrad.addColorStop(1, ssiColor + '00');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 4, H);

  // ── SWERVE logo ────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('SWERVE', 54, 86);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('WEATHER INTELLIGENCE NAVIGATION', 57, 112);

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(54, 128, 300, 1);

  // ── SSI ring ────────────────────────────────────────────────────
  const cx = 126, cy = 258, r = 66;

  // Track ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Progress arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (ssiNum / 100) * Math.PI * 2);
  ctx.strokeStyle = ssiColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ssiNum, cx, cy + 14);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('SSI', cx, cy + 31);
  ctx.textAlign = 'left';

  // Category pill
  ctx.fillStyle = ssiColor + '28';
  _roundRect(ctx, cx - 38, cy + 44, 76, 24, 12);
  ctx.fill();
  ctx.fillStyle = ssiColor;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((category || 'OPTIMAL').toUpperCase(), cx, cy + 60);
  ctx.textAlign = 'left';

  // ── Route info (right of ring) ──────────────────────────────────
  const rx = 228;

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('DESTINATION', rx, 164);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.fillText((to || 'Destination').substring(0, 22), rx, 192);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`from  ${(from || 'Start').substring(0, 22)}`, rx, 218);

  // Stats row
  const stats = [];
  if (distance) stats.push({ label: 'DISTANCE', value: `${(distance / 1609.34).toFixed(1)}mi` });
  if (duration) stats.push({ label: 'ETA', value: `${Math.round(duration / 60)}min` });
  if (traction != null) stats.push({ label: 'TRACTION', value: `${traction}%` });

  stats.forEach((stat, i) => {
    const sx = rx + i * 96;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(stat.value, sx, 278);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(stat.label, sx, 295);
  });

  // ── Hazard tag ────────────────────────────────────────────────
  if (hazardType && hazardType !== 'None') {
    ctx.fillStyle = 'rgba(239,68,68,0.14)';
    _roundRect(ctx, 54, 340, 220, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`⚠  ${hazardType} detected`, 70, 359);
  }

  // Timestamp
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '12px system-ui, sans-serif';
  const ts = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  ctx.fillText(ts, 54, 400);

  // ── Footer ─────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, H - 44, W, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Made with Swerve  •  Weather Intelligence Navigation', 54, H - 15);

  res.set('Content-Type', 'image/png');
  res.send(Buffer.from(await canvas.encode('png')));
});

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Swerve Server] Running on port ${PORT}`);
  console.log('[Swerve Server] Share card endpoint: POST /api/share-card');
});
