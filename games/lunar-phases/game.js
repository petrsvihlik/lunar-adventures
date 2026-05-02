// === Lunar Phases ===

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const counterEl = document.getElementById('counter');

let W = 0, H = 0, DPR = 1;
const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);

// Phase indices: 0 = new, 1 = waxing crescent, 2 = first quarter, 3 = waxing gibbous, 4 = full
// We use 4 phases (skip new, since it's hard to tell apart from an empty slot for little ones)
const PHASE_LIST = [1, 2, 3, 4];
const NUM = PHASE_LIST.length;

let tiles = [];
let slots = [];
let dragging = null;
let dragOffset = { x: 0, y: 0 };
let pointerId = null;
let started = false;
let solved = false;
let solvedFrame = 0;
let frame = 0;
const particles = [];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGame() {
  const homes = shuffle([...Array(NUM).keys()]);
  // Re-shuffle until at least one tile is out of place
  let attempts = 0;
  while (homes.every((h, i) => h === i) && attempts < 10) {
    shuffle(homes);
    attempts++;
  }
  tiles = PHASE_LIST.map((phase, i) => ({
    phase,
    home: homes[i],
    x: 0, y: 0,
    homeX: 0, homeY: 0,
    r: 30,
    placed: false,
    bob: Math.random() * Math.PI * 2,
    bouncing: 0,
    pulse: 0,
  }));
  slots = PHASE_LIST.map((phase, i) => ({ phase, slotIdx: i, x: 0, y: 0, r: 30 }));
  layout();
  for (const t of tiles) { t.x = t.homeX; t.y = t.homeY; }
  solved = false;
  counterEl.textContent = '0';
}

function layout() {
  if (!slots.length || !tiles.length) return;
  const portrait = H > W;
  // Compute radius so 4 tiles fit nicely with spacing
  const spacingFactor = 2.6; // distance between centers = spacingFactor * r
  const margin = Math.max(20, Math.min(W, H) * 0.05);
  const usableW = W - margin * 2;
  // (NUM - 1) * spacing * r + 2r = usableW  =>  r = usableW / ((NUM-1)*spacing + 2)
  let r = usableW / ((NUM - 1) * spacingFactor + 2);
  // Limit r so two rows (slots + tiles) fit vertically
  const maxRy = Math.min(H * 0.18, 90);
  r = Math.min(r, maxRy);
  r = Math.max(r, 30);

  const totalW = (NUM - 1) * r * spacingFactor;
  const startX = (W - totalW) / 2;
  const slotY = portrait ? H * 0.34 : H * 0.36;
  const tileY = portrait ? H * 0.7 : H * 0.72;

  for (let i = 0; i < NUM; i++) {
    slots[i].x = startX + i * r * spacingFactor;
    slots[i].y = slotY;
    slots[i].r = r;
  }
  for (const t of tiles) {
    t.r = r;
    t.homeX = startX + t.home * r * spacingFactor;
    t.homeY = tileY;
    if (t.placed) {
      const s = slots.find(sl => sl.phase === t.phase);
      t.x = s.x;
      t.y = s.y;
    }
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
    if (frame - solvedFrame > 45) newGame();
    return;
  }
  const x = e.clientX, y = e.clientY;
  for (const t of tiles) {
    if (t.placed) continue;
    if (Math.hypot(t.x - x, t.y - y) < t.r * 1.15) {
      dragging = t;
      t.bouncing = 0;
      dragOffset.x = t.x - x;
      dragOffset.y = t.y - y;
      pointerId = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      break;
    }
  }
});

canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointerId || !dragging) return;
  dragging.x = e.clientX + dragOffset.x;
  dragging.y = e.clientY + dragOffset.y;
});

function endDrag(e) {
  if (e.pointerId !== pointerId || !dragging) return;
  const t = dragging;
  dragging = null;
  pointerId = null;

  const correctSlot = slots.find(s => s.phase === t.phase);
  const dCorrect = Math.hypot(correctSlot.x - t.x, correctSlot.y - t.y);
  const snapDist = t.r * 1.6;

  if (dCorrect < snapDist) {
    t.placed = true;
    t.x = correctSlot.x;
    t.y = correctSlot.y;
    t.pulse = 1;
    Lunar.audio.playChime(Lunar.NOTES[t.phase], 0.18);
    Lunar.draw.makeParticleBurst(particles, t.x, t.y, ['#fff8c8', '#ffe6a8', '#ffd699'], 14);

    const placed = tiles.filter(x => x.placed).length;
    counterEl.textContent = placed;
    if (placed === NUM) {
      solved = true;
      solvedFrame = frame;
      setTimeout(() => {
        Lunar.audio.playCelebration();
        Lunar.draw.makeParticleBurst(particles, W / 2, H / 2, ['#fff8c8', '#ffe6a8', '#ffb3d9'], 50);
      }, 250);
    }
  } else {
    t.bouncing = 1;
    Lunar.audio.playBoing(false);
  }
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function update() {
  frame++;
  for (const t of tiles) {
    t.bob += 0.025;
    if (t.pulse > 0) t.pulse -= 0.03;
    if (t.bouncing > 0 && t !== dragging) {
      t.x += (t.homeX - t.x) * 0.18;
      t.y += (t.homeY - t.y) * 0.18;
      t.bouncing -= 0.03;
      if (t.bouncing <= 0 || (Math.abs(t.x - t.homeX) < 1 && Math.abs(t.y - t.homeY) < 1)) {
        t.x = t.homeX;
        t.y = t.homeY;
        t.bouncing = 0;
      }
    }
  }
  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

// Render a moon at the given phase. phase: 0 (new) .. 4 (full).
// silhouette mode draws a faint dashed outline only.
function drawPhaseMoon(x, y, r, phase, opts = {}) {
  const { silhouette = false, glow = 0.5 } = opts;

  if (silhouette) {
    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.strokeStyle = 'rgba(255, 230, 168, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Dim shadow shape inside
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 230, 168, 0.08)';
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    drawShadowSide(x, y, r, phase, 'rgba(20, 18, 60, 0.45)');
    ctx.restore();
    return;
  }

  // Glow halo
  const glowR = r + 14 + glow * 6;
  const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
  halo.addColorStop(0, `rgba(255, 230, 168, ${0.35 + glow * 0.2})`);
  halo.addColorStop(1, 'rgba(255, 230, 168, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Lit body + face
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  body.addColorStop(0, '#fff5d6');
  body.addColorStop(0.7, '#ffe6a8');
  body.addColorStop(1, '#ffc880');
  ctx.fillStyle = body;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);

  // craters
  ctx.fillStyle = 'rgba(255, 200, 130, 0.35)';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.arc(x - r * 0.25, y + r * 0.3, r * 0.09, 0, Math.PI * 2);
  ctx.arc(x + r * 0.1, y + r * 0.4, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // smiley face
  const eyeR = r * 0.10;
  const eyeY = y - r * 0.05;
  ctx.fillStyle = '#3a2a5a';
  ctx.beginPath();
  ctx.arc(x - r * 0.28, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.28 + eyeR * 0.4, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28 + eyeR * 0.4, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c75c8c';
  ctx.lineWidth = Math.max(1.4, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.13, r * 0.26, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 143, 207, 0.4)';
  ctx.beginPath();
  ctx.arc(x - r * 0.5, y + r * 0.13, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.5, y + r * 0.13, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.arc(x - r * 0.4, y - r * 0.5, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Shadow over the un-illuminated side
  drawShadowSide(x, y, r, phase, 'rgba(20, 18, 60, 0.86)');

  ctx.restore();

  // Outer rim
  ctx.strokeStyle = 'rgba(255, 230, 168, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Fills the dark side of a moon (call inside an arc-clipped ctx).
function drawShadowSide(x, y, r, phase, fill) {
  if (phase >= 4) return; // full = no shadow
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (phase === 0) {
    ctx.rect(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2);
  } else {
    // Dark side path: left semicircle + inner ellipse arc
    ctx.moveTo(x, y - r);
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, true); // left half
    const rx = r * 0.7;
    if (phase === 1) {
      ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, -Math.PI / 2, true); // bowing right
    } else if (phase === 2) {
      ctx.lineTo(x, y - r);
    } else if (phase === 3) {
      ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, -Math.PI / 2, false); // bowing left
    }
    ctx.closePath();
  }
  ctx.fill();
}

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  // Hint text
  ctx.fillStyle = 'rgba(255, 230, 168, 0.7)';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.max(14, Math.min(W, H) * 0.022)}px 'Comic Sans MS', sans-serif`;
  if (slots.length) {
    ctx.fillText('Tiny moon  →  Big moon', W / 2, slots[0].y - slots[0].r - 18);
  }

  // Slot silhouettes
  for (const s of slots) {
    const filled = tiles.find(t => t.phase === s.phase && t.placed);
    if (!filled) drawPhaseMoon(s.x, s.y, s.r, s.phase, { silhouette: true });
  }

  // Tiles, with the dragged one drawn last
  const order = [...tiles].sort((a, b) => {
    if (a === dragging) return 1;
    if (b === dragging) return -1;
    return 0;
  });
  for (const t of order) {
    const bobY = t.placed ? Math.sin(t.bob) * 2 : 0;
    const scale = 1 + t.pulse * 0.1 + (t === dragging ? 0.06 : 0);
    ctx.save();
    ctx.translate(t.x, t.y + bobY);
    ctx.scale(scale, scale);
    drawPhaseMoon(0, 0, t.r, t.phase, { glow: t.placed ? 0.85 : 0.45 });
    ctx.restore();
  }

  Lunar.draw.drawParticles(ctx, particles);

  if (solved) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 10, 50, 0.55)';
    ctx.fillRect(0, H * 0.46, W, H * 0.14);
    ctx.fillStyle = '#ffe6a8';
    ctx.font = `bold ${Math.max(28, Math.min(W, H) * 0.055)}px 'Comic Sans MS', sans-serif`;
    ctx.fillText('All in order!', W / 2, H * 0.53);
    ctx.font = `${Math.max(16, Math.min(W, H) * 0.028)}px 'Comic Sans MS', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Tap to play again', W / 2, H * 0.53 + 32);
  }
}

let lastT = performance.now();
function loop(t) {
  const dt = Math.min(33, t - lastT);
  lastT = t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../sw.js').catch(() => {});
  });
}
