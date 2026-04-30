// === Lunar Hop ===

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');
const hudEl = document.getElementById('hud');
const counterEl = document.getElementById('counter');

let W = 0, H = 0, DPR = 1;
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
}

const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);
resize();
window.addEventListener('resize', resize);

let started = false;
let frame = 0;
let hopCount = 0;
const luna = { x: 0, y: 0, wingPhase: 0, trail: [] };
const moons = [];
const particles = [];
let currentMoon = 0;
let cameraX = 0;
let hopState = null;

function randomMoonY() {
  return H * 0.42 + Math.random() * H * 0.28;
}

function addMoon(x, y) {
  const colorIdx = moons.length % Lunar.MOON_COLORS.length;
  const noteIdx = moons.length % Lunar.NOTES.length;
  moons.push({
    x, y,
    r: 34 + Math.random() * 12,
    color: Lunar.MOON_COLORS[colorIdx],
    note: Lunar.NOTES[noteIdx],
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.018 + Math.random() * 0.022,
    glowPhase: Math.random() * Math.PI * 2,
    blinkTimer: 60 + Math.random() * 240,
    blinking: 0,
  });
}

function init() {
  let x = 120;
  for (let i = 0; i < 6; i++) {
    addMoon(x, randomMoonY());
    x += 130 + Math.random() * 60;
  }
  const m = moons[0];
  luna.x = m.x;
  luna.y = m.y - m.r - 14;
}
init();

function startGame() {
  if (started) return;
  started = true;
  titleEl.classList.add('hidden');
  hudEl.hidden = false;
  Lunar.audio.ensureAudio();
  Lunar.audio.startAmbient();
}

// ---------- Input ----------
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
    if (!started) startGame();
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === ' ') tryHop(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') tryHop(-1);
  }
});

let touchPointerId = null;
canvas.addEventListener('pointerdown', e => {
  Lunar.audio.ensureAudio();
  if (!started) startGame();
  touchPointerId = e.pointerId;
  if (hopState) return;
  // Find nearest tappable moon (must be adjacent for simplicity)
  const wx = e.clientX + cameraX;
  const wy = e.clientY;
  for (let dir = -1; dir <= 1; dir += 2) {
    const idx = currentMoon + dir;
    if (idx < 0 || idx >= moons.length) continue;
    const m = moons[idx];
    if (Math.hypot(m.x - wx, m.y - wy) < m.r + 70) {
      tryHop(dir);
      return;
    }
  }
  // If they tap somewhere generally to one side, hop that direction anyway
  if (e.clientX > W / 2) tryHop(1); else tryHop(-1);
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault());

function tryHop(dir) {
  if (hopState) return;
  const target = currentMoon + dir;
  if (target < 0 || target >= moons.length) return;
  hopTo(target);
}

function hopTo(idx) {
  if (idx === currentMoon) return;
  hopState = { fromIdx: currentMoon, toIdx: idx, t: 0, dir: idx > currentMoon ? 1 : -1 };
  Lunar.audio.playBoing(true);
}

function onLand() {
  const m = moons[currentMoon];
  Lunar.audio.playChime(m.note);
  hopCount++;
  counterEl.textContent = hopCount;
  Lunar.draw.makeParticleBurst(particles, luna.x, luna.y + 8, m.color, 14);
  // Spawn ahead so there's always somewhere to hop
  while (moons[moons.length - 1].x < cameraX + W * 1.5) {
    const last = moons[moons.length - 1];
    addMoon(last.x + 130 + Math.random() * 60, randomMoonY());
  }
  // Special celebration every 10 hops
  if (hopCount % 10 === 0) {
    Lunar.audio.playCelebration();
    Lunar.draw.makeParticleBurst(particles, luna.x, luna.y, ['#fff8c8', '#ffe6a8', '#ffb3d9'], 30);
  }
}

// ---------- Update ----------
function update() {
  frame++;

  for (const m of moons) {
    m.bobPhase += m.bobSpeed;
    m.glowPhase += 0.05;
    m.blinkTimer--;
    if (m.blinkTimer <= 0) { m.blinking = 8; m.blinkTimer = 120 + Math.random() * 240; }
    if (m.blinking > 0) m.blinking--;
  }

  if (hopState) {
    hopState.t += 0.038;
    const from = moons[hopState.fromIdx];
    const to = moons[hopState.toIdx];
    const t = Lunar.util.easeInOutCubic(hopState.t);
    const fromY = from.y + Math.sin(from.bobPhase) * 6 - from.r - 14;
    const toY   = to.y   + Math.sin(to.bobPhase)   * 6 - to.r   - 14;
    luna.x = Lunar.util.lerp(from.x, to.x, t);
    const baseY = Lunar.util.lerp(fromY, toY, t);
    const arcH = 100 + Math.abs(to.x - from.x) * 0.25;
    luna.y = baseY - Math.sin(hopState.t * Math.PI) * arcH;
    luna.wingPhase += 0.6;
    if (frame % 2 === 0) luna.trail.push({ x: luna.x, y: luna.y + 4, life: 1 });
    if (hopState.t >= 1) {
      currentMoon = hopState.toIdx;
      hopState = null;
      onLand();
    }
  } else {
    const m = moons[currentMoon];
    luna.x = m.x;
    luna.y = m.y + Math.sin(m.bobPhase) * 6 - m.r - 14;
    luna.wingPhase += 0.2;
  }

  for (let i = luna.trail.length - 1; i >= 0; i--) {
    luna.trail[i].life -= 0.04;
    if (luna.trail[i].life <= 0) luna.trail.splice(i, 1);
  }
  if (luna.trail.length > 30) luna.trail.splice(0, luna.trail.length - 30);

  const targetCam = moons[currentMoon].x - W / 2;
  cameraX += (targetCam - cameraX) * 0.08;

  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

// ---------- Render ----------
function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (let i = 0; i < moons.length; i++) {
    const m = moons[i];
    const screenX = m.x - cameraX;
    if (screenX < -200 || screenX > W + 200) continue;
    const isCurrent = i === currentMoon;
    const my = m.y + Math.sin(m.bobPhase) * 6;
    Lunar.draw.drawMoon(ctx, m.x, my, m.r, m.color,
      Math.sin(m.glowPhase) * 0.5 + 0.5, isCurrent, m.blinking, frame);

    // Subtle "next" arrow on adjacent moons before first hop
    if (!started && Math.abs(i - currentMoon) === 1) {
      const a = (Math.sin(frame * 0.1) + 1) / 2;
      ctx.fillStyle = `rgba(255, 230, 168, ${0.4 + a * 0.4})`;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i > currentMoon ? '→' : '←', m.x, my - m.r - 28);
    }
  }

  Lunar.draw.drawParticles(ctx, particles);
  Lunar.draw.drawLuna(ctx, luna.x, luna.y, frame, luna.wingPhase, luna.trail);

  ctx.restore();
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

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../sw.js').catch(() => {});
  });
}
