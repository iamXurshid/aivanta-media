const filterButtons=[...document.querySelectorAll('[data-filter]')];
const articlesEl=document.querySelector('#articles');
const empty=document.querySelector('#empty');
const searchEl=document.querySelector('#story-search');
const countEl=document.querySelector('#story-count');
const featuredStrip=document.querySelector('#featured-strip');
const heroTitle=document.querySelector('#hero-title');
const heroLede=document.querySelector('#hero-lede');
const heroLink=document.querySelector('#hero-link');
const heroTag=document.querySelector('#hero-tag');
let stories=[];
const trendTerms=[{name:'AI Agents',keys:['agent','agents','agentic']},{name:'AI Models',keys:['model','models','llm','language model']},{name:'AI Coding',keys:['coding','code generation','developer','programming']},{name:'AI Infrastructure',keys:['chip','gpu','compute','data center','datacenter']},{name:'Robotics',keys:['robot','robotics','humanoid']},{name:'Open Source AI',keys:['open source','open-source','open weight','open weights']},{name:'AI Safety',keys:['safety','alignment','security','risk']},{name:'Multimodal AI',keys:['video generation','image generation','voice model','multimodal']}];
function storyText(s){return [s.title,s.excerpt,s.body].filter(Boolean).join(' ').toLowerCase();}
function updateTrendRadar(){const now=Date.now(),week=7*86400000;const scored=trendTerms.map(t=>{const current=stories.filter(s=>{const d=new Date(s.published_at||0).getTime();return d>now-week&&t.keys.some(k=>storyText(s).includes(k));}).length;const prev=stories.filter(s=>{const d=new Date(s.published_at||0).getTime();return d<=now-week&&d>now-2*week&&t.keys.some(k=>storyText(s).includes(k));}).length;const delta=current-prev;return {...t,current,prev,delta};}).filter(t=>t.current||t.prev).sort((x,y)=>y.current-x.current||y.delta-x.delta).slice(0,6);const el=document.querySelector('#radar-grid');el.innerHTML=scored.map(t=>'<div class="radar-card"><div class="radar-top"><strong>'+escapeHTML(t.name)+'</strong><span class="momentum '+(t.delta>0?'up':t.delta<0?'down':'steady')+'">'+(t.delta>0?'↑ Rising':t.delta<0?'↓ Cooling':'→ Steady')+'</span></div><div class="radar-count">'+t.current+' <small>stories · 7 days</small></div><div class="radar-track"><div class="radar-fill" style="width:'+Math.min(100,t.current/Math.max(1,scored[0]?.current)*100)+'%"></div></div><small class="radar-compare">'+(t.delta>0?'+'+t.delta:t.delta)+' vs previous 7 days</small></div>').join('')||'<div class="empty">Not enough published stories to detect trends yet.</div>';}
function updateDailyBrief(){const top=stories.slice(0,5);document.querySelector('#brief-list').innerHTML=top.map((s,i)=>'<a class="brief-item" href="'+storyLink(s)+'"><span class="brief-index">0'+(i+1)+'</span><div><strong>'+escapeHTML(s.title)+'</strong><p>'+escapeHTML(s.excerpt||'Read the full story for details.')+'</p></div><span class="brief-arrow">↗</span></a>').join('')||'<div class="empty">No published stories yet.</div>';}

const fmtNum=n=>Number(n||0).toLocaleString('en-US');
function updateDataStrip(){const views=stories.reduce((sum,s)=>sum+Number(s.views||0),0);const counts={};stories.forEach(s=>{const c=s.category||'AI';counts[c]=(counts[c]||0)+1;});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];const week=stories.filter(s=>s.published_at&&Date.now()-new Date(s.published_at).getTime()<7*86400000).length;document.querySelector('#data-stories').textContent=fmtNum(stories.length);document.querySelector('#data-views').textContent=fmtNum(views);document.querySelector('#data-category').textContent=top?top[0]:'—';document.querySelector('#data-week').textContent=fmtNum(week);}
function updateMostRead(){const popular=[...stories].sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,5);const el=document.querySelector('#most-read');const list=document.querySelector('#most-read-list');if(!popular.length){el.hidden=true;return;}el.hidden=false;list.innerHTML=popular.map((s,i)=>'<a class="popular-item" href="'+storyLink(s)+'"><span class="popular-rank">0'+(i+1)+'</span><span class="popular-copy"><strong>'+escapeHTML(s.title)+'</strong><small>'+escapeHTML(s.category||'AI')+'</small></span><span class="popular-views">'+fmtNum(s.views)+' <small>reads</small></span></a>').join('');}

const trackedCompanies=[{name:'OpenAI',keys:['openai','chatgpt','gpt-']},{name:'Google',keys:['google','gemini','deepmind']},{name:'Anthropic',keys:['anthropic','claude']},{name:'NVIDIA',keys:['nvidia','cuda']},{name:'Microsoft',keys:['microsoft','copilot']},{name:'Meta',keys:['meta','llama']},{name:'Apple',keys:['apple','siri']},{name:'xAI',keys:['xai','grok']}];
let companyPeriod=7;
function updateCompanyTracker(){const now=Date.now(),days=companyPeriod,limit=days*86400000;const rows=trackedCompanies.map(c=>({...c,count:stories.filter(s=>{const d=new Date(s.published_at||0).getTime();return d>now-limit&&c.keys.some(k=>storyText(s).includes(k));}).length})).filter(c=>c.count).sort((a,b)=>b.count-a.count);const el=document.querySelector('#company-grid');el.innerHTML=rows.map((c,i)=>'<div class="company-card"><div class="company-rank">0'+(i+1)+'</div><div class="company-main"><strong>'+escapeHTML(c.name)+'</strong><span class="company-track"><i style="width:'+Math.min(100,c.count/Math.max(1,rows[0]?.count)*100)+'%"></i></span></div><div class="company-mentions"><b>'+c.count+'</b><small>mentions</small></div></div>').join('')||'<div class="empty">No tracked company mentions in this period.</div>';document.querySelectorAll('[data-company-period]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.companyPeriod)===companyPeriod);});}
function updateHeatmap(){const now=new Date(),cats=['Models','Agents','Tools','Robotics','Tech','AI'];const dayLabels=[];for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);dayLabels.push(d);}const matrix=dayLabels.map(d=>cats.map(cat=>stories.filter(s=>{const p=new Date(s.published_at||0);return p.toDateString()===d.toDateString()&&(cat==='AI'?String(s.category||'AI').toLowerCase()==='ai':String(s.category||'').toLowerCase()===cat.toLowerCase());}).length));const max=Math.max(1,...matrix.flat());const el=document.querySelector('#heatmap-wrap');el.innerHTML='<div class="heatmap-grid" style="--heat-cols:'+cats.length+'"><div class="heatmap-label"></div>'+cats.map(c=>'<div class="heatmap-label">'+escapeHTML(c)+'</div>').join('')+dayLabels.map((d,i)=>'<div class="heatmap-day">'+d.toLocaleDateString('en',{weekday:'short',day:'numeric'})+'</div>'+matrix[i].map(v=>'<div class="heat-cell" title="'+v+' '+cats[matrix[i].indexOf(v)]+' stories" style="--heat:'+Math.round(v/max*100)+'%"><span>'+v+'</span></div>').join('')).join('')+'</div>';}
document.querySelectorAll('[data-company-period]').forEach(b=>b.addEventListener('click',()=>{companyPeriod=Number(b.dataset.companyPeriod);updateCompanyTracker();}));
let activeFilter='All';
let searchTerm='';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeImage(value){try{const u=new URL(value||'');return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return ''}}
function storyLink(s){return s.slug?'/article.html?slug='+encodeURIComponent(s.slug):'#'}
function dateLabel(value,style='short'){return value?new Date(value).toLocaleDateString('en',{year:'numeric',month:style==='long'?'long':'short',day:'numeric'}):''}
function updateHero(){
 const story=stories[0];
 if(!story)return;
 heroTag.textContent='LATEST STORY · '+String(story.category||'AI').toUpperCase();
 heroTitle.innerHTML=escapeHTML(story.title);
 heroLede.textContent=story.excerpt||'The latest intelligence, decoded.';
 heroLink.href=storyLink(story);
 heroLink.innerHTML='Read the story <b>↗</b>';
 const image=safeImage(story.image_url);
 const orb=document.querySelector('#hero-orb');
 if(image){orb.innerHTML='<img class="hero-image" src="'+escapeHTML(image)+'" alt="" loading="lazy">';orb.classList.add('has-image');}
}
function updateTrending(){
 const top=stories.slice(0,3);
 featuredStrip.hidden=!top.length;
 featuredStrip.innerHTML=top.map((s,i)=>'<a class="trend" href="'+storyLink(s)+'"><span class="trend-number">0'+(i+1)+'</span><span><small>RECENT</small><strong>'+escapeHTML(s.title)+'</strong></span></a>').join('');
}
function render(){
 const filtered=stories.filter(s=>{
  const categoryMatch=activeFilter==='All'||String(s.category||'AI').toLowerCase()===activeFilter.toLowerCase();
  const query=searchTerm.trim().toLowerCase();
  const searchMatch=!query||[s.title,s.excerpt,s.body,s.category].some(v=>String(v||'').toLowerCase().includes(query));
  return categoryMatch&&searchMatch;
 });
 countEl.textContent=filtered.length+' '+(filtered.length===1?'story':'stories');
 articlesEl.innerHTML=filtered.map(s=>{
  const category=escapeHTML(s.category||'AI');
  const title=escapeHTML(s.title);
  const excerpt=escapeHTML(s.excerpt||'');
  const date=dateLabel(s.published_at);
  const image=safeImage(s.image_url);
  const art=image?'<div class="art story-image"><img src="'+escapeHTML(image)+'" alt="'+title+'" loading="lazy"></div>':'<div class="art art1">✦</div>';
  return '<article class="story">'+art+'<div class="meta">'+category.toUpperCase()+(date?' · '+escapeHTML(date):'')+'</div><h3><a href="'+storyLink(s)+'">'+title+'</a></h3><p>'+excerpt+'</p><a class="card-read" href="'+storyLink(s)+'">Read story <span>↗</span></a></article>';
 }).join('');
 empty.hidden=true;
 if(!filtered.length)articlesEl.innerHTML='<div class="empty">'+(searchTerm?'No stories match your search. Try another keyword.':'No published stories in this category yet.')+'</div>';
}
filterButtons.forEach(btn=>btn.addEventListener('click',()=>{filterButtons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()}));
document.querySelectorAll('[data-nav-filter]').forEach(link=>link.addEventListener('click',()=>{const target=link.dataset.navFilter;const btn=filterButtons.find(b=>b.dataset.filter===target);if(btn)btn.click();}));
searchEl.addEventListener('input',()=>{searchTerm=searchEl.value;render();});
async function loadStories(){
 try{const res=await fetch('/.netlify/functions/articles');if(!res.ok)throw new Error('API request failed (HTTP '+res.status+')');const data=await res.json();stories=Array.isArray(data)?data:[];updateHero();updateTrending();updateDataStrip();updateMostRead();updateTrendRadar();updateDailyBrief();updateCompanyTracker();updateHeatmap();render();}
 catch(err){articlesEl.innerHTML='<div class="empty">Stories could not be loaded right now. Please try again later.</div>';countEl.textContent='News feed unavailable';console.error('AIVANTA article feed:',err);}
}
loadStories();
document.querySelector('#signup').addEventListener('submit',e=>{e.preventDefault();document.querySelector('#formmsg').textContent='Newsletter signup is not connected yet.';});
