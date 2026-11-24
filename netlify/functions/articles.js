exports.handler = async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { statusCode: 500, body: JSON.stringify({ error: "Supabase environment variables are not configured." }) };
  try {
    const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const response = await fetch(baseUrl + "/rest/v1/articles?select=id,slug,title,excerpt,body,category,source_urls,published_at&status=eq.published&order=published_at.desc&limit=30", {
      headers: { apikey: key, Authorization: "Bearer " + key }
    });
    const body = await response.text();
    return { statusCode: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }, body };
  } catch (error) {
    return { statusCode: 502, body: JSON.stringify({ error: "Unable to reach article database." }) };
  }
};