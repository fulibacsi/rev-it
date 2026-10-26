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
  seat: 0.35,      // the driver sits this far left of the car's centre, m
  fov: 75,         // horizontal field of view, degrees
  horizon: 0.40,   // horizon height as a share of the screen
  grade: 0.07,     // steepest slope of the hills (7%, like a highway)
};
const LANES = { mine: 5.25, passing: 1.75, oncoming: [-1.75, -5.25] }; // lane centres, m from the centre line
const MY_LANES = [LANES.mine, LANES.passing]; // your side of the double yellow: 0 the right lane, 1 the passing lane
const ROAD_LANES = [...MY_LANES, ...LANES.oncoming]; // and, driving recklessly, the two oncoming lanes
const SHOULDER = ROAD.half + ROAD.rumble + 1.4; // parked: off the road, right of the kerb

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
// ---- the cars: Pay 'n' Sprite's "JDM 90s pack" (assets/cars.js, made by tools/make_cars.py), pixel art, five
// cars from behind and in front, and their bumpers, body kits and spoilers, each a layer that fits its car's frame.
// A layer is a palette and runs of it a row at a time; its first `paint` colours are the paint, repainted here in
// the car's own colour, each shade kept as much lighter or darker than the view's main paint colour
const MODELS = Object.keys(CAR_ART);
const CAR_M = 1.9; // m across a car's sprite, mirrors and all (its height follows the art)
const rgb = hex => hex.length < 7 ? [1, 2, 3].map(i => 17 * parseInt(hex[i], 16)) : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); // #rgb or #rrggbb
const lum = ([r, g, b]) => 0.3 * r + 0.59 * g + 0.11 * b;
const mix = (a, b, f) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * f).toString(16).padStart(2, '0')).join('');
// parts: the view's layers, in order (the car, then a bumper, then a spoiler; a missing one is skipped); mask(x, y):
// another paint for this pixel (two-tone, stripes, a primer panel), or nothing; pad: rows of room above, for a roof's kit
function pixelSprite(view, parts, paint, { mask, pad = 0 } = {}) {
  const c = document.createElement('canvas'); c.width = view.w; c.height = view.h + pad;
  const g = c.getContext('2d'), im = g.createImageData(view.w, view.h), d = im.data, base = lum(rgb(view.base));
  for (const art of parts) if (art) {
    const pal = art.pal.map(rgb), shades = new Map(); // a paint's shades, worked out once
    const shade = hex => shades.get(hex) ?? shades.set(hex, pal.map((p, i) => i < art.paint ? rgb(hex).map(v => Math.max(0, Math.min(255, v + lum(p) - base))) : p)).get(hex);
    const own = paint ? shade(paint) : pal;
    let x = art.x, y = art.y;
    for (const [, n, ch] of art.rows.matchAll(/(\d*)(\D)/g)) {
      if (ch === '/') { x = art.x; y++; continue; }
      const i = ch < 'a' ? ch.charCodeAt(0) - 39 : ch.charCodeAt(0) - 97;
      for (let k = +(n || 1); k--; x++) if (ch !== '.') {
        const other = mask && i < art.paint && mask(x, y), [r, gr, bl] = (other ? shade(other) : own)[i], o = 4 * (y * view.w + x);
        d[o] = r; d[o + 1] = gr; d[o + 2] = bl; d[o + 3] = 255;
      }
    }
  }
  g.putImageData(im, 0, pad);
  const frac = b => b && [b[0] / view.w, (b[1] + pad) / c.height, b[2] / view.w, (b[3] + pad) / c.height];
  return Object.assign(c, { pixel: true, lamps: view.lamps?.map(frac) });
}
// pixels drawn on a car's sprite, in the art's own pixels (below the pad)
const dab = (c, pad, col, x, y, w = 1, h = 1) => { const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y) + pad, Math.round(w), Math.round(h)); };
const CAR_COLORS = ['#d33', '#36c', '#eee', '#222', '#e8b', '#2a8', '#fa3', '#88a'];
function beamsSprite(view, parts, paint) { // high beams: flashed at you when you're in its lane
  const c = pixelSprite(view, parts, paint), g = c.getContext('2d'), w = c.width, h = c.height;
  for (const b of view.lights.map((l, i) => l ?? [[0.1, 0.48, 0.3, 0.56], [0.7, 0.48, 0.9, 0.56]][i].map((f, j) => f * (j % 2 ? h : w)))) {
    const x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2, glow = g.createRadialGradient(x, y, 1, x, y, w * 0.3);
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, '#fff6c800'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
  }
  return c;
}
// a car's views, each made the first time it is drawn: most of them never are in a run, and a phone starts quicker
const lazyLook = (views, more) => Object.defineProperties({ ...more }, Object.fromEntries(Object.entries(views).map(([k, make]) => {
  let v; return [k, { get: () => v ??= make(), enumerable: true }]; })));
// a car as fitted: its model, paint, and which rear bumper, spoiler and front bumper (-1: as it came)
function carLook(spec) {
  const { rear, front } = CAR_ART[spec.model], at = (list, i) => list[i];
  const back = [rear.car, at(rear.bumpers, spec.bumper), at(rear.spoilers, spec.spoiler)], face = [front.car, at(front.bumpers, spec.front)];
  return lazyLook({ rear: () => pixelSprite(rear, back, spec.paint), front: () => pixelSprite(front, face, spec.paint),
    beams: () => beamsSprite(front, face, spec.paint) }, { spec });
}
// the traffic: every car in every colour, and a dozen fittings each: half of them as they came, a third with a wing,
// a bumper or kit at the front and back alike. Still one draw on the traffic's dice a car (spawnCar)
const FITS = 12, TRAFFIC = MODELS.length * CAR_COLORS.length * FITS, TRAFFIC_LOOKS = new Map();
function trafficLook(k) {
  if (!TRAFFIC_LOOKS.has(k)) {
    const model = MODELS[k % MODELS.length], paint = CAR_COLORS[Math.floor(k / MODELS.length) % CAR_COLORS.length];
    const fit = Math.floor(k / MODELS.length / CAR_COLORS.length), { rear, front } = CAR_ART[model], kit = fit % 2 ? -1 : fit / 2;
    const wing = fit % 3 === 0 && rear.spoilers.length ? Math.floor(fit / 3) % rear.spoilers.length : -1;
    TRAFFIC_LOOKS.set(k, carLook({ model, paint, bumper: kit < 0 ? -1 : kit % rear.bumpers.length, spoiler: wing,
      front: kit < 0 ? -1 : kit % front.bumpers.length, k }));
  }
  return TRAFFIC_LOOKS.get(k);
}
const WRECKS = new Map(); // a totalled car's rear view (Distance's War Rig): tipped over, burnt, smoking
function wreckSprite(img) {
  const pad = Math.round(img.height * 0.3); // room above, as it tips
  if (!WRECKS.has(img)) WRECKS.set(img, Object.assign(sprite(img.width, img.height + pad, (g, w, h) => {
    g.imageSmoothingEnabled = !img.pixel;
    g.save(); g.translate(w / 2, pad + img.height * 0.6); g.rotate(-0.35); g.drawImage(img, -w / 2, -img.height * 0.6); g.restore();
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#1a1210b0'; g.fillRect(0, 0, w, h); // scorched
    g.globalCompositeOperation = 'source-over';
    for (const [x, y, r] of [[0.35, 0.3, 0.13], [0.55, 0.18, 0.16], [0.7, 0.34, 0.11]]) { // smoke
      g.fillStyle = '#5a5a60aa'; g.beginPath(); g.arc(w * x, h * y, w * r, 0, 2 * Math.PI); g.fill();
    }
  }), { pixel: img.pixel }));
  return WRECKS.get(img);
}
const POLICE_MODEL = 'JTR-34';
function policeSprite(side, lit) { // black and white (white down to the glass, black below), a light bar on the roof
  const v = CAR_ART[POLICE_MODEL][side === 'beams' ? 'front' : side], pad = side === 'beams' ? 0 : 3; // lit red (0) or blue (1)
  const c = side === 'beams' ? beamsSprite(v, [v.car], '#f4f4f4') : pixelSprite(v, [v.car], '#f4f4f4', { pad, mask: (x, y) => y >= v.glass[3] && '#1c1c22' });
  const [x0, , x1] = v.glass, bw = Math.round((x1 - x0) * 0.6), bx = Math.round((x0 + x1 - bw) / 2);
  dab(c, 0, '#222', bx, 0, bw, 3);
  const g = c.getContext('2d'); g.shadowColor = lit ? '#48f' : '#f33'; g.shadowBlur = 6;
  dab(c, 0, lit ? '#48f' : '#f33', lit ? bx + bw / 2 : bx, 0, bw / 2, 3);
  return c;
}
const POLICE = [0, 1].map(lit => ({ rear: policeSprite('rear', lit), front: policeSprite('front', lit), beams: policeSprite('beams', lit) }));
// Fuel madness (Distance's War Rig): a mad driver's own car, gone to seed and armed: the paint mostly rust (one of
// three shades), a primer panel, rust holes, one tail light out, bars welded over the rear window, a pipe bar across
// the back with spikes along it and on the roof, in the pack's way of shading (a lit side, a dark side)
const RUST = ['#8b4a2b', '#6b3a22', '#9a6a44'];
function madLook(look) {
  const { spec } = look;
  return look.mad ??= lazyLook({ rear: () => madSprite(spec, 'rear'), front: () => madSprite(spec, 'front'),
    beams: () => madSprite(spec, 'front', true) }, { madOf: look });
}
function rustLook(look) { // the first rusty cars on the road (act 3's foreshadowing, oil.js): gone to seed, not yet armed
  const { spec } = look;
  return look.rust ??= lazyLook({ rear: () => madSprite(spec, 'rear', false, true), front: () => madSprite(spec, 'front', false, true),
    beams: () => madSprite(spec, 'front', true, true) }, { rustOf: look });
}
function madSprite(spec, side, beams, plain) { // from behind, or in front (bars over the windscreen, a spiked bull bar); plain: no bars or spikes
  const v = CAR_ART[spec.model][side], pad = 4, [gx0, gy0, gx1, gy1] = v.glass, [bx0, , bx1, by1] = v.body, bw = bx1 - bx0, low = by1 - gy1;
  const primer = (x, y) => y > gy1 && x - bx0 > bw * (spec.k % 2 ? 0.64 : 0.14) && x - bx0 < bw * (spec.k % 2 ? 0.84 : 0.34) && '#7c7a70';
  const parts = side === 'rear' ? [v.car, v.bumpers[spec.bumper], v.spoilers[spec.spoiler]] : [v.car, v.bumpers[spec.front]];
  const c = pixelSprite(v, parts, mix(spec.paint, RUST[spec.k % 3], 0.75), { pad, mask: primer });
  const at = (...b) => dab(c, pad, ...b);
  for (const [x, y, w] of [[0.16, 0.7, 3], [0.62, 0.3, 2], [0.86, 0.75, 2], [0.4, 0.55, 2]]) { // rust holes, their edges orange
    at('#b0602e', bx0 + x * bw - 1, gy1 + y * low - 1, w + 2, 3); at('#3a1a0c', bx0 + x * bw, gy1 + y * low, w, 1);
  }
  const dead = (v.lamps ?? v.lights)[1]; // the right tail light's outer half, or the right headlight, out
  if (dead && v.lamps) at('#2a0c0c', (dead[0] + dead[2]) / 2, dead[1], (dead[2] - dead[0]) / 2, dead[3] - dead[1]);
  else if (dead) at('#24242a', dead[0], dead[1], dead[2] - dead[0], dead[3] - dead[1]);
  if (plain) return beams ? glare(c, v, pad) : c;
  for (const f of [0.25, 0.5, 0.75]) { at('#1e1e22', gx0 + f * (gx1 - gx0), gy0, 2, gy1 - gy0); at('#6a6a72', gx0 + f * (gx1 - gx0), gy0, 1, gy1 - gy0); } // bars
  at('#1e1e22', gx0 + 2, (gy0 + gy1) / 2, gx1 - gx0 - 4, 2); at('#6a6a72', gx0 + 2, (gy0 + gy1) / 2, gx1 - gx0 - 4, 1);
  const spike = (x, y) => { at('#e2e2ea', x, y - 4, 1, 4); at('#8c8c96', x + 1, y - 3, 1, 3); at('#55555c', x - 1, y - 1, 1, 1); }; // steel, lit on its left
  for (let i = 0; i < 5; i++) spike(gx0 + (i + 0.5) * (gx1 - gx0) / 5 - 1, gy0 - 1); // on the roof
  const py = by1 - 7; // the pipe bar, on two uprights: a lit top, a dark underside, bolts
  for (const x of [bx0 + 0.15 * bw, bx0 + 0.85 * bw - 2]) { at('#2b2b30', x, py - 4, 2, 4); at('#6a6a72', x, py - 4, 1, 4); }
  at('#3c3c42', bx0, py, bw, 4); at('#a4a4ae', bx0, py, bw, 1); at('#1e1e22', bx0, py + 3, bw, 1);
  for (let i = 1; i < 8; i++) at('#c8c8d0', bx0 + i * bw / 8, py + 2);
  for (let i = 0; i < 6; i++) spike(bx0 + (i + 0.5) * bw / 6 - 1, py); // spikes along it
  return beams ? glare(c, v, pad) : c;
}
function glare(c, v, pad) { // flashing you with the one headlight it has left
  const [bx0, , bx1, by1] = v.body, bw = bx1 - bx0;
  const l = v.lights[0] ?? [bw * 0.1, (v.glass[3] + by1) / 2, bw * 0.3, (v.glass[3] + by1) / 2 + 4], g = c.getContext('2d');
  const x = (l[0] + l[2]) / 2, y = (l[1] + l[3]) / 2 + pad, glow = g.createRadialGradient(x, y, 1, x, y, c.width * 0.3);
  glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, '#fff6c800'); g.fillStyle = glow; g.fillRect(0, 0, c.width, c.height);
  return c;
}
const TANK_SPRITE = sprite(300, 230, (g, w, h) => { // the final boss (Distance), from behind: hull, tracks, turret, gun
  g.fillStyle = '#1b1d17'; g.fillRect(0, h * 0.6, w * 0.2, h * 0.4); g.fillRect(w * 0.8, h * 0.6, w * 0.2, h * 0.4); // tracks
  g.fillStyle = '#4b5320'; g.beginPath(); g.roundRect(w * 0.06, h * 0.42, w * 0.88, h * 0.4, 10); g.fill(); // hull
  g.fillStyle = '#3d4419'; g.beginPath(); g.roundRect(w * 0.26, h * 0.14, w * 0.48, h * 0.32, 18); g.fill(); // turret
  g.fillStyle = '#2b3011'; g.fillRect(w * 0.47, 0, w * 0.06, h * 0.2); // the gun, turned back at you
  g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2, h * 0.04, w * 0.035, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#ddd'; g.font = `bold ${h * 0.16}px sans-serif`; g.textAlign = 'center'; g.fillText('★', w / 2, h * 0.7);
  g.fillStyle = '#a22'; g.fillRect(w * 0.12, h * 0.5, w * 0.08, h * 0.05); g.fillRect(w * 0.8, h * 0.5, w * 0.08, h * 0.05);
});
// act 3's spots by the road (oil.js), in the palms' sunset silhouette with lamps lit: an oil puddle on the sand, a
// pumpjack nodding (two frames, the beam up and down), a refinery with its flare flickering (two frames)
const PUDDLE = sprite(240, 48, (g, w, h) => {
  const pool = g.createRadialGradient(w * 0.45, h * 0.45, 2, w / 2, h / 2, w * 0.5);
  pool.addColorStop(0, '#2b1f3a'); pool.addColorStop(0.5, '#140d18'); pool.addColorStop(1, '#0a070c');
  g.fillStyle = pool; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.48, h * 0.42, 0, 0, 2 * Math.PI); g.fill();
  for (const [c, r] of [['#7a3cff55', 0.3], ['#30d0a055', 0.22], ['#ffb03a44', 0.14]]) { // the sheen
    g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.ellipse(w * 0.42, h * 0.42, w * r, h * r * 0.9, -0.1, 0.2, 2.6); g.stroke();
  }
});
const JACK = [-1, 1].map(tilt => sprite(220, 160, (g, w, h) => {
  g.fillStyle = g.strokeStyle = '#2a1430';
  g.fillRect(w * 0.08, h * 0.9, w * 0.86, h * 0.1); // the skid
  g.lineWidth = 7; g.beginPath(); g.moveTo(w * 0.36, h * 0.9); g.lineTo(w * 0.5, h * 0.3); g.lineTo(w * 0.64, h * 0.9); g.stroke(); // the post
  g.save(); g.translate(w * 0.5, h * 0.3); g.rotate(tilt * 0.12); // the walking beam, nodding
  g.fillRect(-w * 0.38, -6, w * 0.7, 12);
  g.beginPath(); g.moveTo(-w * 0.38, -16); g.quadraticCurveTo(-w * 0.48, 4, -w * 0.38, 28); g.lineTo(-w * 0.33, 28); g.lineTo(-w * 0.33, -16); g.fill(); // the horse's head
  g.fillStyle = '#ffc861'; g.beginPath(); g.arc(0, 0, 3, 0, 2 * Math.PI); g.fill(); g.fillStyle = '#2a1430'; // a lamp at the pivot
  g.restore();
  const head = [w * 0.5 - Math.cos(tilt * 0.12) * w * 0.4, h * 0.3 - Math.sin(tilt * 0.12) * w * 0.4 + 24];
  g.lineWidth = 2; g.beginPath(); g.moveTo(...head); g.lineTo(head[0], h * 0.86); g.stroke(); // the rod, down the well
  g.fillRect(head[0] - 6, h * 0.84, 12, h * 0.06);
  g.beginPath(); g.arc(w * 0.8, h * 0.66, 15, 0, 2 * Math.PI); g.fill(); // the crank and its counterweight
  g.fillRect(w * 0.76, h * 0.66, w * 0.08, h * 0.24);
}));
const REFINERY = [0, 1].map(lick => sprite(320, 240, (g, w, h) => {
  g.fillStyle = '#2a1430';
  for (const [x, cw, ch] of [[0.14, 0.09, 0.62], [0.27, 0.07, 0.48], [0.62, 0.1, 0.7]]) { // the columns
    g.beginPath(); g.roundRect(w * x, h * (1 - ch), w * cw, h * ch, 8); g.fill();
  }
  g.beginPath(); g.arc(w * 0.45, h * 0.84, w * 0.08, Math.PI, 0); g.fill(); g.fillRect(w * 0.37, h * 0.84, w * 0.16, h * 0.16); // a tank
  g.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.14); // the plant
  g.fillRect(w * 0.84, h * 0.12, w * 0.02, h * 0.78); // the flare stack
  const flame = g.createRadialGradient(w * 0.85, h * 0.08, 1, w * 0.85, h * 0.1, w * (lick ? 0.07 : 0.05));
  flame.addColorStop(0, '#fff3b0'); flame.addColorStop(0.4, '#ff9a2e'); flame.addColorStop(1, '#ff4a1a00');
  g.fillStyle = flame; g.beginPath(); g.ellipse(w * 0.85, h * (lick ? 0.06 : 0.08), w * (lick ? 0.05 : 0.04), h * (lick ? 0.1 : 0.07), 0, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#ffc861'; // lamps on the columns
  for (const [x, y] of [[0.185, 0.45], [0.185, 0.62], [0.305, 0.6], [0.67, 0.38], [0.67, 0.55], [0.67, 0.72]]) g.fillRect(w * x, h * y, 3, 3);
}));
// act 3's foreshadowing (oil.js omenMarks), in the same silhouette: a fuel station, its board the pump price, then NO FUEL,
// then boarded up (board '': its lamps out, planks across the pumps and the board)
const STATIONS = new Map();
function stationSprite(board) {
  if (!STATIONS.has(board)) STATIONS.set(board, sprite(360, 200, (g, w, h) => {
    g.fillStyle = '#2a1430';
    g.fillRect(0, h * 0.93, w, h * 0.07); // the forecourt
    g.fillRect(w * 0.04, h * 0.2, w * 0.66, h * 0.09); // the canopy, on two posts
    for (const x of [0.12, 0.58]) g.fillRect(w * x, h * 0.29, w * 0.03, h * 0.64);
    for (const x of [0.27, 0.42]) { g.beginPath(); g.roundRect(w * x, h * 0.62, w * 0.06, h * 0.31, 4); g.fill(); } // the pumps
    g.fillRect(w * 0.885, h * 0.3, w * 0.025, h * 0.63); // the board, on its pole
    g.fillRect(w * 0.79, h * 0.04, w * 0.2, h * 0.28);
    if (!board) { // boarded up
      g.strokeStyle = '#5a3a2a'; g.lineWidth = 6;
      for (const [x0, y0, x1, y1] of [[0.24, 0.66, 0.51, 0.88], [0.24, 0.88, 0.51, 0.66], [0.8, 0.07, 0.98, 0.29]]) {
        g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * x1, h * y1); g.stroke();
      }
      return;
    }
    g.fillStyle = '#ffc861'; for (let i = 0; i < 5; i++) g.fillRect(w * (0.09 + 0.12 * i), h * 0.29, 12, 5); // lamps under the canopy
    const out = board === 'NO FUEL';
    g.fillStyle = out ? '#ff4a3a' : '#ffb03a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${h * 0.1}px monospace`;
    if (out) { g.fillText('NO', w * 0.89, h * 0.12); g.fillText('FUEL', w * 0.89, h * 0.24); } else g.fillText(board, w * 0.89, h * 0.18);
  }));
  return STATIONS.get(board);
}
const RACERS = new Map(); // racers' rear views by number: kitted, racing stripes, and the number once the race is revealed
const FONT = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111',
  '111100111101111', '111001001001001', '111101111101111', '111101111001111']; // 0-9, 3 wide and 5 high, row by row
function racerSprite(n, numbered, team) { // team: one of your fleet, black with gold stripes; made when first drawn
  const model = MODELS[n % MODELS.length], key = numbered ? (team ? -n : n) : model;
  return { get rear() { if (!RACERS.has(key)) RACERS.set(key, racerArt(model, numbered ? n : 0, numbered, team)); return RACERS.get(key); } };
}
function racerArt(model, n, numbered, team) { // each number its own bumper and wing (racers are always kitted)
  const v = CAR_ART[model].rear, mid = v.w / 2, sw = Math.max(2, Math.round(v.w * 0.06)), gap = Math.max(1, Math.round(v.w * 0.025));
  const kit = [v.car, v.bumpers[(n + v.bumpers.length - 1) % v.bumpers.length], v.spoilers[Math.floor(n / MODELS.length) % v.spoilers.length]];
  const stripe = (x, y) => Math.abs(x + 0.5 - mid) > gap && Math.abs(x + 0.5 - mid) <= gap + sw && (team ? '#e8c440' : '#c62828');
  const c = pixelSprite(v, kit, team ? '#1a1a20' : '#f4f4f4', { mask: stripe }), at = (...b) => dab(c, 0, ...b);
  if (numbered) { // the number on a roundel on the boot
    const digits = [...String(n)].map(Number), tw = digits.length * 4 - 1, r = Math.ceil(tw / 2) + 3;
    const cy = Math.round(v.glass[3] + (v.body[3] - v.glass[3]) * 0.4), cx = Math.round(mid);
    for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); at('#111', cx - half, cy + y, 2 * half, 1); }
    for (let y = -r + 1; y < r; y++) { const half = Math.round(Math.sqrt((r - 1) * (r - 1) - y * y)); at('#fff', cx - half, cy + y, 2 * half, 1); }
    digits.forEach((d, i) => [...FONT[d]].forEach((bit, j) => bit === '1' && at('#111', cx - Math.floor(tw / 2) + 4 * i + j % 3, cy - 2 + Math.floor(j / 3))));
  }
  return c;
}
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

// ---- traffic: oncoming cars keep to the far side of the double yellow. Cars going your way use both your lanes,
// slower ones on the right. They keep a safe distance, pull out to pass when the other lane is clear and never run
// into you; you can run into them. z: a car's back end (the end you see) as a course position.
const CAR_LEN = 4.5, CAR_W = 1.8;           // m
const MY_FRONT = 1.8, MY_REAR = 2.7;         // m from the driver's eye to your front and back bumpers
const traffic = [];
let spawned = 0; // cars put on the road so far: each one's serial (which ones are mad, below)
function spawnCar(car, d) {
  const oncoming = rand() < 0.45, lane = rand() < 0.6 ? 0 : 1;
  const kmh = oncoming ? 70 + rand() * 40 : lane ? 90 + rand() * 30 : 60 + rand() * 35;
  Object.assign(car, {
    z: odo + d, dir: oncoming ? -1 : 1, lane, look: trafficLook(Math.floor(rand() * TRAFFIC)),
    x: oncoming ? LANES.oncoming[rand() < 0.5 ? 0 : 1] : MY_LANES[lane],
    v: kmh / 3.6, want: kmh / 3.6, signal: 0, // m/s now, and what it cruises at; s of indicator before it pulls out
    serial: ++spawned, // which car it is (a mad one or not: Fuel madness)
    cut: 0, jumped: false, // a mad driver: s it counts as having just cut in on you; whether it has jumped in front of you
    d: NaN, // distance last frame: unknown for a fresh car, so it can't trigger a pass-by sound
    hit: -Infinity, // when you last ran into it (s on the clock): one crash per bump
    warned: false, beams: 0, // an oncoming car: has it flashed and honked at you yet, and for how much longer
    swerve: null, // an oncoming car flashed out of your way (a game of chicken): the lane it is moving to
    wreck: false, hp: null, // totalled (Distance's War Rig), and its health when hurt (null: unhurt)
    police: false, stage: null, passing: false, // a police car (Distance's War Rig, police.js), how far into its move
    tank: false, w: undefined, h: undefined, // the final boss (boss.js), and its size, m
  });
}
const sameLane = (a, x) => Math.abs(a - x) < CAR_W; // two lateral positions close enough to touch
// nobody going this way, you included, within back..front metres of car in x; with a mirror check (mirror s), nobody
// further back who would close those metres on it in that time either: 20 m is under a second when you come up
// 100 km/h quicker
function roomAt(car, x, back, front, mirror = 0) {
  const behind = v => back + Math.max(0, v - car.v) * mirror;
  for (const o of traffic) if (o !== car && o.dir > 0 && sameLane(o.x, x) && o.z > car.z - behind(o.v) && o.z < car.z + front) return false;
  return !(sameLane(carX, x) && odo + MY_FRONT > car.z - behind(speed) && odo - MY_REAR < car.z + front);
}
function spawnAhead(car, d = 900 + rand() * 600) { // over the horizon, with room around it in both your lanes, so
  for (let tries = 0; tries < 6; tries++, d += 60) { // it never appears beside another car as a wall nobody can pass
    spawnCar(car, d);
    if (car.dir < 0 || MY_LANES.every(x => roomAt(car, x, 60, 60))) return;
  }
}
function resetTraffic(fixed = []) { // a fresh set of cars spread out ahead, around any the game places itself
  traffic.length = 0;
  traffic.push(...fixed);
  for (let i = 0; i < 14; i++) { const c = {}; traffic.push(c); spawnAhead(c, 80 + i * 110); }
}
resetTraffic();

function leader(car) { // the nearest thing ahead in its lane: a car, or you
  let lead = null;
  for (const o of traffic) if (o.dir > 0 && o !== car && sameLane(o.x, car.x) && o.z > car.z && (!lead || o.z < lead.z)) lead = o;
  const me = odo - MY_REAR;
  if (sameLane(carX, car.x) && me > car.z && (!lead || me < lead.z)) lead = { z: me, v: speed };
  return lead;
}
const LANE_GAP = { racer: 5, car: 2 }; // seconds a car waits between lane changes: racers don't weave to block you
// passing, as drivers do (the playtests of 15-18 Oct: cars cut in just as you got there, and pairs drove side by side):
// only when clearly quicker than the car ahead (PASS m/s, 10 km/h), or it follows; after a look in the mirror for
// anything closing in under MIRROR s; and with SIGNAL s of indicator first
const PASS = 10 / 3.6, MIRROR = 4, SIGNAL = 1;
// Fuel madness (the game's madness(), Distance's War Rig: the share of drivers gone mad, 0 to 1): which ordinary cars
// are mad, going your way or coming at you (the owner, 18 Oct: the oncoming traffic had none). Picked by serial in golden-ratio steps: an even spread, and no draw on the traffic's seeded
// dice, so the road is the same as before for everyone else
const mad = c => !c.racer && !c.fleet && !c.police && !c.tank &&
  c.serial * 0.6180339887 % 1 < (game.madness?.() ?? 0);
// the first rusty cars (the game's rust(): the share of ordinary cars gone to rust, 0 to 1; Distance's act 3, oil.js)
const rusty = c => !c.racer && !c.fleet && !c.police && !c.tank && c.serial * 0.3819660113 % 1 < (game.rust?.() ?? 0);
function driveCar(c, dt) { // follow at a safe distance, or pull out and pass
  const lead = leader(c), gap = lead ? lead.z - c.z - CAR_LEN : Infinity, safe = 8 + 1.2 * c.v;
  let aim = c.want;
  c.cool = Math.max(0, (c.cool ?? 0) - dt);
  c.cut = Math.max(0, (c.cut ?? 0) - dt); // s it still counts as having just cut in (a mad driver: aids.js takeRam)
  if (c.fleet) teamwork(c, dt); // one of your fleet (fleet.js)
  // a mad driver: no look in the mirror, no indicator, out whenever quicker; and it jumps in front of you: you closing
  // on it in its other lane, 0.8-2 s behind, it swerves across into your lane, briskly, once (the owner, 18 Oct: "jump
  // in front of the player")
  const bad = mad(c);
  const mine = MY_LANES.findIndex(x => sameLane(x, carX)), reach = (c.z - odo - MY_FRONT) / Math.max(0.1, speed - c.v);
  if (bad && !c.jumped && mine >= 0 && mine !== c.lane && Math.abs(c.x - MY_LANES[c.lane]) < 0.2 && reach > 0.8 && reach < 2)
    Object.assign(c, { jumped: true, lane: mine, yielding: true, cut: 3, cool: LANE_GAP.car });
  const hunting = lead && lead === c.prey; // a fleet car on the hunt (gang.js prowl): no passing it, no backing off
  if (hunting) { aim = Math.max(aim, lead.v + 3); c.signal = 0; }
  else if (lead && gap < 2 * safe && lead.v < c.want) {
    const [pass, mirror, signal] = bad ? [0, 0, 0] : [PASS, MIRROR, SIGNAL];
    const other = 1 - c.lane, clear = () => roomAt(c, MY_LANES[other], 20, 30, mirror);
    let moved = false;
    if (lead.v > c.want - pass || c.cool || Math.abs(c.x - MY_LANES[c.lane]) > 0.2) c.signal = 0; // follows; settled first
    else if (!c.signal && !signal) { if (clear()) { c.lane = other; c.cool = LANE_GAP.car; c.cut = 3; moved = true; } } // straight out
    else if (!c.signal) c.signal = clear() ? signal : 0;
    else if ((c.signal = Math.max(0, c.signal - dt)) === 0 && clear()) { // moves over if the lane is still clear
      c.lane = other;
      c.cool = c.racer ? LANE_GAP.racer : LANE_GAP.car;
      moved = true;
    }
    if (!moved) aim = Math.min(aim, lead.v * (gap < safe ? 0.9 : 1));
  } else c.signal = 0;
  c.v += clamp(aim - c.v, -6 * dt, 2 * dt);
  const lat = c.yielding ? 3.5 : 1.6; // m/s sideways; briskly when getting out of your way
  c.x += clamp(MY_LANES[c.lane] - c.x, -lat * dt, lat * dt);
  if (Math.abs(c.x - MY_LANES[c.lane]) < 0.05) c.yielding = false;
  c.z += c.v * dt;
  if (lead && c.z > lead.z - CAR_LEN - 0.5) { // never into it, unless hunting it
    if (hunting) gangRam(c, lead);
    c.z = lead.z - CAR_LEN - 0.5; c.v = Math.min(c.v, lead.v);
  }
}

// the side a car going your way indicates (-1 left, 1 right, 0 not): while it waits to pull out, and as it moves over;
// a mad driver never does
function indicator(c) {
  if (c.dir < 0 || c.wreck || c.tank || mad(c)) return 0;
  const d = MY_LANES[c.signal ? 1 - c.lane : c.lane] - c.x;
  return Math.abs(d) > 0.3 ? Math.sign(d) : 0;
}

// flashed: an ordinary car ahead of you in your lane (within 250 m) moves over to your other lane if there is room.
// Racers don't care.
// yields: whether car c would move over into lane `to` for a flash now (racers never do)
const yields = (c, to) => !c.racer && !c.police && !c.tank && !c.yielding && c.dir > 0 && c.z > odo && c.z - odo <= 250 && roomAt(c, MY_LANES[to], 12, 25);
// Playing chicken (Distance's upgrade), an oncoming car in your lane within 250 m swerves into its other lane, if
// nobody is there within 25 m of it
let chicken = false;
const across = x => sameLane(x, LANES.oncoming[0]) ? LANES.oncoming[1] : LANES.oncoming[0];
const swerves = c => c.dir < 0 && !c.police && !mad(c) && c.swerve == null && c.z > odo && c.z - odo <= 250 && !(sameLane(carX, across(c.x)) ||
  traffic.some(o => o !== c && sameLane(o.swerve ?? o.x, across(c.x)) && Math.abs(o.z - c.z) < 25));
function flashAhead() {
  if (lane > 1) { // over there they are coming at you: only a game of chicken moves them
    if (chicken) for (const c of traffic) if (sameLane(c.x, carX) && swerves(c)) c.swerve = across(c.x);
    return;
  }
  const to = 1 - lane;
  for (const c of traffic) if (sameLane(c.x, carX) && yields(c, to)) Object.assign(c, { lane: to, yielding: true, cool: LANE_GAP.car + 2 });
}

// a totalled car (Distance's War Rig) skids off onto the right shoulder and stops there
function skid(c, dt) {
  c.v = Math.max(0, c.v - 14 * dt);
  c.z += c.v * dt;
  c.x += clamp(SHOULDER - c.x, -4 * dt, 4 * dt);
}

// this frame's racers not in your crew, in the road's own order: what your racers look for (fleet.js, gang.js) a
// frame, each of them searching the whole road was most of the traffic's work in act 4
let RIVALS = [];
// a head-on with a mad driver (Fuel madness) isn't the end of your run (the owner, 18 Oct): you lose most of your speed
// and the game hears of a hard crash (Distance: heavy damage, and the mad car totalled); it ends up spun round, stopped
function madHeadOn(c) {
  impact = { kmh: (speed + c.v) * 3.6, headOn: true, mad: true, car: c };
  speed *= 0.25;
  crashed = true;
  Object.assign(c, { dir: 1, v: 0, want: 0, swerve: null });
}
function updateTraffic(dt, clock) {
  RIVALS = traffic.filter(o => o.racer && !o.fleet);
  for (const c of traffic) {
    if (c.wreck) skid(c, dt);
    else if (c.police) policeDrive(c, dt); // police.js
    else if (c.tank) tankDrive(c, dt); // boss.js
    else if (c.runner) runnerDrive(c, dt); // a car of your crew on its way to a spot (oil.js)
    else if (c.dir > 0) driveCar(c, dt);
    else { // oncoming: a mad driver steers for you while you are on its side, until 1.2 s out (as the police do)
      if (mad(c) && lane > 1 && (c.z - odo) / Math.max(1, speed + c.v) > 1.2) c.x += clamp(carX - c.x, -3 * dt, 3 * dt);
      c.z -= c.v * dt;
      if (c.swerve != null) c.x += clamp(c.swerve - c.x, -3.5 * dt, 3.5 * dt); // as brisk as yielding
    }
    const d = c.z - odo;
    if (c.d > 0 && d <= 0) whoosh(Math.abs(speed - c.dir * c.v) * 3.6, c.x < carX ? -0.7 : 0.7); // went past the driver
    c.d = d;
    if (c.racer || c.passing || c.tank || c.runner) { /* racers stay where they are, however far: their places are the
      race; a police car comes up from behind; the tank holds the road; a car of your crew goes on to its spot */ }
    else if (d < -40 || c.dir > 0 && d < -8 && c.v < speed - 1) spawnAhead(c); // left behind: back to the horizon
    else if (d > ROAD.draw * ROAD.segment + 100) { // pulled away: comes up from behind instead, in a lane you're not in
      spawnCar(c, -30);
      Object.assign(c, { dir: 1, lane: sameLane(carX, MY_LANES[0]) ? 1 : 0, want: Math.max(c.want, speed + 4), v: Math.max(c.want, speed + 4) });
      c.x = MY_LANES[c.lane];
    }
    // you ran into it: your front into its back, sideways into it while changing lanes, or head-on
    const touching = !c.wreck && sameLane(c.x, carX) && c.z < odo + MY_FRONT && c.z + CAR_LEN > odo - MY_REAR && clock - c.hit > 1.5;
    if (touching) { c.hit = clock; c.dir > 0 ? bump(c) : mad(c) ? madHeadOn(c) : headOn(c); }
    // an oncoming car with you in its lane: flashes its lights and sounds its horn, once, about 3 s out
    c.beams = Math.max(0, (c.beams ?? 0) - dt);
    if (c.dir < 0 && !c.warned && sameLane(c.x, carX) && c.d > 0 && c.d < 3 * (speed + c.v)) { c.warned = true; c.beams = 2; horn(); }
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

// a mad driver's car is rusty and weaves in its lane, drawn only (its place on the road stays put), so you know it
// from afar (the owner left the look to Claude, 18 Oct)
const lookOf = c => !c.look.spec ? c.look : mad(c) ? madLook(c.look) : rusty(c) ? rustLook(c.look) : c.look;
const weave = c => mad(c) && !c.wreck ? 0.3 * Math.sin(performance.now() / 250 + c.serial) : 0; // m, about every 1.6 s
// the game's marks by kind, each sprite made only for its own kind (all three were, for every mark: the best banner,
// a 640 px canvas, was redrawn for each distance board ahead, every frame, and a speed sign kept for each distance)
const MARKS = {
  best: v => ({ x: 0, w: 2 * (ROAD.half + ROAD.rumble), h: 5.6, img: bannerSprite(v) }),
  board: v => ({ x: ROAD.half + 2, w: 1.6, h: 3, img: boardSprite(v) }),
  sign: v => ({ x: ROAD.half + 2, w: 1.5, h: 4.1, img: signSprite(v) }),
  // act 3's spots (oil.js crewMarks), off the road on the right, and your crew's cars parked at one
  puddle: () => ({ x: ROAD.half + 6, w: 6, h: 1.2, img: PUDDLE }),
  jack: () => ({ x: ROAD.half + 8, w: 8, h: 5.8, img: JACK[Math.floor(performance.now() / 700) % 2] }),
  refinery: () => ({ x: ROAD.half + 17, w: 20, h: 15, img: REFINERY[Math.floor(performance.now() / 180) % 2] }),
  parked: v => { const img = racerSprite(v.n, true, true).rear; return { x: ROAD.half + 2.6 + 2.3 * v.side, w: CAR_M, h: CAR_M * img.height / img.width, img }; },
  // its foreshadowing (oil.js omenMarks): a fuel station, and a burnt-out shell on the shoulder
  station: v => ({ x: ROAD.half + 13, w: 13, h: 7.2, img: stationSprite(v) }),
  shell: v => { const img = wreckSprite(trafficLook(v).rear); return { x: SHOULDER + 0.8, w: CAR_M, h: CAR_M * img.height / img.width, img }; },
};
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
    proj.push({ x: w / 2 + (-(carX - ROAD.seat) - x) * scale, y: horizon + (eyeY - s.y) * scale, k: scale, z });
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
    clip[n] = maxy;
    if (proj[n + 1].y >= maxy || a.y <= proj[n + 1].y) continue; // hidden behind a crest, or sloping away from us
    // beyond about 70 m a segment is under a pixel tall: they go in one slice until it is a pixel tall (or bends 4 px
    // sideways), the first one's colours for all; 300 slices of nine shapes a frame were most of a phone's work
    let m = n + 1;
    while (m < ROAD.draw && a.y - proj[m + 1].y < 1 && proj[m + 1].y < proj[m].y && Math.abs(proj[m + 1].x - a.x) < 4) clip[m++] = maxy;
    const b = proj[m];
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
    n = m - 1;
  }
  const drawClipped = (img, x, y, dw, dh, clipY) => { // the part below clipY is behind a crest
    if (y >= clipY) return;
    const vis = Math.min(dh, clipY - y);
    g.imageSmoothingEnabled = !(img.pixel && dw > img.width); // pixel art: hard pixels up close, smoothed far off (no shimmer)
    g.drawImage(img, 0, 0, img.width, img.height * vis / dh, x, y, dw, vis);
  };

  // sprites, far to near: palms, traffic and the game's marks (x: metres from the centre line, w/h: metres)
  const marks = (game.marks?.() ?? []).map(m => ({ z: m.z, ...MARKS[m.kind](m.value), ref: m.ref })); // ref: told where it is
  const look = c => c.wreck ? wreckSprite(lookOf(c).rear) : c.dir > 0 ? lookOf(c).rear : c.beams ? lookOf(c).beams : lookOf(c).front;
  const placed = c => { const img = look(c), w = c.w ?? (img.pixel ? CAR_M : 1.8); // a car's art sets its height
    return { z: c.z, x: c.x + weave(c), w, h: c.h ?? (img.pixel ? w * img.height / img.width : 1.4), img, car: c }; };
  const ahead = [...traffic.map(placed), ...marks]
    .map(o => ({ ...o, d: o.z - odo })).filter(o => o.d > 2 && o.d < (ROAD.draw - 2) * ROAD.segment).sort((p, q) => q.d - p.d);
  for (const c of [...traffic, ...marks.map(m => m.ref).filter(Boolean)]) c.seen = null; // where each car (and a mark that
                                                                    // asks: an act 3 spot) is on the screen, canvas px
  const blinkOn = performance.now() % 660 < 330; // indicators: about 1.5 flashes a second
  let t = 0;
  for (let n = ROAD.draw - 1; n > 0; n--) {
    const a = proj[n], s = segments[(base + n) % ROAD.count], fog = Math.min(1, 1.6 - n / ROAD.draw * 1.6);
    g.globalAlpha = fog;
    for (const sp of s.sprites) {
      const ph = 11 * sp.size * a.k, pw = ph / 2;
      if (ph > 1.5) drawClipped(PALM, a.x + sp.x * a.k - pw / 2, a.y - ph, pw, ph, clip[n]); // a far one is a dot: skipped
    }
    while (t < ahead.length && ahead[t].d >= a.z) { // cars and signs within this segment
      const o = ahead[t++], f = (o.d - a.z) / ROAD.segment, b = proj[n + 1] || a;
      const k = a.k + (b.k - a.k) * f, cx = a.x + (b.x - a.x) * f, cy = a.y + (b.y - a.y) * f;
      if (o.h * k > 1) drawClipped(o.img, cx + (o.x - o.w / 2) * k, cy - o.h * k, o.w * k, o.h * k, clip[n]); // not a dot far off
      const who = o.car ?? o.ref;
      if (who && cy - o.h * k < clip[n]) who.seen = [cx + (o.x - o.w / 2) * k, cy - o.h * k, o.w * k, o.h * k];
      const side = o.car && indicator(o.car); // over the outer half of a tail light (the art's, else where a car's is)
      const L = side && (o.img.lamps?.[side < 0 ? 0 : 1] ?? (side < 0 ? [0.03, 0.5, 0.25, 0.64] : [0.75, 0.5, 0.97, 0.64]));
      const outer = L && (side < 0 ? [L[0], (L[0] + L[2]) / 2] : [(L[0] + L[2]) / 2, L[2]]);
      const lx = L && cx + (o.x - o.w / 2 + outer[0] * o.w) * k, ly = L && cy - o.h * k + L[1] * o.h * k;
      const lw = L && (outer[1] - outer[0]) * o.w * k, lh = L && (L[3] - L[1]) * o.h * k;
      if (L && blinkOn && ly + lh < clip[n]) {
        const r = Math.max(3, 0.3 * o.w * k), gx = lx + lw / 2, gy = ly + lh / 2, glow = g.createRadialGradient(gx, gy, 0, gx, gy, r);
        glow.addColorStop(0, '#ffa31acc'); glow.addColorStop(1, '#ffa31a00'); // a glow, so it reads far off on a phone
        g.fillStyle = glow; g.fillRect(gx - r, gy - r, 2 * r, 2 * r);
        g.fillStyle = '#ffb23a';
        g.fillRect(lx, ly, lw, lh);
      }
    }
  }
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = true;
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
