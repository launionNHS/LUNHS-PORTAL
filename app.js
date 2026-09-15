const C=window.LUNHS_CONFIG, sb=window.supabase.createClient(C.url,C.key); let me=null;
function normalizeSchoolId(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'-')}
function internalEmail(id){return normalizeSchoolId(id)+'@accounts.lunhs.local'}
function loginIdentifier(value){
  const v=String(value||'').trim();
  return v.includes('@') ? v.toLowerCase() : internalEmail(v);
}
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+id)?.classList.add('active');if(id==='announcements')loadPublicPosts();scrollTo(0,0)}
document.addEventListener('click',e=>{let b=e.target.closest('[data-view]');if(b)show(b.dataset.view);let t=e.target.closest('[data-tab]');if(t){document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderAdminTab(t.dataset.tab)}})
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginMsg').textContent='Signing in…';let {data,error}=await sb.auth.signInWithPassword({email:loginIdentifier($('#schoolLogin').value),password:$('#password').value});if(error){$('#loginMsg').className='error';$('#loginMsg').textContent=error.message;return}await openDashboard(data.user)};
async function profile(uid){return await sb.from('profiles').select('*').eq('id',uid).single()}
async function openDashboard(u){let {data:p,error}=await profile(u.id);if(error||!p){$('#loginMsg').className='error';$('#loginMsg').textContent='Signed in, but profile could not be read: '+(error?.message||'not found');return}me=p;$('#loginNav').hidden=true;$('#dashNav').hidden=false;$('#logout').hidden=false;$('#welcome').textContent='Welcome, '+p.display_name;$('#identity').textContent=`${p.role.toUpperCase()} • ${p.school_id||''}`;if(p.role==='admin')renderAdmin();if(p.role==='teacher')renderTeacher();if(p.role==='student')renderStudent();show('dashboard')}
async function loadPublicPosts(){let {data,error}=await sb.from('posts').select('*').eq('published',true).order('created_at',{ascending:false});$('#publicPosts').innerHTML=error?`<p class=error>${esc(error.message)}</p>`:(data?.length?data.map(p=>`<article class=post><small>${esc(p.type)}</small><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></article>`).join(''):'<article>No announcements yet.</article>')}
function renderAdmin(){$('#dashboardBody').innerHTML=`<div class=tabs><button class="tab active" data-tab=overview>Overview</button><button class=tab data-tab=posts>Announcements</button><button class=tab data-tab=subjects>Subjects</button><button class=tab data-tab=profiles>Users</button><button class=tab data-tab=assignments>Assignments</button><button class=tab data-tab=grades>Grades</button></div><div id=adminContent></div>`;renderAdminTab('overview')}
async function renderAdminTab(tab){let box=$('#adminContent');if(!box)return;box.innerHTML='Loading…';
if(tab==='overview'){let [p,s,g,po]=await Promise.all([sb.from('profiles').select('id',{count:'exact',head:true}),sb.from('subjects').select('id',{count:'exact',head:true}),sb.from('grades').select('id',{count:'exact',head:true}),sb.from('posts').select('id',{count:'exact',head:true})]);box.innerHTML=`<div class=stats><div class=stat><b>${p.count??0}</b><p>Profiles</p></div><div class=stat><b>${s.count??0}</b><p>Subjects</p></div><div class=stat><b>${g.count??0}</b><p>Grade Records</p></div><div class=stat><b>${po.count??0}</b><p>Posts</p></div></div><div class=notice>Auth accounts are created securely in Supabase Authentication. This browser portal never uses a secret/service-role key.</div>`}
if(tab==='posts'){let {data}=await sb.from('posts').select('*').order('created_at',{ascending:false});box.innerHTML=`<div class=panel><h2>New Announcement / Event</h2><form id=postForm><div class=formgrid><label>Type<select id=ptype><option>Announcement</option><option>Event</option></select></label><label>Title<input id=ptitle required></label></div><label>Details<textarea id=pbody></textarea></label><button class=primary>Publish</button><span id=pmsg></span></form></div><div class=tablewrap><table class=data><tr><th>Type</th><th>Title</th><th>Date</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.title)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join('')}</table></div>`;$('#postForm').onsubmit=async e=>{e.preventDefault();let {error}=await sb.from('posts').insert({type:$('#ptype').value,title:$('#ptitle').value,body:$('#pbody').value,published:true,author_id:me.id});$('#pmsg').textContent=error?error.message:' Published!';if(!error)renderAdminTab('posts')}}
if(tab==='subjects'){let {data}=await sb.from('subjects').select('*').order('grade_level').order('name');box.innerHTML=`<div class=panel><h2>Add Subject</h2><form id=subForm class=formgrid><label>Subject<input id=sname required></label><label>Grade Level<input id=sgrade placeholder="8"></label><label>&nbsp;<button class=primary>Add Subject</button></label></form><p id=smsg></p></div><div class=tablewrap><table class=data><tr><th>Subject</th><th>Grade Level</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.grade_level)}</td></tr>`).join('')}</table></div>`;$('#subForm').onsubmit=async e=>{e.preventDefault();let {error}=await sb.from('subjects').insert({name:$('#sname').value,grade_level:$('#sgrade').value});$('#smsg').textContent=error?error.message:'Subject added.';if(!error)renderAdminTab('subjects')}}
if(tab==='profiles'){let {data,error}=await sb.from('profiles').select('display_name,school_id,role,grade_level,section').order('display_name');box.innerHTML=`<div class=panel><h2>Create Student / Teacher Account</h2><form id=userForm><div class=formgrid><label>Role<select id=urole><option value=student>Student</option><option value=teacher>Teacher</option></select></label><label>Full Name<input id=uname required></label><label>School ID / LRN<input id=usid autocomplete="off" required></label><label>Temporary Password<input id=upass type=password minlength=8 required></label><label>Grade Level<input id=ugrade placeholder="8"></label><label>Section<input id=usection placeholder="Section name"></label></div><button class=primary>Create Account</button><p id=umsg></p></form></div><div class=tablewrap><table class=data><tr><th>Name</th><th>ID</th><th>Role</th><th>Grade</th><th>Section</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.display_name)}</td><td>${esc(x.school_id)}</td><td>${esc(x.role)}</td><td>${esc(x.grade_level)}</td><td>${esc(x.section)}</td></tr>`).join('')}</table></div>${error?`<p class=error>${esc(error.message)}</p>`:''}`;$('#userForm').onsubmit=async e=>{e.preventDefault();let m=$('#umsg');m.className='';m.textContent='Creating account…';const payload={role:$('#urole').value,display_name:$('#uname').value.trim(),school_id:$('#usid').value.trim(),email:internalEmail($('#usid').value.trim()),password:$('#upass').value,grade_level:$('#ugrade').value.trim()||null,section:$('#usection').value.trim()||null};
let {data:r,error:fnError}=await sb.functions.invoke('create-school-user',{body:payload});
if(fnError){
  let detail=fnError.message||'Account creation failed.';
  try{if(fnError.context&&typeof fnError.context.json==='function'){let body=await fnError.context.json();detail=body.error||body.message||detail}}catch(_){}
  m.className='error';m.textContent=detail;return
}
if(!r?.ok){m.className='error';m.textContent=r?.error||'Account creation failed.';return}
m.className='ok';m.textContent=r.message||'Account and LUNHS profile created successfully.';
setTimeout(()=>renderAdminTab('profiles'),700)}}
if(tab==='assignments'){let [a,t,s]=await Promise.all([sb.from('teacher_assignments').select('id,section,teacher_id,subjects(name)'),sb.from('profiles').select('id,display_name,school_id').eq('role','teacher').order('display_name'),sb.from('subjects').select('id,name,grade_level').order('name')]);box.innerHTML=`<div class=panel><h2>Assign Teacher</h2><form id=assignForm class=formgrid><label>Teacher<select id=ateacher required><option value="">Select teacher</option>${(t.data||[]).map(x=>`<option value="${x.id}">${esc(x.display_name)} (${esc(x.school_id)})</option>`).join('')}</select></label><label>Subject<select id=asubject required><option value="">Select subject</option>${(s.data||[]).map(x=>`<option value="${x.id}">${esc(x.name)}${x.grade_level?' - Grade '+esc(x.grade_level):''}</option>`).join('')}</select></label><label>Section<input id=asection required></label><label>&nbsp;<button class=primary>Assign</button></label></form><p id=amsg></p></div><div class=tablewrap><table class=data><tr><th>Teacher UUID</th><th>Subject</th><th>Section</th></tr>${(a.data||[]).map(x=>`<tr><td>${esc(x.teacher_id)}</td><td>${esc(x.subjects?.name)}</td><td>${esc(x.section)}</td></tr>`).join('')}</table></div>`;$('#assignForm').onsubmit=async e=>{e.preventDefault();let {error}=await sb.from('teacher_assignments').insert({teacher_id:$('#ateacher').value,subject_id:Number($('#asubject').value),section:$('#asection').value.trim()});$('#amsg').textContent=error?error.message:'Teacher assigned.';if(!error)renderAdminTab('assignments')}}
if(tab==='grades'){let {data,error}=await sb.from('grades').select('school_year,section,q1,q2,q3,q4,subjects(name),student_id').limit(100);box.innerHTML=`<div class=tablewrap><table class=data><tr><th>Student UUID</th><th>Subject</th><th>Section</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.student_id)}</td><td>${esc(x.subjects?.name)}</td><td>${esc(x.section)}</td><td>${x.q1??'-'}</td><td>${x.q2??'-'}</td><td>${x.q3??'-'}</td><td>${x.q4??'-'}</td></tr>`).join('')}</table></div>${error?`<p class=error>${esc(error.message)}</p>`:''}`}
}
async function renderStudent(){let {data,error}=await sb.from('grades').select('q1,q2,q3,q4,school_year,subjects(name)').eq('student_id',me.id);$('#dashboardBody').innerHTML=`<div class=panel><h2>My Grades</h2>${error?`<p class=error>${esc(error.message)}</p>`:`<div class=tablewrap><table class=data><tr><th>Subject</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr>${(data||[]).map(x=>`<tr><td>${esc(x.subjects?.name)}</td><td>${x.q1??'-'}</td><td>${x.q2??'-'}</td><td>${x.q3??'-'}</td><td>${x.q4??'-'}</td></tr>`).join('')}</table></div>`}</div>`}
async function renderTeacher(){
 let {data,error}=await sb.from('teacher_assignments').select('id,section,subject_id,subjects(name)').eq('teacher_id',me.id);
 $('#dashboardBody').innerHTML=`<div class=panel><h2>My Teaching Assignments</h2>${error?`<p class=error>${esc(error.message)}</p>`:`<label>Select Class<select id=tclass><option value="">Choose subject / section</option>${(data||[]).map(x=>`<option value="${x.subject_id}|${esc(x.section)}">${esc(x.subjects?.name)} — ${esc(x.section)}</option>`).join('')}</select></label><div id=gradeArea></div>`}</div>`;
 if($('#tclass'))$('#tclass').onchange=loadTeacherClass;
}
async function loadTeacherClass(){
 let v=$('#tclass').value;if(!v){$('#gradeArea').innerHTML='';return} let [sid,section]=v.split('|');
 let {data:students,error}=await sb.from('profiles').select('id,display_name,school_id').eq('role','student').eq('section',section).order('display_name');
 if(error){$('#gradeArea').innerHTML=`<p class=error>${esc(error.message)}</p>`;return}
 let gm={}; if(students?.length){let {data:g}=await sb.from('grades').select('*').eq('subject_id',Number(sid)).in('student_id',students.map(x=>x.id));(g||[]).forEach(x=>gm[x.student_id]=x)}
 $('#gradeArea').innerHTML=`<h3>Class List — ${esc(section)}</h3><p class=notice>Enter 60–100. Leave a quarter blank if not yet available.</p><div class=tablewrap><table class=data><tr><th>Student</th><th>ID/LRN</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th></th></tr>${(students||[]).map(s=>{let g=gm[s.id]||{};return `<tr data-student="${s.id}"><td>${esc(s.display_name)}</td><td>${esc(s.school_id)}</td>${['q1','q2','q3','q4'].map(q=>`<td><input class="${q}" type=number min=60 max=100 step=.01 value="${g[q]??''}"></td>`).join('')}<td><button class=primary data-savegrade="${s.id}">Save</button></td></tr>`}).join('')}</table></div>${students?.length?'':'<p>No students found in this section.</p>'}`;
 document.querySelectorAll('[data-savegrade]').forEach(b=>b.onclick=()=>saveGrade(b.dataset.savegrade,Number(sid),section));
}
async function saveGrade(studentId,subjectId,section){
 let row=document.querySelector(`tr[data-student="${studentId}"]`),v={};
 for(let q of ['q1','q2','q3','q4']){let x=row.querySelector('.'+q).value;v[q]=x===''?null:Number(x);if(v[q]!==null&&(v[q]<60||v[q]>100)){alert('Grades must be from 60 to 100.');return}}
 let {error}=await sb.from('grades').upsert({student_id:studentId,subject_id:subjectId,teacher_id:me.id,section,school_year:'2026-2027',...v},{onConflict:'student_id,subject_id,school_year'});
 alert(error?'Could not save: '+error.message:'Grade saved successfully.');
}
(async()=>{let {data:{session}}=await sb.auth.getSession();if(session?.user)await openDashboard(session.user)})();




document.addEventListener('click', async (ev)=>{
  const btn=ev.target.closest?.('.resetUserPassword');
  if(!btn)return;
  const name=btn.dataset.name;
  const p=prompt(`Enter a NEW temporary password for ${name} (minimum 8 characters):`);
  if(p===null)return;
  if(p.length<8){alert('Password must be at least 8 characters.');return;}
  const c=prompt(`Re-enter the new password for ${name}:`);
  if(c!==p){alert('Passwords do not match. Nothing was changed.');return;}
  btn.disabled=true; const oldText=btn.textContent; btn.textContent='Resetting...';
  const {data,error}=await sb.functions.invoke('reset-school-user-password',{body:{user_id:btn.dataset.id,new_password:p}});
  btn.disabled=false; btn.textContent=oldText;
  if(error){
    let detail=error.message||'Password reset failed.';
    try{if(error.context&&typeof error.context.json==='function'){const b=await error.context.json();detail=b.error||b.message||detail}}catch(_){}
    alert(detail); return;
  }
  if(!data?.ok){alert(data?.error||'Password reset failed.');return;}
  alert(data.message+' The user can now sign in with the same School ID/LRN and the new password.');
});


// v10.5 — password management without recovery email.
async function changeMyAdminPassword(){
  const p=prompt('Enter your NEW Administrator password (minimum 8 characters):');
  if(p===null)return;
  if(p.length<8){alert('Password must be at least 8 characters.');return;}
  const c=prompt('Re-enter the new Administrator password:');
  if(c!==p){alert('Passwords do not match. Nothing was changed.');return;}
  const {error}=await sb.auth.updateUser({password:p});
  if(error){alert(error.message);return;}
  alert('Administrator password changed successfully. Use the new password the next time you sign in.');
}

document.addEventListener('click',async(ev)=>{
  const b=ev.target.closest?.('#changeAdminPassword');
  if(!b)return;
  await changeMyAdminPassword();
});

function addAdminPasswordCard(){
  if(!me || me.role!=='admin')return;
  const host=document.querySelector('#adminContent') || document.querySelector('main');
  if(!host || document.getElementById('adminPasswordCard'))return;
  const d=document.createElement('div');
  d.id='adminPasswordCard';
  d.className='card';
  d.innerHTML='<h3>My Account</h3><p>Change the signed-in Administrator password without email recovery.</p><button id="changeAdminPassword" type="button">Change My Password</button>';
  host.appendChild(d);
}
setInterval(addAdminPasswordCard,1200);

const adminForgot=document.getElementById('adminForgot');
if(adminForgot) adminForgot.onclick=async(e)=>{
  e.preventDefault();
  const email=String(document.getElementById('schoolLogin')?.value||'').trim();
  if(!email.includes('@')){alert('Enter the Administrator email in the login box first.');return;}
  const redirectTo=new URL('admin-reset-password.html',window.location.href).href;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  if(error){alert(error.message);return;}
  alert('Administrator recovery email requested. Use only the newest recovery email.');
};

async function selfChangePassword(){
  if(!me || !['student','teacher'].includes(me.role))return;
  const current=prompt('Enter your CURRENT password:'); if(current===null)return;
  const schoolId=me.school_id;
  const authEmail=internalEmail(schoolId);
  const {error:verifyError}=await sb.auth.signInWithPassword({email:authEmail,password:current});
  if(verifyError){alert('Current password is incorrect.');return;}
  const np=prompt('Enter your NEW password (minimum 8 characters):'); if(np===null)return;
  if(np.length<8){alert('New password must be at least 8 characters.');return;}
  const cp=prompt('Re-enter your NEW password:');
  if(cp!==np){alert('Passwords do not match. Nothing was changed.');return;}
  const {error}=await sb.auth.updateUser({password:np});
  if(error){alert(error.message);return;}
  alert('Your password was changed successfully.');
}
document.addEventListener('click',async(e)=>{
  if(e.target.closest?.('#selfChangePassword')) await selfChangePassword();
});
function addSelfPasswordCard(){
  if(!me || !['student','teacher'].includes(me.role))return;
  const host=document.querySelector('main');
  if(!host || document.getElementById('selfPasswordCard'))return;
  const d=document.createElement('div'); d.id='selfPasswordCard'; d.className='card';
  d.innerHTML='<h3>My Account</h3><p>Change your own password.</p><button id="selfChangePassword" type="button">Change My Password</button>';
  host.appendChild(d);
}
setInterval(addSelfPasswordCard,1200);


// v10.7 — reliable Admin password reset panel.
async function renderAdminPasswordResetPanel(){
  if(!me || me.role!=='admin') return;
  const host=document.querySelector('#adminContent') || document.querySelector('main');
  if(!host || document.getElementById('adminResetPanel')) return;

  const {data:users,error}=await sb.from('profiles')
    .select('id,display_name,role,school_id,grade_level,section')
    .in('role',['student','teacher'])
    .order('display_name');

  const panel=document.createElement('section');
  panel.id='adminResetPanel';
  panel.className='card';
  if(error){
    panel.innerHTML='<h3>Password Management</h3><p>Could not load Student/Teacher accounts: '+error.message+'</p>';
  }else{
    panel.innerHTML=`<h3>Password Management</h3>
      <p>Administrator can reset Student and Teacher passwords without email.</p>
      <label>Select Account
        <select id="resetTarget">
          <option value="">Choose Student/Teacher</option>
          ${(users||[]).map(u=>`<option value="${u.id}">${u.display_name} — ${u.role} — ${u.school_id||''}</option>`).join('')}
        </select>
      </label>
      <label>New Password<input id="adminNewPass" type="password" minlength="8" autocomplete="new-password"></label>
      <label>Confirm Password<input id="adminConfirmPass" type="password" minlength="8" autocomplete="new-password"></label>
      <button id="adminResetPasswordBtn" type="button">Reset Selected User Password</button>
      <p id="adminResetMsg"></p>`;
  }
  host.appendChild(panel);
}

document.addEventListener('click',async(e)=>{
  const btn=e.target.closest?.('#adminResetPasswordBtn');
  if(!btn)return;
  const target=document.getElementById('resetTarget')?.value||'';
  const p=document.getElementById('adminNewPass')?.value||'';
  const c=document.getElementById('adminConfirmPass')?.value||'';
  const msg=document.getElementById('adminResetMsg');
  if(!target){msg.textContent='Select a Student or Teacher account.';return;}
  if(p.length<8){msg.textContent='Password must be at least 8 characters.';return;}
  if(p!==c){msg.textContent='Passwords do not match.';return;}

  btn.disabled=true; msg.textContent='Resetting password...';
  const {data,error}=await sb.functions.invoke('reset-school-user-password',{
    body:{user_id:target,new_password:p}
  });
  btn.disabled=false;
  if(error){
    let detail=error.message||'Password reset failed.';
    try{
      if(error.context && typeof error.context.json==='function'){
        const body=await error.context.json();
        detail=body.error||body.message||detail;
      }
    }catch(_){}
    msg.textContent=detail; return;
  }
  if(!data?.ok){msg.textContent=data?.error||'Password reset failed.';return;}
  msg.textContent=data.message||'Password reset successfully.';
  document.getElementById('adminNewPass').value='';
  document.getElementById('adminConfirmPass').value='';
});

setInterval(renderAdminPasswordResetPanel,1000);

// v10.8 home scroll animation
(function(){
  const reveal=()=>document.querySelectorAll('.reveal').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.top < innerHeight-70) el.classList.add('visible');
  });
  addEventListener('scroll',reveal,{passive:true}); addEventListener('load',reveal); reveal();
})();


// v10.9 media hub interactions, filters, transitions, and media rendering.
(function(){
  const grid=document.getElementById('mediaGrid'), chips=document.getElementById('mediaChips'),
        search=document.getElementById('mediaSearch'), count=document.getElementById('mediaCount'),
        featured=document.getElementById('featuredMedia');
  if(!grid)return;

  function youtubeEmbed(url){
    try{
      const u=new URL(url);
      let id='';
      if(u.hostname.includes('youtu.be')) id=u.pathname.slice(1);
      else if(u.hostname.includes('youtube.com')) id=u.searchParams.get('v')||u.pathname.split('/').pop();
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }catch(_){return ''}
  }
  function showFeatured(card){
    const title=card.dataset.title||'LUNHS Media', type=card.dataset.type||'School Media',
          media=card.dataset.media||'', kind=card.dataset.kind||'';
    let visual='<div class="featured-placeholder"><span>▶</span><b>Featured LUNHS Media</b><small>No media attached yet</small></div>';
    const yt=youtubeEmbed(media);
    if(yt) visual=`<iframe src="${yt}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    else if(kind==='video' && media) visual=`<video src="${media}" controls playsinline></video>`;
    else if(media) visual=`<img src="${media}" alt="${title}">`;
    featured.querySelector('.featured-screen').innerHTML=visual;
    featured.querySelector('.featured-copy').innerHTML=`<span class="tag">${type}</span><h3>${title}</h3><p>${card.dataset.body||'A story from the La Union National High School community.'}</p>`;
    featured.scrollIntoView({behavior:'smooth',block:'center'});
  }
  grid.addEventListener('click',e=>{const card=e.target.closest('.media-card');if(card)showFeatured(card)});
  function filter(){
    const active=chips?.querySelector('.active')?.dataset.filter||'All', q=(search?.value||'').toLowerCase();
    let n=0;
    grid.querySelectorAll('.media-card').forEach(c=>{
      const ok=(active==='All'||c.dataset.type===active) && (!q||(c.dataset.title||'').toLowerCase().includes(q)||(c.dataset.body||'').toLowerCase().includes(q));
      c.classList.toggle('hidden',!ok); if(ok)n++;
    }); if(count)count.textContent=`${n} item${n===1?'':'s'}`;
  }
  chips?.addEventListener('click',e=>{if(!e.target.matches('button'))return;chips.querySelectorAll('button').forEach(b=>b.classList.remove('active'));e.target.classList.add('active');filter()});
  search?.addEventListener('input',filter); filter();

  // Load published posts into the media feed. Existing posts remain compatible.
  async function loadMediaPosts(){
    if(typeof sb==='undefined')return;
    const {data,error}=await sb.from('posts').select('*').eq('published',true).order('created_at',{ascending:false});
    if(error||!data)return;
    data.forEach(p=>{
      const type=p.category||p.type||'Event', media=p.media_url||'', thumb=p.thumbnail_url||media||'',
            kind=p.media_type||((media.match(/\.(mp4|webm|mov)(\?|$)/i))?'video':'image');
      const a=document.createElement('article');a.className='media-card';
      a.dataset.type=type;a.dataset.title=p.title||'LUNHS Update';a.dataset.body=p.body||'';a.dataset.media=media;a.dataset.kind=kind;
      const visual=thumb?`<img src="${thumb}" alt="">`:'';
      a.innerHTML=`<div class="thumb">${visual}<span class="${kind==='video'?'play-badge':'photo-badge'}">${kind==='video'?'▶':'▧'}</span><span class="duration">${type}</span></div><div class="media-meta"><img src="lunhs-logo.png" alt=""><div><h4>${p.title||'LUNHS Update'}</h4><p>LUNHS • ${type}</p></div></div>`;
      grid.prepend(a);
    }); filter();
  }
  loadMediaPosts();
})();


// v11.5 — single navigation controller (replaces older stacked login patches)
(function(){
  function label(el){
    return String(el?.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
  }
  function headerOffset(){
    const h=document.querySelector('header');
    return (h?.getBoundingClientRect().height||0)+18;
  }
  function smoothTo(el){
    if(!el)return;
    const y=el.getBoundingClientRect().top+window.scrollY-headerOffset();
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
  }
  function revealView(el){
    if(!el)return;
    const view=el.classList.contains('view') ? el : el.closest('.view');
    if(view){
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      view.classList.add('active');
      view.hidden=false;
      view.removeAttribute('aria-hidden');
    }
    el.hidden=false;
    el.removeAttribute('aria-hidden');
  }
  function openPortalLogin(){
    const form=document.getElementById('loginForm') ||
      [...document.querySelectorAll('form')].find(f=>f.querySelector('input[type="password"]'));
    const login=document.getElementById('login') || form?.closest('section') || form;
    if(!login && !form)return;

    revealView(login||form);

    // Some older CSS hides non-active login sections. Force only this destination visible.
    if(login){
      login.style.removeProperty('display');
      login.style.removeProperty('visibility');
      login.style.removeProperty('opacity');
    }

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        const box=form?.closest('.panel,.card,.login-card') || form || login;
        smoothTo(box);
        setTimeout(()=>{
          const field=document.getElementById('schoolLogin') ||
            box?.querySelector('input:not([type="hidden"]):not([disabled])');
          field?.focus({preventScroll:true});
          box?.classList.add('login-focus-pulse');
          setTimeout(()=>box?.classList.remove('login-focus-pulse'),900);
        },500);
      });
    });
  }
  function openSection(id){
    const el=document.getElementById(id);
    if(!el)return;
    revealView(el);
    requestAnimationFrame(()=>smoothTo(el));
  }

  // One capture listener only. No stopImmediatePropagation, so unrelated controls remain safe.
  document.addEventListener('click',function(e){
    const el=e.target.closest('a,button');
    if(!el || el.closest('form'))return;
    const t=label(el);

    if(t==='portal login' || t==='login'){
      e.preventDefault();
      openPortalLogin();
      return;
    }
    if(t==='home'){
      e.preventDefault();
      openSection('home');
      return;
    }
    if(t==='announcements' || t==='announcement'){
      e.preventDefault();
      openSection('announcements');
    }
  },true);

  // If #login is opened directly.
  if(location.hash==='#login'){
    addEventListener('load',()=>setTimeout(openPortalLogin,150));
  }
})();
