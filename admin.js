// AIVANTA DEMO ADMIN — temporary client-side test only. Not secure for production.
const $=id=>document.getElementById(id);
const DEMO_EMAIL='xurshid@aivanta.com';
const DEMO_PASSWORD='demo2026';
const STORAGE_KEY='aivanta_demo_articles_v1';
const slugify=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function msg(id,t){$(id).textContent=t}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getArticles(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
function putArticles(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function showDash(){$('authbox').hidden=true;$('dash').hidden=false;loadList()}
$('login').addEventListener('submit',e=>{e.preventDefault();msg('authmsg','Checking…');if($('email').value.trim().toLowerCase()===DEMO_EMAIL&&$('password').value===DEMO_PASSWORD){sessionStorage.setItem('aivanta_demo_admin','yes');msg('authmsg','');showDash()}else msg('authmsg','Email yoki parol noto‘g‘ri.')});
$('logout').onclick=()=>{sessionStorage.removeItem('aivanta_demo_admin');$('authbox').hidden=false;$('dash').hidden=true;$('password').value='';msg('authmsg','Signed out.')};
function loadList(){const data=getArticles();msg('status',data.length+' demo article(s) · saved only on this browser');$('list').innerHTML=data.map(a=>'<div class="admin-item"><div><h3>'+esc(a.title)+'</h3><small>'+esc(a.category)+' · '+esc(a.status)+' · '+esc(a.slug)+'</small></div><div class="admin-item-actions"><button data-edit="'+a.id+'">Edit</button><button data-del="'+a.id+'" class="danger">Delete</button></div></div>').join('')||'<div class="empty">No demo articles yet.</div>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del))}
function clearForm(){$('articleId').value='';$('title').value='';$('slug').value='';$('excerpt').value='';$('category').value='AI';$('body').value='';$('sources').value='';$('state').value='draft';$('editorTitle').textContent='Create article';msg('editmsg','')}
$('new').onclick=clearForm;$('cancel').onclick=clearForm;
function edit(id){const a=getArticles().find(x=>x.id===id);if(!a)return;$('articleId').value=a.id;$('title').value=a.title;$('slug').value=a.slug;$('excerpt').value=a.excerpt||'';$('category').value=a.category||'AI';$('body').value=a.body||'';$('sources').value=(a.source_urls||[]).join(', ');$('state').value=a.status;$('editorTitle').textContent='Edit article';window.scrollTo({top:0,behavior:'smooth'})}
function del(id){if(!confirm('Delete this demo article?'))return;putArticles(getArticles().filter(a=>a.id!==id));loadList()}
$('editor').addEventListener('submit',e=>{e.preventDefault();msg('editmsg','Saving demo…');const title=$('title').value.trim();const id=$('articleId').value||String(Date.now());const articles=getArticles();const payload={id,title,slug:slugify($('slug').value||title),excerpt:$('excerpt').value.trim(),category:$('category').value,body:$('body').value.trim(),source_urls:$('sources').value.split(',').map(x=>x.trim()).filter(Boolean),status:$('state').value,published_at:$('state').value==='published'?new Date().toISOString():null};const idx=articles.findIndex(a=>a.id===id);if(idx>=0)articles[idx]=payload;else articles.unshift(payload);putArticles(articles);msg('editmsg','Saved locally in demo mode.');clearForm();loadList()});
if(sessionStorage.getItem('aivanta_demo_admin')==='yes')showDash();
