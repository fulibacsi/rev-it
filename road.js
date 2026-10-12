// Road: a pseudo-3D coast highway seen from the driver's seat, drawn on a canvas. Technique from Jake Gordon's
// "How to build a racing game" articles (codeincomplete.com): the road is a loop of short segments projected to
// the screen, and curves are faked by shifting each segment sideways by a steadily growing amount.
const ROAD = {
  segment: 5,      // m per segment
  count: 1600,     // segments in the looping course (8 km)
  draw: 300,       // segments drawn ahead (1.5 km)
  half: 7,         // half the road width, m: two 3.5 m lanes each way, oncoming traffic on the left
  rumble: 0.6,     // kerb width, m
  shore: 16,       // ocean starts this far left of the centre line, m
  eye: 1.15,       // driver's eye height, m
  seat: 4.9,       // driver's sideways position from the centre line, m (right lane, sitting left in the car)
  fov: 75,         // horizontal field of view, degrees
  horizon: 0.40,   // horizon height as a share of the screen
  grade: 0.07,     // steepest slope of the hills (7%, like a highway)
};
const LANES = { mine: 5.25, passing: 1.75, oncoming: [-1.75, -5.25] }; // lane centres, m from the centre line

let rng = 7; // small seeded random so the course is the same every time
const rand = () => ((rng = (rng * 16807) % 2147483647) - 1) / 2147483646;

const segments = buildCourse();
function buildCourse() {
  const segs = [], add = c => segs.push({ curve: c, sprites: [] });
  while (segs.length < ROAD.count) {
    for (let i = 40 + rand() * 80; i > 0; i--) add(0); // straight
    const c = (rand() < 0.5 ? -1 : 1) * (0.0008 + rand() * 0.0032), hold = 40 + rand() * 80;
    for (let i = 0; i < 30; i++) add(c * (i / 30) ** 2); // ease into the bend
    for (let i = 0; i < hold; i++) add(c);
    for (let i = 30; i > 0; i--) add(c * (i / 30) ** 2); // and out of it
  }
  segs.length = ROAD.count;
  segs.forEach(s => { s.y = 0; }); // elevation of each segment's start, m
  for (let i = 30 + rand() * 60; ;) { // hills: smooth crests and dips that come back to the base level
    const height = (rand() < 0.65 ? 1 : -1) * (8 + rand() * 22);
    const len = Math.round(Math.max(80, Math.abs(height) * Math.PI / ROAD.grade / ROAD.segment)); // segments
    if (i + len >= ROAD.count) break; // the loop must end level so it joins up
    for (let j = 0; j < len; j++) segs[Math.floor(i) + j].y = height * (1 - Math.cos(2 * Math.PI * j / len)) / 2;
    i += len + 20 + rand() * 80; // a level stretch between hills
  }
  segs.forEach((s, i) => { // palm trees: a beach row on the left, a looser row on the right
    if (i % 7 === 0) s.sprites.push({ kind: 'palm', x: -(10 + rand() * 14), size: 0.8 + rand() * 0.5 });
    if (i % 11 === 3) s.sprites.push({ kind: 'palm', x: 10 + rand() * 16, size: 0.8 + rand() * 0.5 });
  });
  return segs;
}

// ---- sprites, drawn once on small canvases ----
function sprite(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}
const PALM = sprite(160, 320, (g, w, h) => { // dark sunset silhouette
  g.fillStyle = g.strokeStyle = '#2a1430';
  g.beginPath(); // slightly bent trunk, tapering
  g.moveTo(w * 0.47, h); g.quadraticCurveTo(w * 0.42, h * 0.5, w * 0.55, h * 0.18);
  g.lineTo(w * 0.59, h * 0.19); g.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.57, h); g.fill();
  for (let a = 0; a < 9; a++) { // drooping fronds
    const ang = -Math.PI + (a / 8) * Math.PI, len = w * (0.38 + (a % 2) * 0.08);
    const ex = w * 0.57 + Math.cos(ang) * len, ey = h * 0.18 + Math.sin(ang) * len * 0.35 + len * 0.45;
    g.beginPath(); g.moveTo(w * 0.57, h * 0.17);
    g.quadraticCurveTo(w * 0.57 + Math.cos(ang) * len * 0.6, h * 0.1 + Math.sin(ang) * len * 0.5, ex, ey);
    g.quadraticCurveTo(w * 0.57 + Math.cos(ang) * len * 0.55, h * 0.16 + Math.sin(ang) * len * 0.4, w * 0.57, h * 0.2);
    g.fill();
  }
});
const CAR_COLORS = ['#d33', '#36c', '#eee', '#222', '#e8b', '#2a8', '#fa3', '#88a'];
function carSprite(color, front) { // rear view (same direction) or front view (oncoming), 1.8 m x 1.4 m
  return sprite(180, 140, (g, w, h) => {
    g.fillStyle = '#111'; g.fillRect(w * 0.08, h * 0.78, w * 0.16, h * 0.22); g.fillRect(w * 0.76, h * 0.78, w * 0.16, h * 0.22);
    g.fillStyle = color; g.beginPath(); g.roundRect(0, h * 0.42, w, h * 0.42, 14); g.fill(); // body
    g.beginPath(); g.moveTo(w * 0.14, h * 0.45); g.lineTo(w * 0.24, h * 0.06); g.lineTo(w * 0.76, h * 0.06);
    g.lineTo(w * 0.86, h * 0.45); g.fill(); // cabin
    g.fillStyle = front ? '#2b3550' : '#1b1b25'; // glass
    g.beginPath(); g.moveTo(w * 0.2, h * 0.42); g.lineTo(w * 0.28, h * 0.12); g.lineTo(w * 0.72, h * 0.12);
    g.lineTo(w * 0.8, h * 0.42); g.fill();
    g.fillStyle = front ? '#fff6c8' : '#ff2a2a'; // headlights or tail lights
    g.fillRect(w * 0.05, h * 0.52, w * 0.2, h * 0.1); g.fillRect(w * 0.75, h * 0.52, w * 0.2, h * 0.1);
    g.fillStyle = '#0006'; g.fillRect(w * 0.3, h * 0.66, w * 0.4, h * 0.1); // plate / grille
  });
}
const CARS = CAR_COLORS.map(c => ({ rear: carSprite(c, false), front: carSprite(c, true) }));
const SPEED_SIGNS = new Map(); // Speed signs game, by value; drawn 1.5 m wide (oversized so they read from afar)
function signSprite(value) {
  if (!SPEED_SIGNS.has(value)) SPEED_SIGNS.set(value, sprite(120, 330, (g, w, h) => {
    g.fillStyle = '#888'; g.fillRect(w * 0.45, h * 0.45, w * 0.1, h * 0.55); // post
    g.fillStyle = '#111'; g.fillRect(0, 0, w, h * 0.47);
    g.fillStyle = '#f4f4f4'; g.fillRect(6, 6, w - 12, h * 0.47 - 12);
    g.fillStyle = '#111'; g.textAlign = 'center';
    g.font = 'bold 20px sans-serif'; g.fillText('SPEED', w / 2, 34);
    g.font = 'bold 60px sans-serif'; g.fillText(value, w / 2, 100);
    g.font = 'bold 16px sans-serif'; g.fillText('km/h', w / 2, 132);
  }));
  return SPEED_SIGNS.get(value);
}
const BOARDS = new Map(); // distance boards by value, drawn 1.6 m wide (oversized so they read from afar)
function boardSprite(value) {
  if (!BOARDS.has(value)) BOARDS.set(value, sprite(160, 300, (g, w, h) => {
    g.fillStyle = '#888'; g.fillRect(w * 0.2, h * 0.3, w * 0.06, h * 0.7); g.fillRect(w * 0.74, h * 0.3, w * 0.06, h * 0.7);
    g.fillStyle = '#eee'; g.beginPath(); g.roundRect(0, 0, w, h * 0.34, 10); g.fill(); // highway green, white rim
    g.fillStyle = '#1d6b3a'; g.beginPath(); g.roundRect(5, 5, w - 10, h * 0.34 - 10, 7); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 54px sans-serif'; g.fillText(`${value} m`, w / 2, 72);
  }));
  return BOARDS.get(value);
}
let bestBanner = { value: NaN }; // checkered banner across the road at the best distance; redrawn when it moves
function bannerSprite(value) {
  if (bestBanner.value !== value) bestBanner = { value, img: sprite(640, 240, (g, w, h) => {
    g.fillStyle = '#777'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); // poles at the kerbs
    for (let x = 10; x < w - 10; x += 20) for (let y = 0; y < 60; y += 20) { // checkered cloth
      g.fillStyle = (x + y) / 20 % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, 20, 20);
    }
    g.fillStyle = '#ffd23a'; g.fillRect(10, 60, w - 20, 34);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.font = 'bold 28px sans-serif';
    g.fillText(`BEST ${value.toLocaleString('en-US')} m`, w / 2, 88);
  }) };
  return bestBanner.img;
}

// ---- traffic: oncoming cars on the left, cars in the passing lane that you overtake or that overtake you ----
const traffic = Array.from({ length: 12 }, () => ({}));
function spawnCar(car, d) {
  const oncoming = rand() < 0.55;
  Object.assign(car, {
    z: odo + d, dir: oncoming ? -1 : 1, look: CARS[Math.floor(rand() * CARS.length)],
    x: oncoming ? LANES.oncoming[rand() < 0.5 ? 0 : 1] : LANES.passing,
    v: (oncoming ? 70 + rand() * 40 : 80 + rand() * 30) / 3.6,
    d: NaN, // distance last frame: unknown for a fresh car, so it can't trigger a pass-by sound
  });
}
function resetTraffic() { traffic.forEach((c, i) => spawnCar(c, 80 + i * 120)); } // spread out ahead
resetTraffic();

function updateTraffic(dt) {
  for (const c of traffic) {
    c.z += c.dir * c.v * dt;
    const d = c.z - odo;
    if (c.d > 0 && d <= 0) whoosh(Math.abs(speed - c.dir * c.v) * 3.6); // just went past the driver
    c.d = d;
    if (d < -15) spawnCar(c, 900 + rand() * 600); // passed: send it back to the horizon
    else if (d > ROAD.draw * ROAD.segment + 100) spawnCar(c, -12); // pulled away: a new one comes up from behind
    if (c.dir > 0 && c.z - odo < 0 && c.v < speed) spawnCar(c, 900 + rand() * 600); // can't come from behind slower
  }
}

// ---- drawing ----
let scenery = 0; // background shift, follows the bends
const seg = i => segments[((i % ROAD.count) + ROAD.count) % ROAD.count]; // the course loops, both ways
const elevation = pos => { // road height at a course position, m
  const i = Math.floor(pos / ROAD.segment), f = pos / ROAD.segment - i;
  return seg(i).y * (1 - f) + seg(i + 1).y * f;
};
// slope under the car (rise per metre), for gravity in car.js
function roadSlope(pos) { return elevation(pos + 0.5) - elevation(pos - 0.5); }

function drawRoad(g, w, h, dt) {
  const depth = 1 / Math.tan(ROAD.fov / 2 * Math.PI / 180), horizon = h * ROAD.horizon, k0 = w / 2;
  const pos = odo % (ROAD.count * ROAD.segment), base = Math.floor(pos / ROAD.segment);
  const frac = pos / ROAD.segment - base, here = segments[base], eyeY = elevation(pos) + ROAD.eye;
  scenery += here.curve * speed * dt * 40;
  drawSky(g, w, horizon);

  // project every segment edge: screen centre-line x, y, and px per metre sideways
  const proj = [];
  let x = 0, dx = -here.curve * frac;
  for (let n = 0; n <= ROAD.draw; n++) {
    const s = segments[(base + n) % ROAD.count], z = Math.max(0.3, (n - frac) * ROAD.segment), scale = depth / z * k0;
    proj.push({ x: w / 2 + (-ROAD.seat - x) * scale, y: horizon + (eyeY - s.y) * scale, k: scale, z });
    x += dx; dx += s.curve;
  }
  // below the horizon, beyond the drawn road (seen when it dips away): the sea on the left, the land on the right
  const far = proj[ROAD.draw], split = far.x - ROAD.shore * far.k;
  g.fillStyle = '#3b3974'; g.fillRect(0, horizon, split, h - horizon);
  g.fillStyle = '#c4a058'; g.fillRect(split, horizon, w - split, h - horizon);
  const quad = (a, b, x1, x2, color) => { // band between sideways positions x1..x2 (m) from edge a to edge b
    g.fillStyle = color; g.beginPath();
    g.moveTo(a.x + x1 * a.k, a.y + 1); g.lineTo(a.x + x2 * a.k, a.y + 1);
    g.lineTo(b.x + x2 * b.k, b.y); g.lineTo(b.x + x1 * b.k, b.y); g.fill();
  };
  // near to far; maxy is the top of what is drawn so far: anything below it is hidden behind a nearer crest
  let maxy = h;
  const clip = []; // per segment: screen y below which its sprites are hidden
  for (let n = 0; n < ROAD.draw; n++) {
    let a = proj[n];
    const b = proj[n + 1];
    clip[n] = maxy;
    if (b.y >= maxy || a.y <= b.y) continue; // hidden behind a crest, or sloping away from us
    if (a.y > maxy) { // partly hidden: start the slice at the crest line
      const f = (a.y - maxy) / (a.y - b.y);
      a = { x: a.x + (b.x - a.x) * f, y: maxy, k: a.k + (b.k - a.k) * f };
    }
    const i = base + n, light = Math.floor(i / 2) % 2 === 0, R = ROAD.half;
    g.fillStyle = light ? '#c9a35a' : '#bf9850'; // golden hills side, from the road to the right edge
    g.beginPath(); g.moveTo(a.x, a.y + 1); g.lineTo(w, a.y + 1); g.lineTo(w, b.y); g.lineTo(b.x, b.y); g.fill();
    quad(a, b, -ROAD.shore, 0, light ? '#e8b77a' : '#dcaa6c'); // beach
    const sa = a.x - ROAD.shore * a.k, sb = b.x - ROAD.shore * b.k; // shoreline; the sea runs to the screen edge
    if (sa > 0 || sb > 0) {
      g.fillStyle = light ? '#3d3b78' : '#393670';
      g.beginPath(); g.moveTo(0, a.y + 1); g.lineTo(sa, a.y + 1); g.lineTo(sb, b.y); g.lineTo(0, b.y); g.fill();
    }
    quad(a, b, -R - ROAD.rumble, R + ROAD.rumble, Math.floor(i / 3) % 2 ? '#d33' : '#eee'); // kerbs
    quad(a, b, -R, R, light ? '#4a4a55' : '#45454f'); // asphalt
    quad(a, b, -0.25, -0.1, '#f2c12e'); quad(a, b, 0.1, 0.25, '#f2c12e'); // double yellow centre line
    if (Math.floor(i / 3) % 2) { quad(a, b, -3.6, -3.4, '#eee'); quad(a, b, 3.4, 3.6, '#eee'); } // lane dashes
    maxy = b.y;
  }
  const drawClipped = (img, x, y, dw, dh, clipY) => { // the part below clipY is behind a crest
    if (y >= clipY) return;
    const vis = Math.min(dh, clipY - y);
    g.drawImage(img, 0, 0, img.width, img.height * vis / dh, x, y, dw, vis);
  };

  // sprites, far to near: palms, traffic and the game's marks (x: metres from the centre line, w/h: metres)
  const marks = (game.marks?.() ?? []).map(m => ({
    best: { z: m.z, x: 0, w: 2 * (ROAD.half + ROAD.rumble), h: 5.6, img: bannerSprite(m.value) },
    board: { z: m.z, x: ROAD.half + 2, w: 1.6, h: 3, img: boardSprite(m.value) },
    sign: { z: m.z, x: ROAD.half + 2, w: 1.5, h: 4.1, img: signSprite(m.value) },
  })[m.kind]);
  const ahead = [...traffic.map(c => ({ z: c.z, x: c.x, w: 1.8, h: 1.4, img: c.dir > 0 ? c.look.rear : c.look.front })), ...marks]
    .map(o => ({ ...o, d: o.z - odo })).filter(o => o.d > 2 && o.d < (ROAD.draw - 2) * ROAD.segment).sort((p, q) => q.d - p.d);
  let t = 0;
  for (let n = ROAD.draw - 1; n > 0; n--) {
    const a = proj[n], s = segments[(base + n) % ROAD.count], fog = Math.min(1, 1.6 - n / ROAD.draw * 1.6);
    g.globalAlpha = fog;
    for (const sp of s.sprites) {
      const ph = 11 * sp.size * a.k, pw = ph / 2;
      drawClipped(PALM, a.x + sp.x * a.k - pw / 2, a.y - ph, pw, ph, clip[n]);
    }
    while (t < ahead.length && ahead[t].d >= a.z) { // cars and signs within this segment
      const o = ahead[t++], f = (o.d - a.z) / ROAD.segment, b = proj[n + 1] || a;
      const k = a.k + (b.k - a.k) * f, cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f;
      drawClipped(o.img, cx + (o.x - o.w / 2) * k, cy - o.h * k, o.w * k, o.h * k, clip[n]);
    }
  }
  g.globalAlpha = 1;
}

function drawSky(g, w, horizon) {
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#1b0f3b'); sky.addColorStop(0.45, '#6b2a7a'); sky.addColorStop(0.8, '#f0646a');
  sky.addColorStop(1, '#ffc27a');
  g.fillStyle = sky; g.fillRect(0, 0, w, horizon + 1);
  const sx = ((w * 0.88 - scenery) % (w * 2) + w * 2) % (w * 2) - w * 0.5, r = w * 0.09; // synthwave sun
  const sun = g.createLinearGradient(0, horizon - r, 0, horizon);
  sun.addColorStop(0, '#ffe36e'); sun.addColorStop(1, '#ff5f8a');
  g.fillStyle = sun; g.beginPath(); g.arc(sx, horizon, r, Math.PI, 0); g.fill();
  g.fillStyle = sky; // stripes cut through the lower half of the sun
  for (let i = 0; i < 6; i++) g.fillRect(sx - r, horizon - r * 0.5 + i * r * 0.1, 2 * r, r * 0.02 + i * r * 0.012);
  for (const [color, height, shift] of [['#4a2659', 0.09, 0.3], ['#2f1840', 0.05, 0.6]]) { // hills, two layers
    g.fillStyle = color; g.beginPath(); g.moveTo(0, horizon);
    for (let px = 0; px <= w; px += 20) {
      const u = (px + scenery * shift) / w, land = Math.min(1, Math.max(0, (px / w - 0.3) / 0.3)); // low over the sea
      g.lineTo(px, horizon - w * height * (0.5 + 0.3 * Math.sin(u * 7.1) + 0.2 * Math.sin(u * 17.3)) * (0.2 + 0.8 * land));
    }
    g.lineTo(w, horizon); g.fill();
  }
}
