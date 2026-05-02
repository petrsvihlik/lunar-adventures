// === Lunar Match ===

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const counterEl = document.getElementById('counter');

let W = 0, H = 0, DPR = 1;
const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);

const NUM_PAIRS = 4;
const PALETTE_SIZE = Lunar.MOON_COLORS.length;

let cards = [];
let pickedIdx = [];
let lockInput = false;
let pairsFound = 0;
let started = false;
let frame = 0;
const particles = [];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const indices = shuffle([...Array(PALETTE_SIZE).keys()]);
  const chosen = indices.slice(0, NUM_PAIRS);
  const deck = [];
  for (const c of chosen) deck.push(c, c);
  return shuffle(deck);
}

function newGame() {
  cards = buildDeck().map(colorIdx => ({
    colorIdx,
    faceUp: false,
    matched: false,
    flipPhase: 0,
    target: 0,
    bobPhase: Math.random() * Math.PI * 2,
    pulse: 0,
    blinkTimer: 80 + Math.random() * 240,
    blinking: 0,
    x: 0, y: 0, w: 0, h: 0,
  }));
  pickedIdx = [];
  lockInput = false;
  pairsFound = 0;
  counterEl.textContent = '0';
  layoutCards();
}

function layoutCards() {
  const portrait = H > W;
  const cols = portrait ? 2 : 4;
  const rows = portrait ? 4 : 2;

  const padTop = Math.min(80, H * 0.13);
  const padBottom = Math.min(60, H * 0.08);
  const padSide = Math.max(16, Math.min(W, H) * 0.04);
  const availW = W - padSide * 2;
  const availH = H - padTop - padBottom;
  const gap = Math.max(8, Math.min(W, H) * 0.022);
  const cardW = (availW - gap * (cols - 1)) / cols;
  const cardH = (availH - gap * (rows - 1)) / rows;
  const size = Math.min(cardW, cardH);
  const totalW = size * cols + gap * (cols - 1);
  const totalH = size * rows + gap * (rows - 1);
  const startX = (W - totalW) / 2;
  const startY = padTop + (availH - totalH) / 2;

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const r = Math.floor(i / cols);
    const col = i % cols;
    c.x = startX + col * (size + gap);
    c.y = startY + r * (size + gap);
    c.w = size;
    c.h = size;
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
  layoutCards();
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
  if (pairsFound === NUM_PAIRS) {
    newGame();
    return;
  }
  if (lockInput) return;
  const x = e.clientX, y = e.clientY;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (c.matched || c.faceUp) continue;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      flipUp(i);
      break;
    }
  }
});

function flipUp(i) {
  const c = cards[i];
  c.faceUp = true;
  c.target = 1;
  pickedIdx.push(i);
  Lunar.audio.playChime(Lunar.NOTES[c.colorIdx % Lunar.NOTES.length], 0.16);
  if (pickedIdx.length === 2) {
    lockInput = true;
    setTimeout(resolvePair, 700);
  }
}

function resolvePair() {
  const [a, b] = pickedIdx;
  pickedIdx = [];
  if (cards[a].colorIdx === cards[b].colorIdx) {
    cards[a].matched = true;
    cards[b].matched = true;
    cards[a].pulse = 1;
    cards[b].pulse = 1;
    pairsFound++;
    counterEl.textContent = pairsFound;
    Lunar.audio.playYum();
    const colA = Lunar.MOON_COLORS[cards[a].colorIdx];
    Lunar.draw.makeParticleBurst(particles, cards[a].x + cards[a].w / 2, cards[a].y + cards[a].h / 2, colA, 14);
    Lunar.draw.makeParticleBurst(particles, cards[b].x + cards[b].w / 2, cards[b].y + cards[b].h / 2, colA, 14);
    lockInput = false;
    if (pairsFound === NUM_PAIRS) {
      setTimeout(() => {
        Lunar.audio.playCelebration();
        Lunar.draw.makeParticleBurst(particles, W / 2, H / 2, ['#fff8c8', '#ffe6a8', '#ffb3d9'], 50);
      }, 350);
    }
  } else {
    cards[a].faceUp = false;
    cards[a].target = 0;
    cards[b].faceUp = false;
    cards[b].target = 0;
    setTimeout(() => { lockInput = false; }, 300);
  }
}

function update() {
  frame++;
  for (const c of cards) {
    c.bobPhase += 0.025;
    c.flipPhase += (c.target - c.flipPhase) * 0.18;
    if (c.pulse > 0) c.pulse -= 0.025;
    c.blinkTimer--;
    if (c.blinkTimer <= 0) { c.blinking = 8; c.blinkTimer = 140 + Math.random() * 280; }
    if (c.blinking > 0) c.blinking--;
  }
  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCardBack(x, y, w, h) {
  const rad = Math.min(w, h) * 0.16;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2a1f6a');
  g.addColorStop(1, '#15124a');
  ctx.fillStyle = g;
  roundRect(x, y, w, h, rad);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 230, 168, 0.45)';
  ctx.lineWidth = 2;
  roundRect(x + 1, y + 1, w - 2, h - 2, rad);
  ctx.stroke();

  const cx = x + w / 2, cy = y + h / 2;
  const sz = Math.min(w, h) * 0.18;
  const tw = (Math.sin(frame * 0.05) + 1) / 2;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 2.4);
  halo.addColorStop(0, `rgba(255, 230, 168, ${0.25 + tw * 0.15})`);
  halo.addColorStop(1, 'rgba(255, 230, 168, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, sz * 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 168, ${0.85 + tw * 0.15})`;
  Lunar.draw.drawStar(ctx, cx, cy, sz * 0.42, sz * (1 + tw * 0.08));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(x + w * 0.18, y + h * 0.2, 1.8, 0, Math.PI * 2);
  ctx.arc(x + w * 0.82, y + h * 0.22, 1.4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.22, y + h * 0.8, 1.2, 0, Math.PI * 2);
  ctx.arc(x + w * 0.8, y + h * 0.78, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCardFront(c) {
  const { x, y, w, h } = c;
  const color = Lunar.MOON_COLORS[c.colorIdx];
  const rad = Math.min(w, h) * 0.16;
  const cx = x + w / 2;
  const cy = y + h / 2 + Math.sin(c.bobPhase) * 2;
  const r = Math.min(w, h) * 0.34;

  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, Lunar.draw.hexA(color[1], 0.28));
  bg.addColorStop(1, Lunar.draw.hexA(color[2], 0.18));
  ctx.fillStyle = bg;
  roundRect(x, y, w, h, rad);
  ctx.fill();

  ctx.strokeStyle = c.matched ? Lunar.draw.hexA(color[2], 0.95) : Lunar.draw.hexA(color[2], 0.55);
  ctx.lineWidth = c.matched ? 3 : 2;
  roundRect(x + 1, y + 1, w - 2, h - 2, rad);
  ctx.stroke();

  const scale = 1 + c.pulse * 0.08;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  Lunar.draw.drawMoon(ctx, 0, 0, r, color, 0.7, c.matched, c.blinking, frame);
  ctx.restore();

  if (c.matched) {
    const heartSize = 14 + c.pulse * 8;
    const hy = y + h - heartSize - 8 + Math.sin(c.bobPhase * 1.3) * 1.5;
    Lunar.draw.drawHeart(ctx, cx, hy, heartSize, '#ff7eb0');
  }
}

function drawCard(c) {
  const cx = c.x + c.w / 2;
  const flipX = Math.cos(c.flipPhase * Math.PI);
  const sx = Math.max(0.001, Math.abs(flipX));
  const showFront = c.flipPhase > 0.5;

  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(sx, 1);
  ctx.translate(-cx, 0);
  if (showFront) drawCardFront(c);
  else drawCardBack(c.x, c.y, c.w, c.h);
  ctx.restore();
}

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);
  for (const c of cards) drawCard(c);
  Lunar.draw.drawParticles(ctx, particles);

  if (pairsFound === NUM_PAIRS && started) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 10, 50, 0.55)';
    ctx.fillRect(0, H * 0.42, W, H * 0.16);
    ctx.fillStyle = '#ffe6a8';
    ctx.font = `bold ${Math.max(28, Math.min(W, H) * 0.055)}px 'Comic Sans MS', sans-serif`;
    ctx.fillText('All matched!', W / 2, H * 0.5);
    ctx.font = `${Math.max(16, Math.min(W, H) * 0.028)}px 'Comic Sans MS', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Tap to play again', W / 2, H * 0.5 + 32);
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
