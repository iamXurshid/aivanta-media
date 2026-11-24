# AIVANTA MVP

Static editorial landing page, ready for Netlify deployment.

## Deploy
1. Upload the project files to GitHub.
2. Import this repository into Netlify.
3. Build command: leave blank. Publish directory: `.`.

## Supabase
Run `supabase_schema.sql` in the Supabase SQL Editor to create the `articles` table. Public visitors can only read published articles. Add trusted writes later through server functions; never expose a service-role key in browser code.

## Current MVP limitations
The three story cards are clearly labeled demo content. Category filters work client-side. Newsletter form is a demo only and does not save or email subscribers. Supabase is not yet connected to the page.

## Netlify article API configuration
The `netlify/functions/articles.js` endpoint reads published articles from Supabase using a public anon/publishable key. In Netlify site environment variables, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`). Never set the service-role key for this public read endpoint. The endpoint returns published articles only, ordered newest-first, capped at 50 and cached for 60 seconds.
