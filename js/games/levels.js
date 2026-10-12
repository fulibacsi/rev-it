// Adaptive levels shared by the target games (Rev and Speed signs). Each level's gauge fills while you are on
// target and drains while you are off it: full = level up, empty = level down, then it restarts half full. Better
// levels narrow the target and pay more points per second.
// table: per level [target width, points per second, ...game specific]; fill / drain: seconds for a full gauge
function makeLevels(table, start, fill, drain) {
  return {
    table,
    reset() { return Object.assign(this, { level: start, best: start, gauge: 0.5, points: 0, note: '' }); },
    // advance by dt; returns +1 or -1 when the level changed, else 0
    update(dt, onTarget) {
      this.gauge = Math.min(1, Math.max(0, this.gauge + (onTarget ? dt / fill : -dt / drain)));
      if (onTarget) this.points += table[this.level][1] * dt;
      const step = this.gauge >= 1 && this.level < table.length - 1 ? 1 : this.gauge <= 0 && this.level > 0 ? -1 : 0;
      if (step) {
        this.level += step;
        this.best = Math.max(this.best, this.level);
        this.gauge = 0.5;
        this.note = step > 0 ? '▲ level up' : '▼ level down';
      }
      return step;
    },
  }.reset();
}
