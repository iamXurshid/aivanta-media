// AIVANTA Newsroom AI: RSS scout -> Gemini multi-article editor -> Supabase publishing
const feeds=[
 ["Reuters Tech","https://news.google.com/rss/search?q=when:7d+site:reuters.com/technology&ceid=US:en&hl=en-US&gl=US"],
 ["BBC Tech","https://feeds.bbci.co.uk/news/technology/rss.xml"],
 ["The Verge","https://www.theverge.com/rss/index.xml"],
 ["TechCrunch","https://techcrunch.com/feed/"],
 ["MIT News","https://news.mit.edu/rss/topic/artificial-intelligence2"],
 ["OpenAI","https://openai.com/blog/rss.xml"]
];
const env=["GEMINI_API_KEY","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"];
for(const k of env) if(!process.env[k]){console.error("Missing secret:",k);process.exit(1)}
const cutoff=Date.now()-24*60*60*1000;
function decode(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function getTag(xml,tag){const m=xml.match(new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)</"+tag+">","i"));return m?decode(m[1].replace(/<[^>]*>/g,"").trim()):""}
function parseFeed(xml,source){const items=xml.match(/<(item|entry)[\\s\\S]*?<\\/\\1>/gi)||[];return items.map(x=>({source,title:getTag(x,"title"),link:(x.match(/<link[^>]*>([^<]+)<\\/link>/i)||x.match(/<link[^>]+href=["']([^"']+)/i)||[])[1],date:["pubDate","published","updated","dc:date","date"].map(tag=>getTag(x,tag)).find(v=>v&&Number.isFinite(Date.parse(v)))||"",desc:getTag(x,"description")||getTag(x,"summary")||getTag(x,"content")})).filter(x=>x.title&&x.link&&Date.parse(x.date)>cutoff).map(x=>({...x,source}))}
const collected=[];
for(const [name,url] of feeds){try{const r=await fetch(url,{headers:{"user-agent":"AIVANTA-NewsBot/0.1"},signal:AbortSignal.timeout(12000)});if(!r.ok){console.log("feed skipped",name,"HTTP",r.status);continue}const xml=await r.text();const parsed=parseFeed(xml,name);console.log("feed diagnostics",name,"HTTP",r.status,"items",(xml.match(/<(item|entry)\\b/gi)||[]).length,"recent",parsed.length);collected.push(...parsed)}catch(e){console.log("feed skipped",name,e.message)}}
console.log("recent feed items:",collected.length);if(!collected.length)process.exit(0);
const supabase=process.env.SUPABASE_URL.replace(/\\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const known=await fetch(supabase+"/rest/v1/articles?select=slug,title&order=created_at.desc&limit=1000",{headers:{apikey:key,Authorization:"Bearer "+key}});
if(!known.ok){console.error("DB read failed",known.status,await known.text());process.exit(1)}
const seen=new Set((await known.json()).map(a=>a.slug));
const picked=[];
for(const n of collected){const slug=n.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);if(!seen.has(slug)){seen.add(slug);picked.push(n)}}
if(!picked.length){console.log("No unseen news candidates");process.exit(0)}
const candidate=picked.slice(0,12);
const prompt=`You are AIVANTA's technology news editor. Select and write UP TO 4 different high-quality, current, non-duplicate stories from candidates. Prefer important AI/technology news, variety of topics and sources, and skip weak stories. Return ONLY valid JSON as an array of article objects (empty array if nothing worth publishing). Each object fields: title (max 90 chars), slug (lowercase hyphenated), excerpt (1-2 sentences), body (Markdown, 350-600 words, factual, no invented quotes/details; disclose if source details are limited), category (AI, Models, Agents, Tools, Robotics, Tech), source_urls (array containing exact candidate URLs used), image_url (empty string unless candidate includes image URL). Do not use one story twice. Do not claim independent verification. Candidates:\n${candidate.map(n=>JSON.stringify({source:n.source,title:n.title,url:n.link,summary:n.desc.slice(0,1300)})).join("\\n")}`;
const models=["gemini-3.8-flash","gemini-3.5-flash-lite"];let ai=null;
for(const model of models){const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY);try{ai=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.35}}),signal:AbortSignal.timeout(20000)};}catch(e){console.error("Gemini",model,"network/timeout",e.message);continue}if(ai.ok){console.log("Gemini model used:",model);break}const err=await ai.text();console.error("Gemini",model,"HTTP",ai.status,err.slice(0,900));if(ai.status===429&&/daily|per.day|quota exceeded|GenerateRequestsPerDay|limit: 20/i.test(err)){console.log("Gemini daily quota exhausted; skip publishing");process.exit(0)}if(ai.status===429||[500,502,503,504].includes(ai.status))continue;process.exit(1)}
if(!ai?.ok){console.error("All Gemini models failed");process.exit(1)}
const data=await ai.json(),raw=data.candidates?.[0]?.content?.parts?.[0]?.text;if(!raw){console.log("AI declined/no content");process.exit(0)}
let articles;try{articles=JSON.parse(raw)}catch{console.error("Invalid model JSON",raw);process.exit(1)}
if(!Array.isArray(articles)){console.error("Model output must be an array");process.exit(1)}
const allowedUrls=new Set(candidate.map(x=>x.link));let published=0;
for(const a of articles.slice(0,4)){
 if(!a.title||!a.body||!Array.isArray(a.source_urls)||!a.source_urls.length||!a.source_urls.every(u=>allowedUrls.has(u))){console.error("Skip incomplete/invalid article");continue}
 a.slug=(a.slug||a.title).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100);
 const check=await fetch(supabase+"/rest/v1/articles?slug=eq."+encodeURIComponent(a.slug)+"&select=id",{headers:{apikey:key,Authorization:"Bearer "+key}});
 if(!check.ok){console.error("Slug check failed",check.status);continue}if((await check.json()).length){console.log("Duplicate slug, skip:",a.slug);continue}
 a.status="published";a.published_at=new Date().toISOString();
 const write=await fetch(supabase+"/rest/v1/articles",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(a)});
 if(!write.ok){console.error("Publish error",write.status,await write.text());continue}
 published++;console.log("Published:",a.title)
}
console.log("Articles published this run:",published);
