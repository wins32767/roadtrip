/* ═══════════════════════════════════════════════════════
   ROAMER — Globe renderers
   1. Main hero globe  (#globe-canvas, entry screen)
   2. Mini card globes (.card-mini-globe, explore section)
   Both share the same orthographic projection math.
   ═══════════════════════════════════════════════════════ */

/* ─── Shared projection helper ─── */
function orthoProject(lat, lng, rotDeg, cx, cy, R) {
  const phi   = (90 - lat) * Math.PI / 180;
  const theta = (lng + rotDeg) * Math.PI / 180;
  const x3 = R * Math.sin(phi) * Math.cos(theta);
  const y3 = R * Math.cos(phi);
  const z3 = R * Math.sin(phi) * Math.sin(theta);
  return { x: cx + x3, y: cy - y3, z3, visible: z3 > -R * 0.1 };
}

/* ─── 1. Hero globe ─── */
(function() {
  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, R, rot = 0;

  // Decorative route shown on the hero globe
  const HERO_ROUTE = [
    [51.5, -0.12],   // London
    [48.8,  2.35],   // Paris
    [41.9, 12.5],    // Rome
    [37.9, 23.7],    // Athens
    [25.2, 55.3],    // Dubai
    [ 1.35,103.8],   // Singapore
    [35.7, 139.7],   // Tokyo
  ];

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    cx = W * 0.42;
    cy = H * 0.48;
    R  = Math.min(W, H) * 0.38;
  }

  function drawGrid(rotDeg) {
    ctx.save();
    for (let lat = -75; lat <= 75; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = orthoProject(lat, lon, rotDeg, cx, cy, R);
        if (!p.visible) { first = true; continue; }
        first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        first = false;
      }
      ctx.strokeStyle = 'rgba(125,211,252,0.055)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -85; lat <= 85; lat += 3) {
        const p = orthoProject(lat, lon, rotDeg, cx, cy, R);
        if (!p.visible) { first = true; continue; }
        first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        first = false;
      }
      ctx.strokeStyle = 'rgba(125,211,252,0.04)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoute(rotDeg) {
    const pts = HERO_ROUTE.map(([la, lo]) => orthoProject(la, lo, rotDeg, cx, cy, R));
    ctx.save();
    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      if (!p.visible) { started = false; continue; }
      started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      started = true;
    }
    const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length-1].x, pts[pts.length-1].y);
    grad.addColorStop(0,   'rgba(125,211,252,0.55)');
    grad.addColorStop(0.5, 'rgba(162,167,255,0.55)');
    grad.addColorStop(1,   'rgba(192,132,252,0.5)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    [pts[0], pts[pts.length - 1]].forEach((p, i) => {
      if (!p.visible) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? 'rgba(125,211,252,0.3)' : 'rgba(192,132,252,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#7dd3fc' : '#c084fc';
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGlobe(rotDeg) {
    ctx.clearRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.05);
    grd.addColorStop(0,    'transparent');
    grd.addColorStop(0.85, 'rgba(125,211,252,0.04)');
    grd.addColorStop(1,    'rgba(125,211,252,0.12)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    drawGrid(rotDeg);
    drawRoute(rotDeg);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125,211,252,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  let lastTime = 0;
  function frame(ts) {
    const dt = ts - lastTime; lastTime = ts;
    rot += dt * 0.004;
    drawGlobe(rot);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();


/* ─── 2. Mini card globes ─── */
document.querySelectorAll('.card-mini-globe').forEach(canvas => {
  const ctx  = canvas.getContext('2d');
  const hue  = parseInt(canvas.dataset.hue);
  let rot = Math.random() * 360;
  let W, H;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.6, cy = H * 0.5, R = H * 0.72;

    // Subtle background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bg.addColorStop(0, `hsla(${hue},60%,12%,0.6)`);
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Lat/lon grid
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip();
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let f = true;
      for (let lon = -180; lon <= 180; lon += 6) {
        const p = orthoProject(lat, lon, rot, cx, cy, R);
        if (!p.visible) { f = true; continue; }
        f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        f = false;
      }
      ctx.strokeStyle = `hsla(${hue},70%,70%,0.08)`;
      ctx.lineWidth = 0.6; ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let f = true;
      for (let lat = -80; lat <= 80; lat += 4) {
        const p = orthoProject(lat, lon, rot, cx, cy, R);
        if (!p.visible) { f = true; continue; }
        f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        f = false;
      }
      ctx.strokeStyle = `hsla(${hue},70%,70%,0.06)`;
      ctx.lineWidth = 0.6; ctx.stroke();
    }
    ctx.restore();

    // Rim
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.strokeStyle = `hsla(${hue},70%,70%,0.12)`; ctx.lineWidth = 1; ctx.stroke();
  }

  function loop() { rot += 0.06; draw(); requestAnimationFrame(loop); }
  resize();
  loop();
});
