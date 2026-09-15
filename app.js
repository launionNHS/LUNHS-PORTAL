const cfg=window.LUNHS_CONFIG||{};
const msg=document.getElementById('loginMsg');
let sb=null;
try{
  if(!cfg.url||!cfg.key) throw new Error("Missing Supabase configuration.");
  sb=window.supabase.createClient(cfg.url,cfg.key);
}catch(e){ console.error(e); }

function show(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const target=document.getElementById(id);
  if(target) target.classList.add('active');
  if(id==='announcements') loadPosts();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-view]');
  if(b){ e.preventDefault(); show(b.dataset.view); }
});
document.getElementById('logoutBtn').onclick=async()=>{ if(sb) await sb.auth.signOut(); setLoggedOut(); show('home'); };

function setLoggedOut(){
  document.getElementById('dashBtn').hidden=true;
  document.getElementById('logoutBtn').hidden=true;
  document.getElementById('portalBtn').hidden=false;
}
function setLoggedIn(){
  document.getElementById('dashBtn').hidden=false;
  document.getElementById('logoutBtn').hidden=false;
  document.getElementById('portalBtn').hidden=true;
}

document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  msg.className=''; msg.textContent='Signing in…';
  if(!sb){msg.className='error';msg.textContent='Supabase configuration could not be loaded.';return;}
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){msg.className='error';msg.textContent=error.message;return;}
  msg.className='ok';msg.textContent='Login successful.';
  await openDashboard(data.user);
});

async function openDashboard(user){
  const {data:p,error}=await sb.from('profiles').select('id,role,display_name,school_id,grade_level,section').eq('id',user.id).single();
  if(error||!p){
    msg.className='error'; msg.textContent='Signed in, but no matching LUNHS profile was found.';
    return;
  }
  setLoggedIn();
  document.getElementById('welcome').textContent=`Welcome, ${p.display_name}`;
  document.getElementById('profileCard').innerHTML=`<b>${esc(p.display_name)}</b><p>Role: ${esc(p.role)}${p.school_id?' • ID: '+esc(p.school_id):''}${p.grade_level?' • Grade '+esc(p.grade_level):''}${p.section?' • '+esc(p.section):''}</p>`;
  if(p.role==='admin') renderAdmin();
  else if(p.role==='student') await renderStudent(user.id);
  else renderTeacher();
  show('dashboard');
}
function renderAdmin(){
  document.getElementById('roleArea').innerHTML=`<div class="card"><h2>Administrator</h2><p>Your administrator login is working. This dashboard is connected to Supabase.</p><div class="admin-actions"><button data-view="announcements">View Announcements</button></div><p><b>Next:</b> secure user creation, teacher assignments, subjects, and grade management can be added without exposing a Supabase secret key.</p></div>`;
}
function renderTeacher(){
  document.getElementById('roleArea').innerHTML=`<div class="card"><h2>Teacher Portal</h2><p>Your teacher account is connected. Grade encoding will be enabled after teacher assignments are configured.</p></div>`;
}
async function renderStudent(uid){
  const {data,error}=await sb.from('grades').select('q1,q2,q3,q4,school_year,subjects(name)').eq('student_id',uid);
  let html='<div class="card"><h2>My Grades</h2>';
  if(error) html+=`<p>${esc(error.message)}</p>`;
  else if(!data?.length) html+='<p>No grades have been posted yet.</p>';
  else html+='<div style="overflow:auto"><table width="100%" cellpadding="10"><tr><th>Subject</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>'+data.map(g=>`<tr><td>${esc(g.subjects?.name||'Subject')}</td><td>${g.q1??'-'}</td><td>${g.q2??'-'}</td><td>${g.q3??'-'}</td><td>${g.q4??'-'}</td></tr>`).join('')+'</table></div>';
  document.getElementById('roleArea').innerHTML=html+'</div>';
}
async function loadPosts(){
  const box=document.getElementById('posts');
  if(!sb){box.innerHTML='<div class="post">Announcements are temporarily unavailable.</div>';return;}
  const {data,error}=await sb.from('posts').select('type,title,body,created_at').eq('published',true).order('created_at',{ascending:false});
  if(error){box.innerHTML=`<div class="post">${esc(error.message)}</div>`;return;}
  box.innerHTML=data?.length?data.map(p=>`<article class="post"><small>${esc(p.type||'Announcement')}</small><h3>${esc(p.title)}</h3><p>${esc(p.body||'')}</p></article>`).join(''):'<div class="post">No announcements posted yet.</div>';
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

(async()=>{
  if(!sb) return;
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user){ await openDashboard(session.user); }
})();