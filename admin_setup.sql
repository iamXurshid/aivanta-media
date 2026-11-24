-- AIVANTA Admin access setup (run once in Supabase SQL Editor)
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "admin can read own access" on public.admin_users;
create policy "admin can read own access" on public.admin_users for select to authenticated using (user_id=auth.uid());
drop policy if exists "admins can read all articles" on public.articles;
create policy "admins can read all articles" on public.articles for select to authenticated using (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "admins can insert articles" on public.articles;
create policy "admins can insert articles" on public.articles for insert to authenticated with check (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "admins can update articles" on public.articles;
create policy "admins can update articles" on public.articles for update to authenticated using (exists(select 1 from public.admin_users au where au.user_id=auth.uid())) with check (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles" on public.articles for delete to authenticated using (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
