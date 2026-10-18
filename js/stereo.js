// The car stereo (Distance's Workshop): synthwave made on the spot with Web Audio, on four tapes. Each tape is a song
// of its own, written down as data: a tempo and a key, four chords, a drum kit and groove, a bass line, a lead hook
// over the four chords, an arpeggio and pads, and a form of sections that bring the parts in and out (intro, verse,
// chorus, break), with a drum fill and a rising sweep into each chorus; the hook goes up an octave the second time
// round. (The owner, 18 Oct: the first tapes sounded too alike. They shared every sound, the groove and the form, had
// no melody, and differed only in key, tempo and the order of the same few chords.) A step sequencer schedules each
// sixteenth a little ahead on the audio clock, so pausing (the menu suspends the context) pauses the music too. On the
// dash: a row of lights in the cluster's hood that jumps with the beat; on a desktop, a head unit with the tape's name
// and an equaliser. A tap on either (or M) plays the next tape; after the last one it goes off.

// key: MIDI note of the bass's root; chords: semitones above it, a bar each. Grooves are a bar of sixteenths, one
// character each: drums x (o: an open hat), bass r the chord's root, o its octave, f its fifth. hook: [sixteenth from
// the top of the four bars, length in sixteenths, semitones above the key + lead.octave]. lead.parts: [frequency ratio,
// wave, level, detune in cents]. arp: chord tones in turn (3 and up: the next octave), a note every `every` sixteenths
const TAPES = [
  { name: 'NEON COAST', bpm: 100, key: 45, kit: 'big', pad: 1300, // A minor, i VI III VII: the classic, driving
    chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    bass: { line: 'r.r.r.o.r.r.r.o.', wave: 'sawtooth', cutoff: 1800, sweep: 260, len: 1.8, vol: 0.32 },
    lead: { octave: 12, parts: [[1, 'sawtooth', 0.05, -10], [1, 'sawtooth', 0.05, 10]], cutoff: 3200, sweep: 1400, attack: 0.01 },
    hook: [[0, 3, 7], [3, 3, 12], [6, 2, 15], [8, 2, 14], [10, 4, 12], [16, 2, 12], [18, 2, 15], [20, 4, 20], [24, 2, 19],
           [26, 4, 15], [32, 3, 22], [35, 3, 19], [38, 2, 15], [40, 2, 17], [42, 6, 19], [48, 2, 17], [50, 2, 14],
           [52, 4, 10], [56, 2, 14], [58, 2, 17], [60, 4, 19]],
    arp: { notes: [0, 1, 2, 3, 2, 1], wave: 'square', every: 1, cutoff: 3200 },
    form: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['break', 4], ['chorus', 8]] },
  { name: 'NIGHT DRIVE', bpm: 84, key: 42, kit: 'gated', pad: 900, // F# minor, i iv VI V: half-time, a rolling bass, dark
    chords: [[0, 3, 7], [5, 8, 12], [8, 12, 15], [7, 11, 14]],
    kick: 'x.........x.....', snare: '........x.......', hat: '..x...x...x...x.',
    bass: { line: 'rrrrrrrrrrrrrrrr', wave: 'sawtooth', cutoff: 900, sweep: 180, len: 0.9, vol: 0.3 },
    lead: { octave: 24, parts: [[1, 'square', 0.06, 0], [0.5, 'sine', 0.04, 0]], cutoff: 1600, sweep: 900, attack: 0.04, verb: true },
    hook: [[0, 6, 7], [6, 2, 5], [8, 4, 3], [12, 4, 0], [16, 6, 8], [22, 2, 7], [24, 8, 5], [32, 6, 12], [38, 2, 10],
           [40, 4, 8], [44, 4, 3], [48, 4, 14], [52, 4, 11], [56, 8, 7]],
    arp: { notes: [0, 1, 2, 1], wave: 'triangle', every: 2, cutoff: 2000 },
    form: [['intro', 8], ['verse', 8], ['chorus', 8], ['break', 8], ['chorus', 8]] },
  { name: 'SUNSET GRID', bpm: 112, key: 38, kit: 'clap', pad: 2200, // D major, I V vi IV: bright, disco hats, a bell
    chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..o...o...o...o.',
    bass: { line: 'r..r..o.r..r..o.', wave: 'square', cutoff: 1400, sweep: 300, len: 1.2, vol: 0.28 },
    lead: { octave: 24, parts: [[1, 'sine', 0.08, 0], [2, 'triangle', 0.03, 0], [3, 'sine', 0.015, 0]], cutoff: 6000, sweep: 2000, attack: 0.004, decay: 0.6 },
    hook: [[0, 2, 16], [2, 2, 19], [4, 2, 16], [6, 2, 14], [8, 4, 12], [12, 4, 7], [16, 2, 11], [18, 2, 14], [20, 4, 19],
           [24, 2, 14], [26, 2, 11], [28, 4, 7], [32, 2, 12], [34, 2, 16], [36, 4, 21], [40, 2, 19], [42, 2, 16],
           [44, 4, 12], [48, 4, 17], [52, 2, 21], [54, 2, 19], [56, 2, 17], [58, 2, 16], [60, 4, 14]],
    arp: { notes: [0, 2, 1, 3, 2, 4], wave: 'triangle', every: 1, cutoff: 4000 },
    form: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 4], ['chorus', 8], ['break', 4], ['chorus', 8]] },
  { name: 'CHROME HEART', bpm: 124, key: 40, kit: 'tight', pad: 1100, // E minor, i VII VI VII: hard, 16th bass and hats
    chords: [[0, 3, 7], [10, 14, 17], [8, 12, 15], [10, 14, 17]],
    kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
    bass: { line: 'rrorrrorrrorrrof', wave: 'sawtooth', cutoff: 2600, sweep: 450, len: 0.9, vol: 0.3 },
    lead: { octave: 12, parts: [[1, 'square', 0.045, 0], [2, 'square', 0.03, 5]], cutoff: 4000, sweep: 1800, attack: 0.005 },
    hook: [[0, 1, 12], [2, 1, 12], [3, 2, 15], [6, 2, 19], [8, 1, 17], [10, 2, 15], [12, 2, 14], [14, 2, 15], [16, 2, 14],
           [19, 2, 17], [22, 2, 22], [24, 2, 17], [26, 2, 14], [28, 4, 10], [32, 2, 12], [35, 2, 15], [38, 2, 20],
           [40, 2, 19], [42, 2, 15], [44, 4, 12], [48, 2, 14], [50, 2, 17], [52, 4, 22], [56, 2, 17], [58, 2, 19], [60, 4, 19]],
    arp: { notes: [3, 2, 1, 0], wave: 'sawtooth', every: 1, cutoff: 2400 },
    form: [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['break', 4], ['chorus', 8]] },
];
const SECTIONS = { // what plays in each kind of section
  intro: ['kick', 'hat', 'pad', 'arp'], verse: ['kick', 'snare', 'hat', 'bass', 'pad'],
  chorus: ['kick', 'snare', 'hat', 'bass', 'pad', 'arp', 'lead'], break: ['pad', 'arp', 'lead'],
};
const MUSIC = 0.4; // the stereo's level: about 6 dB under the engine at 4,000 rpm
const hz = n => 440 * 2 ** ((n - 69) / 12);
const stereo = { on: false, tape: 0, step: 0, next: 0, bus: null, verb: null, echo: null, eq: null, beats: [], volume: 1 }; // volume: the settings' (main.js)

// the sound chain, built once the audio has started: everything through a compressor to the stereo's level; a
// reverb (decaying noise) for the snare, pads and lead, an echo for the arpeggio and lead (its time set by the tape's
// tempo: a dotted eighth), and an analyser for the equaliser
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
  const fb = ctx.createGain(), wet = ctx.createGain();
  fb.gain.value = 0.35;
  wet.gain.value = 0.5;
  s.echo.connect(fb).connect(s.echo);
  s.echo.connect(wet).connect(s.bus);
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

// the snares: a big roomy one, an 80s gated one (a long burst into the reverb), a clap (three quick bursts), a tight one
function snare(t, kit, vol = 1) {
  const room = [stereo.bus, stereo.verb];
  if (kit === 'big') {
    voice(t, { noisy: true, filter: 'bandpass', cutoff: 1800, dur: 0.22, vol: 0.45 * vol, to: room });
    voice(t, { type: 'triangle', freq: 190, dur: 0.1, vol: 0.25 * vol });
  } else if (kit === 'gated') {
    voice(t, { noisy: true, filter: 'bandpass', cutoff: 1500, dur: 0.38, vol: 0.5 * vol, attack: 0.002, to: room });
    voice(t, { type: 'triangle', freq: 165, dur: 0.16, vol: 0.3 * vol });
  } else if (kit === 'clap') {
    for (const d of [0, 0.011, 0.023]) voice(t + d, { noisy: true, filter: 'bandpass', cutoff: 1200, dur: 0.05, vol: 0.35 * vol });
    voice(t + 0.023, { noisy: true, filter: 'bandpass', cutoff: 1300, dur: 0.2, vol: 0.3 * vol, to: room });
  } else {
    voice(t, { noisy: true, filter: 'bandpass', cutoff: 2600, dur: 0.12, vol: 0.4 * vol });
    voice(t, { type: 'triangle', freq: 230, dur: 0.06, vol: 0.25 * vol });
  }
}

// where step falls in the tape's form: the section, the bar in it, and whether a chorus follows this one
function place(tape, step) {
  const total = tape.form.reduce((n, [, bars]) => n + bars, 0);
  let bar = Math.floor(step / 16) % total, k = 0;
  while (bar >= tape.form[k][1]) bar -= tape.form[k++][1];
  return { part: tape.form[k][0], bar, last: bar === tape.form[k][1] - 1, intoChorus: tape.form[(k + 1) % tape.form.length][0] === 'chorus' };
}

// one sixteenth of the tape at time t
function playStep(t, step) {
  const tape = TAPES[stereo.tape], i = step % 16, { part, bar, last, intoChorus } = place(tape, step);
  const has = p => SECTIONS[part].includes(p), chord = tape.chords[bar % 4], root = tape.key + chord[0];
  const beat = 60 / tape.bpm / 4; // s a sixteenth
  const fill = last && intoChorus && part !== 'intro'; // a drum fill and a rising sweep into the chorus
  if (has('kick') && tape.kick[i] === 'x') {
    voice(t, { type: 'sine', freq: 140, drop: 42, dur: 0.32, vol: 0.9 });
    stereo.beats.push([t, 1]);
  }
  if (has('snare') && tape.snare[i] === 'x' || fill && i >= 12) { // the fill: a roll over the last beat, louder and louder
    snare(t, tape.kit, fill && i >= 12 ? 0.5 + 0.15 * (i - 12) : 1);
    stereo.beats.push([t, 0.7]);
  }
  if (fill && i === 0) voice(t, { noisy: true, filter: 'highpass', cutoff: 300, sweep: 6000, dur: 16 * beat, vol: 0.08, attack: 15 * beat });
  if (has('hat') && tape.hat[i] !== '.') voice(t, { noisy: true, filter: 'highpass', cutoff: 7500, dur: tape.hat[i] === 'o' ? 0.25 : 0.04, vol: 0.11 });
  const b = tape.bass.line[i];
  if (has('bass') && b !== '.') { // the bass, through a filter that closes on each note
    const { wave, cutoff, sweep, len, vol } = tape.bass;
    voice(t, { type: wave, freq: hz(root + { r: 0, o: 12, f: 7 }[b]), cutoff, sweep, dur: beat * len, vol });
  }
  if (has('pad') && i === 0) for (const n of chord) for (const d of [-8, 8]) // pads: two saws a note, slowly in
    voice(t, { freq: hz(tape.key + 12 + n), detune: d, cutoff: tape.pad, dur: beat * 16, vol: 0.05, attack: 0.4,
               to: [stereo.bus, stereo.verb] });
  const { arp } = tape;
  if (has('arp') && i % arp.every === 0) { // the arpeggio, two octaves up, through the echo
    const k = arp.notes[(step / arp.every) % arp.notes.length], n = chord[k % 3] + 12 * Math.floor(k / 3);
    voice(t, { type: arp.wave, freq: hz(tape.key + 24 + n), cutoff: arp.cutoff, sweep: 900, dur: beat * 0.9 * arp.every,
               vol: part === 'intro' ? 0.05 : 0.07, to: [stereo.bus, stereo.echo] });
    if (part === 'break') stereo.beats.push([t, 0.3]); // no drums in a break: the lights follow the arpeggio
  }
  const note = has('lead') && tape.hook.find(([at]) => at === (bar % 4) * 16 + i);
  if (note) { // the hook: softer in a break, up an octave the second time round in a chorus
    const [, len, semis] = note, { lead } = tape, lift = part === 'chorus' && bar >= 4 ? 12 : 0, soft = part === 'break' ? 0.6 : 1;
    const to = [stereo.bus, stereo.echo, ...(lead.verb ? [stereo.verb] : [])];
    for (const [ratio, type, vol, detune] of lead.parts)
      voice(t, { type, freq: hz(tape.key + lead.octave + semis + lift) * ratio, detune, cutoff: lead.cutoff, sweep: lead.sweep,
                 dur: lead.decay ? Math.min(lead.decay, beat * len * 1.5) : beat * len * 1.05, vol: vol * soft, attack: lead.attack, to });
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
  if (want) stereo.echo.delayTime.value = 3 * 60 / TAPES[tape].bpm / 4; // a dotted eighth
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
