// Engine: recorded sound loops, starter motor, turbo flutter and the rpm model.
// Classic script: shares globals with the other scripts index.html loads, in that order.

// loops: [rpm, base64 WAV] recorded at a steady rpm, built by tools/make_sounds.py into assets/sounds.js
// drive: free-revving acceleration at full throttle, rpm/s (a flat torque curve, so power peaks near the redline)
// tauDown: engine braking: seconds for the revs to close ~63% of the gap to idle with the throttle shut
// lope: rpm the idle hunts by (big cam); turbo: pulls weakly until boost builds; torqueDip: rpm where the
// factory tune pulls torque; revHang: seconds the e-throttle's late closing (emissions) slows the drop after lift-off
// inertia: flywheel kg·m²; times drive it gives the engine's torque, i.e. how hard it pulls in gear
// mass: kg of the car around it; final: its differential ratio (torquey engines pull taller gearing)
const ENGINES = [ // weakest first: the garage unlocks them in this order
  // 86 / BRZ FA20: light and eager, torque dip around 3500-4500 rpm, rev hang on lift-off; the weakest pull
  { name: 'JDM Boxer', loops: SOUNDS.boxer, idle: 855, redline: 7400, drive: 6500, tauDown: 0.8, torqueDip: 3800,
    revHang: 0.6, inertia: 0.31, mass: 1250, final: 4.1 },
  // big-cam V8, heavy flywheel: lumpy idle, steady but slow to rev and slow to drop; lots of torque
  { name: 'Muscle V8', loops: SOUNDS.v8, idle: 825, redline: 7000, drive: 5000, tauDown: 1.3, lope: 40,
    inertia: 0.76, mass: 1650, final: 3.42 },
  // Supra 2JZ with a big turbo: lazy off idle, then pulls hard once spooled, flutters on lift
  { name: 'JDM Turbo I6', loops: SOUNDS.supra, idle: 1000, redline: 8000, drive: 7000, tauDown: 0.9, turbo: true,
    inertia: 0.57, mass: 1500, final: 3.27 },
];
ENGINES.forEach(e => { e.stock = { drive: e.drive, redline: e.redline }; }); // as built; the Distance garage tunes them
const PEDAL_IN = 0.4, PEDAL_OUT = 0.25; // fastest the throttle follows the pedal: seconds for full travel
const CRANK = 0.9; // seconds the key has to be held in START before the engine catches
const LIMITER_CUT = 0.06; // seconds the rev limiter cuts the fuel each time the redline is hit (stutters in any gear)

let engine, ctx, loading, players = [], filter, master, noise, starterBuffer, starterGain, wind, squeal, nos;
let carBus, carVolume = 1; // every sound the car makes goes out through carBus, at the settings' volume (main.js)
// state: 'off' | 'cranking' | 'running'; cut: rev limiter has cut the fuel, for cutLeft more seconds
// gasPedal: 0..1 how far the gas pedal is pressed; lifted: the pedal has come up since the last lift-off
let rpm = 0, throttle = 0, boost = 0, hang = 0, cut = false, cutLeft = 0, gasPedal = 0, lifted = true;
const NITRO = 1.6; // torque while nitro burns (Distance)
let nitro = false;
let revCap = Infinity; // a limiter below the redline: the Distance aids keep a tuned engine on its factory map
let state = 'off', crankUntil = 0, crankWanted = false;

async function start() {
  ctx = new AudioContext();
  carBus = ctx.createGain();
  carBus.gain.value = carVolume;
  carBus.connect(ctx.destination);
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(carBus);
  filter = ctx.createBiquadFilter(); // muffles the sound when coasting off throttle
  filter.type = 'lowpass';
  filter.frequency.value = 12000;
  filter.connect(master);

  // one second of white noise: the turbo's flutter, the wind, passing cars
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  starterGain = ctx.createGain(); // starter motor has its own level, independent of rpm
  starterGain.gain.value = 0;
  starterGain.connect(carBus);

  const roar = ctx.createBufferSource(); // wind and tyre roar: looping noise, louder and brighter with speed
  roar.buffer = noise;
  roar.loop = true;
  wind = { filter: ctx.createBiquadFilter(), gain: ctx.createGain() };
  wind.filter.type = 'lowpass';
  wind.gain.gain.value = 0;
  roar.connect(wind.filter).connect(wind.gain).connect(carBus);
  roar.start();
  const scrub = ctx.createBufferSource(); // tyre squeal: noise in a narrow band, faded in while the tyres spin
  scrub.buffer = noise;
  scrub.loop = true;
  squeal = { filter: ctx.createBiquadFilter(), gain: ctx.createGain() };
  squeal.filter.type = 'bandpass';
  squeal.filter.frequency.value = 1100;
  squeal.filter.Q.value = 18;
  squeal.gain.gain.value = 0;
  scrub.connect(squeal.filter).connect(squeal.gain).connect(carBus);
  scrub.start();
  const hiss = ctx.createBufferSource(); // nitro: a high hiss while it burns
  hiss.buffer = noise;
  hiss.loop = true;
  nos = { filter: ctx.createBiquadFilter(), gain: ctx.createGain() };
  nos.filter.type = 'highpass';
  nos.filter.frequency.value = 3000;
  nos.gain.gain.value = 0;
  hiss.connect(nos.filter).connect(nos.gain).connect(carBus);
  hiss.start();

  const decode = wav => ctx.decodeAudioData(Uint8Array.from(atob(wav), c => c.charCodeAt(0)).buffer);
  starterBuffer = await decode(SOUNDS.starter);
  await Promise.all(ENGINES.map(async e => {
    e.buffers = await Promise.all(e.loops.map(([, wav]) => decode(wav)));
  }));
  buildPlayers();
}

function buildPlayers() {
  players.forEach(p => p.src.stop());
  players = engine.loops.map(([loopRpm], i) => {
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = engine.buffers[i];
    src.loop = true;
    gain.gain.value = 0;
    src.connect(gain).connect(filter);
    src.start();
    return { src, gain, rpm: loopRpm };
  });
}

// equal-power crossfade (in log-rpm) between the two loops recorded closest to r
function loopGains(r) {
  const g = players.map(() => 0), hi = players.findIndex(p => p.rpm >= r);
  if (hi <= 0) g[hi === 0 ? 0 : g.length - 1] = 1;
  else {
    const lo = players[hi - 1].rpm, x = Math.log(r / lo) / Math.log(players[hi].rpm / lo);
    g[hi - 1] = Math.cos(x * Math.PI / 2);
    g[hi] = Math.sin(x * Math.PI / 2);
  }
  return g;
}

// the turbo's flutter on lift-off, "stu-tu-tu-tu" (the 18 Oct playtest expected it of a JDM turbo): with no blow-off
// valve the boost has nowhere to go but back through the compressor, which chops it into a burst of puffs. A dozen of
// them, slowing and fading, through a band of noise that falls in pitch as the pressure drops
function flutter() {
  if (!ctx) return;
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  src.buffer = noise;
  bp.type = 'bandpass';
  bp.Q.value = 2.5;
  bp.frequency.setValueAtTime(2400, t);
  bp.frequency.exponentialRampToValueAtTime(900, t + 0.7);
  g.gain.setValueAtTime(0.0001, t);
  let at = t + 0.01, gap = 0.035, level = 3.5 * boost; // its puffs peak about as loud as a blow-off valve's hiss
  for (let i = 0; i < 12; i++, at += gap, gap *= 1.07, level *= 0.8) { // a puff: in fast, out over most of the gap
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.75 * gap);
  }
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(at + 0.05);
}

function whoosh(relSpeed, side) { // a car passing (side -1 left, 1 right); louder the faster you pass each other
  if (!ctx || !Number.isFinite(relSpeed)) return;
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
  const t = ctx.currentTime, level = Math.min(0.5, Math.max(0.001, relSpeed / 120)); // ramps can't reach 0
  src.buffer = noise;
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, t);
  bp.frequency.exponentialRampToValueAtTime(350, t + 0.6); // pitch drops as it goes by
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  pan.pan.value = side;
  src.connect(bp).connect(g).connect(pan).connect(carBus);
  src.start();
  src.stop(t + 0.6);
}

function grind() { // gears clashing: shifting without the clutch
  if (!ctx) return;
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  src.buffer = noise;
  bp.type = 'bandpass';
  bp.frequency.value = 2800;
  bp.Q.value = 6;
  for (let i = 0; i < 6; i++) g.gain.setValueAtTime(i % 2 ? 0.15 : 0.6, t + i * 0.04); // rattling teeth
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  src.connect(bp).connect(g).connect(carBus);
  src.start();
  src.stop(t + 0.35);
}

function crashSound() { // a thump and a crunch of metal
  if (!ctx) return;
  const t = ctx.currentTime, src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3000, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.5);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  src.connect(lp).connect(g).connect(carBus);
  src.start(t);
  src.stop(t + 0.6);
  const thump = ctx.createOscillator(), tg = ctx.createGain();
  thump.frequency.setValueAtTime(90, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.25);
  tg.gain.setValueAtTime(0.8, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  thump.connect(tg).connect(carBus);
  thump.start(t);
  thump.stop(t + 0.3);
}

function horn() { // an oncoming driver leaning on the horn: two flat tones
  if (!ctx) return;
  const t = ctx.currentTime, g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  g.gain.setValueAtTime(0.12, t + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  g.connect(carBus);
  for (const f of [415, 523]) {
    const o = ctx.createOscillator();
    o.type = 'square'; o.frequency.value = f;
    o.connect(g); o.start(t); o.stop(t + 0.85);
  }
}

function beep(freq, seconds) { // countdown and finish tones
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.06, t);
  g.gain.setTargetAtTime(0, t + seconds * 0.8, 0.02);
  o.connect(g).connect(carBus);
  o.start(t);
  o.stop(t + seconds + 0.2);
}

// the key held in START turns the starter; the engine catches after CRANK seconds, letting go earlier stops it
async function crank(on) {
  crankWanted = on;
  if (!on) { if (state === 'cranking') state = 'off'; return; }
  loading ??= start(); // browsers only allow audio after a user gesture
  await loading;
  if (!crankWanted || state !== 'off') return; // let go while the sounds were loading, or already running
  state = 'cranking';
  crankUntil = performance.now() + CRANK * 1000;
  const starter = ctx.createBufferSource(); // looping starter motor, faded out by updateAudio() when it stops
  starter.buffer = starterBuffer;
  starter.loop = true;
  starter.connect(starterGain);
  starter.start();
  starter.stop(ctx.currentTime + 3);
}

// free-revving acceleration (rpm/s) at this rpm and throttle: drive torque from the throttle against friction and
// pumping losses, which are large with the throttle shut (engine braking) and mostly gone at full throttle.
// In gear the same torque (inertia x this) also has to move the car.
function engineAccel(e, r, thr) {
  if (r < e.idle && thr < 0.05) return (e.idle - r) / 0.5; // idle control holds the idle
  let pull = 1; // how much of its torque the engine makes at this rpm
  if (e.turbo) pull = 0.35 + 0.85 * boost;
  if (e.torqueDip) pull *= 1 - 0.4 * Math.exp(-(((r - e.torqueDip) / 500) ** 2));
  const slow = e.revHang ? 1 + 3 * hang / e.revHang : 1; // rev hang: the drop after lift-off starts slower
  return thr * e.drive * pull * (nitro ? NITRO : 1) - (r - e.idle) / (e.tauDown * slow) * (1 - 0.8 * thr);
}

// throttle pedal, starter, turbo and limiter; returns the engine's free-rev acceleration (rpm/s) for this step
function updateEngine(dt, now) {
  const e = engine;
  // the throttle follows the pedal, no faster than PEDAL_IN / PEDAL_OUT for a full sweep
  const want = state === 'running' ? gasPedal : 0;
  throttle = want > throttle ? Math.min(want, throttle + dt / PEDAL_IN) : Math.max(want, throttle - dt / PEDAL_OUT);
  hang = Math.max(0, hang - dt);
  if (gasPedal > 0.4) lifted = false; // lifting off: the turbo's flutter, and the boxer's rev hang
  else if (gasPedal < 0.15 && !lifted) {
    lifted = true;
    if (e.turbo && boost > 0.5) flutter();
    if (e.revHang) hang = e.revHang;
  }
  if (state === 'cranking') {
    rpm = 250 + 80 * Math.sin(now / 40); // starter motor chugging
    if (now > crankUntil) { state = 'running'; rpm = e.idle + 1000; } // catches, flares, settles to idle
  }
  // boost follows the throttle above 3000 rpm: spools up slowly (lag), dumps fast (the flutter)
  const boostAim = state === 'running' && rpm > 3000 ? throttle : 0;
  boost += (boostAim - boost) * Math.min(1, dt / (boostAim > boost ? 0.7 : 0.15));
  cutLeft = Math.max(0, cutLeft - dt); // rev limiter: a short fuel cut each time the redline is reached
  if (!cutLeft && rpm >= Math.min(e.redline, revCap)) cutLeft = LIMITER_CUT;
  cut = cutLeft > 0;
  return state === 'running' ? engineAccel(e, rpm, cut ? 0 : throttle) : 0;
}

// rpm as heard and shown: the big-cam lope makes the idle hunt unevenly, fading out as the revs rise
function shownRpm(now) {
  const e = engine;
  return rpm + (e.lope && state === 'running' ?
    e.lope * Math.sin(now / 90) * Math.sin(now / 410) * Math.max(0, 1 - (rpm - e.idle) / 600) : 0);
}

function updateAudio(shown) {
  const e = engine, t = ctx.currentTime;
  const power = cut ? 0 : throttle; // the limiter's fuel cut is heard as the engine dropping out
  const level = (0.45 + 0.35 * power) * (0.5 + 0.5 * rpm / e.redline); // louder on throttle and with revs
  const overrun = state === 'running' && power < 0.1 && rpm > e.idle * 1.5;
  loopGains(shown).forEach((g, i) => {
    players[i].gain.gain.setTargetAtTime(g, t, 0.03);
    players[i].src.playbackRate.setTargetAtTime(Math.max(0.05, shown / players[i].rpm), t, 0.03);
  });
  filter.frequency.setTargetAtTime(overrun ? 2000 : 12000, t, 0.03);
  starterGain.gain.setTargetAtTime(state === 'cranking' ? 0.35 : 0, t, 0.03); // cut as soon as the engine catches
  master.gain.setTargetAtTime(state === 'off' ? level * Math.min(1, rpm / e.idle) : level, t, 0.03);
  wind.gain.gain.setTargetAtTime(Math.min(0.4, 0.3 * (speed / 40) ** 2), t, 0.2);
  wind.filter.frequency.setTargetAtTime(250 + speed * 25, t, 0.2);
  squeal.gain.gain.setTargetAtTime(spinning ? 2.5 : 0, t, 0.05);
  nos.gain.gain.setTargetAtTime(nitro ? 0.25 : 0, t, 0.08);
  squeal.filter.frequency.setTargetAtTime(1000 + 250 * Math.random(), t, 0.03); // a wavering screech
}
