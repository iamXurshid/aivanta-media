-- Add view counter and a safe RPC for the Netlify server function.
alter table public.articles add column if not exists views bigint not null default 0;
create or replace function public.increment_article_views(p_slug text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.articles
  set views = coalesce(views,0) + 1
  where slug = p_slug and status = 'published'
  returning views;
$$;
revoke all on function public.increment_article_views(text) from public, anon, authenticated;
grant execute on function public.increment_article_views(text) to service_role;
