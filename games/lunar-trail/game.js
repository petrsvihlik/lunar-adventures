// === Lunar Trail ===
// Trace a winding path from Earth to a planet with your finger.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const destEl = document.getElementById('destination');

let W = 0, H = 0, DPR = 1;
const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);

const PLANETS = [
  { name: 'Mercury', sizeRel: 0.75, palette: ['#e8d8c0', '#a89070', '#6a4f30'], style: 'cratered' },
  { name: 'Venus',   sizeRel: 0.95, palette: ['#fff0c8', '#e8b06a', '#a85820'], style: 'cloudy'   },
  { name: 'Mars',    sizeRel: 0.85, palette: ['#ffb088', '#d35040', '#7a2818'], style: 'mars'     },
  { name: 'Jupiter', sizeRel: 1.5,  palette: ['#fff0d0', '#d8a070', '#8a4828'], style: 'jupiter'  },
  { name: 'Saturn',  sizeRel: 1.3,  palette: ['#ffe8b8', '#d8b070', '#a07840'], style: 'saturn'   },
  { name: 'Uranus',  sizeRel: 1.1,  palette: ['#d0f0ff', '#88d0e8', '#487aa0'], style: 'icy'      },
  { name: 'Neptune', sizeRel: 1.05, palette: ['#a0c0ff', '#5878d8', '#1a30a0'], style: 'neptune'  },
];

let planetIdx = -1;
let lastPlanetIdx = -1;
let controlPtsNorm = []; // normalized [0..1] coords
let pathPoints = [];     // {x, y, t} in pixel space, t is arc-length [0..1]
let earthRPx = 0;
let planetRPx = 0;
let checkpoints = [];    // {t, hit}
let progress = 0;
let arrived = false;
let arrivedFrame = 0;
let pointerDown = false;
let pointerPos = null;
let activePointerId = null;
let started = false;
let frame = 0;
const trail = [];
const particles = [];

function pickPlanet() {
  if (PLANETS.length <= 1) return 0;
  let n;
  do { n = Math.floor(Math.random() * PLANETS.length); } while (n === lastPlanetIdx);
  return n;
}

function makeControlPoints() {
  // Earth always at index 0, planet at last index.
  // We pick start/end corners and zigzag through 2 mid control points.
  const portrait = H > W;
  const rand = (a, b) => a + Math.random() * (b - a);
  if (portrait) {
    return [
      { x: rand(0.20, 0.36), y: 0.84 },
      { x: rand(0.55, 0.85), y: rand(0.58, 0.70) },
      { x: rand(0.15, 0.45), y: rand(0.32, 0.48) },
      { x: rand(0.55, 0.80), y: 0.16 },
    ];
  }
  return [
    { x: 0.12, y: rand(0.40, 0.65) },
    { x: rand(0.32, 0.42), y: rand(0.18, 0.38) },
    { x: rand(0.58, 0.68), y: rand(0.62, 0.82) },
    { x: 0.88, y: rand(0.30, 0.60) },
  ];
}

function newGame() {
  planetIdx = pickPlanet();
  lastPlanetIdx = planetIdx;
  controlPtsNorm = makeControlPoints();
  progress = 0;
  arrived = false;
  pointerDown = false;
  pointerPos = null;
  activePointerId = null;
  trail.length = 0;
  checkpoints = [0.25, 0.5, 0.75].map(t => ({ t, hit: false }));
  destEl.textContent = PLANETS[planetIdx].name;
  rebuildPath();
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) +
              (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function rebuildPath() {
  if (!controlPtsNorm.length) return;
  // Convert normalized control points to pixel space.
  const pts = controlPtsNorm.map(p => ({ x: p.x * W, y: p.y * H }));
  const samples = [];
  const perSeg = 50;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const last = (i === pts.length - 2) ? perSeg : perSeg - 1;
    for (let j = 0; j <= last; j++) {
      const t = j / perSeg;
      samples.push(catmull(p0, p1, p2, p3, t));
    }
  }
  let total = 0;
  samples[0].len = 0;
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    total += Math.hypot(dx, dy);
    samples[i].len = total;
  }
  for (const s of samples) s.t = total > 0 ? s.len / total : 0;
  pathPoints = samples;

  // Sizes
  const baseR = Math.min(W, H) * 0.07;
  earthRPx = Math.max(28, baseR);
  planetRPx = Math.max(28, baseR * PLANETS[planetIdx].sizeRel);
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  Lunar.sky.rebuildSky(sky, W, H);
  rebuildPath();
}

resize();
window.addEventListener('resize', resize);
newGame();

function startGame() {
  if (started) return;
  started = true;
  titleEl.classList.add('hidden');
  hudEl.hidden = false;
  Lunar.audio.ensureAudio();
  Lunar.audio.startAmbient();
}

canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault());

canvas.addEventListener('pointerdown', e => {
  Lunar.audio.ensureAudio();
  if (!started) startGame();

  if (arrived) {
    if (frame - arrivedFrame > 40) newGame();
    return;
  }

  pointerDown = true;
  pointerPos = { x: e.clientX, y: e.clientY };
  activePointerId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});

canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== activePointerId) return;
  pointerPos = { x: e.clientX, y: e.clientY };
});

function endPointer(e) {
  if (e && e.pointerId !== activePointerId) return;
  pointerDown = false;
  pointerPos = null;
  activePointerId = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function lunaPosAt(t) {
  if (!pathPoints.length) return { x: 0, y: 0 };
  if (t <= 0) return pathPoints[0];
  if (t >= 1) return pathPoints[pathPoints.length - 1];
  // Linear search — pathPoints is small.
  for (let i = 1; i < pathPoints.length; i++) {
    if (pathPoints[i].t >= t) {
      const a = pathPoints[i - 1], b = pathPoints[i];
      const f = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
  }
  return pathPoints[pathPoints.length - 1];
}

function tangentAt(t) {
  // Sample slightly before and after for direction.
  const dt = 0.012;
  const a = lunaPosAt(Math.max(0, t - dt));
  const b = lunaPosAt(Math.min(1, t + dt));
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function update() {
  frame++;

  if (pointerDown && pointerPos && !arrived) {
    const hitR = Math.max(70, Math.min(W, H) * 0.13);
    const maxStep = 0.045;
    let bestD = Infinity;
    let bestT = progress;
    for (const p of pathPoints) {
      if (p.t < progress - 0.005) continue;
      if (p.t > progress + maxStep) break;
      const d = Math.hypot(p.x - pointerPos.x, p.y - pointerPos.y);
      if (d < bestD) { bestD = d; bestT = p.t; }
    }
    if (bestD < hitR && bestT > progress) {
      progress = Math.min(1, bestT);
    }
  }

  // Checkpoint chimes
  for (const cp of checkpoints) {
    if (!cp.hit && progress >= cp.t) {
      cp.hit = true;
      const p = lunaPosAt(cp.t);
      Lunar.audio.playChime(Lunar.NOTES[Math.floor(cp.t * 4)] || 660, 0.16);
      Lunar.draw.makeParticleBurst(particles, p.x, p.y, ['#fff8c8', '#ffe6a8'], 10);
    }
  }

  // Arrival
  if (!arrived && progress >= 1) {
    arrived = true;
    arrivedFrame = frame;
    const last = pathPoints[pathPoints.length - 1];
    setTimeout(() => {
      Lunar.audio.playCelebration();
      Lunar.draw.makeParticleBurst(particles, last.x, last.y,
        ['#fff8c8', '#ffe6a8', PLANETS[planetIdx].palette[0]], 52);
    }, 200);
  }

  // Trail
  const luna = lunaPosAt(progress);
  if (pointerDown && !arrived) {
    if (!trail.length || Math.hypot(luna.x - trail[0].x, luna.y - trail[0].y) > 2) {
      trail.unshift({ x: luna.x, y: luna.y, life: 1 });
    }
  }
  for (const t of trail) t.life -= 0.03;
  while (trail.length && trail[trail.length - 1].life <= 0) trail.pop();
  if (trail.length > 35) trail.length = 35;

  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

// ---------- Planet drawing ----------
function sphereGradient(x, y, r, palette) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, palette[0]);
  g.addColorStop(0.65, palette[1]);
  g.addColorStop(1, palette[2]);
  return g;
}

function drawHalo(x, y, r, color, alpha = 0.4) {
  const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.7);
  g.addColorStop(0, Lunar.draw.hexA(color, alpha));
  g.addColorStop(1, Lunar.draw.hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawShine(x, y, r) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(x - r * 0.4, y - r * 0.5, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawEarth(x, y, r) {
  const palette = ['#a8d8ff', '#5078d0', '#16308a'];
  drawHalo(x, y, r, '#88c8ff', 0.45);
  ctx.fillStyle = sphereGradient(x, y, r, palette);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Continents (static)
  ctx.fillStyle = '#5da050';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.4, r * 0.28, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.2, r * 0.32, r * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dc070';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y - r * 0.45, r * 0.22, r * 0.12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - r * 0.45, y + r * 0.4, r * 0.18, r * 0.1, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Cloud wisps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, y - r * 0.55, r * 0.45, r * 0.1, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.35, y + r * 0.45, r * 0.35, r * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  drawShine(x, y, r);

  // Outer rim
  ctx.strokeStyle = 'rgba(168, 216, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCratered(x, y, r) {
  ctx.fillStyle = 'rgba(60, 45, 30, 0.42)';
  const craters = [
    [-0.32, -0.18, 0.18], [0.28, 0.08, 0.14], [-0.08, 0.32, 0.10],
    [0.18, -0.36, 0.09],  [-0.42, 0.22, 0.07], [0.42, -0.14, 0.06],
    [-0.18, -0.5, 0.05],
  ];
  for (const [dx, dy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloudySwirls(x, y, r) {
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.42)';
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const yo = i * r * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - r, y + yo);
    ctx.bezierCurveTo(x - r * 0.3, y + yo - r * 0.12, x + r * 0.3, y + yo + r * 0.12, x + r, y + yo);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 245, 220, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.45, r * 0.35, r * 0.1, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMarsFeatures(x, y, r) {
  ctx.fillStyle = 'rgba(110, 40, 25, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.18, y, r * 0.42, r * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.32, r * 0.26, r * 0.13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Polar caps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.82, r * 0.5, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.82, r * 0.42, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBands(x, y, r, palette, withSpot = false) {
  const bands = [
    { yo: -0.7, h: 0.22, c: Lunar.draw.hexA(palette[2], 0.38) },
    { yo: -0.4, h: 0.18, c: Lunar.draw.hexA(palette[0], 0.28) },
    { yo: -0.1, h: 0.22, c: Lunar.draw.hexA(palette[2], 0.42) },
    { yo:  0.2, h: 0.18, c: Lunar.draw.hexA(palette[0], 0.32) },
    { yo:  0.48, h: 0.20, c: Lunar.draw.hexA(palette[2], 0.4) },
  ];
  for (const b of bands) {
    ctx.fillStyle = b.c;
    ctx.fillRect(x - r, y + b.yo * r, 2 * r, b.h * r);
  }
  if (withSpot) {
    ctx.fillStyle = 'rgba(180, 60, 40, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.18, y + r * 0.05, r * 0.22, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 110, 80, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.18, y + r * 0.05, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIcy(x, y, r) {
  ctx.fillStyle = 'rgba(180, 220, 240, 0.35)';
  ctx.fillRect(x - r, y - r * 0.25, 2 * r, r * 0.12);
  ctx.fillRect(x - r, y + r * 0.3, 2 * r, r * 0.08);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.5, r * 0.4, r * 0.1, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeptune(x, y, r, palette) {
  drawBands(x, y, r, palette, false);
  // dark spot
  ctx.fillStyle = 'rgba(20, 30, 100, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.15, y - r * 0.2, r * 0.2, r * 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlanetBody(x, y, r, planet) {
  ctx.fillStyle = sphereGradient(x, y, r, planet.palette);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  switch (planet.style) {
    case 'cratered': drawCratered(x, y, r); break;
    case 'cloudy':   drawCloudySwirls(x, y, r); break;
    case 'mars':     drawMarsFeatures(x, y, r); break;
    case 'jupiter':  drawBands(x, y, r, planet.palette, true); break;
    case 'saturn':   drawBands(x, y, r, planet.palette, false); break;
    case 'icy':      drawIcy(x, y, r); break;
    case 'neptune':  drawNeptune(x, y, r, planet.palette); break;
  }
  ctx.restore();
  drawShine(x, y, r);

  ctx.strokeStyle = Lunar.draw.hexA(planet.palette[0], 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlanet(x, y, r, planet, pulse = 0) {
  // Halo
  drawHalo(x, y, r * (1 + pulse * 0.1), planet.palette[1], 0.4 + pulse * 0.2);

  if (planet.style === 'saturn') {
    // Back half of ring
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.32);
    ctx.strokeStyle = 'rgba(230, 200, 140, 0.85)';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180, 150, 100, 0.55)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.95, r * 0.55, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawPlanetBody(x, y, r, planet);

    // Front half of ring
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.32);
    ctx.strokeStyle = 'rgba(240, 215, 160, 0.95)';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 170, 120, 0.75)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.95, r * 0.55, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  } else {
    drawPlanetBody(x, y, r, planet);
  }
}

// ---------- Spaceship ----------
function drawShipTrail(trail) {
  for (const t of trail) {
    const a = t.life;
    // Warm exhaust glow
    const halo = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 12 * a + 3);
    halo.addColorStop(0, `rgba(255, 230, 140, ${a * 0.55})`);
    halo.addColorStop(0.5, `rgba(255, 150, 90, ${a * 0.35})`);
    halo.addColorStop(1, 'rgba(255, 100, 60, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 12 * a + 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpaceship(x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Aura
  const auraR = size * 1.8;
  const aura = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, auraR);
  aura.addColorStop(0, 'rgba(255, 230, 168, 0.35)');
  aura.addColorStop(1, 'rgba(255, 230, 168, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Flame exhaust (behind the ship, flickering)
  const flick = (Math.sin(frame * 0.7) + Math.sin(frame * 1.3)) * 0.5;
  const flameLen = size * (1.5 + flick * 0.3);
  const flameW = size * 0.55;
  const grad = ctx.createLinearGradient(-size * 0.75, 0, -size * 0.75 - flameLen, 0);
  grad.addColorStop(0, 'rgba(255, 245, 200, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 180, 80, 0.85)');
  grad.addColorStop(0.75, 'rgba(255, 100, 60, 0.45)');
  grad.addColorStop(1, 'rgba(255, 80, 50, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-size * 0.75, -flameW * 0.5);
  ctx.quadraticCurveTo(-size * 0.75 - flameLen * 0.7, -flameW * 0.2,
                       -size * 0.75 - flameLen,        0);
  ctx.quadraticCurveTo(-size * 0.75 - flameLen * 0.7,  flameW * 0.2,
                       -size * 0.75,                   flameW * 0.5);
  ctx.closePath();
  ctx.fill();

  // Inner bright core flame
  const coreLen = flameLen * 0.55;
  const coreW = flameW * 0.55;
  const core = ctx.createLinearGradient(-size * 0.75, 0, -size * 0.75 - coreLen, 0);
  core.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
  core.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(-size * 0.75, -coreW * 0.5);
  ctx.quadraticCurveTo(-size * 0.75 - coreLen * 0.7, 0,
                       -size * 0.75 - coreLen,       0);
  ctx.quadraticCurveTo(-size * 0.75 - coreLen * 0.7, 0,
                       -size * 0.75,                 coreW * 0.5);
  ctx.closePath();
  ctx.fill();

  // Fins (top + bottom at tail)
  ctx.fillStyle = '#c75c8c';
  ctx.beginPath();
  ctx.moveTo(-size * 0.45, -size * 0.35);
  ctx.lineTo(-size * 0.90, -size * 0.78);
  ctx.lineTo(-size * 0.45, -size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-size * 0.45,  size * 0.35);
  ctx.lineTo(-size * 0.90,  size * 0.78);
  ctx.lineTo(-size * 0.45,  size * 0.55);
  ctx.closePath();
  ctx.fill();

  // Body — rocket with rounded tail, pointed nose at +X
  const body = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  body.addColorStop(0, '#fff5d6');
  body.addColorStop(0.5, '#ffe6f5');
  body.addColorStop(1, '#c5a8ff');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-size * 0.75, -size * 0.4);
  ctx.lineTo( size * 0.35, -size * 0.45);
  ctx.quadraticCurveTo(size * 1.05, -size * 0.22, size * 1.18, 0);
  ctx.quadraticCurveTo(size * 1.05,  size * 0.22, size * 0.35,  size * 0.45);
  ctx.lineTo(-size * 0.75,  size * 0.4);
  ctx.quadraticCurveTo(-size * 0.95, 0, -size * 0.75, -size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 230, 168, 0.8)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Pink stripe band near the tail
  ctx.fillStyle = '#ff8fcf';
  ctx.fillRect(-size * 0.65, -size * 0.42, size * 0.18, size * 0.84);
  ctx.fillStyle = 'rgba(255, 200, 230, 0.7)';
  ctx.fillRect(-size * 0.65, -size * 0.42, size * 0.18, size * 0.15);

  // Porthole window
  ctx.fillStyle = '#1a2a6a';
  ctx.beginPath();
  ctx.arc(size * 0.32, 0, size * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#88c8ff';
  ctx.beginPath();
  ctx.arc(size * 0.32, 0, size * 0.20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffe6a8';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(size * 0.32, 0, size * 0.23, 0, Math.PI * 2);
  ctx.stroke();
  // window shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(size * 0.26, -size * 0.08, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Nose-tip highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(size * 0.85, -size * 0.1, size * 0.18, size * 0.07, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------- Path drawing ----------
function drawPath() {
  if (!pathPoints.length) return;
  // Untravelled portion: dashed faint
  ctx.save();
  ctx.setLineDash([8, 12]);
  ctx.lineDashOffset = -frame * 0.4;
  ctx.strokeStyle = 'rgba(255, 230, 168, 0.32)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  let started = false;
  for (const p of pathPoints) {
    if (p.t < progress) continue;
    if (!started) { ctx.moveTo(p.x, p.y); started = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  // Travelled portion: solid glow
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.95)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 230, 168, 0.9)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  let started2 = false;
  for (const p of pathPoints) {
    if (p.t > progress) {
      // Add the exact progress point for smooth end
      const tip = lunaPosAt(progress);
      if (started2) ctx.lineTo(tip.x, tip.y);
      break;
    }
    if (!started2) { ctx.moveTo(p.x, p.y); started2 = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  // Checkpoints
  for (const cp of checkpoints) {
    const p = lunaPosAt(cp.t);
    const r = cp.hit ? 4 : 6 + Math.sin(frame * 0.08 + cp.t * 10) * 1.5;
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
    halo.addColorStop(0, `rgba(255, 248, 200, ${cp.hit ? 0.25 : 0.6})`);
    halo.addColorStop(1, 'rgba(255, 248, 200, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (!cp.hit) {
      ctx.fillStyle = '#fff8c8';
      Lunar.draw.drawStar(ctx, p.x, p.y, r * 0.4, r);
    }
  }
}

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  const earth = pathPoints[0];
  const planet = pathPoints[pathPoints.length - 1];

  // Path
  drawPath();

  // Earth (start)
  drawEarth(earth.x, earth.y, earthRPx);
  // Pulse around Earth before the game starts moving
  if (progress < 0.02) {
    const pulse = (Math.sin(frame * 0.08) + 1) / 2;
    ctx.strokeStyle = `rgba(168, 216, 255, ${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(earth.x, earth.y, earthRPx + 8 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Destination planet
  const pulse = arrived ? Math.min(1, (frame - arrivedFrame) / 18) : 0;
  drawPlanet(planet.x, planet.y, planetRPx, PLANETS[planetIdx], pulse);

  // Spaceship
  if (progress > 0.001 || pointerDown) {
    drawShipTrail(trail);
    const ship = lunaPosAt(progress);
    const angle = tangentAt(progress);
    const shipSize = Math.max(18, Math.min(W, H) * 0.045);
    drawSpaceship(ship.x, ship.y, angle, shipSize);
  }

  Lunar.draw.drawParticles(ctx, particles);

  // "Destination" label at start
  if (!arrived) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelX = planet.x;
    const labelY = planet.y + planetRPx + 26;
    ctx.fillStyle = 'rgba(10, 10, 50, 0.55)';
    ctx.font = `bold ${Math.max(14, Math.min(W, H) * 0.022)}px 'Comic Sans MS', sans-serif`;
    const txt = PLANETS[planetIdx].name;
    const tw = ctx.measureText(txt).width + 22;
    ctx.fillRect(labelX - tw / 2, labelY - 14, tw, 26);
    ctx.fillStyle = '#ffe6a8';
    ctx.fillText(txt, labelX, labelY);
  }

  // Arrival banner
  if (arrived && frame - arrivedFrame > 10) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 10, 50, 0.55)';
    const bandH = Math.max(80, H * 0.13);
    ctx.fillRect(0, H * 0.42, W, bandH);
    ctx.fillStyle = '#ffe6a8';
    ctx.font = `bold ${Math.max(28, Math.min(W, H) * 0.06)}px 'Comic Sans MS', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`Welcome to ${PLANETS[planetIdx].name}!`, W / 2, H * 0.42 + bandH / 2 - 10);
    ctx.font = `${Math.max(14, Math.min(W, H) * 0.025)}px 'Comic Sans MS', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Tap to fly to another planet', W / 2, H * 0.42 + bandH / 2 + 22);
  }
}

let lastT = performance.now();
function loop(t) {
  lastT = t;
  update();
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../sw.js').catch(() => {});
  });
}
