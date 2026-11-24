exports.handler = async () => {
  const rawUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const reply = (data) => ({ statusCode: 200, headers, body: JSON.stringify(data) });
  if (!rawUrl || !anonKey) return reply({ deploy: "ok", supabase_configured: false, diagnosis: "missing_environment_variables" });
  let parsed;
  try { parsed = new URL(rawUrl.trim()); } catch {
    return reply({ deploy: "ok", supabase_configured: true, diagnosis: "invalid_supabase_url", detail: "Copy the Project URL from Supabase Settings > API and paste it into SUPABASE_URL." });
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    return reply({ deploy: "ok", supabase_configured: true, diagnosis: "invalid_supabase_host", host: parsed.hostname, detail: "Expected https://<project-ref>.supabase.co" });
  }
  const endpoint = parsed.origin + "/rest/v1/articles?select=id&limit=1";
  try {
    const response = await fetch(endpoint, { headers: { apikey: anonKey, Authorization: "Bearer " + anonKey }, signal: AbortSignal.timeout(12000) });
    const body = await response.text();
    let detail = body.slice(0, 250);
    try { detail = JSON.parse(body); } catch {}
    return reply({ deploy: "ok", supabase_configured: true, host: parsed.hostname, reachable: true, http_status: response.status, diagnosis: response.ok ? "ok" : "supabase_api_response", detail: response.ok ? undefined : detail });
  } catch (error) {
    const cause = error?.cause || {};
    return reply({ deploy: "ok", supabase_configured: true, host: parsed.hostname, reachable: false, diagnosis: "network_or_dns_error", detail: String(error), cause_code: cause.code || null, cause_message: cause.message || null, endpoint: endpoint });
  }
};