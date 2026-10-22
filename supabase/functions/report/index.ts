// Rev It's gate: the only way in to the tables (supabase/tables.sql) for the itch.io build's feedback and gameplay
// data (js/reporting.js). It takes a report from the game, checks its shape and size, throttles each sender, and writes
// it with the project's secret key, which stays here on the server: the game's page carries no Supabase key, and the
// tables take nothing from the public (the owner, 22 Oct: no Supabase open to the web).
// Deploy: the dashboard's Edge Functions, Deploy a new function, Via Editor: name it report, paste this file, then turn
// off its JWT verification (anyone may call it: the game has no key to send). Or with the CLI:
// supabase functions deploy report --no-verify-jwt
// Plain JavaScript, so a browser runs it too (tests/gate_test.py).

const KINDS = ['start', 'run', 'error'];
const MAX = { perMinute: 20, data: 16000, message: 2000, id: 64 }; // reports a minute from one sender; characters
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' };
const reply = status => new Response(null, { status, headers: CORS });

// a sender's reports this minute, in this instance's memory only (a best effort: instances come and go). One without an
// address isn't throttled: better some junk than every player in one bucket
const senders = new Map();
function throttled(req) {
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'))?.split(',')[0].trim();
  if (!ip) return false;
  const minute = Math.floor(Date.now() / 60000), [m, n] = senders.get(ip) ?? [minute, 0], count = m === minute ? n + 1 : 1;
  if (senders.size > 10000) senders.clear(); // never grows without bound
  senders.set(ip, [minute, count]);
  return count > MAX.perMinute;
}

// a report's table and row, or null: only the shape the game sends
const short = (v, max) => typeof v === 'string' && v.length <= max;
function check(report) {
  const { type, session, build, kind, message, data } = report ?? {};
  if (!short(session, MAX.id) || !short(build, MAX.id) || !data || typeof data !== 'object' || Array.isArray(data) ||
      JSON.stringify(data).length > MAX.data) return null;
  if (type === 'event' && KINDS.includes(kind)) return ['events', { session, build, kind, data }];
  if (type === 'feedback' && short(message, MAX.message)) return ['feedback', { session, build, message, data }];
  return null;
}

// the project's secret key: a new one (sb_secret_...), else the legacy service role key
function secret() {
  try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); }
  catch { return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); }
}

export async function gate(req) {
  if (req.method === 'OPTIONS') return reply(204);
  if (req.method !== 'POST') return reply(405);
  if (throttled(req)) return reply(429);
  const body = await req.text();
  if (body.length > MAX.data + MAX.message + 1000) return reply(413);
  let report = null;
  try { report = check(JSON.parse(body)); } catch { /* not JSON: refused below */ }
  if (!report) return reply(400);
  const [table, row] = report, key = secret() ?? '';
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/${table}`, {
    method: 'POST', body: JSON.stringify(row),
    headers: { apikey: key, ...(key.startsWith('ey') ? { Authorization: `Bearer ${key}` } : {}), // a legacy key is a JWT
               'Content-Type': 'application/json', Prefer: 'return=minimal' },
  }).catch(() => null);
  return reply(res?.ok ? 201 : 502);
}

Deno.serve(gate);
