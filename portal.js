/* ENGLISH QUEST interactive navigation and local demo portal.
   No backend authentication is claimed. Student profiles and teacher preview are local-only.
   Do not publish real student data, credentials, or a teacher PIN in a static GitHub repo. */
(()=>{'use strict';
  const api=window.EnglishQuestBridge;
  if(!api){console.error('EnglishQuestBridge unavailable');return}
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const routes=[
    {id:'home',icon:'🏡',title:'Home',hint:'Explore the world'},
    {id:'topics',icon:'📚',title:'Topics',hint:'Five learning worlds'},
    {id:'games',icon:'🎮',title:'Games',hint:'100 fun questions'},
    {id:'rewards',icon:'🏆',title:'Rewards',hint:'Stars and certificates'},
    {id:'profile',icon:'👤',title:'Profile',hint:'My explorer'},
    {id:'teacher',icon:'📊',title:'Teacher Dashboard',hint:'Offline progress preview'},
    {id:'login',icon:'🔐',title:'Login',hint:'Student sign-in on this device'},
    {id:'settings',icon:'⚙️',title:'Settings',hint:'How to play and preferences'}
  ];
  let current='home',teacherUnlocked=false;
  const menu=$('portalToggle'),drawer=$('portalDrawer'),backdrop=$('portalBackdrop'),panel=$('portalPanel'),content=$('portalContent');
  function drawerOpen(open){document.body.classList.toggle('menu-open',open);drawer.setAttribute('aria-hidden',String(!open));menu.setAttribute('aria-expanded',String(open));backdrop.hidden=!open}
  function navLinks(){return routes.map(r=>`<button type="button" class="drawer-link ${current===r.id?'selected':''}" data-route="${r.id}"><span class="drawer-icon">${r.icon}</span><span class="drawer-text"><strong>${r.title}</strong><small>${r.hint}</small></span><span class="nav-arrow">›</span></button>`).join('')}
  function syncDrawer(){$('portalNavItems').innerHTML=navLinks()}
  function navigate(name,updateHash=true){
    if(!routes.some(r=>r.id===name))name='home';
    current=name;drawerOpen(false);syncDrawer();menu.style.display=name==='home'?'flex':'none';
    if(name==='home'){panel.classList.remove('active');api.goWorld()}else{
      api.goWorld(); panel.classList.add('active');panel.scrollTop=0;render(name);
    }
    if(updateHash){const next=name==='home'?'#home':'#'+name;if(location.hash!==next)history.replaceState(null,'',next)}
    return true;
  }
  function open(name){return navigate(name||'home')}
  function heading(eyebrow,title,description,icon){return `<div class="portal-page-heading"><div><div class="page-eyebrow">${safe(eyebrow)}</div><h1>${icon} ${safe(title)}</h1><p>${safe(description)}</p></div><div class="heading-stars" aria-hidden="true">⭐ ✦ ⭐</div></div>`}
  function metrics(){const s=api.stats();return `<div class="portal-metrics"><div class="metric"><b>⭐ ${s.total}<small>/100</small></b><span>Total stars</span></div><div class="metric"><b>🎯 ${s.completed}<small>/5</small></b><span>Quests completed</span></div><div class="metric"><b>📚 100</b><span>Questions to explore</span></div></div>`}
  function assetSrc(index){const file='station-'+String(index).padStart(2,'0')+'.webp';return window.ENGLISH_QUEST_ASSETS?.[file]||'assets/'+file}
  function topicCard(topic,i,mode){const snapshot=api.snapshot(),result=snapshot.scores[topic.id];const best=result?.best??0,done=!!result?.completed;const progress=done?100:Math.min(100,((snapshot.drafts?.[topic.id]?.index??0)/20)*100);
    return `<article class="quest-card"><div class="quest-visual"><img src="${assetSrc(i+1)}" alt="${safe(topic.title)} learning station" loading="lazy"><span class="quest-num">QUEST ${String(i+1).padStart(2,'0')}</span></div><div class="quest-card-body"><h2>${topic.emoji} ${safe(topic.title)}</h2><p>${safe(topic.tagline)}</p><div class="quest-progress"><div style="width:${progress}%"></div></div><div class="quest-card-bottom"><span>${done?'✅ Completed':'✨ Ready to explore'} · ⭐ ${best}/20</span><button class="portal-primary" data-${mode==='games'?'play':'walk'}="${topic.id}">${mode==='games'?'▶ PLAY':'👣 VISIT'}</button></div></div></article>`}
  function render(name){const s=api.snapshot(),info=api.stats();
    if(name==='topics')content.innerHTML=heading('CHOOSE YOUR ADVENTURE','Explore 5 Topics','Choose any station. No levels are locked!','🗺️')+metrics()+`<div class="portal-grid">${api.topics.map((t,i)=>topicCard(t,i,'topics')).join('')}</div>`;
    if(name==='games')content.innerHTML=heading('LET’S PLAY','Games Zone','20 questions in each Quest. Every correct answer gives one star!','🎮')+`<div class="game-guide"><div>👀 <strong>LOOK</strong></div><div>🧠 <strong>THINK</strong></div><div>✅ <strong>CHOOSE</strong></div><div>🌟 <strong>WIN STARS</strong></div></div>`+`<div class="portal-grid">${api.topics.map((t,i)=>topicCard(t,i,'games')).join('')}</div>`;
    if(name==='rewards')content.innerHTML=heading('YOUR ACHIEVEMENTS','Rewards & Badges','Collect a star badge by completing each Quest.','🏆')+metrics()+rewardsHTML(s,info);
    if(name==='profile')content.innerHTML=heading('MY EXPLORER','Profile','Change your name or view your learning progress.','👤')+profileHTML(s,info);
    if(name==='teacher')content.innerHTML=heading('TEACHER VIEW','Teacher Dashboard','Offline demonstration: shows only progress stored on this device.','📊')+teacherHTML();
    if(name==='login')content.innerHTML=heading('WELCOME BACK','Student Login','Create or reopen your explorer profile on this device.','🔐')+loginHTML(s);
    if(name==='settings')content.innerHTML=heading('MAKE IT YOURS','Settings','Play at your own pace with visual-first guidance.','⚙️')+settingsHTML(s);
    bindActions();
  }
  function rewardsHTML(s,info){return `<div class="portal-subheading"><h2>🎖️ Your Quest Badges</h2><p>Finish a Quest to collect its badge.</p></div><div class="badge-grid">${api.topics.map((t,i)=>{const item=s.scores[t.id],completed=!!item?.completed;return `<div class="reward-badge ${completed?'earned':'locked'}"><div class="reward-symbol">${completed?'🌟':t.emoji}</div><div class="reward-number">${String(i+1).padStart(2,'0')}</div><strong>${safe(t.title)}</strong><small>${completed?`Earned · ${item.best}/20`:'Not earned yet'}</small></div>`}).join('')}</div>
    <div class="award-banner"><div class="award-emoji">${info.completed===5?'🏆':'🔒'}</div><div><h2>${info.completed===5?'Certificate Unlocked!':'Explorer Certificate'}</h2><p>${info.completed===5?`${safe(info.award)} · ${info.total}/100`: `Complete ${5-info.completed} more Quest${5-info.completed!==1?'s':''} to unlock your certificate.`}</p></div><button class="portal-primary" data-certificate ${info.completed===5?'':'disabled'}>🎓 VIEW CERTIFICATE</button></div>`}
  function profileHTML(s,info){return `<div class="portal-two-col"><article class="portal-surface profile-hero"><div class="profile-avatar" aria-hidden="true">🧒</div><h2>${safe(s.name||'Explorer')}</h2><div class="profile-pill">${safe(s.className||'Year 2 Explorer')}</div><p>${s.studentId?'Student ID: '+safe(s.studentId):'Guest explorer • not signed in'}</p><div class="profile-award">${info.completed===5?'🏆 '+safe(info.award):'✨ '+info.completed+' of 5 Quests complete'}</div></article>
   <article class="portal-surface"><h2>✏️ Edit My Profile</h2><form id="profileForm" class="portal-form"><label for="profileName">Student name</label><input id="profileName" name="studentName" value="${safe(s.name==='Explorer'?'':s.name)}" maxlength="48" placeholder="My name" required><label for="profileClass">Class</label><input id="profileClass" value="${safe(s.className)}" maxlength="30" placeholder="Year 2"><button class="portal-primary" type="submit">💾 SAVE PROFILE</button><p class="microcopy">Saved on this device only. Student ID can be selected in Login.</p></form></article></div>
   <div class="portal-subheading"><h2>📈 My Best Scores</h2></div><div class="score-rows">${api.topics.map(t=>{const score=s.scores[t.id];return `<div class="score-row"><span>${t.emoji} ${safe(t.title)}</span><div class="score-track"><i style="width:${(score?.best||0)*5}%"></i></div><strong>${score?.best??'–'}/20</strong></div>`}).join('')}</div>`}
  function loginHTML(s){return `<div class="portal-two-col"><article class="portal-surface"><div class="login-image">🎒 🧒 ⭐</div><h2>Explorer Sign In</h2><p>Use a simple Student ID to keep different explorers' scores separate on the <strong>same device</strong>.</p><form id="loginForm" class="portal-form"><label for="studentIdField">Student ID</label><input id="studentIdField" placeholder="e.g. CEMPAKA01" value="${safe(s.studentId)}" maxlength="32" required pattern="[A-Za-z0-9_-]{3,32}" autocomplete="off"><label for="loginNameField">Student name</label><input id="loginNameField" placeholder="Your name" value="${safe(s.name==='Explorer'?'':s.name)}" maxlength="48" required autocomplete="off"><label for="loginClassField">Class</label><input id="loginClassField" placeholder="Year 2 PKD Cempaka" value="${safe(s.className)}" maxlength="30"><button class="portal-primary" type="submit">🚀 ENTER ENGLISH QUEST</button></form>${s.studentId?`<button class="portal-secondary" id="logoutButton">🚪 SIGN OUT OF ${safe(s.studentId)}</button>`:''}</article>
   <article class="portal-surface local-notice"><div class="large-icon">🔐</div><h2>Teacher Login</h2><p>For now this is a <strong>local demo</strong>. A secure teacher account cannot be provided by a public GitHub Pages-only website.</p><p>Teacher authentication, class-wide records and role permissions will require a protected Google Apps Script backend.</p><button class="portal-secondary" data-route="teacher">📊 PREVIEW TEACHER DASHBOARD</button><div class="privacy-strip">🛡️ No passwords are requested or stored in this demo. Data is not sent to Google Sheets.</div></article></div>`}
  function teacherHTML(){if(!teacherUnlocked)return `<article class="portal-surface teacher-gate"><div class="large-icon">📊</div><h2>Teacher Dashboard Preview</h2><p>This preview is <strong>not a secure teacher login</strong>. It contains only local profiles saved in this browser. Class-wide reporting will require server-side authentication and Google Sheets integration.</p><button class="portal-primary" id="unlockTeacher">👩‍🏫 OPEN LOCAL DEMO</button><div class="privacy-strip">For shared devices: use demonstration/student-test data only.</div></article>`;
    const profiles=api.profiles(),all=profiles.length?profiles:[{studentId:'GUEST',name:api.snapshot().name,className:api.snapshot().className,scores:api.snapshot().scores,attemptLog:api.snapshot().attemptLog}];
    const total=all.reduce((n,p)=>n+api.topics.reduce((m,t)=>m+(p.scores?.[t.id]?.best||0),0),0),correct=all.reduce((n,p)=>n+(p.attemptLog||[]).filter(a=>a.correct).length,0),answers=all.reduce((n,p)=>n+(p.attemptLog||[]).length,0);
    return `<div class="teacher-kpis"><div><span>👥</span><b>${all.length}</b><small>Local profiles</small></div><div><span>⭐</span><b>${Math.round(total/all.length)}</b><small>Average / 100</small></div><div><span>✅</span><b>${answers?Math.round(correct/answers*100):0}%</b><small>Local question accuracy</small></div><div><span>🧩</span><b>${answers}</b><small>Recorded answers</small></div></div>
      <article class="portal-surface"><div class="teacher-table-heading"><div><h2>📋 Local Student Progress</h2><p>Records from this browser only · Not a school-wide report</p></div><button class="portal-secondary" id="exportCSV">⬇ EXPORT CSV</button></div><div class="table-scroll"><table class="teacher-table"><thead><tr><th>Student</th><th>Class</th>${api.topics.map(t=>`<th>${safe(t.title)}</th>`).join('')}<th>Total</th><th>Completed</th></tr></thead><tbody>${all.map(p=>{const scores=p.scores||{},sum=api.topics.reduce((n,t)=>n+(scores[t.id]?.best||0),0),num=api.topics.filter(t=>scores[t.id]?.completed).length;return `<tr><td>${safe(p.name||'Explorer')}</td><td>${safe(p.className||'—')}</td>${api.topics.map(t=>`<td>${scores[t.id]?.completed?scores[t.id].best+'/20':'—'}</td>`).join('')}<td><b>${sum}/100</b></td><td>${num}/5</td></tr>`}).join('')}</tbody></table></div></article><div class="portal-surface"><h2>💡 Learning Insights</h2>${api.topics.map(t=>{const done=all.filter(p=>p.scores?.[t.id]?.completed),avg=done.length?Math.round(done.reduce((n,p)=>n+p.scores[t.id].best,0)/done.length):0;return `<div class="score-row"><span>${t.emoji} ${safe(t.title)}</span><div class="score-track"><i style="width:${avg*5}%"></i></div><strong>${done.length?avg+'/20':'—'}</strong></div>`}).join('')}<p class="microcopy">Teacher decisions and official PBD records must be reviewed by a teacher. This demo does not automatically generate official assessments.</p></div>`;
  }
  function settingsHTML(s){return `<div class="portal-two-col"><article class="portal-surface"><h2>🔊 Sounds & Display</h2><div class="settings-line"><div><strong>Sound effects</strong><small>All activities work without sound</small></div><button class="portal-switch" id="switchSound" aria-pressed="${!!s.settings.sound}">${s.settings.sound?'🔊 ON':'🔇 OFF'}</button></div><div class="settings-line"><div><strong>Reduce animation</strong><small>Calmer movements for easier focus</small></div><button class="portal-switch" id="switchMotion" aria-pressed="${document.body.classList.contains('calm-mode')}">${document.body.classList.contains('calm-mode')?'✅ ON':'◯ OFF'}</button></div><button class="portal-secondary" id="howToPlay">❔ HOW TO PLAY</button></article>
      <article class="portal-surface"><h2>🛡️ Data & Privacy</h2><p>Scores, profiles and attempts are stored in this browser using localStorage. They are not synced to Google Sheets yet.</p><p><strong>For a real school deployment:</strong> connect an authenticated backend before recording real pupil records.</p><button class="portal-danger" id="resetScores">🗑️ RESET CURRENT EXPLORER'S SCORES</button></article></div>`}
  function downloadCSV(){const profiles=api.profiles(),rows=[['Student ID','Name','Class',...api.topics.map(t=>t.title),'Total Score','Topics Completed']];for(const p of profiles){const scores=p.scores||{},total=api.topics.reduce((n,t)=>n+(scores[t.id]?.best||0),0),finished=api.topics.filter(t=>scores[t.id]?.completed).length;rows.push([p.studentId,p.name,p.className,...api.topics.map(t=>scores[t.id]?.best||0),total,finished])}const csv=rows.map(row=>row.map(item=>'"'+String(item??'').replace(/^[=+@-]/,'\'$&').replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='English_Quest_Local_Progress.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
  function bindActions(){
    content.querySelectorAll('[data-walk]').forEach(b=>b.addEventListener('click',()=>{navigate('home');api.goStation(b.dataset.walk)}));
    content.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>{navigate('home');api.enterQuest(b.dataset.play)}));
    content.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
    content.querySelector('[data-certificate]')?.addEventListener('click',()=>{navigate('home');api.certificate()});
    $('profileForm')?.addEventListener('submit',e=>{e.preventDefault();api.updateStudent($('profileName').value,$('profileClass').value);render('profile')});
    $('loginForm')?.addEventListener('submit',e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');try{api.loginStudent($('studentIdField').value,$('loginNameField').value,$('loginClassField').value);b.textContent='✅ SIGNED IN';navigate('profile')}catch(error){window.alert(error.message)}});
    $('logoutButton')?.addEventListener('click',()=>{api.logoutStudent();navigate('login')});
    $('unlockTeacher')?.addEventListener('click',()=>{teacherUnlocked=true;render('teacher')});
    $('exportCSV')?.addEventListener('click',downloadCSV);
    $('switchSound')?.addEventListener('click',()=>{api.toggleSound();render('settings')});
    $('switchMotion')?.addEventListener('click',()=>{document.body.classList.toggle('calm-mode');try{localStorage.setItem('eq-calm-mode',String(document.body.classList.contains('calm-mode')))}catch(_){}render('settings')});
    $('howToPlay')?.addEventListener('click',()=>{navigate('home');api.guide()});
    $('resetScores')?.addEventListener('click',()=>{if(window.confirm('Reset your scores, saved questions and answer history on this device?')){api.resetProgress();render('settings')}});
  }
  menu.addEventListener('click',()=>drawerOpen(!document.body.classList.contains('menu-open')));
  $('portalClose').addEventListener('click',()=>drawerOpen(false));
  backdrop.addEventListener('click',()=>drawerOpen(false));
  $('portalNavItems').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)navigate(b.dataset.route)});
  $('portalBack').addEventListener('click',()=>navigate('home'));
  $('portalNavButton').addEventListener('click',()=>drawerOpen(true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.body.classList.contains('menu-open'))drawerOpen(false);else if(panel.classList.contains('active'))navigate('home')}});
  window.addEventListener('eq:progress',()=>{if(panel.classList.contains('active')&&['topics','games','rewards','profile','teacher'].includes(current))render(current)});
  window.addEventListener('hashchange',()=>{const route=location.hash.replace('#','');if(routes.some(r=>r.id===route))navigate(route,false)});
  try{if(localStorage.getItem('eq-calm-mode')==='true')document.body.classList.add('calm-mode')}catch(_){}
  const requested=location.hash.replace('#','');syncDrawer();if(routes.some(r=>r.id===requested)&&requested!=='home')navigate(requested,false);
  window.EnglishQuestPortal={open};
})();
