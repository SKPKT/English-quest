/* English Quest World — standalone playable, visual-first learning game.
   All progress stays in this browser (localStorage). No student information is uploaded. */
(()=>{'use strict';
  const TOPICS=window.ENGLISH_QUEST_TOPICS||[];
  const W=1448,H=1086,KEY='eq-world-playable-v2',ACTIVE_KEY='eq-active-student',ACCOUNT_PREFIX='eq-profile-v1:',ACCOUNT_INDEX='eq-profile-index-v1';
  const STATIONS=[
    {id:'free-time',x:599,y:373,hit:[337,210,530,232],door:[614,468],image:'assets/hd2d/topic-01.png'},
    {id:'old-house',x:1180,y:444,hit:[1007,222,330,248],door:[1114,481],image:'assets/hd2d/topic-02.png'},
    {id:'get-dressed',x:258,y:707,hit:[64,468,320,244],door:[269,739],image:'assets/hd2d/topic-03.png'},
    {id:'robot',x:632,y:830,hit:[383,628,347,243],door:[622,887],image:'assets/hd2d/topic-04.png'},
    {id:'beach',x:1166,y:821,hit:[1017,605,332,224],door:[1080,836],image:'assets/hd2d/topic-05.png'},
  ];
  const BLOCKED=[[342,216,858,442],[1008,227,1324,465],[67,472,376,706],[385,638,718,866],[1030,609,1341,817]];
  const $=id=>document.getElementById(id);
  const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $world=$('worldViewport'),$stage=$('worldStage'),$avatar=$('avatar');
  const state=readState();
  function accountStorageKey(id){return ACCOUNT_PREFIX+encodeURIComponent(id)}
  function activeAccount(){try{return localStorage.getItem(ACTIVE_KEY)||''}catch(_){return ''}}
  function normaliseState(s){return {name:s?.name||'Explorer',studentId:s?.studentId||'',className:s?.className||'',scores:s?.scores||{},drafts:s?.drafts||{},settings:s?.settings||{sound:false},attemptLog:Array.isArray(s?.attemptLog)?s.attemptLog.slice(-2000):[]}}
  function readState(){try{const id=activeAccount();const s=JSON.parse(localStorage.getItem(id?accountStorageKey(id):KEY)||'null');return normaliseState(s)}catch(_){return normaliseState(null)}}
  function readAccountIndex(){try{return JSON.parse(localStorage.getItem(ACCOUNT_INDEX)||'[]').filter(x=>x&&x.studentId).slice(0,200)}catch(_){return []}}
  function persist(){try{const id=activeAccount();localStorage.setItem(id?accountStorageKey(id):KEY,JSON.stringify(state));if(id){const list=readAccountIndex().filter(x=>x.studentId!==id);list.push({studentId:id,name:state.name,className:state.className,updatedAt:new Date().toISOString()});localStorage.setItem(ACCOUNT_INDEX,JSON.stringify(list.slice(-200)))}window.dispatchEvent(new CustomEvent('eq:progress'))}catch(_){}}
  function loginStudent(id,name,className){const sid=String(id||'').trim();if(!/^[a-zA-Z0-9_-]{3,32}$/.test(sid))throw Error('Student ID must contain 3–32 letters, numbers, hyphens or underscores.');if(!String(name||'').trim())throw Error('Please enter your name.');try{localStorage.setItem(ACTIVE_KEY,sid)}catch(_){}const stored=readState();Object.assign(state,stored,{name:String(name).trim().slice(0,48),studentId:sid,className:String(className||'').trim().slice(0,30)});persist();refreshHUD();return sid}
  function logoutStudent(){try{localStorage.removeItem(ACTIVE_KEY)}catch(_){}Object.assign(state,readState());refreshHUD();window.dispatchEvent(new CustomEvent('eq:progress'))}
  function updateStudent(name,className){state.name=(String(name||'').trim()||'Explorer').slice(0,48);state.className=String(className||'').trim().slice(0,30);persist();refreshHUD()}
  function resetProgress(){state.scores={};state.drafts={};state.attemptLog=[];persist();refreshHUD()}
  function savedProfiles(){return readAccountIndex().map(a=>{try{const p=normaliseState(JSON.parse(localStorage.getItem(accountStorageKey(a.studentId))||'null'));return {...a,scores:p.scores,attemptLog:p.attemptLog}}catch(_){return {...a,scores:{},attemptLog:[]}}})}
  let screen='worldScreen';
  let player={x:806,y:643,dir:'right'};
  let scale=1,cam={x:0,y:0},manualPanUntil=0,cameraFollow=false;
  let keys=new Set(),joy={x:0,y:0},joyPid=null;
  let path=[],pathTarget=null,arriveTopic=null,nearTopic=null;
  let activeTopic=null,questionIndex=0,runScore=0,selectedAnswer=null,lastTopic=null;
  let lastTick=0,lastToastTimeout=0,audioContext=null,suppressMapClick=false,drag=null;
  let routeCounter=0;
  const stationFor=id=>STATIONS.find(s=>s.id===id);
  const topicFor=id=>TOPICS.find(t=>t.id===id);
  const scoreTotal=()=>TOPICS.reduce((n,t)=>n+(state.scores[t.id]?.best||0),0);
  const completed=()=>TOPICS.filter(t=>state.scores[t.id]?.completed).length;
  const award=x=>x>=90?'GOLD EXPLORER':x>=75?'SILVER EXPLORER':x>=60?'BRONZE EXPLORER':'QUEST EXPLORER';
  function showScreen(id){screen=id;document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('is-visible',x.id===id));if(id==='worldScreen')setTimeout(()=>{resizeMap();refreshHUD()},20);window.scrollTo(0,0)}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(lastToastTimeout);lastToastTimeout=setTimeout(()=>el.classList.remove('show'),2700)}
  function modal(html){$('dialogBody').innerHTML=html;$('modalOverlay').classList.remove('is-hidden');$('closeDialog').focus()}
  function closeModal(){$('modalOverlay').classList.add('is-hidden')}
  const modalClosed=()=> $('modalOverlay').classList.contains('is-hidden');
  function audioPing(ok){if(!state.settings.sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(ok?660:330,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(ok?880:245,audioContext.currentTime+.11);gain.gain.setValueAtTime(.05,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.15);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.16)}catch(_){}}
  function walkable(x,y,r=12){if(x<28||x>W-28||y<285||y>1042)return false;if(x>1298&&y>944)return false;if(x>1160&&y>1010)return false;return !BLOCKED.some(([l,t,rgt,b])=>x>l-r&&x<rgt+r&&y>t-r&&y<b+r)}
  function nearestWalkable(x,y){if(walkable(x,y))return {x,y};for(let radius=16;radius<280;radius+=16){let best=null,bestDist=Infinity;for(let a=0;a<36;a++){const angle=a*Math.PI/18,px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;if(walkable(px,py)){const d=(px-x)**2+(py-y)**2;if(d<bestDist){best={x:px,y:py};bestDist=d}}}if(best)return best}return {x:player.x,y:player.y}}
  function clearRoute(){path=[];pathTarget=null;arriveTopic=null;routeCounter++;$('destinationMarker').hidden=true}
  function visibleMap(){return screen==='worldScreen'&&modalClosed()&&!document.body.classList.contains('menu-open')&&!document.getElementById('portalPanel')?.classList.contains('active')}
  function resizeMap(){const rect=$world.getBoundingClientRect();const vw=rect.width,vh=rect.height;scale=clamp(Math.max(vw/W,vh/H)*1.04,.53,1.16);if(!cameraFollow){cam.x=0;cam.y=player.y>vh/scale-68?clamp(player.y-(vh/scale)*.70,0,Math.max(0,H-vh/scale)):0;}cam.x=clamp(cam.x,0,Math.max(0,W-vw/scale));cam.y=clamp(cam.y,0,Math.max(0,H-vh/scale));drawMap()}
  function drawMap(){const width=$world.clientWidth/scale,height=$world.clientHeight/scale;cam.x=clamp(cam.x,0,Math.max(0,W-width));cam.y=clamp(cam.y,0,Math.max(0,H-height));$stage.style.transform=`translate3d(${-Math.round(cam.x*scale)}px,${-Math.round(cam.y*scale)}px,0) scale(${scale})`;$avatar.style.left=player.x+'px';$avatar.style.top=player.y+'px';$avatar.classList.toggle('facing-left',player.dir==='left')}
  function screenWorldPoint(e){const rect=$world.getBoundingClientRect();return {x:(e.clientX-rect.left)/scale+cam.x,y:(e.clientY-rect.top)/scale+cam.y}}
  function updateCamera(dt){if(!cameraFollow||performance.now()<manualPanUntil)return;const vw=$world.clientWidth/scale,vh=$world.clientHeight/scale;const targetX=clamp(player.x-vw*.50,0,Math.max(0,W-vw));const targetY=clamp(player.y-vh*.55,0,Math.max(0,H-vh));const ease=Math.min(1,dt*7);cam.x+=(targetX-cam.x)*ease;cam.y+=(targetY-cam.y)*ease}
  function gridPath(from,to){
    if(lineWalkable(from,to))return [{x:to.x,y:to.y}];
    // Four-way A* routing on a walkable grid; corners of buildings remain blocked.
    const GRID=25,COLS=Math.ceil(W/GRID),ROWS=Math.ceil(H/GRID);
    const index=(col,row)=>row*COLS+col;
    const toGrid=p=>({c:clamp(Math.floor(p.x/GRID),0,COLS-1),r:clamp(Math.floor(p.y/GRID),0,ROWS-1)});
    const center=(c,r)=>({x:c*GRID+GRID/2,y:r*GRID+GRID/2});
    const start=toGrid(nearestWalkable(from.x,from.y)),end=toGrid(nearestWalkable(to.x,to.y));
    const startIdx=index(start.c,start.r),endIdx=index(end.c,end.r);
    const open=[startIdx],openSet=new Set(open),g=new Float64Array(COLS*ROWS).fill(Infinity),f=new Float64Array(COLS*ROWS).fill(Infinity),parent=new Int32Array(COLS*ROWS).fill(-1);
    g[startIdx]=0;f[startIdx]=Math.abs(start.c-end.c)+Math.abs(start.r-end.r);
    const neigh=[[1,0],[-1,0],[0,1],[0,-1]];let found=false;
    for(let rounds=0;open.length&&rounds<6000;rounds++){
      let best=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[best]])best=i;
      const cur=open.splice(best,1)[0];openSet.delete(cur);if(cur===endIdx){found=true;break}
      const c=cur%COLS,r=Math.floor(cur/COLS);
      for(const [dc,dr] of neigh){const nc=c+dc,nr=r+dr;if(nc<0||nr<0||nc>=COLS||nr>=ROWS)continue;const spot=center(nc,nr);if(!walkable(spot.x,spot.y))continue;const next=index(nc,nr),nextG=g[cur]+1;if(nextG>=g[next])continue;parent[next]=cur;g[next]=nextG;f[next]=nextG+Math.abs(nc-end.c)+Math.abs(nr-end.r);if(!openSet.has(next)){open.push(next);openSet.add(next)}}
    }
    if(!found)return [];
    const nodes=[];let cur=endIdx;while(cur!==-1){nodes.push(center(cur%COLS,Math.floor(cur/COLS)));if(cur===startIdx)break;cur=parent[cur]}nodes.reverse();
    const final=[{x:from.x,y:from.y}];for(let i=0;i<nodes.length;i++){if(!lineWalkable(final[final.length-1],nodes[i]))final.push(nodes[i-1]||nodes[i]);}final.push(...nodes.slice(-1));
    if(lineWalkable(final[final.length-1],to))final.push({x:to.x,y:to.y});
    return final.slice(1).filter(Boolean);
  }
  function lineWalkable(a,b){const d=dist(a,b),steps=Math.max(1,Math.ceil(d/8));for(let i=1;i<=steps;i++){const k=i/steps;if(!walkable(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k))return false}return true}
  function setRoute(x,y,stationId=null){cameraFollow=true;let target=nearestWalkable(x,y);path=gridPath(player,target);if(!path.length){toast('Try another path 👣');return}pathTarget=target;arriveTopic=stationId;const marker=$('destinationMarker');marker.hidden=false;marker.style.left=target.x+'px';marker.style.top=target.y+'px';manualPanUntil=0;routeCounter++}
  function goToStation(id){const s=stationFor(id);if(!s)return;if(dist(player,{x:s.door[0],y:s.door[1]})<83){openStation(id);return}setRoute(...s.door,id);toast('👣 Walking to '+topicFor(id).title+' ...')}
  function updateNearby(){let best=null,bestD=Infinity;for(const s of STATIONS){const d=Math.hypot(player.x-s.door[0],player.y-s.door[1]);if(d<bestD){best=s;bestD=d}}nearTopic=(bestD<86)?best.id:null;document.querySelectorAll('.station-button').forEach(b=>b.classList.toggle('near',b.dataset.station===nearTopic));$('playerPrompt').hidden=!nearTopic;if(nearTopic){$('promptText').textContent=topicFor(nearTopic).title;$('promptEnter').textContent='🚪 ENTER'}$('actionLabel').textContent=nearTopic?'ENTER':'QUESTS'}
  function tick(ms){const dt=Math.min((ms-lastTick)/1000||.016,.052);lastTick=ms;if(visibleMap()){
      let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
      let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;
      let moving=false;
      if(Math.abs(dx)+Math.abs(dy)>.09){cameraFollow=true;const n=Math.hypot(dx,dy),speed=188*dt;dx=dx/n*speed;dy=dy/n*speed;clearRoute();const nx=player.x+dx,ny=player.y+dy;if(walkable(nx,ny)){player.x=nx;player.y=ny;moving=true}else if(walkable(nx,player.y)){player.x=nx;moving=true}else if(walkable(player.x,ny)){player.y=ny;moving=true}if(dx<-.3)player.dir='left';if(dx>.3)player.dir='right';manualPanUntil=0}
      else if(path.length){const goal=path[0],diffX=goal.x-player.x,diffY=goal.y-player.y,d=Math.hypot(diffX,diffY);const step=220*dt;if(d<=step+1){player.x=goal.x;player.y=goal.y;path.shift()}else{const xx=player.x+diffX/d*step,yy=player.y+diffY/d*step;if(walkable(xx,yy)){player.x=xx;player.y=yy}else{clearRoute();toast('Path blocked — try another way')}}if(diffX<-.2)player.dir='left';if(diffX>.2)player.dir='right';moving=true;if(!path.length&&arriveTopic){const id=arriveTopic;clearRoute();setTimeout(()=>{if(visibleMap())openStation(id)},120)}else if(!path.length){clearRoute()}}
      $avatar.classList.toggle('walking',moving);updateCamera(dt);drawMap();updateNearby();
    }else $avatar.classList.remove('walking');requestAnimationFrame(tick)}
  function setupStations(){const layer=$('stationLayer');for(const [idx,s] of STATIONS.entries()){const t=topicFor(s.id);const b=document.createElement('button');b.type='button';b.className='station-button';b.dataset.station=s.id;b.style.cssText=`left:${s.hit[0]}px;top:${s.hit[1]}px;width:${s.hit[2]}px;height:${s.hit[3]}px`;b.setAttribute('aria-label',`Walk to Quest ${idx+1}: ${t.title}`);b.innerHTML=`<span class="station-bubble">${String(idx+1).padStart(2,'0')} ${escapeHTML(t.title)}</span>${state.scores[s.id]?.completed?'<span class="station-star" aria-hidden="true">⭐</span>':''}`;b.addEventListener('click',e=>{e.stopPropagation();goToStation(s.id)});layer.appendChild(b)}}
  function refreshHUD(){$('studentName').textContent=state.name||'Explorer';$('totalScore').textContent=scoreTotal();$('completedCount').textContent=completed();$('soundButton').textContent=state.settings.sound?'🔊':'🔇';setupRefreshStars()}
  function setupRefreshStars(){document.querySelectorAll('.station-button').forEach(b=>{let star=b.querySelector('.station-star');const yes=!!state.scores[b.dataset.station]?.completed;if(yes&&!star){star=document.createElement('span');star.className='station-star';star.textContent='⭐';star.setAttribute('aria-hidden','true');b.appendChild(star)}if(!yes&&star)star.remove()})}
  function openStation(id){clearRoute();const t=topicFor(id),s=stationFor(id);if(!t||!s)return;const best=state.scores[id]?.best??0,dr=state.drafts[id];modal(`<img class="dialog-image" src="${s.image}" alt="${escapeHTML(t.title)} learning station"><h2 id="dialogTitle">Quest ${String(TOPICS.indexOf(t)+1).padStart(2,'0')}: ${escapeHTML(t.title)}</h2><p>${escapeHTML(t.intro)}</p><p>🧩 20 questions &nbsp; ⭐ Best: ${best}/20<br>🧠 ${escapeHTML(t.tagline)}<br>⏳ No time limit</p><div class="dialog-actions"><button id="startQuestBtn" type="button" class="primary-button">${dr?'▶ CONTINUE':'🚀 START QUEST'}</button>${dr?'<button id="restartQuestBtn" type="button" class="secondary-button">↻ RESTART</button>':''}</div>`);$('startQuestBtn').addEventListener('click',()=>{closeModal();startQuest(id,false)});if(dr)$('restartQuestBtn').addEventListener('click',()=>{if(confirm('Start again from question 1?')){closeModal();startQuest(id,true)}})}
  function saveDraft(){if(!activeTopic)return;state.drafts[activeTopic.id]={index:questionIndex,score:runScore,selected:selectedAnswer};persist()}
  function startQuest(id,restart){activeTopic=topicFor(id);if(!activeTopic)return;lastTopic=id;const d=restart?null:state.drafts[id];questionIndex=clamp(Number(d?.index)||0,0,19);runScore=clamp(Number(d?.score)||0,0,20);selectedAnswer=Number.isInteger(d?.selected)?d.selected:null;saveDraft();$('quizScenery').style.backgroundImage=`url('${stationFor(id).image}')`;$('quizHeading').textContent=activeTopic.title;showScreen('quizScreen');renderQuestion()}
  function renderQuestion(){const q=activeTopic.questions[questionIndex];$('currentScore').textContent=runScore;$('questBadge').textContent='QUEST '+String(TOPICS.indexOf(activeTopic)+1).padStart(2,'0');$('questionCounter').textContent=`QUESTION ${questionIndex+1} / 20`;$('questionMeter').style.width=`${(questionIndex+1)/20*100}%`;$('questionVisual').textContent=q.visual;$('questionText').textContent=q.prompt;const opts=$('answerOptions');opts.innerHTML='';for(let i=0;i<q.options.length;i++){const btn=document.createElement('button');btn.type='button';btn.className='answer-choice';btn.textContent=String.fromCharCode(65+i)+'  '+q.options[i];btn.addEventListener('click',()=>submitAnswer(i));opts.appendChild(btn)}$('feedback').textContent='';$('feedback').className='answer-feedback';$('nextButton').disabled=selectedAnswer===null;$('nextButton').textContent=selectedAnswer===null?'CHOOSE AN ANSWER':questionIndex===19?'🏆 FINISH QUEST':'NEXT ➜';if(selectedAnswer!==null)showFeedback()}
  function submitAnswer(i){if(selectedAnswer!==null)return;const q=activeTopic.questions[questionIndex];selectedAnswer=i;if(i===q.correct){runScore++;audioPing(true)}else audioPing(false);state.attemptLog.push({timestamp:new Date().toISOString(),topic:activeTopic.id,questionId:questionIndex+1,answer:i,correct:i===q.correct,points:i===q.correct?1:0});if(state.attemptLog.length>2000)state.attemptLog=state.attemptLog.slice(-2000);saveDraft();showFeedback()}
  function showFeedback(){const q=activeTopic.questions[questionIndex],correct=selectedAnswer===q.correct;for(const [i,b] of [...$('answerOptions').children].entries()){b.disabled=true;if(i===q.correct)b.classList.add('correct');else if(i===selectedAnswer)b.classList.add('wrong')}$('feedback').classList.add(correct?'success':'error');$('feedback').textContent=(correct?'✅ Great job! ':'💡 Good try! The answer is '+q.options[q.correct]+'. ')+q.hint;$('currentScore').textContent=runScore;$('nextButton').disabled=false;$('nextButton').textContent=questionIndex===19?'🏆 FINISH QUEST':'NEXT ➜'}
  function nextQuestion(){if(selectedAnswer===null)return;if(questionIndex<19){questionIndex++;selectedAnswer=null;saveDraft();renderQuestion()}else finishQuest()}
  function finishQuest(){const id=activeTopic.id,old=state.scores[id]||{best:0,attempts:0,completed:false};old.best=Math.max(old.best,runScore);old.latest=runScore;old.attempts=(old.attempts||0)+1;old.completed=true;old.updatedAt=new Date().toISOString();state.scores[id]=old;delete state.drafts[id];persist();lastTopic=id;showScreen('resultScreen');$('resultTopic').textContent=activeTopic.title;$('resultNumber').textContent=runScore;$('resultBest').textContent=`Your best score: ${old.best} / 20 ⭐`;$('resultEmoji').textContent=runScore>=17?'🏆':runScore>=10?'🌟':'💪';refreshHUD();if(completed()===5){toast('🏆 All five Quests are complete! Certificate unlocked.')}}
  function returnToWorld(){closeModal();showScreen('worldScreen')}
  function showCertificate(){if(completed()!==5){toast('Complete all 5 Quests first!');return}$('certificateName').textContent=state.name||'Explorer';$('certificateTotal').textContent=scoreTotal()+'/100';$('certificateAward').textContent=award(scoreTotal());$('certificateDate').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'numeric',month:'long',year:'numeric'}).format(new Date());showScreen('certificateScreen')}
  function chooseTopic(){const cards=TOPICS.map((t,i)=>`<button type="button" class="topic-option" data-go="${t.id}"><span>${t.emoji}</span><div><strong>${String(i+1).padStart(2,'0')} ${escapeHTML(t.title)}</strong><small>${escapeHTML(t.tagline)}</small></div><b>${state.scores[t.id]?.completed?`⭐ ${state.scores[t.id].best}/20`:'PLAY'}</b></button>`).join('');modal(`<h2 id="dialogTitle">🗺️ Choose a Quest</h2><p>Walk to any station. All topics are open!</p><div class="topic-picker">${cards}</div>${completed()===5?'<button id="openCertificate" class="primary-button" type="button">🏆 MY CERTIFICATE</button>':''}`);$('dialogBody').querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.go;closeModal();showScreen('worldScreen');goToStation(id)}));if($('openCertificate'))$('openCertificate').addEventListener('click',()=>{closeModal();showCertificate()})}
  function editStudent(){modal(`<h2 id="dialogTitle">👤 My Explorer</h2><p>Your name will appear on your certificate. It stays on this device.</p><label for="nameField">Name</label><input class="text-field" id="nameField" maxlength="48" autocomplete="off" value="${escapeHTML(state.name==='Explorer'?'':state.name)}" placeholder="Your name"><label for="classField">Class (optional)</label><input class="text-field" id="classField" maxlength="30" autocomplete="off" value="${escapeHTML(state.className)}" placeholder="Year 2"><div class="dialog-actions"><button id="saveStudent" class="primary-button" type="button">💾 SAVE</button></div>`);$('saveStudent').addEventListener('click',()=>{state.name=($('nameField').value.trim().replace(/\s+/g,' ').slice(0,48))||'Explorer';state.className=$('classField').value.trim().slice(0,30);persist();closeModal();refreshHUD();toast('Welcome, '+state.name+'!')})}
  function settings(){modal(`<h2 id="dialogTitle">⚙️ Settings</h2><p>Play without sound. Your marks are saved on this device.</p><div class="dialog-actions"><button id="toggleSfx" class="secondary-button" type="button">${state.settings.sound?'🔊 SOUND ON':'🔇 SOUND OFF'}</button><button id="showGuide" class="secondary-button" type="button">❔ HOW TO PLAY</button></div><p>Complete all five Quests to unlock your certificate.</p><div class="dialog-actions"><button id="clearProgress" class="secondary-button" type="button">🗑 RESET MY PROGRESS</button></div>`);$('toggleSfx').addEventListener('click',()=>{state.settings.sound=!state.settings.sound;persist();refreshHUD();settings()});$('showGuide').addEventListener('click',guide);$('clearProgress').addEventListener('click',()=>{if(confirm('Delete all saved scores and answers on this device?')){state.scores={};state.drafts={};persist();closeModal();refreshHUD();toast('Progress reset. You can start again!')}})}
  function guide(){modal(`<h2 id="dialogTitle">👣 How to play</h2><p>Use the joystick to move your explorer in four directions.</p><p>On a computer: use <strong>W A S D</strong> or the <strong>arrow keys</strong>.</p><p>Tap a building to walk towards it automatically. When close, press <strong>ENTER</strong>.</p><p>Answer <strong>20 questions</strong> in any Quest. Your best mark is saved. All five topics are open from the start.</p><div class="dialog-actions"><button id="guideOk" class="primary-button" type="button">✅ GOT IT</button></div>`);$('guideOk').addEventListener('click',closeModal)}
  // One-finger joystick with a draggable circular thumb.
  function updateJoy(e){const rect=$('joystick').getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;const dx=e.clientX-cx,dy=e.clientY-cy,max=rect.width*.28,r=Math.hypot(dx,dy),factor=r>max?max/r:1;const vx=dx*factor,vy=dy*factor;joy={x:clamp(vx/max,-1,1),y:clamp(vy/max,-1,1)};$('joyThumb').style.transform=`translate(calc(-50% + ${vx}px),calc(-50% + ${vy}px))`}
  $('joystick').addEventListener('pointerdown',e=>{e.preventDefault();joyPid=e.pointerId;$('joystick').setPointerCapture(e.pointerId);updateJoy(e)});
  $('joystick').addEventListener('pointermove',e=>{if(joyPid===e.pointerId)updateJoy(e)});
  function resetJoy(){joyPid=null;joy={x:0,y:0};$('joyThumb').style.transform='translate(-50%,-50%)'}
  $('joystick').addEventListener('pointerup',resetJoy);$('joystick').addEventListener('pointercancel',resetJoy);$('joystick').addEventListener('lostpointercapture',resetJoy);
  window.addEventListener('blur',()=>{keys.clear();resetJoy()});
  document.addEventListener('keydown',e=>{if(!visibleMap()||['INPUT','TEXTAREA','BUTTON','A'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){keys.add(k);e.preventDefault()}else if(['e','enter',' '].includes(k)){e.preventDefault();if(nearTopic)openStation(nearTopic);else chooseTopic()}});
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  $stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const pt=screenWorldPoint(e);drag={id:e.pointerId,initX:e.clientX,initY:e.clientY,camX:cam.x,camY:cam.y,world:pt,moved:false};$stage.setPointerCapture(e.pointerId)});
  $stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.initX,dy=e.clientY-drag.initY;if(Math.hypot(dx,dy)>9)drag.moved=true;if(drag.moved){cam.x=drag.camX-dx/scale;cam.y=drag.camY-dy/scale;manualPanUntil=performance.now()+2200;cameraFollow=false;drawMap()}});
  $stage.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(!d.moved){const point=screenWorldPoint(e);if(walkable(point.x,point.y))setRoute(point.x,point.y);else toast('Tap a path or a building 👣')}});
  $stage.addEventListener('pointercancel',()=>{drag=null});
  function goStartingPoint(){clearRoute();player={x:806,y:643,dir:'right'};manualPanUntil=0;cameraFollow=false;resizeMap();toast('🏠 Back to the starting path')}
  $('homeButton').addEventListener('click',goStartingPoint);
  function toggleSound(){state.settings.sound=!state.settings.sound;persist();refreshHUD();if(state.settings.sound)audioPing(true)}
  $('soundButton').addEventListener('click',toggleSound);
  $('settingsButton').addEventListener('click',()=>window.EnglishQuestPortal?.open('settings')||settings());$('mapHelp').addEventListener('click',guide);$('studentButton').addEventListener('click',()=>window.EnglishQuestPortal?.open('profile')||editStudent());
  $('actionButton').addEventListener('click',()=>nearTopic?openStation(nearTopic):chooseTopic());$('promptEnter').addEventListener('click',()=>{if(nearTopic)openStation(nearTopic)});
  $('closeDialog').addEventListener('click',closeModal);$('modalOverlay').addEventListener('click',e=>{if(e.target===$('modalOverlay'))closeModal()});
  $('quizBack').addEventListener('click',returnToWorld);$('nextButton').addEventListener('click',nextQuestion);
  $('returnButton').addEventListener('click',returnToWorld);$('replayButton').addEventListener('click',()=>startQuest(lastTopic,true));
  $('certificateBack').addEventListener('click',returnToWorld);$('printCertificate').addEventListener('click',()=>window.print());
  window.addEventListener('resize',resizeMap);
  if(TOPICS.length!==5||TOPICS.some(t=>t.questions?.length!==20))console.error('Question bank must contain exactly five topics × twenty questions.');
  // Explicit bridge: pages use supported actions and read-only snapshots, not game internals.
  window.EnglishQuestBridge={
    topics:TOPICS.map(({id,title,place,emoji,tagline,intro})=>({id,title,place,emoji,tagline,intro})),
    snapshot:()=>JSON.parse(JSON.stringify(state)),
    profiles:()=>savedProfiles(),
    stats:()=>({total:scoreTotal(),completed:completed(),award:award(scoreTotal())}),
    goWorld:()=>{closeModal();showScreen('worldScreen')},
    goStation:id=>{closeModal();showScreen('worldScreen');goToStation(id)},
    enterQuest:id=>{closeModal();showScreen('worldScreen');openStation(id)},
    startQuest:id=>{closeModal();startQuest(id,false)},
    certificate:()=>showCertificate(),
    loginStudent,logoutStudent,updateStudent,resetProgress,
    toggleSound:()=>{state.settings.sound=!state.settings.sound;persist();refreshHUD();return state.settings.sound},
    guide:()=>guide(),
    getScreen:()=>screen
  };
  setupStations();refreshHUD();resizeMap();updateNearby();requestAnimationFrame(tick);
})();
