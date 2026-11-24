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
