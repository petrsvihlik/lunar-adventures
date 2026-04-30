// === Lunar Adventures shared library ===
// Audio, animated sky, sprite drawing, palette. Used by all games.

window.Lunar = (function () {
  // ---------- Audio ----------
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

  function playBoing(up = true) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    const a = up ? 280 : 700;
    const b = up ? 700 : 280;
    o.frequency.setValueAtTime(a, t);
    o.frequency.exponentialRampToValueAtTime(b, t + 0.18);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(masterGain);
    o.start(t);
    o.stop(t + 0.32);
  }

  function playYum() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const notes = [523.25, 659.25, 880.0];
    notes.forEach((n, i) => setTimeout(() => playChime(n, 0.22), i * 70));
  }

  function startAmbient() {
    if (!audioCtx || ambientStarted) return;
    ambientStarted = true;
    const padGain = audioCtx.createGain();
    padGain.gain.value = 0;
    padGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 4);
    padGain.connect(masterGain);
    const chord = [130.81, 196.0, 261.63, 329.63, 392.0];
    for (const f of chord) {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const o2 = audioCtx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 1.004;
      const og = audioCtx.createGain();
      og.gain.value = 1 / chord.length;
      o.connect(og);
      o2.connect(og);
      og.connect(padGain);
      o.start();
      o2.start();
    }
    const lfo = audioCtx.createOscillator();
    const lfoG = audioCtx.createGain();
    lfoG.gain.value = 0.015;
    lfo.frequency.value = 0.08;
    lfo.connect(lfoG).connect(padGain.gain);
    lfo.start();
  }

  // Resume audio on tab return
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });

  // ---------- Constants ----------
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
  const MOON_COLORS = [
    ['#fff5d6', '#ffd699', '#ffb868'], // butter
    ['#ffe0ec', '#ffb3d1', '#ff7eb0'], // pink
    ['#e0f0ff', '#a8d8ff', '#6fb0f0'], // sky
    ['#ece0ff', '#c5a8ff', '#9b7ee8'], // lavender
    ['#e0ffe8', '#a8ffc8', '#6fe89b'], // mint
    ['#fff0e0', '#ffc8a8', '#ff9b6f'], // peach
  ];

  // ---------- Sky ----------
  function makeSky(W, H) {
    const stars = [];
    const count = Math.round((W * H) / 8000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.04,
        hue: Math.random() < 0.15 ? 'warm' : 'white',
      });
    }
    const nebulae = [];
    for (let i = 0; i < 4; i++) {
      nebulae.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.85,
        r: 180 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.07,
        hue: Math.random() < 0.5 ? 'pink' : 'blue',
        alpha: 0.05 + Math.random() * 0.06,
      });
    }
    return { stars, nebulae, shootingStars: [], shootingTimer: 240 };
  }

  function rebuildSky(sky, W, H) {
    Object.assign(sky, makeSky(W, H));
  }

  function spawnShootingStar(sky, W, H) {
    const fromLeft = Math.random() < 0.5;
    sky.shootingStars.push({
      x: fromLeft ? -30 : W + 30,
      y: 50 + Math.random() * (H * 0.5),
      vx: (fromLeft ? 1 : -1) * (8 + Math.random() * 4),
      vy: 1.5 + Math.random() * 1.5,
      trail: [],
    });
  }

  function updateSky(sky, W, H) {
    for (const n of sky.nebulae) {
      n.x += n.vx;
      if (n.x < -n.r) n.x = W + n.r;
      if (n.x > W + n.r) n.x = -n.r;
    }
    for (const s of sky.stars) s.twinkle += s.twinkleSpeed;
    sky.shootingTimer--;
    if (sky.shootingTimer <= 0) {
      spawnShootingStar(sky, W, H);
      sky.shootingTimer = 280 + Math.random() * 380;
    }
    for (let i = sky.shootingStars.length - 1; i >= 0; i--) {
      const ss = sky.shootingStars[i];
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > 12) ss.trail.shift();
      ss.x += ss.vx;
      ss.y += ss.vy;
      if (ss.x < -120 || ss.x > W + 120 || ss.y > H + 120) sky.shootingStars.splice(i, 1);
    }
  }

  function drawSky(ctx, sky, W, H) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080828');
    bg.addColorStop(0.5, '#1a1850');
    bg.addColorStop(1, '#2a1a5a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    for (const n of sky.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      if (n.hue === 'pink') {
        g.addColorStop(0, `rgba(255, 143, 207, ${n.alpha})`);
        g.addColorStop(1, 'rgba(255, 143, 207, 0)');
      } else {
        g.addColorStop(0, `rgba(143, 200, 255, ${n.alpha})`);
        g.addColorStop(1, 'rgba(143, 200, 255, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of sky.stars) {
      const tw = (Math.sin(s.twinkle) + 1) / 2;
      const a = 0.3 + tw * 0.65;
      ctx.fillStyle = s.hue === 'warm' ? `rgba(255, 230, 168, ${a})` : `rgba(255, 255, 255, ${a})`;
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

    for (const ss of sky.shootingStars) {
      ctx.lineCap = 'round';
      for (let j = 1; j < ss.trail.length; j++) {
        const a = (j / ss.trail.length) * 0.9;
        ctx.strokeStyle = `rgba(255, 245, 200, ${a})`;
        ctx.lineWidth = (j / ss.trail.length) * 3 + 0.5;
        ctx.beginPath();
        ctx.moveTo(ss.trail[j - 1].x, ss.trail[j - 1].y);
        ctx.lineTo(ss.trail[j].x, ss.trail[j].y);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff5d6';
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Helpers ----------
  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function drawStarShape(ctx, x, y, inner, outer, points = 5) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawHeart(ctx, x, y, size, color) {
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

  // ---------- Smiley moon ----------
  function drawMoon(ctx, x, y, r, color, glow = 0.5, special = false, blinking = 0, frame = 0) {
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

    const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
    body.addColorStop(0, color[0]);
    body.addColorStop(0.7, color[1]);
    body.addColorStop(1, color[2] || color[1]);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexA(color[2] || color[1], 0.3);
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.13, 0, Math.PI * 2);
    ctx.arc(x - r * 0.25, y + r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.1, y + r * 0.4, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.strokeStyle = '#c75c8c';
    ctx.lineWidth = Math.max(1.4, r * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.15, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = hexA('#ff8fcf', 0.45);
    ctx.beginPath();
    ctx.arc(x - r * 0.55, y + r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.arc(x + r * 0.55, y + r * 0.15, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y - r * 0.5, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hungry moon — draws an indicator showing what color star it wants
  function drawHungryMoon(ctx, x, y, r, color, wantColor, glow, blinking, frame) {
    drawMoon(ctx, x, y, r, color, glow, false, blinking, frame);
    // Floating wanted-star above the moon
    const sx = x + r * 0.85;
    const sy = y - r * 0.85 + Math.sin(frame * 0.06) * 3;
    const sr = r * 0.32;
    // Bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wantColor[1];
    drawStarShape(ctx, sx, sy, sr * 0.45, sr);
  }

  // ---------- Luna fairy ----------
  function drawLuna(ctx, x, y, frame, wingPhase, trail) {
    if (trail) {
      for (const t of trail) {
        ctx.fillStyle = `rgba(255, 230, 168, ${t.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4 * t.life + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const auraR = 50 + Math.sin(frame * 0.06) * 4;
    const aura = ctx.createRadialGradient(x, y, 5, x, y, auraR);
    aura.addColorStop(0, 'rgba(255, 248, 200, 0.55)');
    aura.addColorStop(0.6, 'rgba(255, 200, 230, 0.2)');
    aura.addColorStop(1, 'rgba(255, 200, 230, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, auraR, 0, Math.PI * 2);
    ctx.fill();

    const flap = Math.sin(wingPhase) * 0.4;
    const wg = ctx.createRadialGradient(x - 18, y - 5, 2, x - 18, y - 5, 22);
    wg.addColorStop(0, 'rgba(255, 240, 250, 0.95)');
    wg.addColorStop(1, 'rgba(255, 200, 230, 0.4)');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.ellipse(x - 16, y - 4, 14, 22 + flap * 6, -0.3 - flap * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 16, y - 4, 14, 22 + flap * 6, 0.3 + flap * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x - 16, y - 4, 8, 14, -0.3 - flap * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + 16, y - 4, 8, 14, 0.3 + flap * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const dg = ctx.createLinearGradient(x, y - 2, x, y + 22);
    dg.addColorStop(0, '#ffb3d9');
    dg.addColorStop(1, '#ff7eb0');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x + 15, y + 20);
    ctx.lineTo(x - 15, y + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff5d6';
    ctx.fillRect(x - 15, y + 18, 30, 2.5);

    ctx.fillStyle = '#ffe0c2';
    ctx.beginPath();
    ctx.arc(x - 11, y + 6, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 11, y + 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y - 9, 10, 0, Math.PI * 2);
    ctx.fill();

    const hairBob = Math.sin(frame * 0.08) * 0.5;
    ctx.fillStyle = '#6b3aa0';
    ctx.beginPath();
    ctx.arc(x, y - 11, 11, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 9, y - 8, 4, 0, Math.PI * 2);
    ctx.arc(x + 9, y - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe6a8';
    drawStarShape(ctx, x + 7, y - 14 + hairBob, 3, 5);

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

    ctx.fillStyle = 'rgba(255, 143, 207, 0.5)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c75c8c';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - 5, 2.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  // ---------- Particle helper ----------
  function makeParticleBurst(particles, x, y, color, count = 16) {
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

  function updateParticles(particles) {
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
  }

  function drawParticles(ctx, particles) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.type === 'star') {
        ctx.fillStyle = p.color;
        drawStarShape(ctx, 0, 0, p.size * 0.4, p.size * 1.1);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- Easing ----------
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  return {
    audio: { ensureAudio, playChime, playSparkle, playCelebration, playBoing, playYum, startAmbient },
    sky: { makeSky, rebuildSky, updateSky, drawSky },
    draw: {
      drawMoon, drawHungryMoon, drawLuna, drawStar: drawStarShape, drawHeart, hexA,
      makeParticleBurst, updateParticles, drawParticles,
    },
    util: { easeInOutCubic, lerp },
    NOTES,
    MOON_COLORS,
  };
})();
