// Feedback and gameplay data, to the owner's Supabase (22 Oct: the game is in progress, and players' word shapes it),
// from itch.io's build only: the repository leaves SUPABASE empty, so GitHub Pages plays as before (SHARE, nothing sent),
// and the itch.io build (tools/build.py) fills it in. Then the first visit asks (main.js): gameplay data goes only with
// the box ticked, and SETTINGS changes it. FEEDBACK takes SHARE's place (in STATS and on the ending) and sends a message
// with the player's stats whatever the box says; ticked, the message can't be empty (the stats go anyway), unticked it
// can. Gameplay data only, nothing personal: the save as it stands, the build, touch or keys, the kind of device, the
// screen's size, and errors. Sent by plain fetch to two insert-only tables (tools/supabase.sql); a failed send is
// dropped, and the game never waits on one.
const SUPABASE = { url: '', key: '' }; // the project's URL and publishable key (public by design: the tables are insert-only)
const reporting = () => !!SUPABASE.url;
const session = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`; // this visit's: groups one sitting's runs,
                                                                          // kept in memory, never on the device
let errorsSent = 0;                   // errors reported this visit: the first few are enough

function post(table, row) {
  if (!SUPABASE.url) return Promise.resolve(false);
  return fetch(`${SUPABASE.url}/rest/v1/${table}`, {
    method: 'POST', keepalive: true, body: JSON.stringify(row),
    headers: { apikey: SUPABASE.key, Authorization: `Bearer ${SUPABASE.key}`, 'Content-Type': 'application/json',
               Prefer: 'return=minimal' }, // insert only: nothing to read back
  }).then(r => r.ok, () => false);
}
// the game as it stands: the save, less what only the interface keeps (the tabs' ! and the tutorials seen)
function playStats() {
  const { seen, toured, ...save } = progress, ua = navigator.userAgent;
  return { layout: touchLayout() ? 'touch' : 'keys', screen: `${innerWidth}x${innerHeight}`, act: currentCard()?.id, save,
           device: /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : 'desktop' };
}
// gameplay data, with the box ticked: a game of Distance starting, each run's end, an error
function report(kind, data = {}) {
  try { if (settings.stats) post('events', { session, kind, build: BUILD, data: { ...playStats(), ...data } }); }
  catch { /* an error before the game has loaded: nothing to say yet */ }
}
const sendFeedback = message => post('feedback', { session, message, build: BUILD, data: playStats() });

function reportError(message, at) {
  if (errorsSent++ < 5) report('error', { message: String(message).slice(0, 300), at: String(at ?? '').slice(0, 200) });
}
addEventListener('error', e => reportError(e.message, `${e.filename?.split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', e => reportError(e.reason?.message ?? e.reason, e.reason?.stack?.split('\n')[1]));

// the first visit's question (main.js), the setting, and the feedback screen
const askStats = () => reporting() && settings.stats === undefined;
function setStats(on) { settings.stats = on; saveSettings(); }
function renderFeedback(note = '') {
  const empty = !$('feedback-text').value.trim();
  $('feedback-send').disabled = settings.stats && empty; // ticked: the stats go anyway, so a word is needed
  $('feedback-note').textContent = note || (settings.stats ? '' : 'You can send it empty: just your play stats.');
}
async function submitFeedback() {
  renderFeedback('Sending…');
  $('feedback-send').disabled = true;
  const sent = await sendFeedback($('feedback-text').value.trim().slice(0, 2000));
  if (sent) $('feedback-text').value = '';
  renderFeedback(sent ? 'Sent, thank you!' : "Couldn't send it: try again later.");
}
