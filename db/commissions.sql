-- ============================================================
--  kape.dev — POS commission submissions
--  Run this in the Supabase SQL Editor (after schema.sql)
-- ============================================================

create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  business    text,
  email       text not null,
  contact     text,
  notes       text,
  preset      text,           -- layout preset name
  device      text,           -- device name
  palette     text,           -- colour theme name (or 'Custom')
  font        text,           -- typeface name (Inter, Poppins, …)
  custom_palette jsonb,       -- custom colours {accent,bg,surface,text} when palette = 'Custom'
  receipt     jsonb,          -- receipt designer config {paper, elements, address, footer, …}
  spec         text,          -- human-readable spec sheet
  design       jsonb,         -- full builder config (source of truth for everything)
  snapshot_url text,          -- PNG preview of the chosen screen / receipt
  logo_url     text,          -- uploaded logo image (storage URL)
  status       text not null default 'new'   -- new | contacted | building | done | declined
);

-- back-fill columns for tables created before they existed
alter table public.commissions add column if not exists snapshot_url   text;
alter table public.commissions add column if not exists font           text;
alter table public.commissions add column if not exists custom_palette jsonb;
alter table public.commissions add column if not exists receipt        jsonb;
alter table public.commissions add column if not exists logo_url       text;

-- ------------------------------------------------------------
-- One-time data back-fill: populate the new columns from the
-- existing `design` payload for commissions submitted before the
-- columns existed. Idempotent — coalesce() only fills NULLs, so
-- it is safe to run more than once.
-- ------------------------------------------------------------
update public.commissions set
  font = coalesce(font, case design->>'font'
      when 'inter'    then 'Inter'
      when 'poppins'  then 'Poppins'
      when 'manrope'  then 'Manrope'
      when 'jakarta'  then 'Plus Jakarta'
      when 'grotesk'  then 'Space Grotesk'
      when 'dmsans'   then 'DM Sans'
      when 'fraunces' then 'Fraunces'
      when 'playfair' then 'Playfair'
      else nullif(design->>'font', '') end),
  custom_palette = coalesce(custom_palette,
      case when design->>'palette' = 'custom' then design->'customPalette' end),
  receipt  = coalesce(receipt,  design->'receipt'),
  logo_url = coalesce(logo_url, nullif(design->>'logo', ''))
where design is not null;

alter table public.commissions enable row level security;

-- Anyone (even anonymous visitors) may SUBMIT a commission
drop policy if exists "public submit commission" on public.commissions;
create policy "public submit commission"
  on public.commissions for insert
  to anon, authenticated
  with check ( true );

-- Only logged-in admins can READ submissions
drop policy if exists "auth read commissions" on public.commissions;
create policy "auth read commissions"
  on public.commissions for select
  to authenticated
  using ( true );

-- Only logged-in admins can UPDATE (change status) / DELETE
drop policy if exists "auth update commissions" on public.commissions;
create policy "auth update commissions"
  on public.commissions for update
  to authenticated
  using ( true ) with check ( true );

drop policy if exists "auth delete commissions" on public.commissions;
create policy "auth delete commissions"
  on public.commissions for delete
  to authenticated
  using ( true );

-- ============================================================
--  STORAGE — layout snapshots for commissions
--  Public bucket; visitors (anon) may upload their snapshot when
--  submitting, and anyone can view. (Same trust model as the
--  anonymous "submit commission" insert above.)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('commission-snapshots', 'commission-snapshots', true)
on conflict (id) do nothing;

drop policy if exists "public read snapshots" on storage.objects;
create policy "public read snapshots"
  on storage.objects for select
  using ( bucket_id = 'commission-snapshots' );

drop policy if exists "public upload snapshots" on storage.objects;
create policy "public upload snapshots"
  on storage.objects for insert
  to anon, authenticated
  with check ( bucket_id = 'commission-snapshots' );

drop policy if exists "auth delete snapshots" on storage.objects;
create policy "auth delete snapshots"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'commission-snapshots' );
