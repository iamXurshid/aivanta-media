// Public RSS health endpoint with optional private Supabase history persistence.
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
const supabase = () => {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url && key ? { url, key } : null;
};
async function rest(cfg, path, options={}) {
  return fetch(cfg.url + "/rest/v1/" + path, { ...options, headers: { apikey: cfg.key, Authorization: "Bearer " + cfg.key, ...(options.headers || {}) }, signal: AbortSignal.timeout(8000) });
}
async function writeHistory(cfg, feeds) {
  try {
    const recent = await rest(cfg, "rss_monitor_checks?select=feed_name,checked_at&checked_at=gte." + encodeURIComponent(new Date(Date.now()-60*1000).toISOString()) + "&limit=100");
    const recentRows = recent.ok ? await recent.json() : [];
    const lastMap = new Map(recentRows.map(r=>[r.feed_name,Date.parse(r.checked_at)]));
    const now=Date.now();
    const payload=feeds.filter(f=>(!lastMap.has(f.name)||now-lastMap.get(f.name)>=60000)).map(f=>({feed_name:f.name,checked_at:new Date().toISOString(),ok:f.ok,http_status:f.status,item_count:f.items,latest_item_at:f.latest,elapsed_ms:f.elapsed_ms,error_code:f.error||null}));
    if(payload.length) {
      const insert=await rest(cfg,"rss_monitor_checks",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(payload)});
      if(!insert.ok) return {persisted:false,reason:"write_failed"};
    }
    return {persisted:true,recorded:payload.length};
  } catch(e) { return {persisted:false,reason:"history_unavailable"}; }
}
async function history(cfg) {
  try {
    const since=new Date(Date.now()-24*60*60*1000).toISOString();
    const r=await rest(cfg,"rss_monitor_checks?select=feed_name,checked_at,ok,http_status,item_count,latest_item_at,elapsed_ms,error_code&checked_at=gte."+encodeURIComponent(since)+"&order=checked_at.desc&limit=5000");
    if(!r.ok) return null;
    const rows=await r.json();
    return Object.fromEntries(FEEDS.map(([name])=>{
      const list=rows.filter(x=>x.feed_name===name);
      const lastSuccess=list.find(x=>x.ok);
      let streak=0; for(const item of list){if(item.ok)break;streak++}
      return [name,{checks_24h:list.length,failures_24h:list.filter(x=>!x.ok).length,last_success:lastSuccess?.checked_at||null,consecutive_failures:streak}];
    }));
  }catch(e){return null}
}
exports.handler = async () => {
  const checked_at = new Date().toISOString();
  const feeds = await Promise.all(FEEDS.map(async ([name,url])=>{
    const started=Date.now();
    try {
      const r=await fetch(url,{headers:{"user-agent":"AIVANTA-RSS-Monitor/1.0"},signal:AbortSignal.timeout(10000)});
      const xml=r.ok?await r.text():"";
      return {name,ok:r.ok,status:r.status,items:xml?countItems(xml):0,latest:xml?latestDate(xml):null,elapsed_ms:Date.now()-started};
    }catch(e){return {name,ok:false,status:null,items:0,latest:null,error:e.name==="TimeoutError"?"timeout":"fetch_failed",elapsed_ms:Date.now()-started};}
  }));
  const cfg=supabase();
  let persistence={enabled:!!cfg,persisted:false};
  let stats=null;
  if(cfg){persistence=await writeHistory(cfg,feeds);stats=await history(cfg);}
  if(stats) feeds.forEach(f=>f.history=stats[f.name]);
  const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"};
  return {statusCode:200,headers,body:JSON.stringify({checked_at,feeds,healthy:feeds.filter(f=>f.ok).length,total:feeds.length,history_available:!!stats,persistence})};
};
