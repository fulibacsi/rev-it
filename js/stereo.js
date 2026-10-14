// The car stereo (Distance's Workshop): synthwave made on the spot with Web Audio, on four tapes that differ in key,
// tempo, chords and patterns. Drums, a driving bass, pads and an arpeggio over a four-chord loop, in 16-bar turns:
// drums and bass, then everything, then a break (pads and arpeggio), then everything again. A step sequencer
// schedules each sixteenth a little ahead on the audio clock, so pausing (the menu suspends the context) pauses the
// music too. On the dash: a row of lights in the cluster's hood that jumps with the beat; on a desktop, a head unit
// with the tape's name and an equaliser. A tap on either (or M) plays the next tape; after the last one it goes off.

const TAPES = [ // key: MIDI note of the bass's root; chords: semitones above it, a bar each; arp: chord tones, in turn
  { name: 'NEON COAST', bpm: 100, key: 45, chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], arp: [0, 1, 2, 3, 2, 1] },
  { name: 'NIGHT DRIVE', bpm: 108, key: 42, chords: [[0, 3, 7], [5, 8, 12], [8, 12, 15], [10, 14, 17]], arp: [0, 1, 2, 3] },
  { name: 'SUNSET GRID', bpm: 94, key: 50, chords: [[8, 12, 15], [10, 14, 17], [0, 3, 7], [0, 3, 7]], arp: [0, 2, 1, 3, 2, 4] },
  { name: 'CHROME HEART', bpm: 116, key: 40, chords: [[0, 3, 7], [10, 14, 17], [8, 12, 15], [10, 14, 17]], arp: [3, 2, 1, 0] },
];
const MUSIC = 0.4; // the stereo's level: about 6 dB under the engine at 4,000 rpm
const hz = n => 440 * 2 ** ((n - 69) / 12);
const stereo = { on: false, tape: 0, step: 0, next: 0, bus: null, verb: null, echo: null, eq: null, beats: [], volume: 1 }; // volume: the settings' (main.js)

// the sound chain, built once the audio has started: everything through a compressor to the stereo's level; a
// reverb (decaying noise) for the snare and pads, an echo for the arpeggio, and an analyser for the equaliser
function wireStereo() {
  const s = stereo, comp = ctx.createDynamicsCompressor();
  s.bus = ctx.createGain();
  s.out = ctx.createGain();
  s.out.gain.value = MUSIC * s.volume;
  s.eq = ctx.createAnalyser();
  s.eq.fftSize = 256;
  s.bus.connect(comp).connect(s.out).connect(ctx.destination);
  s.out.connect(s.eq);
  const ir = ctx.createBuffer(2, ctx.sampleRate * 2.2, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  }
  s.verb = ctx.createConvolver();
  s.verb.buffer = ir;
  s.verb.connect(s.bus);
  s.echo = ctx.createDelay(1);
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  s.echo.connect(fb).connect(s.echo);
  s.echo.connect(s.bus);
}

// one voice: an oscillator (or the noise) through a filter, with a quick attack and an exponential fade
function voice(t, { type = 'sawtooth', freq, noisy, filter = 'lowpass', cutoff = 20000, sweep, dur, vol, attack = 0.005,
                    to = [stereo.bus], detune = 0, drop }) {
  const src = noisy ? ctx.createBufferSource() : ctx.createOscillator();
  if (noisy) src.buffer = noise; // engine.js
  else { src.type = type; src.frequency.setValueAtTime(freq, t); src.detune.value = detune; }
  if (drop) src.frequency.exponentialRampToValueAtTime(drop, t + dur * 0.4); // the kick's pitch falls
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = filter;
  f.frequency.setValueAtTime(cutoff, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  for (const d of to) g.connect(d);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// one sixteenth of the tape at time t. Bar b of the 16-bar turn picks what plays: 0-3 drums and bass, 12-15 the break
function playStep(t, step) {
  const tape = TAPES[stereo.tape], i = step % 16, bar = Math.floor(step / 16), b = bar % 16;
  const chord = tape.chords[bar % 4], root = tape.key + chord[0], rest = b >= 12, full = b >= 4 && !rest; // rest: the break
  const beat = 60 / tape.bpm / 4; // s a sixteenth
  if (!rest && i % 4 === 0) { // four on the floor
    voice(t, { type: 'sine', freq: 140, drop: 42, dur: 0.32, vol: 0.9 });
    stereo.beats.push([t, 1]);
  }
  if (!rest && (i === 4 || i === 12)) { // the snare, big and roomy
    voice(t, { noisy: true, filter: 'bandpass', cutoff: 1800, dur: 0.22, vol: 0.45, to: [stereo.bus, stereo.verb] });
    voice(t, { type: 'triangle', freq: 190, dur: 0.1, vol: 0.25 });
    stereo.beats.push([t, 0.7]);
  }
  if (i % 2 === 0) voice(t, { noisy: true, filter: 'highpass', cutoff: 7500, dur: i % 4 === 2 ? 0.12 : 0.04, vol: 0.12 });
  if (!rest && i % 2 === 0) { // the driving bass in eighths, up an octave now and then
    const n = root + (i === 6 || i === 14 ? 12 : 0);
    voice(t, { freq: hz(n), cutoff: 1800, sweep: 260, dur: beat * 1.8, vol: 0.32 });
  }
  if (i === 0 && b >= 4) for (const n of chord) for (const d of [-8, 8]) // pads: two saws a note, slowly in
    voice(t, { freq: hz(tape.key + 12 + n), detune: d, cutoff: 1300, dur: beat * 16, vol: 0.05, attack: 0.4,
               to: [stereo.bus, stereo.verb] });
  if (full || rest) { // the arpeggio, two octaves up, through the echo
    const k = tape.arp[step % tape.arp.length], n = chord[k % 3] + 12 * Math.floor(k / 3);
    voice(t, { type: 'square', freq: hz(tape.key + 24 + n), cutoff: 3200, sweep: 900, dur: beat * 0.9, vol: 0.07,
               to: [stereo.bus, stereo.echo] });
  }
}

// the sequencer: every 25 ms, it schedules the sixteenths due in the next 0.15 s on the audio clock
setInterval(() => {
  const s = stereo;
  if (!s.on || !ctx || ctx.state !== 'running') return;
  if (s.next < ctx.currentTime) s.next = ctx.currentTime + 0.05; // started, or back from a pause
  while (s.next < ctx.currentTime + 0.15) {
    playStep(s.next, s.step++);
    s.next += 60 / TAPES[s.tape].bpm / 4;
  }
}, 25);

// what the car has and wants (main loop): the game says whether there is a stereo, and which tape it plays (or none)
function updateStereo() {
  const tape = game.tape?.() ?? null, want = !!game.stereo?.() && tape !== null && !!ctx;
  if (want && !stereo.bus) wireStereo();
  if (want && stereo.on && tape === stereo.tape) return;
  if (want === stereo.on && !want) return;
  Object.assign(stereo, { on: want, tape, step: 0, next: 0 }); // a new tape starts from the top
  stereo.beats.length = 0;
  stereo.out?.gain.setTargetAtTime(want ? MUSIC * stereo.volume : 0, ctx.currentTime, 0.05); // what was scheduled fades out
}
const nextTape = () => game.nextTape?.(); // a tap on the lights or the head unit, or M

// the lights: in the cluster, a row that jumps with the beat (a kick lights it all, the snare most of it); on the
// head unit, the tape's name and eight bands of the music, as on an 80s graphic equaliser. Switched off, both stay,
// greyed and dark, for a tap to start it again
function renderStereo() {
  document.body.classList.toggle('has-stereo', !!game.stereo?.());
  document.body.classList.toggle('stereo-off', !stereo.on);
  if (!stereo.on) {
    if ($('stereo-lcd').textContent === 'OFF') return;
    for (const led of document.querySelectorAll('#beat rect, #stereo-eq u')) led.classList.remove('on');
    $('stereo-lcd').textContent = 'OFF';
    return;
  }
  const now = ctx.currentTime;
  while (stereo.beats.length > 1 && stereo.beats[1][0] <= now) stereo.beats.shift();
  const [t, hit] = stereo.beats[0] ?? [now, 0], level = t <= now ? hit * Math.exp(-(now - t) * 7) : 0;
  const leds = $('beat').children, lit = Math.round(level * leds.length);
  for (let i = 0; i < leds.length; i++) leds[i].classList.toggle('on', Math.abs(i - (leds.length - 1) / 2) < lit / 2);
  $('stereo-lcd').textContent = `${stereo.tape + 1} ${TAPES[stereo.tape].name}`;
  const bins = new Uint8Array(stereo.eq.frequencyBinCount);
  stereo.eq.getByteFrequencyData(bins);
  [...$('stereo-eq').children].forEach((band, b) => { // bands spaced like an equaliser's, low to high
    const v = bins[Math.round(1 + 1.8 ** b)] / 255;
    [...band.children].forEach((led, i) => led.classList.toggle('on', v > (i + 0.5) / band.children.length));
  });
}
