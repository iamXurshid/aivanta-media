create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 title text not null,
 excerpt text,
 body text,
 category text not null default 'AI',
 status text not null default 'draft' check(status in ('draft','published','archived')),
 source_urls text[] not null default '{}',
 published_at timestamptz,
 created_at timestamptz not null default now()
);
-- Safe migration for projects where the articles table was created before category was added.
alter table public.articles add column if not exists category text not null default 'AI';
create index if not exists articles_status_published_idx on public.articles(status,published_at desc);
alter table public.articles enable row level security;
drop policy if exists "public can read published articles" on public.articles;
create policy "public can read published articles" on public.articles for select using(status='published');
