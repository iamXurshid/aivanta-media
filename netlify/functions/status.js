exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const reply = (data) => ({ statusCode: 200, headers, body: JSON.stringify(data) });
  if (!supabaseUrl || !anonKey) return reply({ deploy: "ok", supabase_configured: false, diagnosis: "missing_environment_variables" });
  let parsed;
  try { parsed = new URL(supabaseUrl.trim()); } catch (e) {
    return reply({ deploy: "ok", supabase_configured: true, diagnosis: "invalid_supabase_url", detail: "SUPABASE_URL is not a valid URL. Copy the Project URL from Supabase Settings > API." });
  }
  if (!["https:"].includes(parsed.protocol) || !parsed.hostname.endsWith(".supabase.co")) {
    return reply({ deploy: "ok", supabase_configured: true, supabase_host: parsed.hostname, diagnosis: "invalid_supabase_host", detail: "Expected an https://<project-ref>.supabase.co URL." });
  }
  try {
    const response = await fetch(parsed.origin + "/rest/v1/articles?select=id&status=eq.published&limit=1", { headers: { apikey: anonKey, Authorization: "Bearer " + anonKey }, signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    let detail = body.slice(0, 300);
    try { detail = JSON.parse(body); } catch (_) {}
    return reply({ deploy: "ok", supabase_configured: true, supabase_host: parsed.hostname, database_reachable: response.ok, http_status: response.status, diagnosis: response.ok ? "ok" : "supabase_api_error", detail: response.ok ? undefined : detail });
  } catch (error) {
    const cause = error && error.cause ? String(error.cause) : "";
    return reply({ deploy: "ok", supabase_configured: true, supabase_host: parsed.hostname, database_reachable: false, diagnosis: "network_or_url_error", detail: [String(error), cause].filter(Boolean).join(" | ").slice(0, 300) });
  }
};
