-- AIVANTA autonomous newsroom migration: run once in Supabase SQL editor
alter table public.articles add column if not exists image_url text;
