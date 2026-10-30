// The car stereo (Distance's Workshop): five tapes of synthwave; the War Rig radio (Distance's War Rig page) swaps in
// three of its own. Recorded (the owner, 18 Oct: the tapes made on the spot weren't good, and making them kept a phone
// core busy): Kevin MacLeod's (CC BY 4.0) and the owner's own, made with Suno, picked by the owner. They are MP3s in
// assets/music, made by tools/make_music.py, all at one loudness. A tape plays through an <audio> element into the
// audio graph, so the volume and the lights work as on any sound; at its end the next tape plays. Each is downloaded
// ahead (an iPhone loads no media before it plays, whatever the page asks): the save's tape while the main menu is up
// (main.js), the next one while a tape plays, so a tap on the lights changes tapes at once. Pausing (the menu
// suspends the context) pauses the tape. On the dash: a row of lights in the cluster's hood that jumps with the beat
// (the kick drum, heard in the music's bass); on a desktop, a head unit with the tape's name and an equalizer. A tap
// on either (or M) plays the next tape; after the last one it goes off.
const TAPES = [
  { name: 'NEON LASER HORIZON', file: 'neon-laser-horizon' }, // Kevin MacLeod
  { name: 'NEON OUTRUN', file: 'neon-outrun' },                // the owner's, made with Suno
  { name: 'CHILL WAVE', file: 'chill-wave' },                  // Kevin MacLeod
  { name: 'CHASING THE LIGHT', file: 'chasing-the-light' },    // Suno, 光の追跡
  { name: 'NEWER WAVE', file: 'newer-wave' },                  // Kevin MacLeod
  // the War Rig radio: the owner's, made with Suno
  { name: 'WAR RIGS ROLLING', war: true, file: 'war-rigs-rolling' },
  { name: 'EMBER CHARGE', war: true, file: 'ember-charge' },   // 余烬冲锋
  { name: 'WAR RIGS OF THE WASTELAND', war: true, file: 'war-rigs-of-the-wasteland' },
];
const MUSIC = 0.48; // the stereo's level: about 6 dB under the engine at 4,000 rpm (as loud as the synthesized tapes were)
const stereo = { on: false, tape: 0, el: null, out: null, eq: null, volume: 1, bins: null, avg: 0, level: 0, at: 0 }; // volume: the settings' (main.js)

// a tape's MP3, downloaded once into memory: a promise of a URL for the <audio> element. One that can't be downloaded
// (a page opened from a file can't) streams instead
const loaded = {}, mp3 = k => `assets/music/${TAPES[k].file}.mp3`;
const loadTape = k => loaded[k] ??= fetch(mp3(k)).then(r => r.ok ? r.blob() : Promise.reject())
  .then(b => URL.createObjectURL(b), () => mp3(k));
const onSameRadio = k => TAPES.filter(t => !!t.war === !!TAPES[k].war); // the tapes on k's radio, in order

// the sound chain, built once the audio has started: the tape to the stereo's level, and an analyser for the lights
function wireStereo() {
  const s = stereo;
  s.el = new Audio();
  s.el.addEventListener('ended', () => game.nextTape?.(true)); // the next tape, round to the first
  s.out = ctx.createGain();
  s.out.gain.value = MUSIC * s.volume;
  s.eq = ctx.createAnalyser();
  s.eq.fftSize = 1024; // bands of 43-47 Hz: the kick drum's own
  s.eq.smoothingTimeConstant = 0.5;
  s.bins = new Uint8Array(s.eq.frequencyBinCount);
  ctx.createMediaElementSource(s.el).connect(s.out).connect(ctx.destination);
  s.out.connect(s.eq);
  ctx.addEventListener('statechange', sync);
}
// the tape plays while the stereo is on and the audio runs (the menu suspends it)
function sync() {
  const { el, on } = stereo;
  if (on && el.src && ctx.state === 'running') el.play().catch(() => {}); // a phone that wants a tap first: see below
  else el.pause();
}
// an iPhone plays media only from a tap (or a key): the first one while it should be playing starts it
for (const kind of ['pointerdown', 'keydown'])
  addEventListener(kind, () => { if (stereo.on && stereo.el?.paused && stereo.el.src && !menuOpen) stereo.el.play().catch(() => {}); }, true);

// what the car has and wants (main loop): the game says whether there is a stereo, and which tape it plays (or none)
function updateStereo() {
  const tape = game.tape?.() ?? null, want = !!game.stereo?.() && tape !== null && !!ctx;
  if (want && !stereo.el) wireStereo();
  if (want === stereo.on && (!want || tape === stereo.tape)) return;
  Object.assign(stereo, { on: want, tape });
  if (!stereo.el) return;
  stereo.el.pause();
  if (!want) return;
  loadTape(tape).then(url => { // a new tape starts from the top
    if (!stereo.on || stereo.tape !== tape) return;
    stereo.el.src = url;
    sync();
  });
  const radio = onSameRadio(tape);
  loadTape(TAPES.indexOf(radio[(radio.indexOf(TAPES[tape]) + 1) % radio.length])); // the next, ahead
}
const nextTape = () => game.nextTape?.(); // a tap on the lights or the head unit, or M

// the head unit's display: the tape's place on its radio and its name; too long to fit, it scrolls, as a car stereo's
// does (measured once a tape)
function label(text) {
  const lcd = $('stereo-lcd');
  if (lcd.textContent === text) return;
  lcd.innerHTML = `<span>${text}</span>`;
  const over = lcd.firstChild.offsetWidth - lcd.clientWidth + 12; // its padding
  lcd.classList.toggle('scroll', over > 0);
  lcd.style.setProperty('--over', `${-Math.max(0, over)}px`);
}

// the lights: in the cluster, a row that jumps with the beat (a kick drum, a jump in the music's bass over its recent
// level, lights it all; then they fall); on the head unit, the tape's name and eight bands of the music, as on an 80s
// graphic equalizer. Switched off, both stay, greyed and dark, for a tap to start it again
function renderStereo() {
  document.body.classList.toggle('has-stereo', !!game.stereo?.());
  document.body.classList.toggle('stereo-off', !stereo.on);
  if (!stereo.on) {
    if ($('stereo-lcd').textContent === 'OFF') return;
    for (const led of document.querySelectorAll('#beat rect, #stereo-eq u')) led.classList.remove('on');
    label('OFF');
    return;
  }
  const s = stereo, bins = s.bins, now = performance.now(), dt = Math.min(0.1, (now - s.at) / 1000);
  s.at = now;
  s.eq.getByteFrequencyData(bins);
  const kick = (bins[1] + bins[2] + bins[3]) / 765; // 40-160 Hz
  s.avg += (kick - s.avg) * Math.min(1, 3 * dt); // its level over the last third of a second or so
  s.level = Math.max(s.level * Math.exp(-7 * dt), Math.min(1, (kick - s.avg) * 8));
  const leds = $('beat').children, lit = Math.round(s.level * leds.length);
  for (let i = 0; i < leds.length; i++) leds[i].classList.toggle('on', Math.abs(i - (leds.length - 1) / 2) < lit / 2);
  const tape = TAPES[s.tape];
  label(`${onSameRadio(s.tape).indexOf(tape) + 1} ${tape.name}`); // its place on its radio
  [...$('stereo-eq').children].forEach((band, b) => { // bands spaced like an equalizer's, low to high
    const v = bins[Math.round(4 * (1 + 1.8 ** b))] / 255;
    [...band.children].forEach((led, i) => led.classList.toggle('on', v > (i + 0.5) / band.children.length));
  });
}
