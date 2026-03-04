/* ═══════════════════════════════════════════════════════
   ROAMER — Game engine
   Depends on: roamer-data.js (ROUTES, DAILY_INDEX)
   ═══════════════════════════════════════════════════════ */

// ── State ──
// screen: "home" | "core" | "play"
let screen = "home";
let currentRoute = null;
let cards = [];
let assignments = {}; // slot index -> card (derived from orderPicks)
let orderPicks = [];  // cards in tap order: orderPicks[0] = stop 1, etc.
let revealed = false;
let score = null;
let history = [];
let leafletMap = null;
let playSource = "home";
let mapCollapsed = false;
let lightboxIndex = null;
let confirmedDecoyNamesGlobal = new Set(); // persists across render calls

const MAX_GUESSES = 3;
let guessesRemaining = MAX_GUESSES;
let guessHistory = [];
let lastFeedback = {};
let lastGuessAssignments = {};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame(r, source) {
  currentRoute = r;
  playSource = source || "home";
  cards = shuffle([
    ...r.stops.map(s => ({ ...s, isDecoy: false })),
    ...r.decoys.map(d => ({ ...d, isDecoy: true, lat: 0, lng: 0 })),
  ]);
  assignments = {};
  orderPicks = [];
  revealed = false;
  score = null;
  guessesRemaining = MAX_GUESSES;
  guessHistory = [];
  lastFeedback = {};
  lastGuessAssignments = {};
  mapCollapsed = false;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  screen = "play";
  render();
  // Animation starts via render() -> startGeoAnimation()
}

// goBack defined in wiring section below

function selectCard(card) {
  selectedCard = (selectedCard?.name === card.name) ? null : card;
  render();
}

function slotIsLocked(i) {
  if (guessHistory.length === 0) return false;
  return guessHistory[guessHistory.length-1].feedback[i] === "green";
}

// Derive assignments map from orderPicks array
function syncAssignments() {
  assignments = {};
  orderPicks.forEach((card, i) => { assignments[i] = card; });
}

// Tap a photo card: if not yet picked, add to end of sequence.
// If already picked, remove it and everything after it (reset from that point).
// Locked (green) positions are immovable.
function tapCard(card) {
  if (revealed) return;
  const existingIdx = orderPicks.findIndex(c => c.name === card.name);
  if (existingIdx !== -1) {
    // If this slot is locked, do nothing
    if (slotIsLocked(existingIdx)) return;
    // Remove from this position onward, keeping locked greens
    const newPicks = [];
    for (let i = 0; i < orderPicks.length; i++) {
      if (i < existingIdx) newPicks.push(orderPicks[i]); // keep before
      else if (slotIsLocked(i)) newPicks.push(orderPicks[i]); // keep locked
      // drop everything from existingIdx onward that isn't locked
    }
    orderPicks = newPicks;
  } else {
    // Find the next unfilled non-locked slot
    const nextSlot = orderPicks.length;
    if (nextSlot >= currentRoute.stops.length) return; // all filled
    orderPicks.push(card);
  }
  syncAssignments();
  render();
  // Redraw geo map to show updated assignments
  setTimeout(redrawGeoMap, 20);
}

function checkAnswers() {
  const feedback = {};
  let correct = 0;
  currentRoute.stops.forEach((stop, i) => {
    const placed = assignments[i];
    if (!placed) return;
    if (placed.name === stop.name) { feedback[i] = "green"; correct++; }
    else if (!placed.isDecoy) feedback[i] = "yellow";
    else feedback[i] = "red";
  });
  lastFeedback = feedback;
  lastGuessAssignments = { ...assignments };
  guessHistory.push({ assignments: { ...assignments }, feedback: { ...feedback } });
  guessesRemaining--;
  if (guessHistory.length === 1) mapCollapsed = true; // auto-collapse after first guess
  const won = correct === currentRoute.stops.length;
  const lost = guessesRemaining === 0;
  if (won || lost) {
    score = correct;
    revealed = true;
    history.push({ route: currentRoute.name, score: correct, total: currentRoute.stops.length });
    render();
    setTimeout(initLeafletMap, 50);
  } else {
    // Keep only locked (green) picks
    const newPicks = [];
    currentRoute.stops.forEach((_, i) => {
      if (feedback[i] === "green") newPicks[i] = assignments[i];
    });
    // Rebuild orderPicks: greens stay in place, rest cleared
    orderPicks = currentRoute.stops.map((_, i) => newPicks[i]).filter(Boolean);
    syncAssignments();
    render();
  }
}

function initLeafletMap() {
  const el = document.getElementById("leaflet-map");
  if (!el || !window.L) return;
  const map = L.map(el, { zoomControl: true, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
  const bounds = L.latLngBounds(currentRoute.stops.map(s => [s.lat, s.lng]));
  map.fitBounds(bounds.pad(0.25));
  L.polyline(currentRoute.stops.map(s => [s.lat, s.lng]), { color: "rgba(125,211,252,0.7)", weight: 3, dashArray: "8 5" }).addTo(map);
  currentRoute.stops.forEach((stop, i) => {
    const correct = assignments[i]?.name === stop.name;
    const col = correct ? "#4ade80" : "#f87171";
    const bg = correct ? "rgba(22,101,52,0.85)" : "rgba(127,29,29,0.85)";
    const icon = L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid ${col};display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;font-family:'DM Sans',sans-serif;">${correct ? "✓" : "✗"}</div>
        <div style="margin-top:3px;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:${col};text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;">${stop.name}</div>
      </div>`,
      iconSize: [140, 50], iconAnchor: [70, 14],
    });
    L.marker([stop.lat, stop.lng], { icon, interactive: false }).addTo(map);
  });
  leafletMap = map;
  setTimeout(() => map.invalidateSize(), 200);
}

// ── OLD REPLACED ──
function drawRouteCanvas_OLD() {
  const canvas = document.getElementById("route-canvas");
  if (!canvas) return;
  const W = 600, H = 300, padding = 52;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.cssText = "width:100%;max-width:600px;height:auto;display:block;margin:0 auto;";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const stops = currentRoute.stops;
  const lats = stops.map(s=>s.lat), lngs = stops.map(s=>s.lng);
  const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
  const midLat = (minLat+maxLat)/2, cosLat = Math.cos(midLat*Math.PI/180);
  const lngRange = maxLng-minLng||1, latRange = maxLat-minLat||1;
  const geoAspect = (lngRange*cosLat)/latRange, boxAspect = (W-padding*2)/(H-padding*2);
  const scale = geoAspect>boxAspect ? (W-padding*2)/(lngRange*cosLat) : (H-padding*2)/latRange;
  const cx=(minLng+maxLng)/2, cy=(minLat+maxLat)/2;
  const pts = stops.map(s=>({ x: W/2+(s.lng-cx)*cosLat*scale, y: H/2-(s.lat-cy)*scale }));
  const minDist = 46;
  for (let pass=0; pass<6; pass++) for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
    const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y, dist=Math.sqrt(dx*dx+dy*dy);
    if (dist<minDist&&dist>0.1) { const push=(minDist-dist)/2, nx=dx/dist, ny=dy/dist; pts[i].x-=nx*push; pts[i].y-=ny*push; pts[j].x+=nx*push; pts[j].y+=ny*push; }
  }
  ctx.fillStyle="#07101f"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(125,211,252,0.04)";
  for (let x=16;x<W;x+=24) for (let y=16;y<H;y+=24) { ctx.beginPath(); ctx.arc(x,y,0.9,0,Math.PI*2); ctx.fill(); }
  ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle="rgba(125,211,252,0.07)"; ctx.lineWidth=14; ctx.lineCap="round"; ctx.stroke();
  ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle="rgba(125,211,252,0.45)"; ctx.lineWidth=1.8; ctx.setLineDash([6,5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font="10px 'DM Sans',sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="rgba(125,211,252,0.3)";
  currentRoute.travelTimes.forEach((t,i)=>{
    if(i>=pts.length-1)return;
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    const dx=pts[i+1].x-pts[i].x, dy=pts[i+1].y-pts[i].y, len=Math.sqrt(dx*dx+dy*dy)||1;
    ctx.fillText(t, mx+(-dy/len*16), my+(dx/len*16));
  });
  const nodeR=22;
  pts.forEach((p,i)=>{
    const assigned=assignments[i], empty=!assigned;
    if(i===0){ctx.beginPath();ctx.arc(p.x,p.y,nodeR+8,0,Math.PI*2);ctx.strokeStyle="rgba(125,211,252,0.1)";ctx.lineWidth=1;ctx.stroke();}
    ctx.beginPath(); ctx.arc(p.x,p.y,nodeR,0,Math.PI*2);
    ctx.fillStyle = i===0&&empty?"rgba(125,211,252,0.08)":empty?"rgba(255,255,255,0.03)":"rgba(125,211,252,0.1)";
    ctx.fill();
    ctx.beginPath(); ctx.arc(p.x,p.y,nodeR,0,Math.PI*2);
    if(i===0){ctx.strokeStyle="rgba(125,211,252,0.7)";ctx.lineWidth=2;ctx.setLineDash([]);}
    else if(empty){ctx.strokeStyle="rgba(255,255,255,0.18)";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);}
    else{ctx.strokeStyle="rgba(125,211,252,0.6)";ctx.lineWidth=2;ctx.setLineDash([]);}
    ctx.stroke(); ctx.setLineDash([]);
    if(empty){
      ctx.fillStyle=i===0?"rgba(125,211,252,0.8)":"rgba(255,255,255,0.3)";
      ctx.font=`${i===0?"bold ":""}12px 'DM Sans',sans-serif`;
      ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(i+1),p.x,p.y);
    } else {
      const img=new Image(); img.crossOrigin="anonymous";
      img.onload=()=>{
        ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,nodeR-2,0,Math.PI*2); ctx.clip();
        const d=(nodeR-2)*2; ctx.drawImage(img,p.x-(nodeR-2),p.y-(nodeR-2),d,d); ctx.restore();
        ctx.beginPath(); ctx.arc(p.x,p.y,nodeR,0,Math.PI*2);
        ctx.strokeStyle="rgba(125,211,252,0.7)"; ctx.lineWidth=2; ctx.stroke();
      };
      img.src=assigned.photo;
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font="11px 'DM Sans',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(i+1),p.x,p.y);
    }
  });
  ctx.font="bold 9px 'DM Sans',sans-serif"; ctx.textAlign="center";
  ctx.fillStyle="rgba(125,211,252,0.65)"; ctx.fillText("START",pts[0].x,pts[0].y-nodeR-10);
  ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.fillText("END",pts[pts.length-1].x,pts[pts.length-1].y-nodeR-10);
}

/* ═══════════════════════════════════════════════════════════
   GEO MAP SYSTEM — abstract world map with zoom animation
   ═══════════════════════════════════════════════════════════ */

// ── Simplified world coastline rings [lng, lat] ──
const GEO_RINGS = [[[-67,47],[-70,46],[-72,45],[-74,45],[-76,44],[-79,43],[-80,43],[-82,42],[-83,42],[-83,44],[-84,46],[-85,47],[-88,48],[-95,49],[-100,49],[-110,49],[-115,49],[-123,49],[-124,49],[-124,48],[-124.5,47],[-124.5,45],[-124,44],[-124.5,42],[-124.5,40],[-124,39],[-123,38],[-123,37],[-122,36],[-121,35],[-120,34],[-118,34],[-118,33],[-117,32],[-114,32],[-111,31],[-108,31],[-106,32],[-104,29],[-101,28],[-99,27],[-97,27],[-97,26],[-96,27],[-94,29],[-93,29],[-90,28],[-90,29],[-88,30],[-85,30],[-82,29],[-82,26],[-82,24],[-81,24],[-81,25],[-80,25],[-80,27],[-80,29],[-80,31],[-80,32],[-79,33],[-78,34],[-77,34],[-76,35],[-76,37],[-76,38],[-75,39],[-74,40],[-73,41],[-71,42],[-70,43],[-69,44],[-68,44],[-67,47]],[[-141,60],[-148,60],[-152,58],[-158,57],[-162,60],[-164,63],[-168,66],[-165,60],[-160,59],[-156,60],[-153,60],[-141,68],[-141,60]],[[-117,32],[-116,31],[-114,30],[-112,28],[-110,26],[-109,24],[-110,23],[-117,32]],[[-81,24],[-81,25],[-80,25],[-80,24],[-81,24]],[[-117,32],[-110,23],[-109,23],[-105,20],[-97,22],[-94,22],[-92,21],[-90,21],[-89,21],[-88,21],[-87,20],[-86,18],[-87,18],[-88,18],[-90,21],[-92,21],[-96,21],[-97,20],[-92,19],[-90,18],[-88,16],[-83,10],[-77,8],[-77,9],[-83,11],[-88,16],[-90,18],[-92,19],[-96,22],[-97,26],[-97,27],[-99,27],[-101,28],[-104,29],[-106,32],[-108,31],[-111,31],[-117,32]],[[-25,83],[-44,76],[-52,70],[-64,66],[-57,63],[-52,67],[-43,70],[-24,72],[-18,76],[-15,82],[-25,83]],[[-77,8],[-72,12],[-72,10],[-68,6],[-62,4],[-58,2],[-62,-45],[-60,-38],[-57,-38],[-53,-34],[-50,-33],[-48,-28],[-45,-24],[-42,-23],[-39,-20],[-37,-14],[-35,-10],[-35,-4],[-40,2],[-50,5],[-52,-3],[-52,-10],[-56,-15],[-60,-22],[-62,-32],[-65,-38],[-66,-44],[-68,-54],[-65,-55],[-70,-30],[-70,-22],[-70,-18],[-72,-16],[-75,-14],[-77,-12],[-80,-8],[-80,-4],[-78,-2],[-80,2],[-80,6],[-77,8]],[[-5,48],[-3,50],[-2,51],[0,51],[1,51],[2,51],[3,51],[4,52],[8,57],[8,55],[10,55],[12,56],[10,58],[8,57],[5,57],[5,58],[8,62],[12,65],[15,68],[18,69],[20,70],[24,70],[26,68],[28,65],[26,60],[24,58],[22,58],[20,59],[18,57],[15,57],[14,55],[12,56],[10,55],[8,54],[7,51],[6,51],[5,51],[3,51],[2,51],[2,44],[3,44],[4,44],[5,44],[6,44],[7,44],[8,44],[9,41],[10,40],[10,38],[11,38],[12,38],[13,38],[14,38],[15,38],[16,38],[16,40],[16,41],[15,42],[14,44],[7,44],[6,44],[5,46],[6,47],[7,47],[8,47],[10,47],[12,47],[13,46],[14,46],[14,44],[13,44],[12,44],[11,44],[10,44],[9,44],[8,44],[7,44],[6,43],[5,43],[3,43],[-2,44],[-4,44],[-5,44],[-8,44],[-9,44],[-9,42],[-9,39],[-9,37],[-6,37],[-5,36],[-2,37],[-1,37],[0,38],[1,40],[3,42],[3,43],[0,44],[-1,44],[-2,44],[-2,47],[-5,48]],[[14,46],[14,44],[16,42],[18,41],[20,41],[20,40],[20,38],[22,37],[24,38],[26,40],[26,41],[26,42],[24,43],[22,44],[20,45],[18,46],[14,46]],[[20,38],[20,37],[22,36],[26,36],[28,37],[26,38],[24,37],[22,37],[20,38]],[[26,38],[26,42],[30,42],[34,42],[38,42],[42,42],[44,40],[42,38],[40,38],[38,37],[36,36],[32,36],[28,37],[26,38]],[[14,54],[14,52],[16,50],[18,50],[20,50],[22,56],[26,68],[28,70],[30,60],[30,58],[28,56],[24,58],[26,60],[28,60],[26,58],[24,58],[22,56],[18,54],[14,54]],[[28,70],[28,54],[30,46],[36,47],[42,52],[60,56],[80,54],[100,50],[110,50],[120,48],[130,50],[140,60],[140,50],[138,46],[134,36],[130,34],[126,34],[126,38],[130,42],[132,44],[138,46],[140,68],[140,70],[120,72],[100,73],[80,74],[60,72],[40,70],[28,70]],[[-5,36],[-5,32],[-8,28],[-12,24],[-16,20],[-16,12],[-14,10],[-10,6],[-4,5],[0,5],[5,2],[10,-8],[14,-22],[18,-30],[22,-34],[28,-34],[30,-25],[34,-18],[36,-5],[40,-1],[42,2],[44,4],[44,8],[42,12],[38,22],[37,22],[35,28],[33,30],[30,30],[25,31],[20,34],[15,37],[10,37],[5,37],[0,36],[-5,36]],[[44,-12],[44,-24],[50,-25],[50,-16],[44,-12]],[[34,32],[34,26],[36,22],[38,20],[42,14],[44,12],[48,12],[52,12],[58,14],[58,22],[56,24],[50,26],[44,28],[42,28],[38,30],[36,32],[34,32]],[[60,24],[68,28],[72,28],[74,32],[76,32],[80,32],[80,28],[82,26],[82,20],[82,14],[80,8],[78,8],[74,20],[72,22],[68,24],[60,24]],[[80,6],[78,8],[80,10],[82,8],[80,6]],[[96,20],[94,18],[96,8],[100,2],[104,2],[108,10],[106,14],[100,20],[96,20]],[[108,2],[108,6],[116,8],[118,8],[118,4],[108,2]],[[96,5],[98,2],[106,-2],[106,5],[96,5]],[[130,32],[130,34],[132,44],[141,44],[141,40],[140,38],[136,36],[134,35],[132,34],[130,32]],[[114,-22],[114,-26],[118,-32],[126,-34],[132,-34],[138,-36],[142,-38],[146,-38],[150,-38],[152,-34],[154,-32],[154,-28],[152,-26],[148,-22],[146,-20],[142,-18],[140,-16],[136,-12],[132,-12],[128,-14],[122,-18],[118,-20],[114,-22]],[[-84,22],[-82,23],[-78,23],[-75,22],[-74,20],[-75,20],[-78,20],[-82,22],[-84,22]],[[-74,18],[-74,20],[-72,20],[-68,20],[-68,18],[-74,18]],[[74,38],[74,36],[76,32],[80,28],[82,28],[88,28],[92,28],[96,28],[98,24],[100,22],[102,22],[104,22],[106,14],[108,16],[110,18],[114,22],[120,28],[122,32],[126,34],[126,40],[124,42],[122,46],[120,48],[116,48],[110,48],[106,48],[100,44],[96,44],[90,42],[86,44],[80,42],[74,38]]];

// ── Map state ──
let geoMapAnim = null; // animation frame handle
let geoPhase = 'globe'; // 'globe' | 'zooming' | 'flat' | 'revealed'

// Per-route viewport: center + zoom padding
function getRouteViewport(route) {
  const lats = route.stops.map(s => s.lat);
  const lngs = route.stops.map(s => s.lng);
  const routeSpanLat = Math.max(...lats) - Math.min(...lats) || 4;
  const routeSpanLng = Math.max(...lngs) - Math.min(...lngs) || 6;
  // Single viewport: readable nodes + surrounding coastline context
  const padLat = Math.max(5, routeSpanLat * 0.8);
  const padLng = Math.max(8, routeSpanLng * 1.0);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  return {
    minLat: centerLat - padLat,
    maxLat: centerLat + padLat,
    minLng: centerLng - padLng,
    maxLng: centerLng + padLng,
    centerLat,
    centerLng,
  };
}

// ── Projection helpers ──
// Globe: 3D orthographic projection
function globeProject(lat, lng, rotDeg, cx, cy, R) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + rotDeg) * Math.PI / 180;
  const x3 = R * Math.sin(phi) * Math.cos(theta);
  const y3 = R * Math.cos(phi);
  const z3 = R * Math.sin(phi) * Math.sin(theta);
  return { x: cx + x3, y: cy - y3, z3, visible: z3 > -R * 0.05 };
}

// Flat: simple equirectangular, no cos-lat correction
// cosLat param kept for API compat but not used — avoids any inconsistency
function flatProject(lat, lng, vp, W, H, _cosLat) {
  const latSpan = vp.maxLat - vp.minLat;
  const lngSpan = vp.maxLng - vp.minLng;
  const scaleByLat = H / latSpan;
  const scaleByLng = W / lngSpan;
  const scale = Math.min(scaleByLat, scaleByLng) * 0.88;
  const offX = W / 2 - vp.centerLng * scale;
  const offY = H / 2 + vp.centerLat * scale;
  return {
    x: lng * scale + offX,
    y: offY - lat * scale,
  };
}

// Interpolated project — t=0 globe, t=1 flat
function lerpProject(lat, lng, t, rotDeg, vp, W, H, cosLat, cx, cy, R) {
  const gp = globeProject(lat, lng, rotDeg, cx, cy, R);
  const fp = flatProject(lat, lng, vp, W, H, cosLat);
  // On globe: back-of-sphere points fade out. On flat map: all visible.
  const globeVis = gp.visible ? 1 : 0;
  const vis = globeVis + (1 - globeVis) * t; // smoothly reveal hidden points as t→1
  return {
    x: gp.x + (fp.x - gp.x) * t,
    y: gp.y + (fp.y - gp.y) * t,
    alpha: vis,
  };
}

// ── Main draw function ──
function drawGeoMap(t, rotDeg) {
  // t: 0=full globe, 1=full flat map
  const canvas = document.getElementById('route-canvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 300;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const vp = getRouteViewport(currentRoute);
  const cosLat = Math.cos(vp.centerLat * Math.PI / 180);
  const vpGeo = vp; // same viewport for land and nodes

  // Globe geometry
  const cx = W * 0.5, cy = H * 0.48;
  const R = Math.min(W, H) * (0.42 - t * 0.15); // globe shrinks as we zoom

  // ── Background ──
  // Water: deep blue, transitions from globe-dark to flat-ocean
  const waterA = `rgba(7,16,31,1)`;
  const waterB = `rgba(8,18,36,1)`;
  ctx.fillStyle = t < 0.5 ? waterA : waterB;
  ctx.fillRect(0, 0, W, H);

  // At globe phase: draw sphere background + glow
  if (t < 0.95) {
    const globeAlpha = Math.max(0, 1 - t * 1.6);
    // Ocean fill on sphere
    const grd = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R);
    grd.addColorStop(0, `rgba(12,28,56,${globeAlpha * 0.9})`);
    grd.addColorStop(1, `rgba(7,16,31,${globeAlpha})`);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    // Rim glow
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(125,211,252,${0.12 * globeAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // At flat phase: subtle ocean gradient covering whole canvas
  if (t > 0.3) {
    const flatAlpha = Math.min(1, (t - 0.3) / 0.7);
    const flatGrd = ctx.createLinearGradient(0, 0, W, H);
    flatGrd.addColorStop(0, `rgba(8,18,40,${flatAlpha * 0.6})`);
    flatGrd.addColorStop(1, `rgba(6,12,28,${flatAlpha * 0.6})`);
    ctx.fillStyle = flatGrd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Land polygons ──
  GEO_RINGS.forEach(ring => {
    if (ring.length < 3) return;
    ctx.beginPath();
    let started = false;
    ring.forEach(([lng, lat]) => {
      const p = lerpProject(lat, lng, t, rotDeg, vp, W, H, cosLat, cx, cy, R);
      if (p.alpha < 0.01) { started = false; return; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    });
    if (started) ctx.closePath();
    // Land fill: slightly lighter than ocean
    const landAlpha = t < 0.5
      ? 0.75  // opaque on globe
      : 0.75 + (t - 0.5) * 0.5; // more opaque as flat
    ctx.fillStyle = `rgba(18,32,56,${landAlpha})`;
    ctx.fill();
    // Border
    ctx.strokeStyle = `rgba(125,211,252,${0.08 + t * 0.08})`;
    ctx.lineWidth = t < 0.5 ? 0.5 : 0.7;
    ctx.stroke();
  });

  // ── Globe lat/lng grid (fades out during zoom) ──
  if (t < 0.7) {
    const gridAlpha = Math.max(0, (0.7 - t) / 0.7) * 0.06;
    ctx.strokeStyle = `rgba(125,211,252,${gridAlpha})`;
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 5) {
        const p = globeProject(lat, lng, rotDeg, cx, cy, R);
        if (!p.visible) { first = true; continue; }
        first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        first = false;
      }
      ctx.stroke();
    }
    for (let lng = -180; lng < 180; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -80; lat <= 80; lat += 4) {
        const p = globeProject(lat, lng, rotDeg, cx, cy, R);
        if (!p.visible) { first = true; continue; }
        first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        first = false;
      }
      ctx.stroke();
    }
  }

  // ── Flat grid (fades in) ──
  if (t > 0.5) {
    const gridAlpha = Math.min(1, (t - 0.5) / 0.5) * 0.04;
    ctx.strokeStyle = `rgba(125,211,252,${gridAlpha})`;
    ctx.lineWidth = 0.5;
    for (let lat = -80; lat <= 80; lat += 15) {
      ctx.beginPath();
      const a = flatProject(lat, vp.minLng - 10, vp, W, H, cosLat);
      const b = flatProject(lat, vp.maxLng + 10, vp, W, H, cosLat);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 15) {
      ctx.beginPath();
      const a = flatProject(-80, lng, vp, W, H, cosLat);
      const b = flatProject(80, lng, vp, W, H, cosLat);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // ── Route overlay (only when fully flat, t > 0.85) ──
  if (t > 0.85) {
    const routeAlpha = Math.min(1, (t - 0.85) / 0.15);
    const stops = currentRoute.stops;
    let pts = stops.map(s => flatProject(s.lat, s.lng, vp, W, H, cosLat));
    const nodeR = Math.max(16, Math.min(22, W / 28));

    // Label offset positions — nodes stay at true geo coords, only labels shift
    const labelPts = pts.map(p => ({ x: p.x, y: p.y }));
    const minLabelDist = nodeR * 2.4;
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < labelPts.length; i++) {
        for (let j = i + 1; j < labelPts.length; j++) {
          const dx = labelPts[j].x - labelPts[i].x, dy = labelPts[j].y - labelPts[i].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minLabelDist && dist > 0.01) {
            const push = (minLabelDist - dist) / 2;
            const nx = dx / dist, ny = dy / dist;
            labelPts[i] = { x: labelPts[i].x - nx * push, y: labelPts[i].y - ny * push };
            labelPts[j] = { x: labelPts[j].x + nx * push, y: labelPts[j].y + ny * push };
          }
        }
      }
    }

    // Route line glow
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = `rgba(125,211,252,${0.06 * routeAlpha})`;
    ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();

    // Route line
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = `rgba(125,211,252,${0.5 * routeAlpha})`;
    ctx.lineWidth = 1.8; ctx.setLineDash([6, 5]); ctx.stroke();
    ctx.setLineDash([]);

    // Travel times
    ctx.font = `10px 'DM Sans', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(125,211,252,${0.3 * routeAlpha})`;
    currentRoute.travelTimes.forEach((tt, i) => {
      if (i >= pts.length - 1) return;
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      ctx.fillText(tt, mx + (-dy/len*14), my + (dx/len*14));
    });

    // Stop nodes
    pts.forEach((p, i) => {
      const assigned = assignments[i], empty = !assigned;
      if (i === 0) {
        ctx.beginPath(); ctx.arc(p.x, p.y, nodeR + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(125,211,252,${0.12 * routeAlpha})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = empty
        ? (i === 0 ? `rgba(125,211,252,${0.09 * routeAlpha})` : `rgba(255,255,255,${0.03 * routeAlpha})`)
        : `rgba(125,211,252,${0.12 * routeAlpha})`;
      ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
      if (i === 0) {
        ctx.strokeStyle = `rgba(125,211,252,${0.75 * routeAlpha})`;
        ctx.lineWidth = 2; ctx.setLineDash([]);
      } else if (empty) {
        ctx.strokeStyle = `rgba(255,255,255,${0.18 * routeAlpha})`;
        ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      } else {
        ctx.strokeStyle = `rgba(125,211,252,${0.65 * routeAlpha})`;
        ctx.lineWidth = 2; ctx.setLineDash([]);
      }
      ctx.stroke(); ctx.setLineDash([]);

      if (empty) {
        ctx.fillStyle = i === 0
          ? `rgba(125,211,252,${0.85 * routeAlpha})`
          : `rgba(255,255,255,${0.35 * routeAlpha})`;
        ctx.font = `${i === 0 ? 'bold ' : ''}12px 'DM Sans', sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), labelPts[i].x, labelPts[i].y);
      } else {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save(); ctx.beginPath();
          ctx.arc(p.x, p.y, nodeR - 2, 0, Math.PI * 2); ctx.clip();
          const d = (nodeR - 2) * 2;
          ctx.drawImage(img, p.x - (nodeR-2), p.y - (nodeR-2), d, d);
          ctx.restore();
          ctx.beginPath(); ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(125,211,252,${0.75 * routeAlpha})`; ctx.lineWidth = 2; ctx.stroke();
        };
        img.src = assigned.photo;
        ctx.fillStyle = `rgba(255,255,255,${0.2 * routeAlpha})`;
        ctx.font = '11px DM Sans, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), p.x, p.y);
      }
    });

    // START / END labels
    ctx.font = 'bold 9px DM Sans, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(125,211,252,${0.65 * routeAlpha})`;
    ctx.fillText('START', pts[0].x, pts[0].y - nodeR - 10);
    ctx.fillStyle = `rgba(255,255,255,${0.25 * routeAlpha})`;
    ctx.fillText('END', pts[pts.length-1].x, pts[pts.length-1].y - nodeR - 10);
  }
}

// ── Animation controller ──
let geoT = 0; // 0 = globe, 1 = flat
let geoRot = 0; // current globe rotation
let geoAnimHandle = null;
let geoAnimating = false;

function startGeoAnimation() {
  if (geoAnimHandle) cancelAnimationFrame(geoAnimHandle);
  geoAnimating = true;
  geoT = 0;

  // Start rotation centered on route
  const vp = getRouteViewport(currentRoute);
  // Aim globe so route center is facing viewer (z forward = lng near 0 after rot)
  geoRot = -vp.centerLng;

  const SPIN_DURATION = 800;   // ms spinning globe before zoom
  const ZOOM_DURATION = 1400;  // ms zoom transition
  const TOTAL = SPIN_DURATION + ZOOM_DURATION;
  let startTime = null;

  function frame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;

    if (elapsed < SPIN_DURATION) {
      // Spin globe, t stays 0
      geoRot = -vp.centerLng + (1 - elapsed / SPIN_DURATION) * 60;
      geoT = 0;
    } else {
      // Zoom into flat map
      const zoomElapsed = elapsed - SPIN_DURATION;
      const raw = Math.min(1, zoomElapsed / ZOOM_DURATION);
      // Ease in-out cubic
      geoT = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      // Globe rotation settles to 0 during zoom
      geoRot = (-vp.centerLng) * (1 - geoT);
    }

    drawGeoMap(geoT, geoRot);

    if (elapsed < TOTAL) {
      geoAnimHandle = requestAnimationFrame(frame);
    } else {
      geoT = 1;
      geoAnimating = false;
      drawGeoMap(1, 0);
    }
  }

  geoAnimHandle = requestAnimationFrame(frame);
}

function stopGeoAnimation() {
  if (geoAnimHandle) cancelAnimationFrame(geoAnimHandle);
  geoAnimHandle = null;
  geoAnimating = false;
}

// Called when assignments change — redraw flat map without animation
function redrawGeoMap() {
  if (geoAnimating) return; // don't interrupt animation
  drawGeoMap(1, 0);
}


// ── Photo expand ──
let expandedPhoto = null;
function showExpand(src) {
  const existing = document.getElementById('photo-expand');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'photo-expand';
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);cursor:pointer;";
  overlay.innerHTML = `<img src="${src}" style="max-width:min(500px,90vw);max-height:82vh;border-radius:14px;box-shadow:0 8px 48px rgba(0,0,0,0.8);object-fit:contain;" />`;
  overlay.addEventListener('click', hideExpand);
  document.body.appendChild(overlay);
}
function hideExpand() { document.getElementById('photo-expand')?.remove(); expandedPhoto = null; }

// ── Mini SVG for route cards ──
function routeMiniSVG(r) {
  const lats=r.stops.map(s=>s.lat), lngs=r.stops.map(s=>s.lng);
  const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs);
  const cosLat=Math.cos(((minLat+maxLat)/2*Math.PI)/180);
  const sc=Math.min(52/((maxLng-minLng||1)*cosLat),34/(maxLat-minLat||1));
  const cx2=(minLng+maxLng)/2, cy2=(minLat+maxLat)/2;
  const pts=r.stops.map(s=>({x:36+(s.lng-cx2)*cosLat*sc, y:24-(s.lat-cy2)*sc}));
  const d=pts.map((p,j)=>`${j===0?"M":"L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return `<svg width="72" height="48" viewBox="0 0 72 48" style="flex-shrink:0">
    <path d="${d}" fill="none" stroke="rgba(125,211,252,0.4)" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="4 3"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="rgba(125,211,252,0.55)"/>`).join("")}
  </svg>`;
}

// ── Frozen guess row ──
function frozenRowHTML(gh, guessNum) {
  const FB_BG = {green:"rgba(22,101,52,0.3)",yellow:"rgba(113,63,18,0.35)",red:"rgba(127,29,29,0.3)"};
  const FB_BD = {green:"#4ade80",yellow:"#facc15",red:"#f87171"};
  const FB_IC = {green:"✓",yellow:"↕",red:"✗"};
  return `<div style="margin-bottom:14px;opacity:0.65;">
    <div class="guess-label">Guess ${guessNum}</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
      ${currentRoute.stops.map((_,i)=>{
        const card=gh.assignments[i], fb=gh.feedback[i];
        const bd=fb?FB_BD[fb]:"rgba(255,255,255,0.1)", bg=fb?FB_BG[fb]:"rgba(255,255,255,0.03)";
        return `<div data-expandsrc="${card?card.photo:""}" style="width:clamp(52px,14vw,72px);height:clamp(40px,10.5vw,54px);border-radius:8px;border:1.5px solid ${bd};background:${bg};position:relative;overflow:hidden;cursor:${card?"pointer":"default"};">
          ${card?`<img src="${card.photo}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;"/>`:
            `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:16px;color:rgba(255,255,255,0.1);">${i+1}</div>`}
          ${fb?`<div style="position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:50%;background:${FB_BD[fb]};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;color:#000;">${FB_IC[fb]}</div>`:""}
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

// ── Render ──
function render() {
  const app = document.getElementById("app");
  const navRight = document.getElementById("nav-right");

  // Update nav right
  if (screen === "home") {
    navRight.innerHTML = `<button class="btn-ghost" id="nav-core">Grand Adventures</button>`;
    navRight.querySelector('#nav-core').addEventListener('click', () => { screen='core'; render(); });
  } else if (screen === "core") {
    navRight.innerHTML = `<button class="btn-ghost" id="nav-home">← Home</button>`;
    navRight.querySelector('#nav-home').addEventListener('click', () => { closeOverlay(); });
  } else {
    navRight.innerHTML = `<button class="btn-ghost" id="nav-back">← Back</button>`;
    navRight.querySelector('#nav-back').addEventListener('click', goBack);
  }

  // ── HOME ──
  if (screen === "home") {
    const daily = ROUTES[DAILY_INDEX];
    const core = ROUTES.filter((_,i) => i !== DAILY_INDEX);
    let scoresHTML = "";
    if (history.length > 0) {
      scoresHTML = `<div class="scores-panel" style="margin:36px auto 0;">
        <div class="scores-title">Recent</div>
        ${history.slice(-5).reverse().map(h=>`<div class="scores-row"><span>${h.route}</span><span style="color:${h.score===h.total?"#4ade80":"#7dd3fc"};font-weight:500">${h.score}/${h.total}</span></div>`).join("")}
      </div>`;
    }
    app.innerHTML = `
      <div class="home-hero">
        <div class="home-eyebrow">Daily Route · ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        <h1 class="home-title">Where will <em>you go</em> today?</h1>
        <p class="home-desc">Six stops. No place names. Sort the photos in order — watch out for decoys.</p>
      </div>
      <div class="daily-card">
        <div class="daily-badge"><span></span>Today's Route</div>
        <div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:180px;">
            <div class="daily-route-name">${daily.name}</div>
            <div class="daily-meta">${daily.region} · ${daily.stops.length} stops · ${daily.decoys.length} decoys · 3 guesses</div>
            <div class="daily-actions">
              <button class="btn-play" id="btn-daily-play">Start Today's Route →</button>
            </div>
          </div>
          <div style="flex-shrink:0;opacity:0.7;">${routeMiniSVG(daily)}</div>
        </div>
      </div>
      <div class="section-label">Winter 2024</div>
      <div class="route-grid">
        ${core.map((r,i)=>{
          const ri = ROUTES.indexOf(r);
          return `<button class="route-btn" data-route="${ri}">
            ${routeMiniSVG(r)}
            <div><div class="rname">${r.name}</div><div class="rmeta">${r.region} · ${r.stops.length} stops</div></div>
          </button>`;
        }).join("")}
      </div>
      ${scoresHTML}`;
    document.getElementById("btn-daily-play").addEventListener("click", () => startGame(daily, "home"));
    document.querySelectorAll(".route-btn").forEach(btn => {
      btn.addEventListener("click", () => startGame(ROUTES[parseInt(btn.dataset.route)], "home"));
    });
    return;
  }

  // ── GRAND ADVENTURES ──
  if (screen === "core") {
    const grandRoutes = ROUTES.filter(r => r.pack === 'grand');
    let grandBody;
    if (grandRoutes.length === 0) {
      grandBody = '<div style="margin-top:48px;text-align:center;padding:48px 24px;border:1px solid rgba(255,255,255,0.07);border-radius:18px;background:rgba(255,255,255,0.025);">'
        + '<div style="font-size:1.6rem;margin-bottom:16px;">🌍</div>'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;font-weight:500;margin-bottom:10px;">Routes coming soon</div>'
        + '<div style="font-size:0.82rem;color:var(--text-2);font-weight:300;max-width:32ch;margin:0 auto;line-height:1.6;">We\'re building something special. Check back soon.</div>'
        + '</div>';
    } else {
      grandBody = '<div class="section-label">Grand Adventures</div><div class="route-grid">'
        + grandRoutes.map(r => {
            const ri = ROUTES.indexOf(r);
            return '<button class="route-btn" data-route="' + ri + '">'
              + routeMiniSVG(r)
              + '<div><div class="rname">' + r.name + '</div>'
              + '<div class="rmeta">' + r.region + ' · ' + r.stops.length + ' stops · ' + r.decoys.length + ' decoys</div></div>'
              + '</button>';
          }).join('')
        + '</div>';
    }
    app.innerHTML = '<div style="margin-bottom:28px;">'
      + '<div class="home-eyebrow" style="text-align:left;margin-bottom:10px;">Pack</div>'
      + '<h2 style="font-family:\'Playfair Display\',serif;font-size:1.8rem;font-weight:500;letter-spacing:-0.01em;">Grand Adventures</h2>'
      + '<p style="font-size:0.85rem;color:var(--text-2);font-weight:300;margin-top:6px;">To get your bearings, a collection of globe-spanning adventures built around the world\'s most recognizable places.</p>'
      + '</div>' + grandBody;
    document.querySelectorAll(".route-btn").forEach(btn => {
      btn.addEventListener("click", () => startGame(ROUTES[parseInt(btn.dataset.route)], "core"));
    });
    return;
  }

  // ── WINTER 2024 ──
  if (screen === "winter") {
    app.innerHTML = `
      <div style="margin-bottom:28px;">
        <div class="home-eyebrow" style="text-align:left;margin-bottom:10px;">Archive</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:500;letter-spacing:-0.01em;">Winter 2024</h2>
        <p style="font-size:0.85rem;color:var(--text-2);font-weight:300;margin-top:6px;">47 days of routes from the season. Replay at your own pace.</p>
      </div>
      <div class="section-label">All Routes</div>
      <div class="route-grid">
        ${ROUTES.filter(r=>r.pack==='winter').map(r=>{const i=ROUTES.indexOf(r);return`<button class="route-btn" data-route="${i}">
          ${routeMiniSVG(r)}
          <div>
            <div class="rname">${r.name}</div>
            <div class="rmeta">${r.region} · ${r.stops.length} stops · ${r.decoys.length} decoys</div>
          </div>
        </button>`;}).join("")}
      </div>`;
    document.querySelectorAll(".route-btn").forEach(btn => {
      btn.addEventListener("click", () => startGame(ROUTES[parseInt(btn.dataset.route)], "winter"));
    });
    return;
  }

  // ── PLAY ──
  const confirmedDecoys = [];
  const confirmedDecoyNames = new Set();
  guessHistory.forEach(gh => {
    Object.entries(gh.feedback).forEach(([si,fb]) => {
      if (fb==="red") { const c=gh.assignments[si]; if(c&&!confirmedDecoyNames.has(c.name)){confirmedDecoys.push(c);confirmedDecoyNames.add(c.name);} }
    });
  });
  confirmedDecoyNamesGlobal = confirmedDecoyNames; // keep in sync for lightbox
  const assignedNames = new Set(Object.values(assignments).map(a=>a?.name).filter(Boolean));
  const poolCards = cards.filter(c => !assignedNames.has(c.name) && !confirmedDecoyNames.has(c.name));
  const allSlotsFilled = orderPicks.length === currentRoute.stops.length;
  const guessNum = guessHistory.length + 1;

  // Pips
  const pipsHTML = `<div class="guesses-pip">${Array.from({length:MAX_GUESSES},(_,i)=>{
    let cls="pip";
    if(i < guessHistory.length) {
      const gh=guessHistory[i];
      const c=Object.values(gh.feedback).filter(f=>f==="green").length;
      cls += c===currentRoute.stops.length?" correct":" used";
    }
    return `<div class="${cls}"></div>`;
  }).join("")}</div>`;

  // Tap-order photo grid
  // All cards (pool + picked) shown together. Picked ones show their order number.
  // Locked greens show lock badge. Tap to pick next, tap picked to undo from that point.
  const nextPickNum = orderPicks.length + 1; // next number to assign
  const allPhotosHTML = cards.map(c => {
    const pickIdx = orderPicks.findIndex(p => p.name === c.name);
    const isPicked = pickIdx !== -1;
    const isDecoyElim = confirmedDecoyNames.has(c.name);
    const locked = isPicked && slotIsLocked(pickIdx);
    const num = isPicked ? pickIdx + 1 : null;

    let borderCol, bgCol, opacity = 1;
    if (isDecoyElim) {
      borderCol = "rgba(248,113,113,0.35)"; bgCol = "rgba(127,29,29,0.15)"; opacity = 0.45;
    } else if (locked) {
      borderCol = "#4ade80"; bgCol = "rgba(22,101,52,0.2)";
    } else if (isPicked) {
      borderCol = "var(--cyan)"; bgCol = "rgba(125,211,252,0.08)";
    } else {
      borderCol = "var(--border)"; bgCol = "transparent";
    }

    return `<div class="tap-card" data-name="${c.name}"
      style="position:relative;aspect-ratio:1/1;border-radius:14px;overflow:hidden;
             border:2px solid ${borderCol};background:${bgCol};opacity:${opacity};
             cursor:${locked||isDecoyElim?"default":"pointer"};
             transition:transform 0.15s,border-color 0.15s,opacity 0.2s;
             ${isPicked&&!locked?"transform:scale(0.97)":""}">
      <img src="${c.photo}" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;"
           onerror="this.parentElement.style.background='#1a1f30';this.style.display='none'"/>
      ${isPicked ? `
        <div style="position:absolute;inset:0;background:rgba(0,0,0,${locked?0.15:0.35});pointer-events:none;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                    width:40px;height:40px;border-radius:50%;
                    background:${locked?"rgba(22,101,52,0.9)":"rgba(6,10,18,0.85)"};
                    border:2px solid ${locked?"#4ade80":"var(--cyan)"};
                    display:flex;align-items:center;justify-content:center;pointer-events:none;">
          <span style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:500;
                       color:${locked?"#4ade80":"var(--cyan)"};">${locked?"✓":num}</span>
        </div>
        ${locked?"":""}`
      : isDecoyElim ? `
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);pointer-events:none;"></div>
        <div style="position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;
                    background:#f87171;display:flex;align-items:center;justify-content:center;
                    font-size:9px;font-weight:700;color:#fff;">✗</div>`
      : `<div style="position:absolute;inset:0;background:transparent;transition:background 0.15s;" class="tap-hover"></div>`}
      <button class="expand-btn" data-expand="${cards.indexOf(c)}" aria-label="Expand">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 4V1h3M7 1h3v3M10 7v3H7M4 10H1V7" stroke="rgba(240,239,245,0.7)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  }).join("");

  const instructionText = orderPicks.length === 0
    ? "Tap photos in route order — stop 1 first"
    : orderPicks.length < currentRoute.stops.length
    ? `Tap stop ${nextPickNum} of ${currentRoute.stops.length}${confirmedDecoys.length > 0 ? " · avoid the decoys" : ""}`
    : "All stops placed — submit when ready";

  const gameGridHTML = `
    <div class="panel panel-padded" style="margin-bottom:12px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;margin-bottom:14px;">
        <div class="guess-label active-label" style="margin-bottom:0;">Guess ${guessNum} of ${MAX_GUESSES}</div>
        <div style="font-size:0.75rem;color:var(--text-3);font-weight:300;text-align:center;letter-spacing:0.01em;font-family:'DM Sans',sans-serif;">${instructionText}</div>
      </div>
      <div class="tap-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${allPhotosHTML}
      </div>
      <div class="submit-wrap">
        <button id="btn-submit" class="submit-btn ${allSlotsFilled?"active":"inactive"}" ${allSlotsFilled?"":"disabled"}>
          ${allSlotsFilled ? `Submit Guess ${guessNum} →` : `Pick all ${currentRoute.stops.length} stops to continue`}
        </button>
      </div>
    </div>`;

  // Past guesses
  const historyHTML = guessHistory.length > 0
    ? `<div class="panel panel-padded">${[...guessHistory].reverse().map((gh,ri)=>frozenRowHTML(gh,guessHistory.length-ri)).join("")}</div>`
    : "";

  // Results
  let resultsHTML = "";
  if (revealed) {
    const won = score === currentRoute.stops.length;
    const guessUsed = guessHistory.length;
    const resultMsg = won
      ? guessUsed===1?"Perfect — first try!":guessUsed===2?"Got it in 2!":"Solved it!"
      : score >= currentRoute.stops.length/2?"So close.":"Rough road.";
    const shareEmoji = guessHistory.map(gh=>
      currentRoute.stops.map((_,i)=>{const fb=gh.feedback[i];return fb==="green"?"🟩":fb==="yellow"?"🟨":fb==="red"?"🟥":"⬜";}).join("")
    ).join("\n");
    const shareText = `Roamer: ${currentRoute.name}\n${shareEmoji}`;
    resultsHTML = `
      <div class="results-inner">
        <div class="results-score" style="color:${won?"#4ade80":"#7dd3fc"}">${won?`Solved in ${guessUsed}/${MAX_GUESSES}`:`${score}/${currentRoute.stops.length} Correct`}</div>
        <div class="results-msg">${resultMsg}</div>
        <div class="share-grid">${shareEmoji}</div>
        <button class="btn-copy" id="btn-copy">Copy results</button>
        <div class="results-actions">
          <button class="btn-retry" id="btn-retry">Retry</button>
          <button class="btn-menu" id="btn-menu">← Back</button>
        </div>
      </div>
      <div class="panel panel-padded">
        <div class="panel-label">Correct Order</div>
        <div class="reveal-grid">
          ${currentRoute.stops.map((s,i)=>{
            const correct=assignments[i]?.name===s.name, guessed=assignments[i];
            return `<div class="reveal-card ${correct?"correct":"wrong"}" data-expandsrc="${s.photo}">
              <img src="${s.photo}" alt=""/>
              <div class="reveal-overlay">
                <div class="reveal-top"><div class="reveal-num">${i+1}</div><div class="reveal-check">${correct?"✓":"✗"}</div></div>
                <div>
                  <div class="reveal-name">${s.name}</div>
                  ${!correct&&guessed?`<div class="reveal-guess">you: ${guessed.name}</div>`:""}
                  ${!correct&&!guessed?`<div class="reveal-guess">no answer</div>`:""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
        <div class="reveal-decoys">Decoys: ${currentRoute.decoys.map(d=>d.name).join(", ")}</div>
      </div>`;
  }

  app.innerHTML = `
    <div class="play-header">
      <div>
        <div class="play-title">${currentRoute.name}</div>
        <div class="play-meta">${currentRoute.region} · ${currentRoute.stops.length} stops · ${currentRoute.decoys.length} decoys</div>
      </div>
      ${pipsHTML}
    </div>
    <div class="map-panel" id="map-panel">
      <button class="map-toggle" id="map-toggle" aria-expanded="${!mapCollapsed}">
        <div class="map-toggle-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0">
            <circle cx="7" cy="7" r="6" stroke="rgba(125,211,252,0.5)" stroke-width="1.2" fill="none"/>
            <circle cx="4" cy="7" r="1.5" fill="#7dd3fc"/>
            <circle cx="10" cy="5" r="1.5" fill="#7dd3fc"/>
            <path d="M5.5 7 Q7 5.5 8.5 5" stroke="rgba(125,211,252,0.6)" stroke-width="1" stroke-linecap="round" fill="none" stroke-dasharray="2 2"/>
          </svg>
          <span class="map-toggle-label">${mapCollapsed ? "Show route map" : "Route map"}</span>
        </div>
        <div class="map-toggle-right">
          <span class="map-toggle-hint">${mapCollapsed ? "" : "tap to hide"}</span>
          <svg class="map-chevron ${mapCollapsed ? "collapsed" : ""}" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="#4a4f68" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </button>
      <div class="map-body ${mapCollapsed ? "map-body-hidden" : ""}">
        ${revealed
          ? `<div style="padding:0 10px 10px"><div id="leaflet-map"></div></div>`
          : `<div style="padding:0 10px 8px"><canvas id="route-canvas" style="width:100%;height:auto;display:block;border-radius:10px;"></canvas></div>`
        }
      </div>
    </div>
    ${!revealed ? `${gameGridHTML}${historyHTML}` : ""}
    ${resultsHTML}
  `;

  // Events
  document.getElementById("btn-submit")?.addEventListener("click", ()=>{ if(allSlotsFilled) checkAnswers(); });
  document.getElementById("btn-retry")?.addEventListener("click", ()=>startGame(currentRoute, playSource));
  document.getElementById("btn-menu")?.addEventListener("click", goBack);
  document.getElementById("btn-copy")?.addEventListener("click", function() {
    const shareText=`Roamer: ${currentRoute.name}\n`+guessHistory.map(gh=>currentRoute.stops.map((_,i)=>{const fb=gh.feedback[i];return fb==="green"?"🟩":fb==="yellow"?"🟨":fb==="red"?"🟥":"⬜";}).join("")).join("\n");
    navigator.clipboard.writeText(shareText).then(()=>{this.textContent="Copied!";});
  });

  document.getElementById("map-toggle")?.addEventListener("click", () => {
    mapCollapsed = !mapCollapsed;
    render();
    if (!mapCollapsed && !revealed) startGeoAnimation();
    if (!mapCollapsed && revealed) setTimeout(initLeafletMap, 50);
  });

  document.querySelectorAll(".tap-card").forEach(el => {
    const name = el.dataset.name;
    const card = cards.find(c => c.name === name);
    if (!card) return;
    const pickIdx = orderPicks.findIndex(p => p.name === name);
    const isDecoyElim = confirmedDecoyNames.has(name);
    const locked = pickIdx !== -1 && slotIsLocked(pickIdx);
    // Main card tap = assign (unless locked/eliminated)
    if (!locked && !isDecoyElim) {
      el.addEventListener("click", e => {
        // Don't assign if the expand button was tapped
        if (e.target.closest('.expand-btn')) return;
        tapCard(card);
      });
    }
  });

  // Expand buttons — separate from card tap
  document.querySelectorAll(".expand-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openLightbox(parseInt(btn.dataset.expand));
    });
  });



  if(!revealed) {
    if (geoT === 0 && !geoAnimating) {
      startGeoAnimation(); // only on first load
    } else if (!geoAnimating) {
      redrawGeoMap(); // just redraw current state
    }
  }
}

// Boot
render();


/* ═══════════════════════════════════════════════════════
   OVERLAY & NAV WIRING
   ═══════════════════════════════════════════════════════ */

function openOverlay() {
  const overlay = document.getElementById('game-overlay');
  overlay.classList.add('active');
  overlay.scrollTop = 0;
  overlay.style.animation = 'none';
  requestAnimationFrame(() => { overlay.style.animation = ''; });
}

function closeOverlay() {
  const overlay = document.getElementById('game-overlay');
  overlay.classList.remove('active');
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
}

function goBack() {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  if (playSource === 'core') {
    screen = 'core';
    render();
  } else {
    closeOverlay();
  }
}

/* ─── Entry-screen button wiring ─── */
document.getElementById('play-btn').addEventListener('click', function(e) {
  e.preventDefault();
  this.style.transform = 'scale(0.97)';
  setTimeout(() => { this.style.transform = ''; }, 150);
  setTimeout(() => {
    startGame(ROUTES[DAILY_INDEX], 'home');
    openOverlay();
  }, 120);
});

document.querySelector('.cta-secondary a').addEventListener('click', function(e) {
  e.preventDefault();
  screen = 'core';
  render();
  openOverlay();
});

const packCards = document.querySelectorAll('.pack-card');
if (packCards[0]) packCards[0].addEventListener('click', function() {
  screen = 'core';
  render();
  openOverlay();
});
if (packCards[1]) packCards[1].addEventListener('click', function() {
  screen = 'winter';
  render();
  openOverlay();
});

/* ─── Boot ─── */
render();
