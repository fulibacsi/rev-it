// Speed signs: hold the road speed set by the roadside signs. Levels: [band width km/h, points per second on
// target, meters between signs]. Better levels narrow the band and bring the signs closer, so more of the time
// goes into reaching the next speed: shifting, braking, reading hills, getting past traffic. The gauge drains
// twice as fast as it fills, so holding a level takes about 2/3 of the time on target.
const SIGNS = {
  id: 'signs', name: 'Speed signs', hud: 'levels',
  blurb: 'Hold the speed on the roadside signs. Better levels: narrower bands, signs closer together.',
  levels: makeLevels([[30, 5, 500], [24, 8, 420], [18, 10, 350], [14, 15, 290], [10, 20, 240], [7, 30, 200], [5, 40, 170]], 2, 6, 3),
  gears: () => 6,
  start() {
    this.levels.reset();
    Object.assign(this, { lo: 0, hi: 0, on: false, signs: [] }); // signs: [{ z: odometer meters, value: km/h }]
    for (let i = 0; i < 3; i++) this.addSign();
  },
  addSign() { // the next one 20-50 km/h away from the previous, 40-160 km/h
    const prev = this.signs.at(-1), z = prev ? prev.z + this.levels.table[this.levels.level][2] : odo + 150;
    let value = 50 + 10 * Math.floor(Math.random() * 6);
    if (prev) do value = 10 * Math.round((prev.value + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30)) / 10);
    while (value < 40 || value > 160);
    this.signs.push({ z, value });
  },
  band(mid) { // centered on mid, as wide as the level allows
    const width = this.levels.table[this.levels.level][0];
    [this.lo, this.hi] = [mid - width / 2, mid + width / 2];
  },
  update(dt) {
    this.on = false;
    if (state !== 'running') return; // the game clock only runs while the engine does
    while (this.signs[0].z <= odo) { this.band(this.signs.shift().value); this.addSign(); } // passed a sign
    if (!this.lo) return; // not at the first sign yet
    const kmh = speed * 3.6;
    this.on = kmh >= this.lo && kmh <= this.hi;
    const step = this.levels.update(dt, this.on);
    if (step) { this.band((this.lo + this.hi) / 2); levelFlash(step); }
  },
  render() {
    const lv = this.levels, [width, pps] = lv.table[lv.level], next = this.signs[0];
    renderLevels(lv, this.on, state !== 'running' && !this.lo ? 'turn the key to start' :
      `${Math.round(lv.points)} pts\n${width} km/h band · ${pps} pts/s\n` +
      (this.lo ? `target ${Math.round(this.lo)}–${Math.round(this.hi)} km/h · ` : '') +
      `next sign ${next.value} in ${Math.max(0, Math.round(next.z - odo))} m` + (lv.note ? `\n${lv.note}` : ''));
    showBand('speedo', this.lo, this.hi, this.on);
  },
  marks() { return this.signs.map(s => ({ z: s.z, kind: 'sign', value: s.value })); },
};
