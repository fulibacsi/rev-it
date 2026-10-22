-- Rev It's tables on Supabase, for the itch.io build's gameplay data and feedback (js/reporting.js). Run once in the
-- project's SQL editor. Only the gate writes to them (supabase/functions/report: it checks each report and writes with
-- the project's secret key); the public keys can't touch them at all. You read them in the dashboard (Table editor).
-- Sizes are capped against junk, behind the gate's own checks.

-- gameplay data, with the player's consent: a game of Distance starting, each run's end, an error
create table public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  session text not null check (length(session) <= 64),     -- one visit's, kept in the page's memory only
  kind text not null check (kind in ('start', 'run', 'error')),
  build text check (length(build) <= 64),
  data jsonb not null check (pg_column_size(data) <= 16000)  -- the save as it stands, the run, the device's kind
);

-- feedback: the player's words (may be empty), with their stats
create table public.feedback (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  session text not null check (length(session) <= 64),
  message text not null check (length(message) <= 2000),
  build text check (length(build) <= 64),
  data jsonb not null check (pg_column_size(data) <= 16000)
);

-- closed to the public keys (anon, and signed-in users): no grants, and row level security with no policy to let them
-- in. The gate's secret key (the service_role) gets past row level security, but needs its grant: given here, as a
-- project with "Automatically expose new tables" off (the safer choice at its creation) grants new tables nothing
alter table public.events enable row level security;
alter table public.feedback enable row level security;
revoke all on public.events, public.feedback from anon, authenticated;
grant insert on public.events, public.feedback to service_role;
