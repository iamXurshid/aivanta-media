// Public, read-only article API for the AIVANTA static site.
// Only use the Supabase anon/publishable key here. Never expose the service-role key.
exports.handler = async function handler(event) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { ...headers, Allow: "GET, OPTIONS" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error("Articles API missing Supabase public configuration");
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Article service is not configured" }) };
  }

  try {
    const baseUrl = supabaseUrl.replace(/\\/$/, "");
    const url = new URL(baseUrl + "/rest/v1/articles");
    url.searchParams.set("select", "slug,title,excerpt,body,category,source_urls,image_url,published_at");
    url.searchParams.set("status", "eq.published");
    url.searchParams.set("order", "published_at.desc");
    url.searchParams.set("limit", "50");

    const response = await fetch(url, {
      headers: { apikey: anonKey, Authorization: "Bearer " + anonKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error("Supabase articles query failed with HTTP", response.status);
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Article service temporarily unavailable" }) };
    }
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(Array.isArray(data) ? data : []) };
  } catch (error) {
    console.error("Articles API request failed:", error?.message || "Unknown error");
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Article service temporarily unavailable" }) };
  }
};
