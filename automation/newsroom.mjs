// Agent 1: RSS news scout -> Gemini editorial -> Supabase publishing
const feeds=[
 ["Reuters Tech","https://feeds.reuters.com/reuters/technologyNews"],
 ["BBC Tech","https://feeds.bbci.co.uk/news/technology/rss.xml"],
 ["The Verge","https://www.theverge.com/rss/index.xml"],
 ["TechCrunch","https://techcrunch.com/feed/"],
 ["MIT News","https://news.mit.edu/rss/topic/artificial-intelligence2"],
 ["OpenAI","https://openai.com/blog/rss.xml"]
];
const env=["GEMINI_API_KEY","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"];
for(const k of env) if(!process.env[k]) {console.error("Missing secret:",k);process.exit(1)}
const cutoff=Date.now()-24*60*60*1000;
function decode(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function getTag(xml,tag){const m=xml.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)</"+tag+">","i"));return m?decode(m[1].replace(/<[^>]*>/g,"").trim()):""}
function parseFeed(xml,source){const items=xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi)||[];return items.map(x=>({source,title:getTag(x,"title"),link:(x.match(/<link[^>]*>([^<]+)<\/link>/i)||x.match(/<link[^>]+href=["']([^"']+)/i)||[])[1],date:getTag(x,"pubDate")||getTag(x,"published")||getTag(x,"updated"),desc:getTag(x,"description")||getTag(x,"summary")||getTag(x,"content"),raw:x})).filter(x=>x.title&&x.link&&Date.parse(x.date)>cutoff).map(x=>({...x,source}))}
const collected=[];
for(const [name,url] of feeds){try{const r=await fetch(url,{headers:{"user-agent":"AIVANTA-NewsBot/0.1"},signal:AbortSignal.timeout(12000)});if(!r.ok){console.log("feed skipped",name,"HTTP",r.status);continue}const xml=await r.text();const parsed=parseFeed(xml,name);console.log("feed diagnostics",name,"HTTP",r.status,"items",(xml.match(/<(item|entry)\b/gi)||[]).length,"recent",parsed.length);if(parsed.length)console.log("feed recent",name,parsed.slice(0,3).map(x=>x.title.replace(/\s+/g," ").slice(0,180)));collected.push(...parsed)}catch(e){console.log("feed skipped",name,e.message)}}
console.log("recent feed items:",collected.length);
if(!collected.length)process.exit(0);
const supabase=process.env.SUPABASE_URL.replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const known=await fetch(supabase+"/rest/v1/articles?select=slug,title&order=created_at.desc&limit=100",{headers:{apikey:key,Authorization:"Bearer "+key}});
if(!known.ok){console.error("DB read failed",known.status,await known.text());process.exit(1)}
const existing=await known.json();const seen=new Set(existing.map(a=>a.slug));
const picked=[];
for(const n of collected){const slug=n.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);if(!seen.has(slug)){seen.add(slug);picked.push(n)}}
if(!picked.length){console.log("No unseen news candidates");process.exit(0)}
const candidate=picked.slice(0,3);
const prompt=`You are AIVANTA's English-language technology news editor. From the candidate RSS stories below, select at most ONE genuinely newsworthy, factual, recent story (skip if minor, duplicate, unclear or unsupported). Write an original concise article based only on provided candidate information. Return ONLY valid JSON with fields: title (max 90 chars), slug (lowercase hyphenated), excerpt (1-2 sentences), body (Markdown, 450-750 words, no invented quotes/details; if details unavailable be transparent), category (one of AI, Models, Agents, Tools, Robotics, Tech), source_urls (array of exact candidate URLs), image_url (use a candidate image URL only if present, otherwise empty string). Do not claim you independently verified anything. Candidates:\n${candidate.map(n=>JSON.stringify({source:n.source,title:n.title,url:n.link,summary:n.desc.slice(0,1500)})).join("\n")}`;
// Keep API usage bounded: one attempt per model, and stop immediately on daily quota exhaustion.
const models=["gemini-3.8-flash","gemini-3.5-flash-lite"];
let ai=null;
for(const model of models){
 const aiUrl="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY);
 const aiOptions={method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.35}})};
 try{ai=await fetch(aiUrl,{...aiOptions,signal:AbortSignal.timeout(20000)});}catch(e){console.error("Gemini",model,"network/timeout error",e.message);continue}
 if(ai.ok){console.log("Gemini model used:",model);break}
 const errorText=await ai.text();
 console.error("Gemini",model,"HTTP",ai.status,errorText.slice(0,1200));
 if(ai.status===429){
  if(/daily|per.day|quota exceeded|GenerateRequestsPerDay|limit: 20/i.test(errorText)){
   console.log("Gemini daily quota exhausted; AI generation and publishing skipped for this run.");
   process.exit(0);
  }
  // Transient rate limit: do not retry the same model; try the fallback once.
  continue;
 }
 if([500,502,503,504].includes(ai.status))continue;
 console.error("Non-retryable Gemini response; no article published.");
 process.exit(1);
}
if(!ai?.ok){console.error("All Gemini models failed; no article published.");process.exit(1)}
const result=await ai.json();const raw=result.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw){console.log("AI declined/no content");process.exit(0)}
let article;try{article=JSON.parse(raw)}catch{console.error("Invalid model JSON",raw);process.exit(1)}
if(!article.title||!article.body||!article.source_urls?.length){console.error("Incomplete article fields");process.exit(1)}
article.slug=(article.slug||article.title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const check=await fetch(supabase+"/rest/v1/articles?slug=eq."+encodeURIComponent(article.slug)+"&select=id",{headers:{apikey:key,Authorization:"Bearer "+key}});
if(!check.ok){console.error("Slug check failed");process.exit(1)}if((await check.json()).length){console.log("Duplicate slug, skip");process.exit(0)}
article.status="published";article.published_at=new Date().toISOString();
const write=await fetch(supabase+"/rest/v1/articles",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(article)});
if(!write.ok){console.error("Publish error",write.status,await write.text());process.exit(1)}
console.log("Published:",article.title);
