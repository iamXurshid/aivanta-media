// Public RSS diagnostics for AIVANTA Studio. No credentials required.
const FEEDS = [
  ["Reuters Tech", "https://feeds.reuters.com/reuters/technologyNews"],
  ["BBC Tech", "https://feeds.bbci.co.uk/news/technology/rss.xml"],
  ["The Verge", "https://www.theverge.com/rss/index.xml"],
  ["TechCrunch", "https://techcrunch.com/feed/"],
  ["MIT News AI", "https://news.mit.edu/rss/topic/artificial-intelligence2"],
  ["OpenAI", "https://openai.com/blog/rss.xml"]
];
const countItems = xml => (xml.match(/<(item|entry)\b/gi) || []).length;
const latestDate = xml => {
  const dates = [...xml.matchAll(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(m => Date.parse(m[2].replace(/<[^>]*>/g, "").trim())).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
};
exports.handler = async () => {
  const feeds = await Promise.all(FEEDS.map(async ([name, url]) => {
    const started = Date.now();
    try {
      const r = await fetch(url, { headers: { "user-agent": "AIVANTA-RSS-Monitor/1.0" }, signal: AbortSignal.timeout(10000) });
      const xml = r.ok ? await r.text() : "";
      return { name, ok: r.ok, status: r.status, items: xml ? countItems(xml) : 0, latest: xml ? latestDate(xml) : null, elapsed_ms: Date.now() - started };
    } catch (e) {
      return { name, ok: false, status: null, items: 0, latest: null, error: e.name === "TimeoutError" ? "timeout" : "fetch_failed", elapsed_ms: Date.now() - started };
    }
  }));
  return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ checked_at: new Date().toISOString(), feeds, healthy: feeds.filter(f => f.ok).length, total: feeds.length }) };
};
