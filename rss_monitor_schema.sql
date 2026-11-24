-- RSS monitor history and alert state. Service-role only; no anon/auth policies.
create table if not exists public.rss_monitor_checks (
 id bigint generated always as identity primary key,
 feed_name text not null,
 checked_at timestamptz not null default now(),
 ok boolean not null,
 http_status integer,
 item_count integer not null default 0,
 latest_item_at timestamptz,
 elapsed_ms integer,
 error_code text
);
create index if not exists rss_monitor_feed_checked_idx on public.rss_monitor_checks(feed_name, checked_at desc);
alter table public.rss_monitor_checks enable row level security;
-- Intentionally no public policies.
create table if not exists public.rss_monitor_alert_state (
 feed_name text primary key,
 alert_active boolean not null default false,
 last_alert_at timestamptz,
 last_recovered_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now()
);
alter table public.rss_monitor_alert_state enable row level security;
-- Intentionally no public policies.
