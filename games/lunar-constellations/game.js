// === Lunar Constellations ===
// Connect numbered stars in order to reveal a constellation shape.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const counterEl = document.getElementById('counter');

let W = 0, H = 0, DPR = 1;
const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);

// Each constellation: closed-loop outline in normalized 0..1 coords inside a square fit-area.
// `tint` colors the revealed silhouette glow.
const CONSTELLATIONS = [
  {
    name: 'Fish',
    points: [
      [0.05, 0.50], // mouth tip
      [0.25, 0.36], // upper head
      [0.42, 0.10], // dorsal fin tip
      [0.62, 0.32], // upper back
      [0.95, 0.16], // tail upper tip
      [0.80, 0.50], // tail notch
      [0.95, 0.84], // tail lower tip
      [0.62, 0.68], // lower back
      [0.42, 0.92], // anal fin tip
      [0.25, 0.64], // lower head
    ],
    tint: '#a8d8ff',
  },
  {
    name: 'Heart',
    points: [
      [0.50, 0.32], // top notch
      [0.30, 0.18], // left lobe top
      [0.14, 0.40], // left side
      [0.50, 0.86], // bottom point
      [0.86, 0.40], // right side
      [0.70, 0.18], // right lobe top
    ],
    tint: '#ffb3d1',
  },
  {
    name: 'Bunny',
    points: [
      [0.30, 0.10], // left ear tip
      [0.36, 0.42], // left ear base
      [0.22, 0.58], // left cheek
      [0.50, 0.88], // chin
      [0.78, 0.58], // right cheek
      [0.64, 0.42], // right ear base
      [0.70, 0.10], // right ear tip
      [0.50, 0.48], // valley between ears
    ],
    tint: '#fff5d6',
  },
  {
    name: 'Kitty',
    points: [
      [0.30, 0.16], // left ear tip
      [0.40, 0.34], // left ear base
      [0.50, 0.30], // forehead notch
      [0.60, 0.34], // right ear base
      [0.70, 0.16], // right ear tip
      [0.82, 0.60], // right side
      [0.62, 0.88], // bottom right
      [0.38, 0.88], // bottom left
      [0.18, 0.60], // left side
    ],
    tint: '#c5a8ff',
  },
  {
    name: 'Star',
    points: [
      [0.50, 0.05], // top tip
      [0.61, 0.35], // upper-right inner
      [0.93, 0.36], // upper-right tip
      [0.67, 0.56], // lower-right inner
      [0.76, 0.86], // lower-right tip
      [0.50, 0.68], // bottom inner
      [0.24, 0.86], // lower-left tip
      [0.33, 0.56], // lower-left inner
      [0.07, 0.36], // upper-left tip
      [0.39, 0.35], // upper-left inner
    ],
    tint: '#ffe6a8',
  },
  {
    name: 'Flower',
    points: [
      [0.50, 0.10], // top petal
      [0.63, 0.32], // valley
      [0.88, 0.38], // right-upper petal
      [0.71, 0.57], // valley
      [0.74, 0.82], // right-lower petal
      [0.50, 0.72], // valley
      [0.26, 0.82], // left-lower petal
      [0.29, 0.57], // valley
      [0.12, 0.38], // left-upper petal
      [0.37, 0.32], // valley
    ],
    tint: '#ffb3d1',
  },
  {
    name: 'Butterfly',
    points: [
      [0.10, 0.20], // top-left wing tip
      [0.10, 0.80], // bottom-left wing tip
      [0.50, 0.62], // body waist
      [0.90, 0.80], // bottom-right wing tip
      [0.90, 0.20], // top-right wing tip
      [0.50, 0.38], // body neck
    ],
    tint: '#a8ffc8',
  },
  {
    name: 'Sailboat',
    points: [
      [0.50, 0.08], // sail peak
      [0.80, 0.56], // sail bottom-right
      [0.92, 0.60], // deck right
      [0.78, 0.90], // hull bottom-right
      [0.22, 0.90], // hull bottom-left
      [0.08, 0.60], // deck left
      [0.20, 0.56], // sail bottom-left
    ],
    tint: '#a8d8ff',
  },
  {
    name: 'House',
    points: [
      [0.50, 0.08], // roof peak
      [0.86, 0.42], // right eave
      [0.86, 0.90], // bottom right
      [0.14, 0.90], // bottom left
      [0.14, 0.42], // left eave
    ],
    tint: '#ff9b6f',
  },
  {
    name: 'Rainbow',
    points: [
      [0.05, 0.85], // bottom-left outer
      [0.20, 0.30], // upper-left outer
      [0.50, 0.10], // top outer
      [0.80, 0.30], // upper-right outer
      [0.95, 0.85], // bottom-right outer
      [0.80, 0.85], // bottom-right inner
      [0.68, 0.38], // upper-right inner
      [0.50, 0.30], // top inner
      [0.32, 0.38], // upper-left inner
      [0.20, 0.85], // bottom-left inner
    ],
    tint: '#ff8fcf',
    special: 'rainbow',
  },
  {
    name: 'Unicorn',
    points: [
      [0.40, 0.06], // horn tip
      [0.44, 0.22], // horn base back
      [0.55, 0.18], // ear tip
      [0.86, 0.65], // mane back
      [0.78, 0.92], // lower neck back
      [0.48, 0.92], // lower neck front
      [0.32, 0.72], // throat
      [0.18, 0.62], // jaw
      [0.05, 0.50], // nose
      [0.28, 0.34], // nose bridge
    ],
    tint: '#ffd6f5',
  },
  {
    name: 'Teddy',
    points: [
      [0.22, 0.10], // left ear top
      [0.32, 0.20], // left ear inside valley
      [0.50, 0.16], // between ears (forehead)
      [0.68, 0.20], // right ear inside valley
      [0.78, 0.10], // right ear top
      [0.88, 0.36], // right side of head into shoulder
      [0.95, 0.55], // right paw
      [0.82, 0.92], // right foot
      [0.50, 0.86], // between legs
      [0.18, 0.92], // left foot
      [0.05, 0.55], // left paw
      [0.12, 0.36], // left side of head into shoulder
    ],
    tint: '#d8a878',
  },
  {
    name: 'Human',
    points: [
      [0.50, 0.08], // top of head
      [0.62, 0.16], // right side of head/neck
      [0.95, 0.40], // right hand
      [0.62, 0.55], // right armpit/waist
      [0.75, 0.95], // right foot
      [0.50, 0.82], // between feet
      [0.25, 0.95], // left foot
      [0.38, 0.55], // left armpit/waist
      [0.05, 0.40], // left hand
      [0.38, 0.16], // left side of head/neck
    ],
    tint: '#ffd8a8',
  },
];

let level = -1;
let stars = [];     // {x, y, r, baseR}
let stepIdx = 0;    // index of the next-to-connect star (0..N-1, equals N when closed)
let connected = []; // indices already connected, in order
let revealT = 0;    // 0..1 reveal animation
let solved = false;
let solvedFrame = 0;
let started = false;
let frame = 0;
let drawErrorShake = 0;
let errorStarIdx = -1;
const particles = [];

function pickNextLevel() {
  if (CONSTELLATIONS.length <= 1) return 0;
  let n;
  do { n = Math.floor(Math.random() * CONSTELLATIONS.length); } while (n === level);
  return n;
}

function newGame() {
  level = pickNextLevel();
  stepIdx = 0;
  connected = [];
  revealT = 0;
  solved = false;
  errorStarIdx = -1;
  drawErrorShake = 0;
  stars = CONSTELLATIONS[level].points.map(() => ({ x: 0, y: 0, r: 0, baseR: 0 }));
  layout();
  counterEl.textContent = '0';
}

let fitX = 0, fitY = 0, fitSize = 0;

function layout() {
  if (!stars.length) return;
  const portrait = H > W;
  const sideMargin = Math.max(40, Math.min(W, H) * 0.08);
  const topMargin = Math.max(110, H * 0.18);
  const bottomMargin = Math.max(80, H * 0.12);
  const availW = W - sideMargin * 2;
  const availH = H - topMargin - bottomMargin;
  const size = Math.min(availW, availH);
  const offsetX = (W - size) / 2;
  const offsetY = topMargin + (availH - size) / 2;
  fitX = offsetX;
  fitY = offsetY;
  fitSize = size;

  const baseR = Math.max(14, size * 0.038);
  const pts = CONSTELLATIONS[level].points;
  for (let i = 0; i < pts.length; i++) {
    stars[i].x = offsetX + pts[i][0] * size;
    stars[i].y = offsetY + pts[i][1] * size;
    stars[i].r = baseR;
    stars[i].baseR = baseR;
  }
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
  layout();
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

  if (solved) {
    if (frame - solvedFrame > 40) newGame();
    return;
  }

  const x = e.clientX, y = e.clientY;
  // Find tapped star (generous hit radius, prefer the expected next one if overlapping)
  const expected = stepIdx;
  const hitRadius = stars[0].baseR * 2.4;
  let tapped = -1;
  // First, accept the expected star if within radius
  if (Math.hypot(stars[expected].x - x, stars[expected].y - y) < hitRadius) {
    tapped = expected;
  } else {
    // Otherwise, find nearest star within range to give helpful "wrong star" feedback
    let bestD = Infinity;
    for (let i = 0; i < stars.length; i++) {
      const d = Math.hypot(stars[i].x - x, stars[i].y - y);
      if (d < hitRadius && d < bestD) {
        bestD = d;
        tapped = i;
      }
    }
  }

  if (tapped === -1) return;

  if (tapped === expected) {
    connected.push(tapped);
    stepIdx++;
    Lunar.audio.playChime(Lunar.NOTES[Math.min(connected.length - 1, Lunar.NOTES.length - 1)], 0.2);
    Lunar.draw.makeParticleBurst(particles, stars[tapped].x, stars[tapped].y,
      ['#fff8c8', '#ffe6a8', '#fff'], 12);
    counterEl.textContent = connected.length;

    if (stepIdx === stars.length) {
      // closing the loop
      solved = true;
      solvedFrame = frame;
      setTimeout(() => {
        Lunar.audio.playCelebration();
        const c = CONSTELLATIONS[level];
        const cx = stars.reduce((s, p) => s + p.x, 0) / stars.length;
        const cy = stars.reduce((s, p) => s + p.y, 0) / stars.length;
        if (c.special === 'rainbow') {
          for (const col of RAINBOW_COLORS) {
            Lunar.draw.makeParticleBurst(particles, cx, cy, ['#fff8c8', col, col], 8);
          }
        } else {
          Lunar.draw.makeParticleBurst(particles, cx, cy, ['#fff8c8', '#ffe6a8', c.tint], 44);
        }
      }, 250);
    }
  } else {
    errorStarIdx = tapped;
    drawErrorShake = 1;
    Lunar.audio.playBoing(false);
  }
});

function update() {
  frame++;
  if (drawErrorShake > 0) drawErrorShake -= 0.06;
  if (solved && revealT < 1) revealT = Math.min(1, revealT + 0.02);
  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

function drawConnection(a, b, alpha = 1) {
  const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  grad.addColorStop(0, `rgba(255, 245, 200, ${0.95 * alpha})`);
  grad.addColorStop(1, `rgba(255, 230, 168, ${0.85 * alpha})`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 230, 168, 0.85)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawNumber(x, y, n, color = 'rgba(20, 18, 60, 0.9)') {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(11, Math.min(W, H) * 0.018)}px 'Comic Sans MS', sans-serif`;
  ctx.fillText(String(n), x, y);
}

function drawTwinkleStar(x, y, r, opts) {
  const { glow = 0.5, color = '#fff8c8', pulse = 0, dim = false } = opts || {};
  const haloR = r * (3 + glow * 1.5);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
  halo.addColorStop(0, Lunar.draw.hexA(color, dim ? 0.18 : 0.55 + pulse * 0.25));
  halo.addColorStop(1, Lunar.draw.hexA(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, haloR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dim ? 'rgba(255, 248, 200, 0.55)' : color;
  Lunar.draw.drawStar(ctx, x, y, r * 0.4, r);

  if (!dim) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

const RAINBOW_COLORS = [
  '#ff5050', // red
  '#ff9b30', // orange
  '#ffe040', // yellow
  '#5ad55a', // green
  '#5090ff', // blue
  '#7050d0', // indigo
  '#c060e0', // violet
];

// Special fill for the Rainbow constellation:
// 10 stars = outer arc (idx 0..4) and inner arc (idx 5..9, reversed to pair with outer).
// We draw 7 concentric arch bands between them and stagger their reveal.
function drawRainbowFill(stars, revealT, frame) {
  const N = RAINBOW_COLORS.length;
  const outer = stars.slice(0, 5);
  const inner = [stars[9], stars[8], stars[7], stars[6], stars[5]];

  const pairLerp = (t) => outer.map((o, i) => ({
    x: o.x * (1 - t) + inner[i].x * t,
    y: o.y * (1 - t) + inner[i].y * t,
  }));

  for (let k = 0; k < N; k++) {
    // Stagger: outer band first, inner band last
    const tStart = k / (N + 1);
    const bandT = Math.max(0, Math.min(1, (revealT - tStart) * (N + 1)));
    if (bandT <= 0) continue;

    const top = pairLerp(k / N);
    const bot = pairLerp((k + 1) / N);

    ctx.beginPath();
    top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
    ctx.closePath();

    // Gentle shimmer once the band has fully appeared
    const baseA = 0.55 * bandT;
    const shimmer = bandT >= 1 ? Math.sin(frame * 0.05 + k * 0.7) * 0.12 : 0;
    ctx.shadowColor = RAINBOW_COLORS[k];
    ctx.shadowBlur = 28 * bandT;
    ctx.fillStyle = Lunar.draw.hexA(RAINBOW_COLORS[k], baseA + shimmer);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// Normalized-coord helpers (use after layout()).
const nx = (x) => fitX + x * fitSize;
const ny = (y) => fitY + y * fitSize;
const ns = (v) => v * fitSize;

function drawSmallEye(x, y, r) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1850';
  ctx.beginPath(); ctx.arc(x + r * 0.2, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fill();
}

function drawSmileArc(x, y, w, lineW, color = '#3a2a5a') {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, w, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawCloud(x, y, r, alpha = 0.85) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x - r * 0.65, y, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x, y - r * 0.30, r * 0.7, 0, Math.PI * 2);
  ctx.arc(x + r * 0.65, y, r * 0.55, 0, Math.PI * 2);
  ctx.arc(x, y + r * 0.20, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

// Shape-specific decorations drawn over the silhouette once it's revealed.
function drawAccents(c, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  switch (c.name) {
    case 'Fish': {
      // Eye
      drawSmallEye(nx(0.20), ny(0.44), ns(0.045));
      // Gill curve
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = ns(0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nx(0.32), ny(0.40));
      ctx.quadraticCurveTo(nx(0.36), ny(0.50), nx(0.32), ny(0.60));
      ctx.stroke();
      // Drifting bubble
      const bobT = (frame * 0.008) % 1;
      const bx = nx(-0.02 + Math.sin(frame * 0.04) * 0.02);
      const by = ny(0.46 - bobT * 0.35);
      ctx.globalAlpha = alpha * (1 - bobT);
      ctx.fillStyle = 'rgba(200, 230, 255, 0.85)';
      ctx.beginPath(); ctx.arc(bx, by, ns(0.022), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = ns(0.005);
      ctx.beginPath(); ctx.arc(bx, by, ns(0.022), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = alpha;
      break;
    }
    case 'Heart': {
      drawSmallEye(nx(0.40), ny(0.50), ns(0.05));
      drawSmallEye(nx(0.60), ny(0.50), ns(0.05));
      drawSmileArc(nx(0.50), ny(0.60), ns(0.10), ns(0.018));
      // Inner shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(nx(0.26), ny(0.34), ns(0.06), ns(0.04), -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'Bunny': {
      // Pink ear interiors
      ctx.fillStyle = 'rgba(255, 143, 207, 0.7)';
      ctx.beginPath(); ctx.ellipse(nx(0.32), ny(0.26), ns(0.04), ns(0.10), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(nx(0.68), ny(0.26), ns(0.04), ns(0.10), 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      drawSmallEye(nx(0.40), ny(0.60), ns(0.05));
      drawSmallEye(nx(0.60), ny(0.60), ns(0.05));
      // Nose
      ctx.fillStyle = '#ff8fcf';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.68));
      ctx.lineTo(nx(0.46), ny(0.72));
      ctx.lineTo(nx(0.54), ny(0.72));
      ctx.closePath();
      ctx.fill();
      // Smile
      drawSmileArc(nx(0.50), ny(0.74), ns(0.06), ns(0.012));
      // Whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = ns(0.008);
      ctx.beginPath();
      ctx.moveTo(nx(0.42), ny(0.72)); ctx.lineTo(nx(0.30), ny(0.70));
      ctx.moveTo(nx(0.42), ny(0.74)); ctx.lineTo(nx(0.30), ny(0.76));
      ctx.moveTo(nx(0.58), ny(0.72)); ctx.lineTo(nx(0.70), ny(0.70));
      ctx.moveTo(nx(0.58), ny(0.74)); ctx.lineTo(nx(0.70), ny(0.76));
      ctx.stroke();
      break;
    }
    case 'Kitty': {
      // Pink ear interiors
      ctx.fillStyle = 'rgba(255, 143, 207, 0.7)';
      ctx.beginPath();
      ctx.moveTo(nx(0.34), ny(0.22)); ctx.lineTo(nx(0.42), ny(0.32)); ctx.lineTo(nx(0.36), ny(0.34));
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(nx(0.66), ny(0.22)); ctx.lineTo(nx(0.58), ny(0.32)); ctx.lineTo(nx(0.64), ny(0.34));
      ctx.closePath(); ctx.fill();
      // Eyes (green pupils!)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(nx(0.40), ny(0.50), ns(0.05), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx(0.60), ny(0.50), ns(0.05), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5ad55a';
      ctx.beginPath(); ctx.ellipse(nx(0.41), ny(0.50), ns(0.012), ns(0.035), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(nx(0.61), ny(0.50), ns(0.012), ns(0.035), 0, 0, Math.PI * 2); ctx.fill();
      // Nose
      ctx.fillStyle = '#ff8fcf';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.58));
      ctx.lineTo(nx(0.46), ny(0.62));
      ctx.lineTo(nx(0.54), ny(0.62));
      ctx.closePath();
      ctx.fill();
      // Smile (two arcs under the nose)
      ctx.strokeStyle = '#3a2a5a';
      ctx.lineWidth = ns(0.012);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(nx(0.46), ny(0.66), ns(0.04), 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(nx(0.54), ny(0.66), ns(0.04), 0, Math.PI); ctx.stroke();
      // Whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = ns(0.008);
      ctx.beginPath();
      ctx.moveTo(nx(0.42), ny(0.60)); ctx.lineTo(nx(0.28), ny(0.58));
      ctx.moveTo(nx(0.42), ny(0.62)); ctx.lineTo(nx(0.28), ny(0.64));
      ctx.moveTo(nx(0.58), ny(0.60)); ctx.lineTo(nx(0.72), ny(0.58));
      ctx.moveTo(nx(0.58), ny(0.62)); ctx.lineTo(nx(0.72), ny(0.64));
      ctx.stroke();
      break;
    }
    case 'Star': {
      const cx = nx(0.5), cy = ny(0.5);
      const pulse = 0.85 + Math.sin(frame * 0.1) * 0.25;
      ctx.fillStyle = 'rgba(255, 245, 200, 0.85)';
      Lunar.draw.drawStar(ctx, cx, cy, ns(0.05) * pulse, ns(0.11) * pulse);
      ctx.fillStyle = '#fff';
      Lunar.draw.drawStar(ctx, cx, cy, ns(0.018), ns(0.05));
      // Twinkles around
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const sparkles = [[0.30, 0.30], [0.70, 0.30], [0.30, 0.65], [0.70, 0.65]];
      for (let i = 0; i < sparkles.length; i++) {
        const tw = 0.5 + Math.sin(frame * 0.12 + i * 1.7) * 0.5;
        if (tw > 0.3) {
          ctx.globalAlpha = alpha * tw;
          ctx.beginPath();
          ctx.arc(nx(sparkles[i][0]), ny(sparkles[i][1]), ns(0.012) * tw, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = alpha;
      break;
    }
    case 'Flower': {
      const cx = nx(0.50), cy = ny(0.50);
      ctx.fillStyle = '#ffe6a8';
      ctx.beginPath(); ctx.arc(cx, cy, ns(0.11), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffa86f';
      ctx.beginPath(); ctx.arc(cx, cy, ns(0.075), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a4818';
      for (let a = 0; a < 7; a++) {
        const ang = (a / 7) * Math.PI * 2;
        const rr = a === 0 ? 0 : ns(0.04);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, ns(0.013), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'Butterfly': {
      // Body
      ctx.strokeStyle = '#3a2a5a';
      ctx.lineWidth = ns(0.025);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.38));
      ctx.lineTo(nx(0.50), ny(0.62));
      ctx.stroke();
      // Antennae
      ctx.lineWidth = ns(0.008);
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.38));
      ctx.quadraticCurveTo(nx(0.42), ny(0.28), nx(0.38), ny(0.22));
      ctx.moveTo(nx(0.50), ny(0.38));
      ctx.quadraticCurveTo(nx(0.58), ny(0.28), nx(0.62), ny(0.22));
      ctx.stroke();
      ctx.fillStyle = '#3a2a5a';
      ctx.beginPath(); ctx.arc(nx(0.38), ny(0.22), ns(0.015), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx(0.62), ny(0.22), ns(0.015), 0, Math.PI * 2); ctx.fill();
      // Wing dots
      ctx.fillStyle = 'rgba(255, 230, 168, 0.85)';
      ctx.beginPath();
      ctx.arc(nx(0.22), ny(0.40), ns(0.030), 0, Math.PI * 2);
      ctx.arc(nx(0.30), ny(0.62), ns(0.025), 0, Math.PI * 2);
      ctx.arc(nx(0.78), ny(0.40), ns(0.030), 0, Math.PI * 2);
      ctx.arc(nx(0.70), ny(0.62), ns(0.025), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8fcf';
      ctx.beginPath();
      ctx.arc(nx(0.22), ny(0.40), ns(0.012), 0, Math.PI * 2);
      ctx.arc(nx(0.78), ny(0.40), ns(0.012), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'Sailboat': {
      // Mast (from peak down to deck)
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.85)';
      ctx.lineWidth = ns(0.014);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.08));
      ctx.lineTo(nx(0.50), ny(0.58));
      ctx.stroke();
      // Flag
      ctx.fillStyle = '#ff8fcf';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.08));
      ctx.lineTo(nx(0.66), ny(0.12));
      ctx.lineTo(nx(0.50), ny(0.16));
      ctx.closePath();
      ctx.fill();
      // Porthole on hull
      ctx.fillStyle = '#ffe6a8';
      ctx.beginPath();
      ctx.arc(nx(0.50), ny(0.74), ns(0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.85)';
      ctx.lineWidth = ns(0.008);
      ctx.beginPath();
      ctx.arc(nx(0.50), ny(0.74), ns(0.04), 0, Math.PI * 2);
      ctx.stroke();
      // Wavy water below (drifts)
      ctx.strokeStyle = 'rgba(168, 216, 255, 0.8)';
      ctx.lineWidth = ns(0.012);
      const drift = frame * 0.03;
      ctx.beginPath();
      let started = false;
      for (let x = 0.0; x <= 1.0; x += 0.04) {
        const yWave = 0.96 + Math.sin(x * 18 + drift) * 0.012;
        const px = nx(x), py = ny(yWave);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case 'House': {
      // Door
      ctx.fillStyle = 'rgba(140, 70, 35, 0.95)';
      const doorX = nx(0.42), doorY = ny(0.58), doorW = ns(0.16), doorH = ns(0.32);
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.strokeStyle = 'rgba(60, 30, 15, 0.8)';
      ctx.lineWidth = ns(0.008);
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      // Doorknob
      ctx.fillStyle = '#ffe6a8';
      ctx.beginPath();
      ctx.arc(doorX + doorW * 0.78, doorY + doorH * 0.55, ns(0.014), 0, Math.PI * 2);
      ctx.fill();
      // Window with cross
      ctx.fillStyle = 'rgba(168, 216, 255, 0.9)';
      const winX = nx(0.62), winY = ny(0.55), winS = ns(0.16);
      ctx.fillRect(winX, winY, winS, winS);
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.85)';
      ctx.lineWidth = ns(0.012);
      ctx.strokeRect(winX, winY, winS, winS);
      ctx.beginPath();
      ctx.moveTo(winX + winS / 2, winY);
      ctx.lineTo(winX + winS / 2, winY + winS);
      ctx.moveTo(winX, winY + winS / 2);
      ctx.lineTo(winX + winS, winY + winS / 2);
      ctx.stroke();
      // Chimney
      ctx.fillStyle = 'rgba(140, 70, 35, 0.95)';
      ctx.fillRect(nx(0.66), ny(0.18), ns(0.08), ns(0.14));
      ctx.strokeStyle = 'rgba(60, 30, 15, 0.8)';
      ctx.lineWidth = ns(0.008);
      ctx.strokeRect(nx(0.66), ny(0.18), ns(0.08), ns(0.14));
      // Animated smoke puffs
      for (let i = 0; i < 3; i++) {
        const t = ((frame * 0.6) + i * 30) % 90 / 90;
        const sx = nx(0.70) + Math.sin(t * Math.PI * 2 + i) * ns(0.035);
        const sy = ny(0.18) - t * ns(0.20);
        const sr = ns(0.022 + t * 0.025);
        ctx.globalAlpha = alpha * (1 - t) * 0.7;
        ctx.fillStyle = 'rgba(240, 240, 250, 1)';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      break;
    }
    case 'Rainbow': {
      // Clouds at each base
      drawCloud(nx(0.12), ny(0.86), ns(0.10));
      drawCloud(nx(0.88), ny(0.86), ns(0.10));
      break;
    }
    case 'Unicorn': {
      // Eye
      drawSmallEye(nx(0.30), ny(0.50), ns(0.038));
      // Nostril
      ctx.fillStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.ellipse(nx(0.13), ny(0.51), ns(0.014), ns(0.010), 0, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = '#3a2a5a';
      ctx.lineWidth = ns(0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(nx(0.14), ny(0.58), ns(0.04), 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      // Glittering horn stripes
      ctx.strokeStyle = 'rgba(255, 230, 168, 0.85)';
      ctx.lineWidth = ns(0.005);
      ctx.beginPath();
      ctx.moveTo(nx(0.34), ny(0.20)); ctx.lineTo(nx(0.42), ny(0.18));
      ctx.moveTo(nx(0.36), ny(0.15)); ctx.lineTo(nx(0.42), ny(0.13));
      ctx.stroke();
      // Rainbow mane strands
      const maneColors = ['#ff8fcf', '#ffd699', '#a8ffc8', '#a8d8ff', '#c5a8ff'];
      ctx.lineWidth = ns(0.024);
      ctx.lineCap = 'round';
      for (let i = 0; i < maneColors.length; i++) {
        ctx.strokeStyle = maneColors[i];
        const offset = i * 0.045;
        ctx.beginPath();
        ctx.moveTo(nx(0.55 + offset * 0.4), ny(0.28 + offset * 0.6));
        ctx.quadraticCurveTo(nx(0.78 + offset * 0.2), ny(0.50 + offset * 0.4),
                              nx(0.70 + offset * 0.2), ny(0.78 + offset * 0.3));
        ctx.stroke();
      }
      break;
    }
    case 'Teddy': {
      // Pink ear interiors
      ctx.fillStyle = 'rgba(255, 143, 207, 0.7)';
      ctx.beginPath(); ctx.ellipse(nx(0.28), ny(0.16), ns(0.05), ns(0.06), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(nx(0.72), ny(0.16), ns(0.05), ns(0.06), 0, 0, Math.PI * 2); ctx.fill();
      // Tummy patch (lighter)
      ctx.fillStyle = 'rgba(255, 230, 168, 0.5)';
      ctx.beginPath(); ctx.ellipse(nx(0.50), ny(0.66), ns(0.18), ns(0.16), 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      drawSmallEye(nx(0.38), ny(0.36), ns(0.04));
      drawSmallEye(nx(0.62), ny(0.36), ns(0.04));
      // Nose
      ctx.fillStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.ellipse(nx(0.50), ny(0.46), ns(0.04), ns(0.028), 0, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = '#3a2a5a';
      ctx.lineWidth = ns(0.012);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nx(0.50), ny(0.49)); ctx.lineTo(nx(0.50), ny(0.53));
      ctx.stroke();
      ctx.beginPath(); ctx.arc(nx(0.46), ny(0.55), ns(0.04), 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(nx(0.54), ny(0.55), ns(0.04), 0, Math.PI); ctx.stroke();
      // Paw pads
      ctx.fillStyle = 'rgba(255, 200, 150, 0.7)';
      ctx.beginPath(); ctx.arc(nx(0.08), ny(0.56), ns(0.03), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx(0.92), ny(0.56), ns(0.03), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(nx(0.20), ny(0.90), ns(0.04), ns(0.025), 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(nx(0.80), ny(0.90), ns(0.04), ns(0.025), 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'Human': {
      // T-shirt
      ctx.fillStyle = 'rgba(255, 143, 207, 0.55)';
      ctx.beginPath();
      ctx.ellipse(nx(0.50), ny(0.50), ns(0.13), ns(0.18), 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      drawSmallEye(nx(0.45), ny(0.12), ns(0.024));
      drawSmallEye(nx(0.55), ny(0.12), ns(0.024));
      // Smile
      drawSmileArc(nx(0.50), ny(0.16), ns(0.045), ns(0.010));
      // Cheek blush
      ctx.fillStyle = 'rgba(255, 143, 207, 0.55)';
      ctx.beginPath(); ctx.arc(nx(0.42), ny(0.16), ns(0.015), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx(0.58), ny(0.16), ns(0.015), 0, Math.PI * 2); ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  // Filled silhouette underlay (revealed on solve)
  if (solved && revealT > 0) {
    const c = CONSTELLATIONS[level];
    ctx.save();
    if (c.special === 'rainbow') {
      drawRainbowFill(stars, revealT, frame);
    } else {
      ctx.beginPath();
      for (let i = 0; i < stars.length; i++) {
        const p = stars[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      // Soft outer glow
      ctx.shadowColor = c.tint;
      ctx.shadowBlur = 60 * revealT;
      ctx.fillStyle = Lunar.draw.hexA(c.tint, 0.35 * revealT);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner brighter fill
      ctx.fillStyle = Lunar.draw.hexA(c.tint, 0.18 * revealT);
      ctx.fill();
    }
    ctx.restore();
    // Shape-specific accents, fade in once silhouette is half revealed
    const accentAlpha = Math.max(0, Math.min(1, (revealT - 0.4) * 1.8));
    drawAccents(c, accentAlpha);
  }

  // Connected lines
  for (let i = 1; i < connected.length; i++) {
    drawConnection(stars[connected[i - 1]], stars[connected[i]]);
  }
  // Closing line on solve
  if (solved && connected.length === stars.length) {
    drawConnection(stars[connected[connected.length - 1]], stars[connected[0]],
      Math.min(1, revealT * 1.4));
  }

  // Stars
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const isConnected = connected.includes(i);
    const isNext = !solved && i === stepIdx;
    let dx = 0, dy = 0;
    if (i === errorStarIdx && drawErrorShake > 0) {
      dx = Math.sin(frame * 1.6) * 4 * drawErrorShake;
    }
    const pulse = isNext ? (Math.sin(frame * 0.12) + 1) / 2 : 0;
    const scale = 1 + (isNext ? pulse * 0.3 : 0) + (isConnected ? 0.1 : 0);
    drawTwinkleStar(
      s.x + dx, s.y + dy,
      s.r * scale,
      {
        glow: isNext ? 1 : (isConnected ? 0.7 : 0.35),
        color: isConnected ? '#ffe6a8' : '#fff8c8',
        pulse,
        dim: !isNext && !isConnected && !solved,
      }
    );
    // Number label inside the star while not solved
    if (!solved) {
      drawNumber(s.x + dx, s.y + dy, i + 1);
    }
  }

  // Hint text along the bottom
  if (!solved) {
    ctx.fillStyle = 'rgba(255, 230, 168, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold ${Math.max(14, Math.min(W, H) * 0.022)}px 'Comic Sans MS', sans-serif`;
    const msg = stepIdx === 0 ? 'Tap star 1' : `Tap star ${stepIdx + 1}`;
    ctx.fillText(msg, W / 2, H - Math.max(28, H * 0.05));
  }

  Lunar.draw.drawParticles(ctx, particles);

  if (solved && revealT > 0.4) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 10, 50, 0.55)';
    const bandY = H * 0.06;
    ctx.fillRect(0, bandY, W, Math.max(80, H * 0.12));
    ctx.fillStyle = '#ffe6a8';
    ctx.font = `bold ${Math.max(28, Math.min(W, H) * 0.06)}px 'Comic Sans MS', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(CONSTELLATIONS[level].name + '!', W / 2, bandY + Math.max(80, H * 0.12) / 2 - 8);
    ctx.font = `${Math.max(14, Math.min(W, H) * 0.025)}px 'Comic Sans MS', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Tap for another constellation', W / 2, bandY + Math.max(80, H * 0.12) / 2 + 22);
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
