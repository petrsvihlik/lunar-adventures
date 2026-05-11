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
        const tint = CONSTELLATIONS[level].tint;
        const cx = stars.reduce((s, p) => s + p.x, 0) / stars.length;
        const cy = stars.reduce((s, p) => s + p.y, 0) / stars.length;
        Lunar.draw.makeParticleBurst(particles, cx, cy, ['#fff8c8', '#ffe6a8', tint], 44);
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

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  // Filled silhouette underlay (revealed on solve)
  if (solved && revealT > 0) {
    const c = CONSTELLATIONS[level];
    ctx.save();
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
    ctx.restore();
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
