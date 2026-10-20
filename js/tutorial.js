// Tutorials, under HOW TO DRIVE (the owner, 20 Oct, after Diablo IV's: a system at a time, in pages, kept to read
// again). A page is a step; behind it the menu goes clear and dims all but the real control the step is about, lit
// up, so it always shows your own cockpit, phone or desktop, and never goes stale as the cockpit changes (the owner's
// pick over screenshots); its words follow the layout (touch, or keys and mouse). ◀ ▶, the arrow keys, Space or a
// swipe turn the pages; Esc goes back to the list.
// A page: title, at (the control to light up, a selector; none: the card alone), touch and desk (what to do, each
// way), both (said either way)
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
];
const tour = { id: 'driving', page: 0 };
const tutorial = id => TUTORIALS.find(t => t.id === id);

// HOW TO DRIVE's list (main.js renderMenu)
function renderTutorials() {
  $('tutorials').innerHTML = TUTORIALS.map(t => `<button data-tour="${t.id}">${t.name.toUpperCase()}</button>`).join('');
}
function openTour(id) {
  Object.assign(tour, { id, page: 0 });
  document.activeElement?.blur(); // Space turns the page, not the button just clicked
  showScreen('tour');
}
function turnTour(by) {
  const to = tour.page + by;
  if (to < 0) return;
  if (to >= tutorial(tour.id).pages.length) return showScreen(screenFrom.pop() ?? 'help', true); // past the last page
  tour.page = to;
  renderTour();
}
function renderTour() {
  const t = tutorial(tour.id), p = t.pages[tour.page], touch = document.body.classList.contains('touch');
  $('tour-name').textContent = `${t.name.toUpperCase()} · ${tour.page + 1} OF ${t.pages.length}`;
  $('tour-title').textContent = p.title;
  $('tour-text').textContent = [touch ? p.touch : p.desk, p.both].filter(Boolean).join(' ');
  $('tour-dots').innerHTML = t.pages.map((_, i) => `<i${i === tour.page ? ' class="on"' : ''}></i>`).join('');
  $('tour-prev').disabled = tour.page === 0;
  $('tour-next').textContent = tour.page === t.pages.length - 1 ? 'DONE' : '▶';
  spot(p.at && document.querySelector(p.at));
}
// the dimming, with a hole round the control (or none), and the card out of its way: at the top or the bottom, and
// beside it when it is off to one side (a phone's lever is tall)
function spot(el) {
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
  if (!menuOpen || screen !== 'tour') return false;
  if (k === 'ArrowRight' || k === ' ' && !document.activeElement?.closest('button')) turnTour(1); // Space on a button
  else if (k === 'ArrowLeft') turnTour(-1);                                                       // presses that one
  else if (k === 'Escape') showScreen(screenFrom.pop() ?? 'help', true);
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
