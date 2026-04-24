const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

// ── Flat-file persistence (.data/) ────────────────────────────────────────────
const DATA_DIR          = path.join(__dirname, '.data');
const HAZARDS_FILE      = path.join(DATA_DIR, 'hazards.json');
const LIVE_ROUTES_FILE  = path.join(DATA_DIR, 'live-routes.json');
const HAZARD_TTL        = 4 * 60 * 60 * 1000; // 4 hours
const LIVE_ROUTE_TTL    = 4 * 60 * 60 * 1000; // 4 hours — auto-expire

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readHazards() {
  try {
    if (!fs.existsSync(HAZARDS_FILE)) return [];
    const raw = fs.readFileSync(HAZARDS_FILE, 'utf8');
    const all = JSON.parse(raw);
    const now = Date.now();
    return all.filter(h => new Date(h.expiresAt).getTime() > now);
  } catch { return []; }
}

function writeHazards(hazards) {
  fs.writeFileSync(HAZARDS_FILE, JSON.stringify(hazards, null, 2));
}

// ── Live routes helpers ───────────────────────────────────────────────────────
function readLiveRoutes() {
  try {
    if (!fs.existsSync(LIVE_ROUTES_FILE)) return [];
    const all = JSON.parse(fs.readFileSync(LIVE_ROUTES_FILE, 'utf8'));
    const now = Date.now();
    return all.filter(r => new Date(r.expiresAt).getTime() > now && r.isActive);
  } catch { return []; }
}

function writeLiveRoutes(routes) {
  fs.writeFileSync(LIVE_ROUTES_FILE, JSON.stringify(routes, null, 2));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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

// ── Community Hazards API ─────────────────────────────────────────────────────

const VALID_HAZARD_TYPES = ['Flooding', 'Debris', 'Accident', 'Ice', 'Construction'];

// GET /api/hazards?lat=&lng=&radius=  (radius in km, default 100)
app.get('/api/hazards', (req, res) => {
  const hazards = readHazards();
  writeHazards(hazards); // prune expired

  const { lat, lng, radius = 100 } = req.query;
  if (!lat || !lng) return res.json(hazards);

  const filtered = hazards.filter(h =>
    haversineKm(parseFloat(lat), parseFloat(lng), h.lat, h.lng) <= parseFloat(radius)
  );
  res.json(filtered);
});

// POST /api/hazards
app.post('/api/hazards', (req, res) => {
  const { type, lat, lng, description, clientId } = req.body;
  if (!VALID_HAZARD_TYPES.includes(type) || !lat || !lng || !clientId) {
    return res.status(400).json({ error: 'Invalid hazard data' });
  }
  const now = new Date();
  const hazard = {
    id: crypto.randomUUID(),
    type,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    description: (description || '').slice(0, 200),
    clientId,
    upvotes: 0,
    downvotes: 0,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + HAZARD_TTL).toISOString(),
  };
  const hazards = readHazards();
  hazards.push(hazard);
  writeHazards(hazards);
  res.status(201).json(hazard);
});

// PUT /api/hazards/:id/vote  body: { vote: 'up'|'down', clientId }
app.put('/api/hazards/:id/vote', (req, res) => {
  const { vote, clientId } = req.body;
  if (!['up', 'down'].includes(vote) || !clientId) {
    return res.status(400).json({ error: 'Invalid vote' });
  }
  const hazards = readHazards();
  const idx = hazards.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  // One vote per clientId (track in votes object)
  if (!hazards[idx].votes) hazards[idx].votes = {};
  const prev = hazards[idx].votes[clientId];
  if (prev === vote) {
    // toggle off
    if (vote === 'up') hazards[idx].upvotes = Math.max(0, hazards[idx].upvotes - 1);
    else hazards[idx].downvotes = Math.max(0, hazards[idx].downvotes - 1);
    delete hazards[idx].votes[clientId];
  } else {
    if (prev) {
      if (prev === 'up') hazards[idx].upvotes = Math.max(0, hazards[idx].upvotes - 1);
      else hazards[idx].downvotes = Math.max(0, hazards[idx].downvotes - 1);
    }
    if (vote === 'up') hazards[idx].upvotes++;
    else hazards[idx].downvotes++;
    hazards[idx].votes[clientId] = vote;
  }
  writeHazards(hazards);
  res.json(hazards[idx]);
});

// DELETE /api/hazards/:id  body: { clientId }
app.delete('/api/hazards/:id', (req, res) => {
  const { clientId } = req.body;
  const hazards = readHazards();
  const idx = hazards.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (hazards[idx].clientId !== clientId) return res.status(403).json({ error: 'Forbidden' });
  hazards.splice(idx, 1);
  writeHazards(hazards);
  res.json({ success: true });
});

// ── Intelligence Feed API ─────────────────────────────────────────────────────

// GET /api/intelligence-feed?lat=&lng=&radius=  (radius km, default 80)
app.get('/api/intelligence-feed', async (req, res) => {
  const { lat, lng, radius = 80 } = req.query;
  const items = [];

  if (lat && lng) {
    const uLat = parseFloat(lat);
    const uLng = parseFloat(lng);
    const r    = parseFloat(radius);

    // Community hazards
    const hazards = readHazards();
    hazards.forEach(h => {
      const dist = haversineKm(uLat, uLng, h.lat, h.lng);
      if (dist > r) return;
      const net = h.upvotes - h.downvotes;
      items.push({
        id: `hazard-${h.id}`,
        source: 'community',
        type: h.type,
        severity: net > 5 ? 'high' : net > 1 ? 'medium' : 'low',
        title: h.type,
        detail: h.description || `Community-reported ${h.type.toLowerCase()}`,
        distanceKm: Math.round(dist * 10) / 10,
        lat: h.lat,
        lng: h.lng,
        timestamp: h.createdAt,
        votes: net,
        hazardId: h.id,
      });
    });
  }

  items.sort((a, b) => a.distanceKm - b.distanceKm);
  res.json(items);
});

// ── Live Route Share ("Track My Drive") ──────────────────────────────────────

// POST /api/live-route — create a share session
app.post('/api/live-route', (req, res) => {
  const { clientId, from, to, centerLat, centerLng, ssi } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const now = new Date();
  const route = {
    id: crypto.randomUUID(),
    clientId,
    from: (from || 'Start').slice(0, 80),
    to: (to || 'Destination').slice(0, 80),
    centerLat: parseFloat(centerLat) || 0,
    centerLng: parseFloat(centerLng) || 0,
    lat: parseFloat(centerLat) || 0,
    lng: parseFloat(centerLng) || 0,
    ssi: parseInt(ssi, 10) || 0,
    isActive: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + LIVE_ROUTE_TTL).toISOString(),
  };

  const routes = readLiveRoutes();
  // Deactivate any existing route for this clientId
  routes.forEach(r => { if (r.clientId === clientId) r.isActive = false; });
  routes.push(route);
  writeLiveRoutes(routes);

  res.status(201).json({ id: route.id, expiresAt: route.expiresAt });
});

// PUT /api/live-route/:id — update position + SSI
app.put('/api/live-route/:id', (req, res) => {
  const { clientId, lat, lng, ssi } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const all = readLiveRoutes();
  // Need to read ALL (including expired) to do a proper update
  let allRaw;
  try {
    allRaw = fs.existsSync(LIVE_ROUTES_FILE)
      ? JSON.parse(fs.readFileSync(LIVE_ROUTES_FILE, 'utf8'))
      : [];
  } catch { allRaw = []; }

  const idx = allRaw.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (allRaw[idx].clientId !== clientId) return res.status(403).json({ error: 'Forbidden' });

  allRaw[idx].lat = parseFloat(lat) || allRaw[idx].lat;
  allRaw[idx].lng = parseFloat(lng) || allRaw[idx].lng;
  allRaw[idx].ssi = parseInt(ssi, 10) || allRaw[idx].ssi;
  allRaw[idx].updatedAt = new Date().toISOString();

  fs.writeFileSync(LIVE_ROUTES_FILE, JSON.stringify(allRaw, null, 2));
  res.json({ ok: true });
});

// GET /api/live-route/:id — public viewer (no auth, returns sanitized data)
app.get('/api/live-route/:id', (req, res) => {
  let allRaw;
  try {
    allRaw = fs.existsSync(LIVE_ROUTES_FILE)
      ? JSON.parse(fs.readFileSync(LIVE_ROUTES_FILE, 'utf8'))
      : [];
  } catch { allRaw = []; }

  const route = allRaw.find(r => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: 'Not found' });
  if (!route.isActive) return res.status(410).json({ error: 'Share ended' });
  if (new Date(route.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Share expired' });
  }

  // Return public-safe subset (no clientId)
  res.json({
    id: route.id,
    from: route.from,
    to: route.to,
    lat: route.lat,
    lng: route.lng,
    ssi: route.ssi,
    updatedAt: route.updatedAt,
    expiresAt: route.expiresAt,
  });
});

// DELETE /api/live-route/:id — end a share session
app.delete('/api/live-route/:id', (req, res) => {
  const { clientId } = req.body;
  let allRaw;
  try {
    allRaw = fs.existsSync(LIVE_ROUTES_FILE)
      ? JSON.parse(fs.readFileSync(LIVE_ROUTES_FILE, 'utf8'))
      : [];
  } catch { allRaw = []; }

  const idx = allRaw.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (allRaw[idx].clientId !== clientId) return res.status(403).json({ error: 'Forbidden' });

  allRaw[idx].isActive = false;
  fs.writeFileSync(LIVE_ROUTES_FILE, JSON.stringify(allRaw, null, 2));
  res.json({ ok: true });
});

// ── Share Card Endpoint ────────────────────────────────────────────────────────
app.post('/api/share-card', async (req, res) => {
  if (!createCanvas) {
    return res.status(503).json({ error: 'canvas not available' });
  }

  const {
    from, to, ssi, category, hazardType, traction,
    distance, duration, centerLng, centerLat,
    format = 'og',  // 'og' (1200×630) or 'stories' (1080×1920)
  } = req.body;

  const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
  const isStories = format === 'stories';
  const W = isStories ? 1080 : 1200;
  const H = isStories ? 1920 : 630;
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

  // Map overlay (position depends on format)
  if (mapboxToken && centerLng != null && centerLat != null) {
    try {
      if (isStories) {
        // Stories: full-bleed map in bottom 60% of canvas
        const mapH = Math.round(H * 0.55);
        const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${centerLng},${centerLat},12/${W}x${mapH}@2x?access_token=${mapboxToken}`;
        const mapImg = await loadImage(mapUrl);
        const mapY = H - mapH;
        ctx.drawImage(mapImg, 0, mapY, W, mapH);
        // Fade map into dark at top
        const fadeGrad = ctx.createLinearGradient(0, mapY, 0, mapY + mapH * 0.45);
        fadeGrad.addColorStop(0, 'rgba(10,10,14,1)');
        fadeGrad.addColorStop(1, 'rgba(10,10,14,0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, mapY, W, mapH);
      } else {
        // OG: right-panel map
        const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${centerLng},${centerLat},12/800x630@2x?access_token=${mapboxToken}`;
        const mapImg = await loadImage(mapUrl);
        ctx.drawImage(mapImg, 400, 0, 800, 630);
        const fadeGrad = ctx.createLinearGradient(400, 0, 850, 0);
        fadeGrad.addColorStop(0, 'rgba(10,10,14,1)');
        fadeGrad.addColorStop(0.45, 'rgba(10,10,14,0.4)');
        fadeGrad.addColorStop(1, 'rgba(10,10,14,0.0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(400, 0, 800, 630);
      }
    } catch (e) {
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0a0a0e');
      bgGrad.addColorStop(1, '#0d1a26');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── Stories-format layout (early return after drawing) ──────────────────────
  if (isStories) {
    // Centered SSI ring
    const cx = W / 2, cy = 560, r = 130;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 14; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (ssiNum / 100) * Math.PI * 2);
    ctx.strokeStyle = ssiColor; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();

    // Score label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ssiNum, cx, cy + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('SAFETY SCORE', cx, cy + 68);

    // Category pill
    ctx.fillStyle = ssiColor + '28';
    _roundRect(ctx, cx - 80, cy + 90, 160, 40, 20);
    ctx.fill();
    ctx.fillStyle = ssiColor;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText((category || 'OPTIMAL').toUpperCase(), cx, cy + 116);

    // Route label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('TO', cx, cy + 185);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.fillText((to || 'Destination').substring(0, 20), cx, cy + 230);

    // Stats
    const storyStats = [];
    if (distance) storyStats.push({ l: 'DISTANCE', v: `${(distance / 1609.34).toFixed(1)} mi` });
    if (duration) storyStats.push({ l: 'ETA', v: `${Math.round(duration / 60)} min` });
    if (traction != null) storyStats.push({ l: 'TRACTION', v: `${traction}%` });
    const statY = cy + 300;
    const statSpacing = W / (storyStats.length + 1);
    storyStats.forEach(({ l, v }, i) => {
      const sx = statSpacing * (i + 1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText(v, sx, statY);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(l, sx, statY + 28);
    });

    // Header — SWERVE logo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('SWERVE', W / 2, 110);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('WEATHER INTELLIGENCE NAVIGATION', W / 2, 148);

    // Accent bar (left edge)
    const sBar = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    sBar.addColorStop(0, ssiColor);
    sBar.addColorStop(1, ssiColor + '00');
    ctx.fillStyle = sBar;
    ctx.fillRect(0, 0, 5, H * 0.5);

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Download Swerve — check your SSI before every drive', W / 2, H - 48);

    res.set('Content-Type', 'image/png');
    return res.send(Buffer.from(await canvas.encode('png')));
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

// ── HERE Traffic Incidents Proxy ──────────────────────────────────────────────
// Key is NEVER sent to the client — all HERE requests go through this proxy.

app.get('/api/here/incidents', async (req, res) => {
  const KEY = process.env.HERE_API_KEY;

  if (!KEY) {
    // Graceful degradation — client treats 503 as "no HERE configured"
    return res.status(503).json({ error: 'HERE_API_KEY not configured', results: [] });
  }

  const { bbox } = req.query;
  if (!bbox) {
    return res.status(400).json({ error: 'bbox query parameter required (west,south,east,north)' });
  }

  try {
    const url =
      `https://data.traffic.hereapi.com/v7/incidents` +
      `?in=bbox:${encodeURIComponent(bbox)}` +
      `&locationReferencing=shape` +
      `&apiKey=${KEY}`;

    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text();
      console.error(`[HERE proxy] HTTP ${r.status}: ${body.slice(0, 200)}`);
      return res.status(r.status).json({ error: `HERE API error ${r.status}` });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('[HERE proxy] fetch error:', err.message);
    res.status(502).json({ error: 'Failed to fetch HERE incidents' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Swerve Server] Running on port ${PORT}`);
  console.log('[Swerve Server] Share card endpoint: POST /api/share-card');
});
