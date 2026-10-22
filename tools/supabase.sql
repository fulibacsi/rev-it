-- Rev It's tables on Supabase, for the itch.io build's gameplay data and feedback (js/reporting.js). Run once in the
-- project's SQL editor. The game sends with the publishable key, which anyone can read in the page, so the tables take
-- inserts from it and nothing else: no reading, changing or deleting. You read them in the dashboard (Table editor),
-- which isn't bound by these rules. Sizes are capped against junk.

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

-- the publishable key's role (anon) may add rows, nothing more
alter table public.events enable row level security;
alter table public.feedback enable row level security;
revoke all on public.events, public.feedback from anon, authenticated;
grant insert on public.events, public.feedback to anon;
create policy "the game adds events" on public.events for insert to anon with check (true);
create policy "the game adds feedback" on public.feedback for insert to anon with check (true);
