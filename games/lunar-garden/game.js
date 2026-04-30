// === Lunar Garden ===

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title');

let W = 0, H = 0, DPR = 1;
let GARDEN_HEIGHT = 130;
let PLAY_HEIGHT = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  GARDEN_HEIGHT = Math.max(110, Math.min(160, H * 0.18));
  PLAY_HEIGHT = H - GARDEN_HEIGHT;
}
resize();
window.addEventListener('resize', resize);

// === Input ===
const keys = Object.create(null);
let started = false;
let touchTarget = null;
let touchPointerId = null;

window.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
    if (!started && e.key.startsWith('Arrow')) startGame();
  }
  keys[e.key] = true;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function setTouchFromEvent(e) {
  const x = e.clientX;
  const y = Math.min(e.clientY, PLAY_HEIGHT - luna.r);
  touchTarget = { x, y };
}

canvas.addEventListener('pointerdown', e => {
  ensureAudio();
  if (!started) startGame();
  touchPointerId = e.pointerId;
  setTouchFromEvent(e);
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId === touchPointerId) setTouchFromEvent(e);
});
function endTouch(e) {
  if (e.pointerId === touchPointerId) {
    touchPointerId = null;
    touchTarget = null;
  }
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('pointerleave', endTouch);
// Block iOS bounce/zoom gestures over the canvas
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('gesturestart', e => e.preventDefault());

function startGame() {
  if (started) return;
  started = true;
  titleEl.classList.add('hidden');
  ensureAudio();
  startAmbient();
}

// === Audio ===
let audioCtx = null;
let masterGain = null;
let ambientStarted = false;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playChime(freq, vol = 0.22) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const harmonics = [
    { mult: 1, gain: 1.0, decay: 1.4 },
    { mult: 2, gain: 0.45, decay: 0.9 },
    { mult: 3.01, gain: 0.18, decay: 0.6 },
    { mult: 4.2, gain: 0.08, decay: 0.4 },
  ];
  for (const h of harmonics) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * h.mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * h.gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + h.decay);
    o.connect(g).connect(masterGain);
    o.start(t);
    o.stop(t + h.decay + 0.05);
  }
}

function playSparkle() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (let i = 0; i < 5; i++) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 1500 + Math.random() * 2200;
    const start = t + i * 0.035;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.045, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    o.connect(g).connect(masterGain);
    o.start(start);
    o.stop(start + 0.22);
  }
}

function playCelebration() {
  if (!audioCtx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0];
  notes.forEach((n, i) => setTimeout(() => playChime(n, 0.28), i * 90));
  setTimeout(playSparkle, 250);
  setTimeout(playSparkle, 500);
}

function playWhoosh() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, t);
  filter.frequency.exponentialRampToValueAtTime(500, t + 0.4);
  o.type = 'sawtooth';
  o.frequency.value = 200;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  // Use noise via detuned sawtooth
  o.connect(filter).connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + 0.45);
}

function startAmbient() {
  if (!audioCtx || ambientStarted) return;
  ambientStarted = true;
  const padGain = audioCtx.createGain();
  padGain.gain.value = 0;
  padGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 4);
  padGain.connect(masterGain);

  const chord = [130.81, 196.00, 261.63, 329.63, 392.00];
  for (const f of chord) {
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = audioCtx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 1.004;
    const oGain = audioCtx.createGain();
    oGain.gain.value = 1 / chord.length;
    o.connect(oGain);
    o2.connect(oGain);
    oGain.connect(padGain);
    o.start();
    o2.start();
  }

  // Slow shimmer LFO
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.frequency.value = 0.08;
  lfo.connect(lfoGain).connect(padGain.gain);
  lfo.start();
}

// Pentatonic-ish bell scale — always sounds harmonious
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

// === Palette ===
const MOON_COLORS = [
  ['#fff5d6', '#ffd699', '#ffb868'],
  ['#ffe0ec', '#ffb3d1', '#ff7eb0'],
  ['#e0f0ff', '#a8d8ff', '#6fb0f0'],
  ['#ece0ff', '#c5a8ff', '#9b7ee8'],
  ['#e0ffe8', '#a8ffc8', '#6fe89b'],
  ['#fff0e0', '#ffc8a8', '#ff9b6f'],
];

// === Entities ===
const luna = {
  x: 0, y: 0,
  vx: 0, vy: 0,
  r: 24,
  speed: 0.6,
  maxSpeed: 5.5,
  friction: 0.86,
  wingPhase: 0,
  trail: [],
};

const stars = [];
const moons = [];
const particles = [];
const collected = [];
const shootingStars = [];
const nebulae = [];
const floatingHearts = [];

function initWorld() {
  luna.x = W / 2;
  luna.y = PLAY_HEIGHT / 2;

  stars.length = 0;
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * PLAY_HEIGHT,
      r: Math.random() * 1.6 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.015 + Math.random() * 0.04,
      hue: Math.random() < 0.15 ? 'warm' : 'white',
    });
  }

  nebulae.length = 0;
  for (let i = 0; i < 4; i++) {
    nebulae.push({
      x: Math.random() * W,
      y: Math.random() * PLAY_HEIGHT * 0.8,
      r: 150 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.08,
      hue: Math.random() < 0.5 ? 'pink' : 'blue',
      alpha: 0.05 + Math.random() * 0.06,
    });
  }
}
initWorld();

function spawnMoon(special = false) {
  const colorIdx = Math.floor(Math.random() * MOON_COLORS.length);
  const radius = special ? 32 : 20 + Math.random() * 14;
  moons.push({
    x: 60 + Math.random() * (W - 120),
    y: -radius - 20,
    targetY: 80 + Math.random() * (PLAY_HEIGHT - 200),
    r: radius,
    color: special ? ['#fff8c8', '#ffe6a8', '#ffb3d9'] : MOON_COLORS[colorIdx],
    note: NOTES[special ? 6 : colorIdx % NOTES.length],
    bobPhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.018 + Math.random() * 0.022,
    vx: (Math.random() - 0.5) * 0.4,
    glowPhase: Math.random() * Math.PI * 2,
    blinkTimer: 60 + Math.random() * 240,
    blinking: 0,
    special,
    age: 0,
  });
}

for (let i = 0; i < 5; i++) {
  spawnMoon();
  moons[i].y = moons[i].targetY;
  moons[i].age = 60;
}

function spawnShootingStar() {
  const fromLeft = Math.random() < 0.5;
  shootingStars.push({
    x: fromLeft ? -30 : W + 30,
    y: 50 + Math.random() * (PLAY_HEIGHT * 0.5),
    vx: (fromLeft ? 1 : -1) * (8 + Math.random() * 4),
    vy: 1.5 + Math.random() * 1.5,
    life: 1,
    trail: [],
  });
}

function sparkleBurst(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      type: Math.random() < 0.4 ? 'star' : 'dot',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      color: typeof color === 'string' ? color : color[1],
      size: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
    });
  }
}

function heartBurst(x, y) {
  for (let i = 0; i < 6; i++) {
    floatingHearts.push({
      x: x + (Math.random() - 0.5) * 30,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1 - Math.random() * 1.5,
      life: 1,
      size: 10 + Math.random() * 6,
      hue: Math.random() < 0.5 ? '#ff8fcf' : '#ffe6a8',
    });
  }
}

function addToGarden(moon) {
  const slot = collected.length;
  const perRow = Math.max(8, Math.floor((W - 60) / 46));
  const row = Math.floor(slot / perRow);
  const col = slot % perRow;
  const slotWidth = (W - 60) / perRow;
  const targetX = 30 + slotWidth * (col + 0.5);
  const targetY = PLAY_HEIGHT + 38 + row * 36;
  collected.push({
    x: moon.x,
    y: moon.y,
    targetX,
    targetY,
    r: moon.special ? 22 : 16,
    color: moon.color,
    arrived: false,
    glowPhase: Math.random() * Math.PI * 2,
    settle: 0,
    special: moon.special,
  });
}

// === Update ===
let frame = 0;
let spawnTimer = 0;
let shootingTimer = 240;
let totalCollected = 0;

function update(dt) {
  frame++;

  // Luna movement (smooth with momentum)
  let ax = 0, ay = 0;
  if (keys['ArrowLeft'])  ax -= luna.speed;
  if (keys['ArrowRight']) ax += luna.speed;
  if (keys['ArrowUp'])    ay -= luna.speed;
  if (keys['ArrowDown'])  ay += luna.speed;
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
  luna.vx += ax;
  luna.vy += ay;
  luna.vx *= luna.friction;
  luna.vy *= luna.friction;
  const sp = Math.hypot(luna.vx, luna.vy);
  if (sp > luna.maxSpeed) {
    luna.vx = luna.vx / sp * luna.maxSpeed;
    luna.vy = luna.vy / sp * luna.maxSpeed;
  }
  luna.x += luna.vx;
  luna.y += luna.vy;
  luna.x = Math.max(luna.r, Math.min(W - luna.r, luna.x));
  luna.y = Math.max(luna.r, Math.min(PLAY_HEIGHT - luna.r, luna.y));
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

  // Stars
  for (const s of stars) s.twinkle += s.twinkleSpeed;

  // Nebulae drift
  for (const n of nebulae) {
    n.x += n.vx;
    if (n.x < -n.r) n.x = W + n.r;
    if (n.x > W + n.r) n.x = -n.r;
  }

  // Shooting stars
  shootingTimer--;
  if (shootingTimer <= 0) {
    spawnShootingStar();
    shootingTimer = 240 + Math.random() * 360;
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.trail.push({ x: ss.x, y: ss.y });
    if (ss.trail.length > 12) ss.trail.shift();
    ss.x += ss.vx;
    ss.y += ss.vy;
    if (ss.x < -100 || ss.x > W + 100 || ss.y > PLAY_HEIGHT) shootingStars.splice(i, 1);
  }

  // Moons
  for (let i = moons.length - 1; i >= 0; i--) {
    const m = moons[i];
    m.age++;
    if (m.y < m.targetY) m.y += 1.4;
    m.bobPhase += m.bobSpeed;
    m.glowPhase += 0.05;
    m.x += m.vx;
    if (m.x < m.r + 10 || m.x > W - m.r - 10) m.vx *= -1;

    m.blinkTimer--;
    if (m.blinkTimer <= 0) {
      m.blinking = 8;
      m.blinkTimer = 120 + Math.random() * 240;
    }
    if (m.blinking > 0) m.blinking--;

    // Collision with Luna
    const my = m.y + Math.sin(m.bobPhase) * 6;
    const dx = m.x - luna.x;
    const dy = my - luna.y;
    const dist = Math.hypot(dx, dy);
    if (m.age > 30 && dist < m.r + luna.r - 6) {
      sparkleBurst(m.x, my, m.color, m.special ? 32 : 18);
      playChime(m.note);
      if (m.special) {
        playCelebration();
        heartBurst(m.x, my);
      }
      addToGarden(m);
      totalCollected++;
      moons.splice(i, 1);
      if (totalCollected % 10 === 0) {
        playCelebration();
        heartBurst(luna.x, luna.y);
      }
    }
  }

  // Spawn
  spawnTimer++;
  const targetMoons = Math.min(8, 4 + Math.floor(totalCollected / 8));
  if (spawnTimer > 70 && moons.length < targetMoons) {
    const special = totalCollected > 0 && totalCollected % 15 === 14 && !moons.some(m => m.special);
    spawnMoon(special);
    spawnTimer = 0;
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.99;
    p.rot += p.vrot;
    p.life -= 0.02;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Hearts
  for (let i = floatingHearts.length - 1; i >= 0; i--) {
    const h = floatingHearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.02;
    h.life -= 0.012;
    if (h.life <= 0) floatingHearts.splice(i, 1);
  }

  // Garden settle
  for (const c of collected) {
    if (!c.arrived) {
      c.x += (c.targetX - c.x) * 0.12;
      c.y += (c.targetY - c.y) * 0.12;
      if (Math.abs(c.x - c.targetX) < 0.5 && Math.abs(c.y - c.targetY) < 0.5) {
        c.arrived = true;
        c.settle = 1;
      }
    } else {
      c.settle = Math.max(0, c.settle - 0.04);
    }
    c.glowPhase += 0.04;
  }
}

// === Drawing ===
function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#080828');
  bg.addColorStop(0.5, '#1a1850');
  bg.addColorStop(1, '#2a1a5a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Nebulae
  for (const n of nebulae) {
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    if (n.hue === 'pink') {
      grad.addColorStop(0, `rgba(255, 143, 207, ${n.alpha})`);
      grad.addColorStop(1, 'rgba(255, 143, 207, 0)');
    } else {
      grad.addColorStop(0, `rgba(143, 200, 255, ${n.alpha})`);
      grad.addColorStop(1, 'rgba(143, 200, 255, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stars
  for (const s of stars) {
    const tw = (Math.sin(s.twinkle) + 1) / 2;
    const a = 0.3 + tw * 0.65;
    if (s.hue === 'warm') {
      ctx.fillStyle = `rgba(255, 230, 168, ${a})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.7 + tw * 0.4), 0, Math.PI * 2);
    ctx.fill();
    if (tw > 0.85 && s.r > 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(tw - 0.85) * 4})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 3, s.y);
      ctx.lineTo(s.x + s.r * 3, s.y);
      ctx.moveTo(s.x, s.y - s.r * 3);
      ctx.lineTo(s.x, s.y + s.r * 3);
      ctx.stroke();
    }
  }
}

function drawShootingStars() {
  for (const ss of shootingStars) {
    ctx.lineCap = 'round';
    for (let i = 0; i < ss.trail.length; i++) {
      const t = ss.trail[i];
      const a = (i / ss.trail.length) * 0.9;
      ctx.strokeStyle = `rgba(255, 245, 200, ${a})`;
      ctx.lineWidth = (i / ss.trail.length) * 3 + 0.5;
      if (i > 0) {
        const prev = ss.trail[i - 1];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#fff5d6';
    ctx.beginPath();
    ctx.arc(ss.x, ss.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoon(x, y, r, color, glow, special, blinking) {
  const glowR = r + 14 + glow * 6;
  const grad = ctx.createRadialGradient(x, y, r * 0.6, x, y, glowR);
  grad.addColorStop(0, hexA(color[1], 0.55));
  grad.addColorStop(1, hexA(color[1], 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  if (special) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(frame * 0.01);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = r + 16 + Math.sin(frame * 0.1 + i) * 4;
      ctx.strokeStyle = hexA(color[2] || color[1], 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  const bodyGrad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  bodyGrad.addColorStop(0, color[0]);
  bodyGrad.addColorStop(0.7, color[1]);
  bodyGrad.addColorStop(1, color[2] || color[1]);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Craters
  ctx.fillStyle = hexA(color[2] || color[1], 0.3);
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
  ctx.arc(x - r * 0.25, y + r * 0.3, r * 0.09, 0, Math.PI * 2);
  ctx.arc(x + r * 0.1, y + r * 0.4, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Face
  const eyeR = r * 0.11;
  const eyeY = y - r * 0.05;
  ctx.fillStyle = '#3a2a5a';
  if (blinking > 0) {
    ctx.fillRect(x - r * 0.3 - eyeR, eyeY - 1, eyeR * 2, 2);
    ctx.fillRect(x + r * 0.3 - eyeR, eyeY - 1, eyeR * 2, 2);
  } else {
    ctx.beginPath();
    ctx.arc(x - r * 0.3, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.3 + eyeR * 0.4, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3 + eyeR * 0.4, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile
  ctx.strokeStyle = '#c75c8c';
  ctx.lineWidth = Math.max(1.4, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.15, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Blush
  ctx.fillStyle = hexA('#ff8fcf', 0.45);
  ctx.beginPath();
  ctx.arc(x - r * 0.55, y + r * 0.15, r * 0.13, 0, Math.PI * 2);
  ctx.arc(x + r * 0.55, y + r * 0.15, r * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(x - r * 0.4, y - r * 0.5, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawLuna(x, y) {
  // Trail
  for (let i = 0; i < luna.trail.length; i++) {
    const t = luna.trail[i];
    ctx.fillStyle = `rgba(255, 230, 168, ${t.life * 0.4})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 4 * t.life + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aura
  const auraR = 50 + Math.sin(frame * 0.06) * 4;
  const auraGrad = ctx.createRadialGradient(x, y, 5, x, y, auraR);
  auraGrad.addColorStop(0, 'rgba(255, 248, 200, 0.55)');
  auraGrad.addColorStop(0.6, 'rgba(255, 200, 230, 0.2)');
  auraGrad.addColorStop(1, 'rgba(255, 200, 230, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(x, y, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  const flap = Math.sin(luna.wingPhase) * 0.4;
  const wingGrad1 = ctx.createRadialGradient(x - 18, y - 5, 2, x - 18, y - 5, 22);
  wingGrad1.addColorStop(0, 'rgba(255, 240, 250, 0.95)');
  wingGrad1.addColorStop(1, 'rgba(255, 200, 230, 0.4)');
  ctx.fillStyle = wingGrad1;
  ctx.beginPath();
  ctx.ellipse(x - 16, y - 4, 14, 22 + flap * 6, -0.3 - flap * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 16, y - 4, 14, 22 + flap * 6, 0.3 + flap * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Wing shimmer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x - 16, y - 4, 8, 14, -0.3 - flap * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 16, y - 4, 8, 14, 0.3 + flap * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Dress
  const dressGrad = ctx.createLinearGradient(x, y - 2, x, y + 22);
  dressGrad.addColorStop(0, '#ffb3d9');
  dressGrad.addColorStop(1, '#ff7eb0');
  ctx.fillStyle = dressGrad;
  ctx.beginPath();
  ctx.moveTo(x - 9, y);
  ctx.lineTo(x + 9, y);
  ctx.lineTo(x + 15, y + 20);
  ctx.lineTo(x - 15, y + 20);
  ctx.closePath();
  ctx.fill();

  // Dress trim
  ctx.fillStyle = '#fff5d6';
  ctx.fillRect(x - 15, y + 18, 30, 2.5);

  // Arms
  ctx.fillStyle = '#ffe0c2';
  ctx.beginPath();
  ctx.arc(x - 11, y + 6, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 11, y + 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#ffe0c2';
  ctx.beginPath();
  ctx.arc(x, y - 9, 10, 0, Math.PI * 2);
  ctx.fill();

  // Hair (purple, slight bob)
  const hairBob = Math.sin(frame * 0.08) * 0.5;
  ctx.fillStyle = '#6b3aa0';
  ctx.beginPath();
  ctx.arc(x, y - 11, 11, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 9, y - 8, 4, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Star hair clip
  ctx.fillStyle = '#ffe6a8';
  drawStar(x + 7, y - 14 + hairBob, 3, 5);

  // Eyes
  ctx.fillStyle = '#2a1f4f';
  ctx.beginPath();
  ctx.arc(x - 3.2, y - 8, 1.7, 0, Math.PI * 2);
  ctx.arc(x + 3.2, y - 8, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - 2.7, y - 8.5, 0.7, 0, Math.PI * 2);
  ctx.arc(x + 3.7, y - 8.5, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks
  ctx.fillStyle = 'rgba(255, 143, 207, 0.5)';
  ctx.beginPath();
  ctx.arc(x - 5, y - 5, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#c75c8c';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y - 5, 2.5, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}

function drawStar(x, y, inner, outer) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = size / 10;
  ctx.moveTo(x, y + 3 * s);
  ctx.bezierCurveTo(x, y, x - 5 * s, y, x - 5 * s, y - 3 * s);
  ctx.bezierCurveTo(x - 5 * s, y - 6 * s, x, y - 6 * s, x, y - 2 * s);
  ctx.bezierCurveTo(x, y - 6 * s, x + 5 * s, y - 6 * s, x + 5 * s, y - 3 * s);
  ctx.bezierCurveTo(x + 5 * s, y, x, y, x, y + 3 * s);
  ctx.closePath();
  ctx.fill();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.type === 'star') {
      ctx.fillStyle = p.color;
      drawStar(0, 0, p.size * 0.4, p.size * 1.1);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHearts() {
  for (const h of floatingHearts) {
    ctx.save();
    ctx.globalAlpha = h.life;
    drawHeart(h.x, h.y, h.size, h.hue);
    ctx.restore();
  }
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

  ctx.strokeStyle = `rgba(255, 200, 230, ${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 14 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGarden() {
  // Garden gradient
  const gardenGrad = ctx.createLinearGradient(0, PLAY_HEIGHT - 4, 0, H);
  gardenGrad.addColorStop(0, 'rgba(255, 214, 245, 0.0)');
  gardenGrad.addColorStop(0.15, 'rgba(80, 50, 130, 0.95)');
  gardenGrad.addColorStop(1, 'rgba(20, 10, 60, 1)');
  ctx.fillStyle = gardenGrad;
  ctx.fillRect(0, PLAY_HEIGHT - 4, W, GARDEN_HEIGHT + 4);

  // Sparkle line at top
  ctx.strokeStyle = 'rgba(255, 230, 168, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -frame * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, PLAY_HEIGHT);
  ctx.lineTo(W, PLAY_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cloud platform
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  for (let i = 0; i < 6; i++) {
    const cx = (W / 6) * (i + 0.5);
    const cy = PLAY_HEIGHT + 12;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Label
  ctx.fillStyle = 'rgba(255, 230, 168, 0.95)';
  ctx.font = `bold ${Math.max(16, Math.min(22, W * 0.018))}px 'Comic Sans MS', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Lunar Garden', 24, PLAY_HEIGHT - 12);

  // Counter
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(18, Math.min(26, W * 0.022))}px 'Comic Sans MS', sans-serif`;
  ctx.textAlign = 'right';
  const counterY = 36;
  ctx.fillText(`${totalCollected}`, W - 24, counterY);
  ctx.font = `${Math.max(12, Math.min(16, W * 0.013))}px 'Comic Sans MS', sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('moons collected', W - 24, counterY + 18);
  ctx.textAlign = 'left';

  // Hearts every 10
  const hearts = Math.floor(totalCollected / 10);
  for (let i = 0; i < Math.min(hearts, 10); i++) {
    drawHeart(W - 30 - i * 22, counterY + 38, 14, '#ff8fcf');
  }
}

function drawGardenMoons() {
  for (const c of collected) {
    const bob = c.arrived ? Math.sin(c.glowPhase) * 2 : 0;
    const settle = 1 + c.settle * 0.2;
    drawMoon(c.x, c.y + bob, c.r * settle, c.color, Math.sin(c.glowPhase) * 0.5 + 0.5, c.special, 0);
  }
}

// Helpers
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// === Loop ===
let lastT = performance.now();
function loop(t) {
  const dt = Math.min(33, t - lastT);
  lastT = t;
  update(dt);
  drawBackground();
  drawShootingStars();
  for (const m of moons) {
    drawMoon(m.x, m.y + Math.sin(m.bobPhase) * 6, m.r, m.color, Math.sin(m.glowPhase) * 0.5 + 0.5, m.special, m.blinking);
  }
  drawParticles();
  drawHearts();
  drawTouchIndicator();
  drawLuna(luna.x, luna.y);
  drawGarden();
  drawGardenMoons();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Register the shared Lunar Adventures service worker (lives at the root)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../sw.js').catch(() => {});
  });
}

// Resume audio context if it gets suspended (iOS sometimes does this)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
});
