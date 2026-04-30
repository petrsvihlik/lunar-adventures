// === Lunar Adventures menu — starry background + PWA install ===

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
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
  rebuild();
}

const stars = [];
const nebulae = [];
const shootingStars = [];
let frame = 0;
let shootingTimer = 200;

function rebuild() {
  stars.length = 0;
  const count = Math.round((W * H) / 8000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.015 + Math.random() * 0.04,
      hue: Math.random() < 0.15 ? 'warm' : 'white',
    });
  }
  nebulae.length = 0;
  for (let i = 0; i < 4; i++) {
    nebulae.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 200 + Math.random() * 250,
      vx: (Math.random() - 0.5) * 0.06,
      hue: Math.random() < 0.5 ? 'pink' : 'blue',
      alpha: 0.05 + Math.random() * 0.06,
    });
  }
}

resize();
window.addEventListener('resize', resize);

function spawnShootingStar() {
  const fromLeft = Math.random() < 0.5;
  shootingStars.push({
    x: fromLeft ? -30 : W + 30,
    y: 50 + Math.random() * (H * 0.5),
    vx: (fromLeft ? 1 : -1) * (8 + Math.random() * 4),
    vy: 1.5 + Math.random() * 1.5,
    trail: [],
  });
}

function frameLoop() {
  frame++;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#080828');
  bg.addColorStop(0.5, '#1a1850');
  bg.addColorStop(1, '#2a1a5a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (const n of nebulae) {
    n.x += n.vx;
    if (n.x < -n.r) n.x = W + n.r;
    if (n.x > W + n.r) n.x = -n.r;
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

  for (const s of stars) {
    s.twinkle += s.twinkleSpeed;
    const tw = (Math.sin(s.twinkle) + 1) / 2;
    const a = 0.3 + tw * 0.65;
    ctx.fillStyle = s.hue === 'warm'
      ? `rgba(255, 230, 168, ${a})`
      : `rgba(255, 255, 255, ${a})`;
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

  shootingTimer--;
  if (shootingTimer <= 0) {
    spawnShootingStar();
    shootingTimer = 280 + Math.random() * 400;
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.trail.push({ x: ss.x, y: ss.y });
    if (ss.trail.length > 12) ss.trail.shift();
    ss.x += ss.vx;
    ss.y += ss.vy;
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
    if (ss.x < -120 || ss.x > W + 120 || ss.y > H + 120) shootingStars.splice(i, 1);
  }

  requestAnimationFrame(frameLoop);
}
requestAnimationFrame(frameLoop);

// === PWA: service worker + install ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

let deferredInstall = null;
const installBtn = document.getElementById('install');
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  if (installBtn) installBtn.hidden = false;
});
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    installBtn.hidden = true;
  });
}
window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.hidden = true;
  deferredInstall = null;
});
