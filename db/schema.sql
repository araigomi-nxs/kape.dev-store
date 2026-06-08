-- ============================================================
--  kape.dev — projects / blog schema for Supabase
--  Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- ============================================================

-- 1. TABLE -----------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  title       text not null,
  category    text,                       -- e.g. "Business · Finance"
  status      text default 'Live',        -- Live | Beta | WIP | Web App | Mobile + Web ...
  description text,                        -- short card blurb
  body        text,                        -- long-form blog content
  icon_url    text,                        -- small square logo/icon
  cover_url   text,                        -- wide cover image (optional)
  link_url    text,                        -- external link (download / live demo / details)
  tags        text[] default '{}',         -- e.g. {Android, Web, Free}
  featured    boolean not null default false,
  published   boolean not null default true,
  sort_order  int not null default 0
);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 2. ROW LEVEL SECURITY ---------------------------------------
alter table public.projects enable row level security;

-- Anyone (anon) can read PUBLISHED projects
drop policy if exists "public read published" on public.projects;
create policy "public read published"
  on public.projects for select
  using ( published = true );

-- Logged-in admins can read everything (incl. drafts)
drop policy if exists "auth read all" on public.projects;
create policy "auth read all"
  on public.projects for select
  to authenticated
  using ( true );

-- Logged-in admins can insert / update / delete
drop policy if exists "auth insert" on public.projects;
create policy "auth insert"
  on public.projects for insert
  to authenticated
  with check ( true );

drop policy if exists "auth update" on public.projects;
create policy "auth update"
  on public.projects for update
  to authenticated
  using ( true ) with check ( true );

drop policy if exists "auth delete" on public.projects;
create policy "auth delete"
  on public.projects for delete
  to authenticated
  using ( true );

-- 3. STORAGE (image uploads) ----------------------------------
-- Public bucket for project images/icons
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Anyone can view images
drop policy if exists "public read images" on storage.objects;
create policy "public read images"
  on storage.objects for select
  using ( bucket_id = 'project-images' );

-- Logged-in admins can upload / replace / delete images
drop policy if exists "auth write images" on storage.objects;
create policy "auth write images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'project-images' );

drop policy if exists "auth update images" on storage.objects;
create policy "auth update images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'project-images' );

drop policy if exists "auth delete images" on storage.objects;
create policy "auth delete images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'project-images' );

-- ============================================================
--  DONE. Next:
--   • Create an admin user: Dashboard → Authentication → Users → Add user
--     (set email + password; this is who logs into /admin)
--   • Optionally turn OFF public sign-ups:
--     Authentication → Providers → Email → disable "Enable sign ups"
-- ============================================================
