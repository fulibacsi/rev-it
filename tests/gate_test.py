"""The gate (supabase/functions/report): the only way in to the tables. Run in the browser, as plain JavaScript, with
Deno's few calls and the database stood in for: a report the game sends is written with the secret key (the new kind,
or a legacy one), to its table, and nothing else is; anything else is refused (another shape, sizes over the caps,
not JSON, not POST); a sender over 20 reports a minute is throttled (one without an address isn't); a failed write
says so."""
import functools, http.server, threading
from playwright.sync_api import sync_playwright
from common import ROOT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
class Served(http.server.SimpleHTTPRequestHandler):  # .ts as JavaScript, so the browser imports it
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".ts": "text/javascript"}
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Served, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
STAND_IN = """window.ENV = { SUPABASE_URL: 'https://db.test', SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_abc' }) };
window.Deno = { env: { get: k => ENV[k] }, serve: h => { window.served = h; } };
window.writes = []; window.db = 201;
window.fetch = async (url, o) => { if (db === 'down') throw new TypeError('down'); writes.push({ url, headers: o.headers, row: JSON.parse(o.body) });
  return new Response(null, { status: db }); };
// a report to the gate: its answer, and what reached the database
window.send = async (body, { method = 'POST', ip = '1.1.1.1' } = {}) => { const n = writes.length;
  const r = await gate(new Request('https://gate.test/report', { method, headers: ip ? { 'x-forwarded-for': ip } : {},
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined }));
  return [r.status, writes.slice(n), r.headers.get('access-control-allow-origin')]; };
window.ok = { type: 'event', session: 's1', build: 'build 1', kind: 'run', data: { save: { runs: 3 } } };"""
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(f"http://127.0.0.1:{srv.server_port}/css/style.css")  # a page of the server, for its origin
    js(STAND_IN + "; 0"); js("import('/supabase/functions/report/index.ts').then(m => { window.gate = m.gate; })")
    check("Deno.serve gets the gate", js("served === gate"), "")
    got = js("send(ok)")
    check("an event: 201, one write to events with the secret key, its row as the game sent it (less the type)",
          got[0] == 201 and len(got[1]) == 1 and got[1][0]["url"] == "https://db.test/rest/v1/events"
          and got[1][0]["headers"]["apikey"] == "sb_secret_abc" and "Authorization" not in got[1][0]["headers"]
          and got[1][0]["row"] == {"session": "s1", "build": "build 1", "kind": "run", "data": {"save": {"runs": 3}}} and got[2] == "*", got)
    got = js("send({ type: 'feedback', session: 's1', build: 'b', message: '', data: {} })")
    check("feedback, empty: 201, to feedback", got[0] == 201 and got[1][0]["url"].endswith("/feedback") and got[1][0]["row"]["message"] == "", got[:2])
    got = js("send({ type: 'feedback', session: 's1', build: 'b', message: 'Great game', data: {} })")
    check("feedback with words", got[0] == 201 and got[1][0]["row"]["message"] == "Great game", got[0])
    refused = js("""(async () => { const out = {}, cases = {
        'another kind': { ...ok, kind: 'drop' }, 'another type': { ...ok, type: 'admin' }, 'no session': { ...ok, session: undefined },
        'a long session': { ...ok, session: 'x'.repeat(65) }, 'data a list': { ...ok, data: [1] }, 'no data': { ...ok, data: null },
        'data too big': { ...ok, data: { x: 'x'.repeat(16001) } }, 'feedback too long': { ...ok, type: 'feedback', message: 'x'.repeat(2001) },
        'not JSON': 'hello' };
      for (const [k, v] of Object.entries(cases)) { const [s, w] = await send(v, { ip: 'r-' + k }); out[k] = [s, w.length]; }
      return out; })()""")
    check("refused, nothing written: other shapes, sizes over the caps, not JSON", all(v == [400, 0] for v in refused.values()), refused)
    got = js("Promise.all([send(null, { method: 'GET', ip: 'g' }), send(null, { method: 'OPTIONS', ip: 'g' }), send('x'.repeat(20000), { ip: 'big' })]).then(r => r.map(x => x[0]))")
    check("GET 405, OPTIONS 204 (with CORS), a body too big 413", got == [405, 204, 413], got)
    got = js("""(async () => { if (Date.now() % 60000 > 58000) await new Promise(r => setTimeout(r, 2500)); // all in one minute
      const s = []; for (let i = 0; i < 21; i++) s.push((await send(ok, { ip: '9.9.9.9' }))[0]); return s; })()""")
    check("one sender: 20 a minute, the 21st throttled (429)", got[:20] == [201] * 20 and got[20] == 429, got[-3:])
    got = js("Promise.all([send(ok, { ip: '8.8.8.8' }), send(ok, { ip: '' })]).then(r => r.map(x => x[0]))")
    check("another sender, and one without an address: let through", got == [201, 201], got)
    got = js("(async () => { db = 500; const a = (await send(ok, { ip: 'f' }))[0]; db = 'down'; const b = (await send(ok, { ip: 'f' }))[0]; db = 201; return [a, b]; })()")
    check("the database refusing, or out of reach: 502", got == [502, 502], got)
    got = js("(async () => { ENV.SUPABASE_SECRET_KEYS = undefined; ENV.SUPABASE_SERVICE_ROLE_KEY = 'eyJlegacy'; return (await send(ok, { ip: 'l' }))[1][0].headers; })()")
    check("a legacy service role key: as apikey and Bearer (a JWT)", got["apikey"] == "eyJlegacy" and got.get("Authorization") == "Bearer eyJlegacy", got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
