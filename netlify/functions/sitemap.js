// Dynamic sitemap based on published Supabase articles. Host is derived from request.
exports.handler = async function(event) {
  const host = event.headers?.host || event.headers?.Host || "";
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return {statusCode:400,body:"Invalid host"};
  const origin = "https://" + host;
  const headers={"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"};
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;
  let urls=[origin+"/"];
  if(url&&key){
    try{
      const endpoint=new URL(url.replace(/\/+$/,"")+"/rest/v1/articles");
      endpoint.searchParams.set("select","slug,published_at");
      endpoint.searchParams.set("status","eq.published");
      endpoint.searchParams.set("order","published_at.desc");
      endpoint.searchParams.set("limit","500");
      const r=await fetch(endpoint,{headers:{apikey:key,Authorization:"Bearer "+key},signal:AbortSignal.timeout(10000)});
      if(r.ok){const rows=await r.json();for(const row of rows||[]){if(typeof row.slug==="string"&&row.slug.trim())urls.push(origin+"/article.html?slug="+encodeURIComponent(row.slug));}}
      else console.warn("Sitemap article query HTTP",r.status);
    }catch(e){console.warn("Sitemap query failed:",e?.message||"unknown error");}
  }
  const xml="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"+"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"+urls.map(u=>"<url><loc>"+u.replace(/&/g,"&amp;")+"</loc></url>").join("")+"</urlset>";
  return {statusCode:200,headers,body:xml};
};
