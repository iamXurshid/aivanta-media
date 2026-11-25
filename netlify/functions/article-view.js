// Increment a published article's view counter securely (service role stays server-side).
exports.handler = async function(event) {
  const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
  if(event.httpMethod==="OPTIONS")return {statusCode:204,headers,body:""};
  if(event.httpMethod!=="POST")return {statusCode:405,headers,body:JSON.stringify({error:"Method not allowed"})};
  let slug="";
  try{slug=JSON.parse(event.body||"{}").slug||"";}catch{return {statusCode:400,headers,body:JSON.stringify({error:"Invalid JSON"})};}
  if(typeof slug!=="string"||!slug||slug.length>120||!/^[a-z0-9-]+$/.test(slug))return {statusCode:400,headers,body:JSON.stringify({error:"Invalid slug"})};
  const url=(process.env.SUPABASE_URL||"").replace(/\/+$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  if(!url||!key)return {statusCode:503,headers,body:JSON.stringify({error:"View counter not configured"})};
  try{
    const r=await fetch(url+"/rest/v1/rpc/increment_article_views",{method:"POST",headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_slug:slug}),signal:AbortSignal.timeout(8000)});
    if(!r.ok){console.error("View counter RPC failed",r.status);return {statusCode:502,headers,body:JSON.stringify({error:"View counter unavailable"})};}
    const views=await r.json();return {statusCode:200,headers,body:JSON.stringify({views})};
  }catch(e){console.error("View counter error",e?.message);return {statusCode:502,headers,body:JSON.stringify({error:"View counter unavailable"})};}
};
