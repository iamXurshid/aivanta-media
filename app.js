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
 empty.hidden=filtered.length>0;
 if(!filtered.length)articlesEl.innerHTML='<div class="empty">'+(searchTerm?'No stories match your search. Try another keyword.':'No published stories in this category yet.')+'</div>';
}
filterButtons.forEach(btn=>btn.addEventListener('click',()=>{filterButtons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()}));
document.querySelectorAll('[data-nav-filter]').forEach(link=>link.addEventListener('click',()=>{const target=link.dataset.navFilter;const btn=filterButtons.find(b=>b.dataset.filter===target);if(btn)btn.click();}));
searchEl.addEventListener('input',()=>{searchTerm=searchEl.value;render();});
async function loadStories(){
 try{const res=await fetch('/.netlify/functions/articles');if(!res.ok)throw new Error('API request failed (HTTP '+res.status+')');const data=await res.json();stories=Array.isArray(data)?data:[];updateHero();updateTrending();render();}
 catch(err){articlesEl.innerHTML='<div class="empty">Stories could not be loaded right now. Please try again later.</div>';countEl.textContent='News feed unavailable';console.error('AIVANTA article feed:',err);}
}
loadStories();
document.querySelector('#signup').addEventListener('submit',e=>{e.preventDefault();document.querySelector('#formmsg').textContent='Newsletter signup is not connected yet.';});
