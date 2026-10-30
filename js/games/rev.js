// Rev: parked on the shoulder, keep the revs inside the target band; the band moves every few seconds.
// The original game of this app, now in the cockpit. Levels: [band width rpm, points per second].
const REV = {
  id: 'rev', name: 'Rev', hud: 'levels', parked: true,
  blurb: 'Parked on the shoulder: keep the revs inside the band. It moves every 5 seconds.',
  levels: makeLevels([[1600, 5], [1200, 8], [900, 10], [700, 15], [550, 20], [420, 30], [300, 40]], 2, 6, 6),
  TARGET: 5, // seconds each band lasts
  gears: () => 0, // parking brake on, stays in neutral: no slots in the gate
  start() { this.levels.reset(); Object.assign(this, { lo: 0, hi: 0, left: 0, on: false }); },
  update(dt) {
    speed = 0;
    this.on = false;
    if (state !== 'running') return; // the game clock only runs while the engine does
    if ((this.left -= dt) <= 0) this.next();
    this.on = rpm >= this.lo && rpm <= this.hi;
    const step = this.levels.update(dt, this.on);
    if (step) { this.band((this.lo + this.hi) / 2); levelFlash(step); }
  },
  next() { // a band well away from the last one
    const lo = engine.idle + 1000, hi = engine.redline - 1200, prev = (this.lo + this.hi) / 2;
    let mid;
    do mid = lo + Math.random() * (hi - lo); while (Math.abs(mid - prev) < 1200);
    this.band(mid);
    this.left = this.TARGET;
  },
  band(mid) { // centered on mid, as wide as the level allows
    const width = this.levels.table[this.levels.level][0];
    this.lo = Math.round((mid - width / 2) / 50) * 50;
    this.hi = this.lo + width;
  },
  readout: () => [Math.round(shownRpm(performance.now()) / 10) * 10, 'rpm'],
  render() {
    const lv = this.levels, [width, pps] = lv.table[lv.level];
    renderLevels(lv, this.on, !this.lo ? 'turn the key to start' : `${Math.round(lv.points)} pts\n${width} rpm band · ${pps} pts/s\n` +
      `target ${this.lo}–${this.hi} rpm · new in ${Math.ceil(this.left)} s` + (lv.note ? `\n${lv.note}` : ''));
    showBand('tach', this.lo, this.hi, this.on);
  },
};
