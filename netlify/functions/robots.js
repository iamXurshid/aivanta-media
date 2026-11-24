exports.handler = async function(event) {
 const host=event.headers?.host||event.headers?.Host||"";
 if(!host||!/^[a-z0-9.-]+(?::\d+)?$/i.test(host))return {statusCode:400,body:"Invalid host"};
 const body="User-agent: *\nAllow: /\nDisallow: /.netlify/functions/\nSitemap: https://"+host+"/sitemap.xml\n";
 return {statusCode:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"},body};
};
