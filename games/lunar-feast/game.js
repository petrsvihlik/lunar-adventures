// === Lunar Feast ===

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
  layoutMoons();
}

const sky = Lunar.sky.makeSky(window.innerWidth, window.innerHeight);

let started = false;
let frame = 0;
let totalFed = 0;

const luna = {
  x: 0, y: 0, vx: 0, vy: 0,
  r: 24,
  speed: 0.6,
  maxSpeed: 5.5,
  friction: 0.86,
  wingPhase: 0,
  trail: [],
};

// Four hungry moons, each craves a different color
const HUNGRY = [
  { colorIdx: 1, pos: 'tl' }, // pink
  { colorIdx: 2, pos: 'tr' }, // sky
  { colorIdx: 4, pos: 'bl' }, // mint
  { colorIdx: 3, pos: 'br' }, // lavender
];

const moons = HUNGRY.map(h => ({
  x: 0, y: 0,
  r: 0,
  color: Lunar.MOON_COLORS[h.colorIdx],
  colorIdx: h.colorIdx,
  pos: h.pos,
  fed: 0,
  bobPhase: Math.random() * Math.PI * 2,
  bobSpeed: 0.018 + Math.random() * 0.022,
  glowPhase: Math.random() * Math.PI * 2,
  blinkTimer: 60 + Math.random() * 240,
  blinking: 0,
  happy: 0,
}));

function layoutMoons() {
  const margin = Math.min(W, H) * 0.16;
  const rBase = Math.max(46, Math.min(78, Math.min(W, H) * 0.09));
  const places = {
    tl: [margin, margin],
    tr: [W - margin, margin],
    bl: [margin, H - margin],
    br: [W - margin, H - margin],
  };
  for (const m of moons) {
    const [px, py] = places[m.pos];
    m.x = px;
    m.y = py;
    m.r = rBase;
  }
}

resize();
window.addEventListener('resize', resize);

luna.x = W / 2;
luna.y = H / 2;

const stars = [];      // free-floating stars
const carried = [];    // stars Luna is carrying
const flying = [];     // stars currently flying into a moon
const particles = [];

const MAX_FREE_STARS = 9;
const MAX_CARRIED = 6;
const PICKUP_RADIUS = 50;
const FEED_RADIUS = 90;

function spawnStar() {
  if (stars.length >= MAX_FREE_STARS) return;
  const colorIdx = HUNGRY[Math.floor(Math.random() * HUNGRY.length)].colorIdx;
  // Spawn in middle area (away from corners where moons live)
  const margin = Math.min(W, H) * 0.28;
  let x, y, tries = 0;
  do {
    x = margin + Math.random() * (W - margin * 2);
    y = margin + Math.random() * (H - margin * 2);
    tries++;
  } while (tries < 6 && nearAnyMoon(x, y, 100));
  stars.push({
    x, y,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    color: Lunar.MOON_COLORS[colorIdx],
    colorIdx,
    twinkle: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.02,
    r: 14 + Math.random() * 4,
    age: 0,
  });
}

function nearAnyMoon(x, y, dist) {
  for (const m of moons) {
    if (Math.hypot(m.x - x, m.y - y) < m.r + dist) return true;
  }
  return false;
}

// Seed initial stars
for (let i = 0; i < 5; i++) spawnStar();

function startGame() {
  if (started) return;
  started = true;
  titleEl.classList.add('hidden');
  hudEl.hidden = false;
  Lunar.audio.ensureAudio();
  Lunar.audio.startAmbient();
}

// ---------- Input ----------
const keys = Object.create(null);
let touchTarget = null;
let touchPointerId = null;

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
    if (!started && e.key.startsWith('Arrow')) startGame();
  }
  keys[e.key] = true;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function setTouchFromEvent(e) {
  touchTarget = { x: e.clientX, y: e.clientY };
}
canvas.addEventListener('pointerdown', e => {
  Lunar.audio.ensureAudio();
  if (!started) startGame();
  touchPointerId = e.pointerId;
  setTouchFromEvent(e);
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId === touchPointerId) setTouchFromEvent(e);
});
function endTouch(e) {
  if (e.pointerId === touchPointerId) { touchPointerId = null; touchTarget = null; }
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('pointerleave', endTouch);
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault());

// ---------- Update ----------
function update() {
  frame++;

  // Luna movement
  let ax = 0, ay = 0;
  if (keys['ArrowLeft']) ax -= luna.speed;
  if (keys['ArrowRight']) ax += luna.speed;
  if (keys['ArrowUp']) ay -= luna.speed;
  if (keys['ArrowDown']) ay += luna.speed;
  if (touchTarget) {
    const tdx = touchTarget.x - luna.x;
    const tdy = touchTarget.y - luna.y;
    const td = Math.hypot(tdx, tdy);
    if (td > 4) {
      const pull = Math.min(1, td / 80);
      ax += (tdx / td) * luna.speed * 1.6 * pull;
      ay += (tdy / td) * luna.speed * 1.6 * pull;
    }
  }
  luna.vx += ax; luna.vy += ay;
  luna.vx *= luna.friction; luna.vy *= luna.friction;
  const sp = Math.hypot(luna.vx, luna.vy);
  if (sp > luna.maxSpeed) {
    luna.vx = luna.vx / sp * luna.maxSpeed;
    luna.vy = luna.vy / sp * luna.maxSpeed;
  }
  luna.x += luna.vx; luna.y += luna.vy;
  luna.x = Math.max(luna.r, Math.min(W - luna.r, luna.x));
  luna.y = Math.max(luna.r, Math.min(H - luna.r, luna.y));
  luna.wingPhase += 0.35 + sp * 0.05;

  // Trail
  if (started && (Math.abs(luna.vx) > 0.5 || Math.abs(luna.vy) > 0.5)) {
    luna.trail.push({ x: luna.x, y: luna.y + 4, life: 1 });
  }
  for (let i = luna.trail.length - 1; i >= 0; i--) {
    luna.trail[i].life -= 0.04;
    if (luna.trail[i].life <= 0) luna.trail.splice(i, 1);
  }
  if (luna.trail.length > 30) luna.trail.splice(0, luna.trail.length - 30);

  // Moons visual state
  for (const m of moons) {
    m.bobPhase += m.bobSpeed;
    m.glowPhase += 0.05;
    m.blinkTimer--;
    if (m.blinkTimer <= 0) { m.blinking = 8; m.blinkTimer = 120 + Math.random() * 240; }
    if (m.blinking > 0) m.blinking--;
    if (m.happy > 0) m.happy--;
  }

  // Free-floating stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.age++;
    s.x += s.vx; s.y += s.vy;
    if (s.x < 30 || s.x > W - 30) s.vx *= -1;
    if (s.y < 30 || s.y > H - 30) s.vy *= -1;
    s.twinkle += 0.05;
    s.rot += s.vrot;

    // Magnet pickup
    if (s.age > 20 && carried.length < MAX_CARRIED) {
      const d = Math.hypot(s.x - luna.x, s.y - luna.y);
      if (d < PICKUP_RADIUS) {
        s.attached = true;
        s.attachAngle = Math.atan2(s.y - luna.y, s.x - luna.x);
        s.attachR = 36 + (carried.length * 2);
        carried.push(s);
        stars.splice(i, 1);
        Lunar.audio.playChime(Lunar.NOTES[s.colorIdx], 0.12);
      }
    }
  }

  // Carried stars orbit Luna
  for (let i = 0; i < carried.length; i++) {
    const s = carried[i];
    s.attachAngle += 0.045;
    s.attachR += (38 + i * 2 - s.attachR) * 0.1;
    s.x = luna.x + Math.cos(s.attachAngle) * s.attachR;
    s.y = luna.y + Math.sin(s.attachAngle) * s.attachR;
    s.twinkle += 0.05;
    s.rot += 0.02;
  }

  // Feed: detach matching stars when near a moon
  for (const m of moons) {
    const d = Math.hypot(m.x - luna.x, m.y - luna.y);
    if (d < FEED_RADIUS + m.r) {
      for (let i = carried.length - 1; i >= 0; i--) {
        const s = carried[i];
        if (s.colorIdx === m.colorIdx) {
          flying.push({ s, target: m, t: 0 });
          carried.splice(i, 1);
        }
      }
    }
  }

  // Animate flying stars
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += 0.06;
    f.s.x += (f.target.x - f.s.x) * 0.18;
    f.s.y += (f.target.y - f.s.y) * 0.18;
    f.s.rot += 0.15;
    if (f.t >= 1 || Math.hypot(f.s.x - f.target.x, f.s.y - f.target.y) < 8) {
      // Eaten!
      f.target.fed++;
      f.target.happy = 30;
      totalFed++;
      counterEl.textContent = totalFed;
      Lunar.audio.playYum();
      Lunar.draw.makeParticleBurst(particles, f.target.x, f.target.y, f.target.color, 16);
      flying.splice(i, 1);
      if (totalFed % 10 === 0) {
        Lunar.audio.playCelebration();
        Lunar.draw.makeParticleBurst(particles, luna.x, luna.y, ['#fff8c8', '#ffe6a8', '#ffb3d9'], 30);
      }
    }
  }

  // Spawn stars on a steady trickle (slightly more if she has none)
  const interval = stars.length < 3 ? 40 : 90;
  if (frame % interval === 0) spawnStar();

  Lunar.draw.updateParticles(particles);
  Lunar.sky.updateSky(sky, W, H);
}

// ---------- Render ----------
function drawFreeStar(s, twinkleAlpha = 1) {
  const tw = (Math.sin(s.twinkle) + 1) / 2;
  // soft halo
  const haloR = s.r + 14;
  const grad = ctx.createRadialGradient(s.x, s.y, s.r * 0.4, s.x, s.y, haloR);
  grad.addColorStop(0, Lunar.draw.hexA(s.color[1], 0.45 * twinkleAlpha));
  grad.addColorStop(1, Lunar.draw.hexA(s.color[1], 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
  ctx.fill();
  // star body
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  const innerScale = 0.45;
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r);
  fill.addColorStop(0, s.color[0]);
  fill.addColorStop(1, s.color[1]);
  ctx.fillStyle = fill;
  Lunar.draw.drawStar(ctx, 0, 0, s.r * innerScale, s.r * (0.95 + tw * 0.1));
  ctx.restore();
}

function drawTouchIndicator() {
  if (!touchTarget) return;
  const pulse = (Math.sin(frame * 0.18) + 1) / 2;
  const x = touchTarget.x, y = touchTarget.y;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 50);
  grad.addColorStop(0, 'rgba(255, 230, 168, 0.25)');
  grad.addColorStop(1, 'rgba(255, 230, 168, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 230, 168, ${0.55 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 26 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();
}

function render() {
  Lunar.sky.drawSky(ctx, sky, W, H);

  // Hungry moons (with want indicator)
  for (const m of moons) {
    const my = m.y + Math.sin(m.bobPhase) * 5;
    const happyBoost = m.happy > 0 ? 0.5 : 0;
    Lunar.draw.drawHungryMoon(
      ctx, m.x, my, m.r, m.color, m.color,
      Math.sin(m.glowPhase) * 0.5 + 0.5 + happyBoost,
      m.blinking, frame
    );
    // fed counter under the moon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `bold ${Math.max(13, m.r * 0.32)}px 'Comic Sans MS', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`× ${m.fed}`, m.x, my + m.r + 22);
  }

  // Free stars
  for (const s of stars) drawFreeStar(s);

  // Carried stars
  for (const s of carried) drawFreeStar(s);

  // Flying stars
  for (const f of flying) drawFreeStar(f.s, 1 - f.t);

  Lunar.draw.drawParticles(ctx, particles);
  drawTouchIndicator();

  // Luna
  Lunar.draw.drawLuna(ctx, luna.x, luna.y, frame, luna.wingPhase, luna.trail);
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
