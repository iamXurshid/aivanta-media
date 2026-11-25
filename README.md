# AIVANTA MVP

Static editorial landing page, ready for Netlify deployment.

## Deploy
1. Upload the project files to GitHub.
2. Import this repository into Netlify.
3. Build command: leave blank. Publish directory: `.`.

## Supabase
Run `supabase_schema.sql` in the Supabase SQL Editor to create the `articles` table. Public visitors can only read published articles. Add trusted writes later through server functions; never expose a service-role key in browser code.

## Current site features
- Published articles are loaded through the Netlify articles function from Supabase.
- Homepage includes a dynamic latest-story hero, article cards, category filtering, and search.
- Article detail pages show article text, hero image when available, and source links.
- Newsletter signup remains a placeholder until a provider is connected.

## SEO setup
- Homepage includes canonical URL, Open Graph, Twitter summary metadata, and NewsMediaOrganization structured data. The canonical host is set at runtime.
- Article pages update title, canonical URL, Open Graph/Twitter metadata, and NewsArticle JSON-LD when an article is loaded.
- `/robots.txt` and `/sitemap.xml` are served dynamically by Netlify Functions; the sitemap lists the homepage and published article slugs from Supabase.
- Sitemap generation uses the public anon/publishable key. It never uses the Supabase service-role key.

## Netlify article API configuration
The `netlify/functions/articles.js` endpoint reads published articles from Supabase using a public anon/publishable key. In Netlify site environment variables, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`). Never set the service-role key for this public read endpoint. The endpoint returns published articles only, ordered newest-first, capped at 50 and cached for 60 seconds.


## RSS Source Monitor history
- Analytics dashboard includes live RSS feed checks and optional 24-hour history (check counts, failures, last success, consecutive failure streak).
- To enable history, run `rss_monitor_schema.sql` in Supabase SQL Editor. Then configure Netlify server environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the RSS monitor function only. The service-role key must remain server-side and never be added to browser code.
- History writes are throttled to one record per feed per minute. Without these server-side variables, live feed checks still work, but history is disabled.

## Telegram RSS alerts
- Alerts fire after three consecutive recorded failures for a feed and send a recovery notification when it returns to healthy.
- Configure Netlify server-side environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, alongside the existing Supabase service-role settings.
- Run the updated `rss_monitor_schema.sql` in Supabase to create the private alert-state table. Keep service-role credentials and Telegram token out of browser code and Git.
- AI diagnosis is not part of this alert implementation yet.

## Newsroom AI quota protection
- The scheduled scout/publish job runs every 2 hours (12 scheduled runs/day), rather than every 5 minutes.
- Push events are disabled to prevent code changes from consuming Gemini quota; use workflow dispatch for manual checks.
- Each run makes at most one request per configured Gemini model. Daily-quota HTTP 429 responses stop AI generation/publishing immediately; transient limits may move to the single fallback model.
- A successful workflow run is not proof of publication. Confirm a `Published:` log line or a newly published Supabase row.

## Reuters RSS source replacement
- Reuters' legacy `feeds.reuters.com` RSS endpoint is retired/unavailable. A Google News RSS search restricted to Reuters technology replaces it in both publisher and dashboard monitor.
- The newsroom date parser also accepts `dc:date` and generic `date` when they contain a parseable timestamp.


## Follower news submissions & Telegram moderation

1. Run `follower-submissions-schema.sql` in Supabase SQL Editor (adds `source_label` and private `news_submissions` queue table).
2. Set Netlify server-only environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (moderation group chat ID), `TELEGRAM_ADMIN_IDS` (comma-separated numeric Telegram user IDs allowed to approve/cancel), `TELEGRAM_WEBHOOK_SECRET` (random 32+ character token), `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `AIVANTA_SITE_URL (set to https://gregarious-sable-1fb7d9.netlify.app)`. Never expose the bot token, webhook secret, Gemini key, or service-role key in frontend files.
3. After Netlify deploy, set the Telegram webhook to `https://gregarious-sable-1fb7d9.netlify.app/.netlify/functions/telegram-moderation`, using Telegram Bot API `setWebhook` with `secret_token` equal to the configured webhook secret and allowed updates `callback_query`. Example (replace the placeholders; do not commit the token): `https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://gregarious-sable-1fb7d9.netlify.app/.netlify/functions/telegram-moderation&secret_token=YOUR_WEBHOOK_SECRET&allowed_updates=%5B%22callback_query%22%5D`.
4. Public homepage includes Submit News. Submission is saved and sent to Telegram with ACCEPT/CANCEL buttons. Only IDs listed in `TELEGRAM_ADMIN_IDS` can act on them. ACCEPT invokes Gemini, publishes immediately, and labels the article `With Follower`; CANCEL prevents publishing.

**Security note:** The webhook rejects requests without a matching secret token. Keep `news_submissions` without public RLS policies; Netlify functions access it via service role.
