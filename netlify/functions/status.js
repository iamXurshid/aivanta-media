exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deploy: "ok", supabase_configured: false, articles_api: "not_configured" }) };
  try {
    const baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const response = await fetch(baseUrl + "/rest/v1/articles?select=id&status=eq.published&limit=1", { headers: { apikey: anonKey, Authorization: "Bearer " + anonKey } });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ deploy: "ok", supabase_configured: true, database_reachable: response.ok, articles_api: response.ok ? "ok" : "error" }) };
  } catch (_) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deploy: "ok", supabase_configured: true, database_reachable: false, articles_api: "error" }) };
  }
};
