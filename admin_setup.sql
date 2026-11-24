-- AIVANTA Admin access setup (run once in Supabase SQL Editor)
-- 1) First create the Auth user with email xurshid@aivanta.com in Supabase Dashboard > Authentication > Users.
-- 2) Then run this script. It grants admin access to that exact email.
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admin_users enable row level security;
insert into public.admin_users (user_id) select id from auth.users where email = 'xurshid@aivanta.com' on conflict (user_id) do nothing;
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
