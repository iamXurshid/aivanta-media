const filterButtons=[...document.querySelectorAll('[data-filter]')];
const articlesEl=document.querySelector('#articles');
const empty=document.querySelector('#empty');
let stories=[];
let activeFilter='All';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const filtered=stories.filter(s=>activeFilter==='All'||String(s.category||'').toLowerCase()===activeFilter.toLowerCase());
 articlesEl.innerHTML=filtered.map(s=>{
   const category=escapeHTML(s.category||'AI');
   const title=escapeHTML(s.title);
   const excerpt=escapeHTML(s.excerpt||'');
   const date=s.published_at?new Date(s.published_at).toLocaleDateString('en',{year:'numeric',month:'short',day:'numeric'}):'';
   const link=s.slug?'/article.html?slug='+encodeURIComponent(s.slug):'#';
   let image='';try{const u=new URL(s.image_url||'');if(['http:','https:'].includes(u.protocol))image=u.href;}catch{}
   const art=image?'<div class="art story-image"><img src="'+escapeHTML(image)+'" alt="'+title+'" loading="lazy"></div>':'<div class="art art1">✦</div>';
   return '<article class="story" data-category="'+category+'">'+art+'<div class="meta">'+category.toUpperCase()+(date?' · '+escapeHTML(date):'')+'</div><h3><a href="'+link+'">'+title+'</a></h3><p>'+excerpt+'</p></article>';
 }).join('');
 empty.hidden=filtered.length>0;
 if(!filtered.length)articlesEl.innerHTML='<div class="empty">No published stories in this category yet.</div>';
}
filterButtons.forEach(btn=>btn.addEventListener('click',()=>{filterButtons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()}));
async function loadStories(){
 try{const res=await fetch('/.netlify/functions/articles');if(!res.ok)throw new Error('API request failed');const data=await res.json();stories=Array.isArray(data)?data:[];render();}
 catch(err){articlesEl.innerHTML='<div class="empty">Stories could not be loaded right now. Please try again later.</div>';console.error('AIVANTA article feed:',err);}
}
loadStories();
document.querySelector('#signup').addEventListener('submit',e=>{e.preventDefault();document.querySelector('#formmsg').textContent='Newsletter signup will be enabled in a future update.';});
