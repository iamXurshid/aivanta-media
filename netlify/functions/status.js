exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deploy: "ok", supabase_configured: false, diagnosis: "missing_environment_variables" }) };
  let parsed;
  try { parsed = new URL(supabaseUrl); } catch (e) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deploy: "ok", supabase_configured: true, diagnosis: "invalid_supabase_url", detail: "SUPABASE_URL is not a valid URL" }) };
  }
  try {
    const response = await fetch(parsed.origin + "/rest/v1/articles?select=id&status=eq.published&limit=1", { headers: { apikey: anonKey, Authorization: "Bearer " + anonKey } });
    const body = await response.text();
    let detail = body.slice(0, 400);
    try { detail = JSON.parse(body); } catch (_) {}
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ deploy: "ok", supabase_configured: true, supabase_host: parsed.hostname, database_reachable: response.ok, http_status: response.status, diagnosis: response.ok ? "ok" : "supabase_api_error", detail: response.ok ? undefined : detail }) };
  } catch (error) {
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ deploy: "ok", supabase_configured: true, supabase_host: parsed.hostname, database_reachable: false, diagnosis: "network_or_url_error", detail: String(error).slice(0, 250) }) };
  }
};
