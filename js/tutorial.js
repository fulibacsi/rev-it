// Tutorials, under HOW TO DRIVE (the owner, 20 Oct, after Diablo IV's: a system at a time, in pages, kept to read
// again). A page is a step; behind it the menu goes clear and dims all but the real control the step is about, lit
// up, so it always shows your own cockpit, phone or desktop, and never goes stale as the cockpit changes (the owner's
// pick over screenshots); its words follow the layout (touch, or keys and mouse). ◀ ▶, the arrow keys, Space or a
// swipe turn the pages; Esc goes back to the list.
// Driving is always there; each system's opens with it (open), mostly when bought, and pops up once in the garage
// when it opens in play: bought, or come with a run (the race, the gang, the tank), never mid-run (popTour). Its ? is on the cards of the upgrades it is for, once bought
// (the owner's picks). Nothing of the race shows before the reveal: its systems are bought after it.
// A page: title, at (the control to light up, a selector; none: the card alone; hidden in the garage, it shows while
// the page is up), touch and desk (what to do, each way), both (said either way), if (only then)
const TUTORIALS = [
  { id: 'driving', name: 'Driving', pages: [
    { title: 'START THE ENGINE', at: '#key',
      touch: 'Turn the key to START and hold it there until the engine catches.',
      desk: 'Press Enter. Or with the mouse: drag the key to START and hold it until the engine catches.' },
    { title: 'CLUTCH DOWN', at: '#clutch',
      touch: 'Touch the clutch, the left pedal: it goes all the way down while your finger is on it.',
      desk: 'Hold Shift: the clutch, the left pedal, goes all the way down. Or drag it down with the mouse.',
      both: 'Down, it frees the engine from the wheels, so you can change gear.' },
    { title: 'INTO 1ST', at: '#shifter',
      touch: 'Clutch held, drag the knob through the H into 1, top left.',
      desk: 'Clutch held, press ↑ for 1st (↑ and ↓ go up and down the gears). Or drag the knob into 1.' },
    { title: 'GAS', at: '#gas',
      touch: 'Touch the gas, the right pedal, and the revs climb. Slide your finger up the pedal to ease off.',
      desk: 'Hold Space for the gas, the right pedal, and the revs climb.',
      both: 'A few thousand rpm is plenty to pull away.' },
    { title: 'CLUTCH UP', at: '#clutch',
      touch: 'Gas on, slide your finger up the clutch pedal: as it comes up, the car pulls away.',
      desk: 'Gas on, let Shift go: the clutch comes up and the car pulls away.',
      both: 'Too few revs and the engine stalls: start it again.' },
    { title: 'CHANGE UP', at: '#tach',
      touch: 'As the needle nears the red: clutch down, drag the knob into the next gear, clutch up. Every gear, as quick as you can.',
      desk: 'As the needle nears the red: Shift, ↑, let Shift go. Every gear, as quick as you can.',
      both: 'Too low a gear screams at the limiter; too high a gear bogs down.' },
    { title: 'CHANGE LANES', at: '#wheel',
      touch: 'Grab the wheel and turn it: a lane each way.',
      desk: '← and → change lanes. Or grab the wheel with the mouse and turn it.',
      both: 'Slower cars use your lane: overtake them. A crash costs most of your speed.' },
    { title: 'BRAKE', at: '#brake',
      touch: 'The middle pedal.', desk: 'Hold B: the middle pedal.',
      both: 'Boxed in behind a slower car, brake rather than crash.' },
  ] },
  { id: 'flash', name: 'Headlight flash', for: ['flash', 'flashRecharge', 'autoflash'], open: () => lvl('flash') > 0, pages: [
    { title: 'FLASH', at: '#stalk',
      touch: 'Pull the stalk, left of the wheel.', desk: 'Press F, or pull the stalk left of the wheel.',
      both: 'A slower car ahead in your lane moves over to your other lane, if there is room. A run has a few flashes: ' +
        'the head-up display counts them.' },
    { title: 'AUTO FLASH', at: '#stalk', if: () => lvl('autoflash') > 0,
      both: 'Auto flash pulls the stalk for you, at a slower car that would move over, before you would have to brake.' },
  ] },
  { id: 'aids', name: 'Driver aids', for: ['clutch', 'gas', 'shift', 'steer', 'cruise', 'recklessCruise', 'hunter'],
    open: () => ['clutch', 'gas', 'shift', 'steer', 'cruise'].some(id => lvl(id) > 0), pages: [
    { title: 'ROBOT FEET AND HANDS', at: '#pedals',
      both: 'The aids work the same pedals, lever and wheel you do: watch them. Touch a control and it is yours until ' +
        'you let go.' },
    { title: 'ON AND OFF',
      both: 'Each aid has a switch on its card in the garage, so you can drive any part yourself again.' },
    { title: 'AUTOCRUISE', at: '#wheel', if: () => lvl('cruise') > 0,
      both: 'It drives the whole run on your side of the road: it passes, keeps right, and brakes when boxed in.' },
    { title: 'RECKLESS AUTO-DRIVE', if: () => lvl('recklessCruise') > 0, // each on its own: Hunter is a later act's
      both: 'It adds to Autocruise: it takes the oncoming lanes, nitro and the tune. Autocruise off, it is off too.' },
    { title: 'HUNTER', if: () => lvl('hunter') > 0,
      both: 'It adds to Autocruise: it hunts the car in the reticle, and has the lanes while it does. ' +
        'Autocruise off, it is off too.' },
  ] },
  { id: 'stereo', name: 'Car stereo', for: ['stereo', 'warradio'], open: () => lvl('stereo') > 0, pages: [
    { title: 'THE STEREO', at: '#beat',
      touch: 'Tap the lights in the cluster for the next tape; after the last one it goes off, and a tap turns it on.',
      desk: 'Press M, or click the lights in the cluster, for the next tape; after the last one it goes off, and the ' +
        'next press turns it on.',
      both: 'The lights jump with the beat. The garage has its switch too.' },
  ] },
  { id: 'race', name: 'The race', for: ['grid', 'rolling'], open: () => progress.racing, pages: [
    { title: "IT'S A RACE",
      both: 'You are in a race, from the back of the grid: the head-up display shows your place and how far the cars ' +
        'just ahead and behind are. Each race pays points by place, and points buy the Black market.' },
    { title: 'POINTS', // the owner (22 Oct): how places pay, here rather than in a hint
      both: 'A place pays its big points only the first time you take it, and the nearer the front, the more: P50 pays ' +
        '51 the first time, P1 100. After that a race pays a little: P50 6, P1 10.' },
  ] },
  { id: 'reckless', name: 'Reckless driving', for: ['reckless', 'chicken', 'daredevil'], open: () => lvl('reckless') > 0, pages: [
    { title: 'THE ONCOMING LANES', at: '#wheel',
      touch: 'Turn the wheel on past your lanes: the oncoming ones are yours too.',
      desk: 'Keep going with ← past your lanes: the oncoming ones are yours too.',
      both: 'Cars come at you there: a head-on ends the run.' },
    { title: 'DAMAGE', at: '#cluster',
      both: 'From now on collisions damage the car: the cluster says how much, and the windscreen cracks. The rev limit ' +
        'drops, gears break, and at 100% the car is wrecked. Repairs, in the Workshop, cost metres.' },
    { title: 'GAME OF CHICKEN', at: '#stalk', if: () => lvl('chicken') > 0,
      both: 'Flash a car coming at you and it swerves into its other lane, if there is room.' },
  ] },
  { id: 'ecu', name: 'ECU tune', for: ['ecuRev', 'ecuPower', 'cooling'], open: () => lvl('ecuRev') + lvl('ecuPower') > 0, pages: [
    { title: 'THE TUNE', at: '#tach', both: 'Tuned, the engine revs higher and pulls harder.' },
    { title: 'HEAT', at: '#heat',
      both: 'It heats the engine too: the gauge in the cluster. In the red, the heat damages the engine; Cooling buys ' +
        'you time. The aids keep to the factory map while it is hot.' },
  ] },
  { id: 'nitro', name: 'Nitro', for: ['nitro'], open: () => lvl('nitro') > 0, pages: [
    { title: 'NITRO', at: '#nos',
      touch: 'Press the small pedal on the gas pedal.', desk: 'Hold N, or press the small pedal on the gas pedal.',
      both: 'It floors the gas and adds power while it burns, and the heat goes straight into the red.' },
    { title: 'THE BOTTLE', at: '#nos-gauge',
      both: 'The gauge in the cluster shows what is left. The garage refills it, for metres.' },
  ] },
  { id: 'fleet', name: 'The Fleet', for: ['fleet', 'dues', 'fleetPace', 'fleetFlash', 'pack'], open: () => fleetSize() > 0, pages: [
    { title: 'YOUR FLEET',
      both: 'The racers you pay off race for you, in your colours: they give way when you come up behind them, and ' +
        'move across to block a rival closing on them. Your place counts the rivals only. At the finish their places ' +
        'pay you miles, more the further up they are.' },
    { title: 'THE SONAR', at: '#sonar',
      both: 'On the A-pillar: the road 250 m ahead of you and behind, from above. You are the arrow; your fleet cars ' +
        'are green, the rivals white, the traffic yellow.' },
    { title: 'THE HUNTING PACK', if: () => lvl('pack') > 0,
      both: 'Each fleet car hunts the nearest car ahead of it, as you do: into its lane and into it.' },
  ] },
  { id: 'warrig', name: 'The War Rig', for: ['bullbar', 'armour', 'spikes'], open: () => arOn(), pages: [
    { title: 'THE RETICLE', at: '#ar',
      both: 'Your fleet is a gang now. On the windscreen, the car ahead going your way is in the reticle, its health ' +
        'above it.' },
    { title: 'TOTAL IT',
      both: 'Ram it: each bump is a hit (a nudge under 30 km/h is not; over 200 km/h totals it at once). At no health ' +
        'it is totalled, and its scrap is yours.' },
    { title: 'THE WAR RIG PAGE', if: () => gangOpen(), // it opens with the first car totalled, after this pops up
      both: 'Scrap buys what is on the War Rig page in the garage: a bull bar, armour, guns.' },
  ] },
  { id: 'madness', name: 'Fuel madness', for: ['baddrivers'], open: () => lvl('baddrivers') > 0, pages: [
    { title: 'MAD FOR FUEL',
      both: 'Rusty, weaving cars are mad for fuel: no mirror, no indicator, and each jumps in front of you once. Ram one ' +
        'that does and it is totalled, for double scrap. Coming at you, they steer for you.' },
  ] },
  { id: 'police', name: 'Police heat', open: () => gangOpen(), pages: [
    { title: 'THE SCANNER', at: '#scanner',
      both: 'Every car totalled raises the police heat: the scanner on the A-pillar. The police come after you (red ' +
        'and blue on the sonar), and at 100% the army sends a tank, once you have guns.' },
  ] },
  { id: 'guns', name: 'Guns', for: ['guns', 'autogun'], open: () => lvl('guns') > 0, pages: [
    { title: 'FIRE', at: '#fire',
      touch: 'Hold the red marker at the top of the wheel.', desk: 'Hold G, or the red marker at the top of the wheel.',
      both: 'Four shots a second at the car in the reticle, up to 200 m. The gang fires too.' },
    { title: 'AUTO GUN', at: '#fire', if: () => lvl('autogun') > 0, both: 'It fires for you; the marker reads AUTO.' },
  ] },
  { id: 'tank', name: 'The tank', open: () => bossRace() || progress.tanks > 0, pages: [
    { title: 'THE TANK',
      both: 'It holds the road 80 m ahead of you (the red square on the sonar) and shells you. Rams barely scratch ' +
        'it: outgun it, with the gang. Lose and the heat drops to half; push for it again.' },
  ] },
];
const tour = { id: 'driving', page: 0, popup: false }; // popup: opened from the garage, so it closes back to it
const tutorial = id => TUTORIALS.find(t => t.id === id);
const opened = () => TUTORIALS.filter(t => t.open?.() ?? true);
const pagesOf = t => t.pages.filter(p => p.if?.() ?? true);
const tourFor = upgrade => TUTORIALS.find(t => t.for?.includes(upgrade))?.id; // the card's ? (distance.js)

// HOW TO DRIVE's list (main.js renderMenu)
function renderTutorials() {
  $('tutorials').innerHTML = opened().filter(t => t.pages).map(t => `<button data-tour="${t.id}">${t.name.toUpperCase()}</button>`).join('');
}
function openTour(id, popup = false) {
  Object.assign(tour, { id, page: 0, popup });
  document.activeElement?.blur(); // Space turns the page, not the button just clicked
  if (menuOpen) showScreen('tour'); else openMenu('tour');
}
function exitTour() {
  if (!tour.popup) return showScreen(screenFrom.pop() ?? 'help', true);
  closeMenu();
  popTour(); // another system the same purchase or run brought (the first total brings two): its turn
}
// a system's tutorial, once, when it opens in play: open now, not before the purchase or the run (markTours), and not
// shown yet. Only in play: a save's systems from before the tutorials, or set up by a test, pop nothing up. A new
// game marks all but its first act's card (distance.js)
let openBefore = null; // marked before a purchase or a run, and done with once its tutorials have popped up
const markTours = (but) => { openBefore = new Set(opened().map(t => t.id).filter(id => id !== but)); };
function popTour() {
  const t = openBefore && opened().find(t => t.open && !openBefore.has(t.id) && !progress.toured.includes(t.id));
  if (!t) { openBefore = null; return; }
  progress.toured.push(t.id);
  save();
  if (t.text) openCard(t.id); else openTour(t.id, true); // an act's card (distance.js), or a tutorial
}
function turnTour(by) {
  const to = tour.page + by;
  if (to < 0) return;
  if (to >= pagesOf(tutorial(tour.id)).length) return exitTour(); // past the last page
  tour.page = to;
  renderTour();
}
function renderTour() {
  const t = tutorial(tour.id), pages = pagesOf(t), p = pages[tour.page], touch = document.body.classList.contains('touch');
  $('tour-name').textContent = `${t.name.toUpperCase()} · ${tour.page + 1} OF ${pages.length}`;
  $('tour-title').textContent = p.title;
  $('tour-text').textContent = [touch ? p.touch : p.desk, p.both].filter(Boolean).join(' ');
  $('tour-dots').innerHTML = pages.map((_, i) => `<i${i === tour.page ? ' class="on"' : ''}></i>`).join('');
  $('tour-prev').disabled = tour.page === 0;
  $('tour-next').textContent = tour.page === pages.length - 1 ? 'DONE' : '▶';
  spot(p.at && document.querySelector(p.at));
}
// the dimming, with a hole round the control (or none), and the card out of its way: at the top or the bottom, and
// beside it when it is off to one side (a phone's lever is tall)
function spot(el) {
  for (const e of document.querySelectorAll('.tour-show')) if (e !== el) e.classList.remove('tour-show');
  // shown while the page is up, if the garage hides it (the sonar, the reticle); only then, as tour-show makes it a
  // block: the pedals' row once stood on end, the three stacked up the screen
  if (el && getComputedStyle(el).display === 'none') el.classList.add('tour-show');
  const r = el?.getBoundingClientRect(), lit = !!r && r.width > 0 && r.height > 0, s = $('spot'), body = document.body;
  const side = !lit ? '' : r.right < innerWidth * 0.4 ? 'right' : r.left > innerWidth * 0.6 ? 'left' : '';
  s.classList.toggle('lit', lit);
  body.classList.toggle('tour-low', lit && r.top + r.height / 2 < innerHeight / 2);
  body.classList.toggle('tour-left', side === 'left');
  body.classList.toggle('tour-right', side === 'right');
  body.style.setProperty('--tour-w', `${Math.min(540, side === 'right' ? innerWidth - r.right - 30 : side === 'left' ? r.left - 30 : 540)}px`);
  if (lit) Object.assign(s.style, { left: `${r.left - 8}px`, top: `${r.top - 8}px`, width: `${r.width + 16}px`, height: `${r.height + 16}px` });
}
addEventListener('resize', () => { if (menuOpen && screen === 'tour') renderTour(); });

// the keys while a tutorial is open (controls.js asks first): the pages, and Esc back to the list
function tourKey(k) {
  if (menuOpen && screen === 'act' && k === 'Escape') { closeCard(); return true; } // an act's card (distance.js)
  if (!menuOpen || screen !== 'tour') return false;
  if (k === 'ArrowRight' || k === ' ' && !document.activeElement?.closest('button')) turnTour(1); // Space on a button
  else if (k === 'ArrowLeft') turnTour(-1);                                                       // presses that one
  else if (k === 'Escape') exitTour();
  else return false;
  return true;
}
// a swipe across the card: the next page (to the left) or the one before
let swipeX = null;
$('menu-panel').addEventListener('pointerdown', e => { swipeX = screen === 'tour' ? e.clientX : null; });
$('menu-panel').addEventListener('pointerup', e => {
  if (swipeX !== null && Math.abs(e.clientX - swipeX) > 40) turnTour(e.clientX < swipeX ? 1 : -1);
  swipeX = null;
});
