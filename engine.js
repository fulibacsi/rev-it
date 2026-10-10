// Engine: recorded sound loops, starter motor, blow-off valve and the rpm model.
// Classic script: shares globals with car.js, game.js and main.js.

// loops: [rpm, base64 WAV] recorded at a steady rpm, built by make_sounds.py
// tauUp / tauDown: seconds for the rpm to close ~63% of the gap to where the pedal points (free-revving feel)
// lope: rpm the idle hunts by (big cam); turbo: pulls weakly until boost builds; torqueDip: rpm where the
// factory tune pulls torque; revHang: seconds the e-throttle's late closing (emissions) slows the drop after lift-off
// inertia: flywheel kg·m²; with the free-rev response it sets the engine's torque, i.e. how hard it pulls in gear
// mass: kg of the car around it
const ENGINES = [
  // big-cam V8, heavy flywheel: lumpy idle, steady but slow to rev and slow to drop; lots of torque
  { name: 'Muscle V8', loops: SOUNDS.v8, idle: 825, redline: 7000, tauUp: 0.75, tauDown: 1.3, lope: 40,
    inertia: 1.3, mass: 1650 },
  // Supra 2JZ with a big turbo: lazy off idle, then pulls hard once spooled, blow-off on lift
  { name: 'JDM Turbo I6', loops: SOUNDS.supra, idle: 1000, redline: 8000, tauUp: 0.5, tauDown: 0.9, turbo: true,
    inertia: 0.45, mass: 1500 },
  // 86 / BRZ FA20: light and eager, torque dip around 3500-4500 rpm, rev hang on lift-off; the weakest pull
  { name: 'JDM Boxer', loops: SOUNDS.boxer, idle: 855, redline: 7400, tauUp: 0.5, tauDown: 0.8, torqueDip: 3800,
    revHang: 0.6, inertia: 0.28, mass: 1250 },
];
const PEDAL_IN = 0.4, PEDAL_OUT = 0.25; // seconds to fully press / release the throttle
const LIMITER_DROP = 250; // fuel cut at the redline until the rpm falls this far

let engine, ctx, loading, players = [], filter, master, noise, starterBuffer, starterGain, wind;
// state: 'off' | 'cranking' | 'running'; cut: rev limiter has cut the fuel
let rpm = 0, throttle = 0, boost = 0, hang = 0, cut = false, gas = false, state = 'off', crankUntil = 0;

async function start() {
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  filter = ctx.createBiquadFilter(); // muffles the sound when coasting off throttle
  filter.type = 'lowpass';
  filter.frequency.value = 12000;
  filter.connect(master);

  // one second of white noise for the blow-off valve
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  starterGain = ctx.createGain(); // starter motor has its own level, independent of rpm
  starterGain.gain.value = 0;
  starterGain.connect(ctx.destination);

  const roar = ctx.createBufferSource(); // wind and tyre roar: looping noise, louder and brighter with speed
  roar.buffer = noise;
  roar.loop = true;
  wind = { filter: ctx.createBiquadFilter(), gain: ctx.createGain() };
  wind.filter.type = 'lowpass';
  wind.gain.gain.value = 0;
  roar.connect(wind.filter).connect(wind.gain).connect(ctx.destination);
  roar.start();

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

function blowOff() { // turbo blow-off valve "pssh"
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  src.buffer = noise;
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(4000, t);
  bp.frequency.exponentialRampToValueAtTime(1500, t + 0.5);
  g.gain.setValueAtTime(boost, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  src.connect(bp).connect(g).connect(master);
  src.start();
  src.stop(t + 0.5);
}

function whoosh(relSpeed) { // a car passing on the left; louder the faster you pass each other
  if (!ctx) return;
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
  const t = ctx.currentTime, level = Math.min(0.5, Math.max(0.001, relSpeed / 120)); // ramps can't reach 0
  src.buffer = noise;
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, t);
  bp.frequency.exponentialRampToValueAtTime(350, t + 0.6); // pitch drops as it goes by
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  pan.pan.value = -0.7;
  src.connect(bp).connect(g).connect(pan).connect(ctx.destination);
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
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start();
  src.stop(t + 0.35);
}

async function ignite() {
  loading ??= start(); // browsers only allow audio after a user gesture
  await loading;
  state = 'cranking';
  crankUntil = performance.now() + 900;
  const starter = ctx.createBufferSource(); // looping starter motor, faded out by updateAudio()
  starter.buffer = starterBuffer;
  starter.loop = true;
  starter.connect(starterGain);
  starter.start();
  starter.stop(ctx.currentTime + 1.2);
}

function setGas(on) {
  if (!on && gas && engine.turbo && boost > 0.5) blowOff();
  if (!on && gas && engine.revHang) hang = engine.revHang;
  gas = on;
}

// free-revving acceleration (rpm/s) at this rpm and throttle: rpm chases where the pedal points, quickly when
// far away, easing in as it gets close. In gear the same torque (inertia x this) also has to move the car.
function engineAccel(e, r, thr) {
  const aim = e.idle + thr * (e.redline + 1000 - e.idle);
  if (aim <= r) return (aim - r) / (e.tauDown * (e.revHang ? 1 + 3 * hang / e.revHang : 1)); // rev hang: slower drop
  let pull = 1; // how hard the engine can accelerate at this rpm
  if (e.turbo) pull = 0.35 + 0.85 * boost;
  if (e.torqueDip) pull *= 1 - 0.4 * Math.exp(-(((r - e.torqueDip) / 500) ** 2));
  return (aim - r) * pull / e.tauUp;
}

// throttle pedal, starter, turbo and limiter; returns the engine's free-rev acceleration (rpm/s) for this step
function updateEngine(dt, now) {
  const e = engine;
  // the pedal moves progressively, so short taps only open the throttle a little
  throttle = gas && state === 'running' ? Math.min(1, throttle + dt / PEDAL_IN) : Math.max(0, throttle - dt / PEDAL_OUT);
  hang = Math.max(0, hang - dt);
  if (state === 'cranking') {
    rpm = 250 + 80 * Math.sin(now / 40); // starter motor chugging
    if (now > crankUntil) { state = 'running'; rpm = e.idle + 1000; } // catches, flares, settles to idle
  }
  // boost follows the throttle above 3000 rpm: spools up slowly (lag), dumps fast through the blow-off valve
  const boostAim = state === 'running' && rpm > 3000 ? throttle : 0;
  boost += (boostAim - boost) * Math.min(1, dt / (boostAim > boost ? 0.7 : 0.15));
  if (rpm >= e.redline) cut = true; // rev limiter: cut the fuel until the revs drop back
  else if (rpm < e.redline - LIMITER_DROP) cut = false;
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
  const level = (0.45 + 0.35 * throttle) * (0.5 + 0.5 * rpm / e.redline); // louder on throttle and with revs
  const overrun = state === 'running' && throttle < 0.1 && rpm > e.idle * 1.5;
  loopGains(shown).forEach((g, i) => {
    players[i].gain.gain.setTargetAtTime(g, t, 0.03);
    players[i].src.playbackRate.setTargetAtTime(Math.max(0.05, shown / players[i].rpm), t, 0.03);
  });
  filter.frequency.setTargetAtTime(overrun ? 2000 : 12000, t, 0.1);
  starterGain.gain.setTargetAtTime(state === 'cranking' ? 0.35 : 0, t, 0.03); // cut as soon as the engine catches
  master.gain.setTargetAtTime(state === 'off' ? level * Math.min(1, rpm / e.idle) : level, t, 0.1);
  wind.gain.gain.setTargetAtTime(Math.min(0.4, 0.3 * (speed / 40) ** 2), t, 0.2);
  wind.filter.frequency.setTargetAtTime(250 + speed * 25, t, 0.2);
}
