-- Emotionary content schema — DESIGN.md §6.1/§6.2.
-- Apply with: supabase db push (after supabase link), or supabase start locally.

create extension if not exists moddatetime schema extensions;

create type word_type as enum ('wanderword', 'hidden_english', 'psychology');

create table public.words (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  word          text not null,
  pronunciation text not null,
  language      text not null,
  type          word_type not null,
  level         smallint not null check (level between 1 and 5),
  definition    text not null,
  wisdom        text not null,
  is_free       boolean not null default true,   -- future freemium switch (never remove)
  published     boolean not null default false,  -- founder drafts until flipped
  published_at  timestamptz,                     -- set on first publish; drives rotation freeze
  audio_url     text,                            -- V1.5 (Supabase Storage)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger words_updated_at before update on public.words
  for each row execute procedure extensions.moddatetime(updated_at);

-- Set published_at the first time a row is published. NOTE: the initial seed
-- import explicitly BACKDATES published_at (DESIGN.md §6.1) — the monthly
-- rotation only draws from words published before the current month.
create or replace function public.set_published_at() returns trigger as $$
begin
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$ language plpgsql;

create trigger words_published_at before insert or update on public.words
  for each row execute procedure public.set_published_at();

create index words_updated_at_idx on public.words (updated_at);

-- RLS: anonymous read-only on published words; default-deny everything else.
alter table public.words enable row level security;

grant select on public.words to anon, authenticated;

create policy "public read published words" on public.words
  for select to anon, authenticated
  using (published);

-- V1.5 (spec'd in DESIGN.md §6.6, deliberately not created yet):
-- create table public.daily_overrides (
--   date    date primary key,
--   word_id uuid not null references public.words(id)
-- );
