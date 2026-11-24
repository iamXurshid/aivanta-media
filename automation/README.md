# AIVANTA autonomous agents (free-first)

Agent 1 (Newsroom) runs on a GitHub Actions 5-minute schedule:
RSS discovery -> dedupe -> Gemini editorial -> Supabase publish.

Required GitHub repository Actions secrets:
- GEMINI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

The service-role key is only used in GitHub Actions server environment; never put it in client-side website files.

Run the schema migration in Supabase SQL Editor:
```sql
alter table public.articles add column if not exists image_url text;
```

First workflow run is available via Actions > AIVANTA Newsroom AI > Run workflow.
Scheduled workflows can be delayed by GitHub and may run less frequently during inactivity. The pipeline only considers RSS items in the last 6 hours, picks up to 3 candidates per cycle, asks the model to publish at most one, and skips duplicate slugs.
