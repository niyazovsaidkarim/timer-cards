const $=id=>document.getElementById(id), native=window.Native;
let data={sessions:[],active:null,minutes:25,goal:300,mode:'focus'},page='focus',period='day',offset=0,dialogPurpose='timer';
try{const raw=native?native.load():localStorage.getItem('sokin');if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed.sessions))data={...data,...parsed};}}catch(e){$('notice').hidden=false;$('notice').textContent='Could not read saved results.';}
function save(){const raw=JSON.stringify(data);if(native)native.save(raw);else localStorage.setItem('sokin',raw)}
function alarm(at){if(native?.alarm)native.alarm(at)}
function duration(ms){let m=Math.floor(ms/60000);if(ms>0&&m===0)return Math.floor(ms/1000)+'s';return m>=60?Math.floor(m/60)+'h'+(m%60?' '+(m%60)+'m':''):m+' min'}
function clock(ms){let n=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function totalByDay(){let totals={};for(const s of data.sessions){for(const [k,v] of Object.entries(Engine.split(s.spans)))totals[k]=(totals[k]||0)+v;}const s=data.active;if(s&&s.mode==='focus'){let spans=s.spans.slice();if(s.running)spans.push([s.since,Math.min(Date.now(),s.deadline)]);for(const [k,v] of Object.entries(Engine.split(spans)))totals[k]=(totals[k]||0)+v;}return totals;}
let noticeTimer;
function finish(complete, discard=false){const s=data.active;if(!s)return;Engine.closeSpan(s,Date.now());s.ended=Date.now();s.complete=complete;s.duration=Engine.elapsed(s,Date.now());if(!discard&&s.mode==='focus'&&s.duration>0)data.sessions.push(s);
if(discard && data.extensionBase?.id===s.id)data.sessions.push(data.extensionBase);
data.extensionBase=null;data.active=null;
if (complete && s.mode==='focus') {
  data.extendId=s.id;
  data.studyMinutes=data.studyMinutes || s.target/60000;
  data.lastSubject=s.task;
  data.mode = 'break';
  data.minutes = breakLength(data.studyMinutes);
} else if (s.mode==='break') {
  data.continueStudy=true;
  data.mode='focus';
  data.minutes=data.studyMinutes || 25;
}
alarm(0);save();$('notice').hidden=false;$('notice').textContent=s.mode==='focus'?'Focus saved: '+duration(s.duration)+'.':'Break finished.';if (discard) $('notice').textContent = 'Session discarded.';
clearTimeout(noticeTimer);
noticeTimer=setTimeout(()=>{$('notice').hidden=true;},3500);
$('endDialog').close();
setFull(false);render();}
function breakLength(minutes) { return minutes >= 45 ? 10 : 5; }
function toggle(){let s=data.active;if(s&&s.running&&Date.now()>=s.deadline){finish(true);return;}if(!s){data.extendId=null;if(data.continueStudy && data.mode==='focus' && !$('task').value.trim())$('task').value=data.lastSubject||'';data.continueStudy=false;if(data.mode==='focus')data.studyMinutes=data.minutes;$('notice').hidden=true;s={id:Date.now(),started:Date.now(),task:$('task').value.trim()||'Focus',mode:data.mode,target:data.minutes*60000,spans:[],running:false};data.active=s;}if(s.running){Engine.closeSpan(s,Date.now());alarm(0);}else{s.since=Date.now();s.deadline=s.since+s.target-Engine.elapsed(s,s.since);s.running=true;alarm(s.deadline);}save();render();}
let controlsTimeout, resumeAfterDialog=false;
function showControls(visible) {
  clearTimeout(controlsTimeout);
  $('full').classList.toggle('controls', visible);
  if (visible) controlsTimeout = setTimeout(() => showControls(false), 3000);
}
$('full').onclick = event => {
  if (event.target === $('fullPause')) showControls(false);
  else if (event.target !== $('collapse')) showControls(!$('full').classList.contains('controls'));
};
function setFull(on){showControls(false);$('full').classList.toggle('on',on);if(native)native.fullscreen(on);}
function back(){if($('full').classList.contains('on')){setFull(false);return true;}if(page!=='focus'){navigate('focus');return true;}return false;}
function navigate(p){page=p;for(const n of ['focus','progress'])$(n).hidden=n!==p;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===p));render();window.scrollTo(0,0);}
function render(){const s=data.active;let remaining=s?s.target-Engine.elapsed(s,Date.now()):data.minutes*60000;$('fullClock').classList.toggle('long',remaining>5999999);$('extend').hidden=!data.extendId||!!s||data.mode!=='break';
  $('quiet').checked=!!data.quiet; $('cue').value=data.cue||'vibrate'; $('access').hidden=!data.quiet||!!native?.allowed?.();
  const label=s?(s.running?'Pause':'Resume'):'Start '+data.minutes+' min'+(data.mode==='break'?' break':'');$('clock').textContent=$('fullClock').textContent=clock(remaining);$('start').textContent=$('fullPause').textContent=!s&&data.continueStudy&&data.mode==='focus'?'Continue '+(data.lastSubject||'study')+' · '+data.minutes+' min':label;$('stop').hidden=!s;$('status').textContent=s?(s.running?(s.mode==='focus'?'Studying':'On a break'):'Paused'):data.mode==='focus'?'Ready to focus':'Ready for a break';$('fullStatus').textContent=$('status').textContent;$('fullTask').textContent=s?s.task:$('task').value;$('fill').style.width=(s?Math.min(100,100*(1-remaining/s.target)):0)+'%';$('expand').hidden=!s;$('subjects').hidden=!!s||data.mode==='break';$('task').disabled=!!s;if(s)$('task').value=['Fokus','Focus'].includes(s.task)?'':s.task;document.querySelectorAll('[data-min]').forEach(b=>{b.classList.toggle('selected',+b.dataset.min===data.minutes);b.disabled=!!s;b.textContent=data.mode==='focus'?b.dataset.min+' + '+breakLength(+b.dataset.min):b.dataset.min+' min';});$('custom').disabled=!!s;$('custom').textContent=[25,45,60].includes(data.minutes)?'Custom':data.minutes+' min';document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===data.mode);b.disabled=!!s;});if(page==='progress')renderProgress(totalByDay());}
function renderProgress(totals){let start=new Date();start.setHours(0,0,0,0);if(period==='week')start.setDate(start.getDate()-((start.getDay()+6)%7)+offset*7);else start.setDate(start.getDate()+offset);let end=new Date(start);end.setDate(end.getDate()+(period==='week'?7:1));$('periodLabel').textContent=start.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+(period==='week'?' – '+new Date(end-1).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'');$('next').disabled=offset>=0;let relevant=data.sessions.filter(s=>s.spans.some(p=>p[0]<+end&&p[1]>+start));renderSubjects(relevant,start,end);renderInsights(start,end,totals);let buckets=[],labels=[];if(period==='week'){for(let i=0;i<7;i++){let d=new Date(start);d.setDate(d.getDate()+i);buckets.push(totals[Engine.dayKey(d)]||0);labels.push(['M','Tu','W','Th','F','Sa','Su'][i]);}}else{for(let i=0;i<6;i++){let a=new Date(start);a.setHours(i*4);let b=new Date(start);b.setHours(i*4+4);let sum=0;let sessions=[...data.sessions];if(data.active?.mode==='focus'){let s=data.active; sessions.push({...s,spans:[...s.spans,...(s.running?[[s.since,Math.min(Date.now(),s.deadline)]]:[])]});}for(let s of sessions)for(let p of s.spans)sum+=Math.max(0,Math.min(p[1],+b)-Math.max(p[0],+a));buckets.push(sum);labels.push(String(i*4).padStart(2,'0'));}}$('periodTotal').textContent=duration(buckets.reduce((a,b)=>a+b,0));$('sessionsCount').textContent=relevant.length;$('longest').textContent=duration(Math.max(0,...relevant.map(s=>s.duration)));$('chart').replaceChildren();let max=Math.max(1,...buckets);buckets.forEach((v,i)=>{let col=document.createElement('div');col.className='barcol';let value=document.createElement('div');value.className='small';value.style.fontSize='10px';value.textContent=v?duration(v):'';let bar=document.createElement('div');bar.className='bar'+(v===Math.max(...buckets)?' today':'');bar.style.height=(v ? Math.max(2,v/max*85) : 0)+'px';let label=document.createElement('span');label.className='small';label.textContent=labels[i];col.append(value,bar,label);$('chart').append(col);});let today=totals[Engine.dayKey(new Date())]||0;$('goalText').textContent=duration(today)+' / '+duration(data.goal*60000);$('goalFill').style.width=Math.min(100,today/(data.goal*60000)*100)+'%';}
function numberDialog(p){dialogPurpose=p;$('dialogTitle').textContent=p==='goal'?'Daily goal in minutes':'Session length in minutes';$('minutes').value=p==='goal'?data.goal:data.minutes;$('validation').textContent='';$('numberDialog').showModal();}
$('fullPause').onclick = toggle;
$('start').onclick = () => {
  toggle();
  if (data.active && data.active.running) setFull(true);
};$('expand').onclick=()=>setFull(true);$('collapse').onclick=$('stop').onclick=()=>{
  if(!data.active)return;
  resumeAfterDialog=data.active.running;
  if(resumeAfterDialog)toggle();
  if(!data.active)return;
  $('confirmEnd').textContent=data.mode==='focus'?'Save '+duration(Engine.elapsed(data.active,Date.now())):'End break';
  $('endDialog').showModal();
};$('discard').onclick=()=>finish(false,true);function keepGoing(){
  $('endDialog').close();
  if(resumeAfterDialog && data.active && !data.active.running) toggle();
  resumeAfterDialog=false;
}
$('cancelEnd').onclick=keepGoing;
$('endDialog').oncancel=event=>{event.preventDefault();keepGoing();};$('confirmEnd').onclick=()=>{$('endDialog').close();finish(false);};$('custom').onclick=()=>numberDialog('timer');$('goalEdit').onclick=()=>numberDialog('goal');$('cancelDialog').onclick=()=>$('numberDialog').close();$('saveDialog').onclick=()=>{let n=+$('minutes').value,max=dialogPurpose==='goal'?720:180;if(!Number.isInteger(n)||n<1||n>max){$('validation').textContent='Enter a whole number from 1 to '+max+'.';return;}if(dialogPurpose==='goal')data.goal=n;else data.minutes=n;save();$('numberDialog').close();render();};document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{data.minutes=+b.dataset.min;save();render();});document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{data.mode=b.dataset.mode;data.minutes=data.mode==='break'?breakLength(data.studyMinutes||25):(data.studyMinutes||25);save();render();});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));$('dayBtn').onclick=()=>changePeriod('day');$('weekBtn').onclick=()=>changePeriod('week');function changePeriod(p){period=p;offset=0;$('dayBtn').classList.toggle('selected',p==='day');$('weekBtn').classList.toggle('selected',p==='week');render();}$('prev').onclick=()=>{offset--;render();};$('next').onclick=()=>{if(offset<0)offset++;render();};function tick(){const external=native?.external?.();if(external)data=JSON.parse(external);if(data.active?.running&&Date.now()>=data.active.deadline){const end=data.active.deadline;finish(true);if(native)native.done(end,data.cue||'vibrate');}else render();}

function renderSubjects(sessions, start, end) {
  const totals = new Map();
  for (const session of sessions) {
    const subject = session.task;
    if (!subject || ['Focus','Fokus'].includes(subject)) continue;
    const time = session.spans.reduce((sum,[a,b]) =>
      sum + Math.max(0,Math.min(b,+end)-Math.max(a,+start)), 0);
    totals.set(subject, (totals.get(subject)||0)+time);
  }
  $('bySubject').hidden = !totals.size;
  $('subjectTotals').replaceChildren();
  for (const [name,time] of [...totals].sort((a,b)=>b[1]-a[1])) {
    const row=document.createElement('div');
    row.className='row between';
    const label=document.createElement('span');
    label.textContent=name;
    const value=document.createElement('strong');
    value.textContent=duration(time);
    row.append(label,value);
    $('subjectTotals').append(row);
  }
}
$('subjects').ontoggle=()=>{
  if(!$('subjects').open)return;
  const names = [...new Set(data.sessions.map(s=>s.task).reverse())];
  $('recentSubjects').replaceChildren();
  for(const name of names.filter(n=>n && !['Focus','Fokus'].includes(n)).slice(0,6)){
    const button=document.createElement('button');
    button.textContent=name;
    button.onclick=()=>{$('task').value=name;$('subjects').open=false;};
    $('recentSubjects').append(button);
  }
};

function renderInsights(start,end,totals) {
  const today=totals[Engine.dayKey(new Date())]||0;
  const minutes=Math.ceil(Math.max(0,data.goal*60000-today)/60000);
  const block=data.studyMinutes||45;
  const whole=Math.floor(minutes/block);
  const rest=minutes%block;
  const parts=[];
  if(whole) parts.push(whole+' × '+block+' min');
  if(rest) parts.push(rest+' min');
  $('remainingGoal').textContent=minutes ? parts.join(' + ')+' left today' : 'Daily goal reached';
  const spans=data.sessions.flatMap(session=>session.spans);
  if(data.active?.mode==='focus'){
    spans.push(...data.active.spans);
    if(data.active.running) spans.push([data.active.since,Math.min(Date.now(),data.active.deadline)]);
  }
  $('chart').hidden=period==='day';
  $('rhythm').hidden=period!=='day';
  $('comparison').hidden=period!=='week';
  if(period==='week'){
    const until=new Date(Math.min(+end,Date.now()));
    const prior=d=>{const v=new Date(+d);v.setDate(v.getDate()-7);return +v;};
    const sum=(a,b)=>spans.reduce((n,[x,y])=>n+Math.max(0,Math.min(y,b)-Math.max(x,a)),0);
    const delta=sum(+start,+until)-sum(prior(start),prior(until));
    $('comparison').textContent=delta===0?'Same as the comparable period last week':
      duration(Math.abs(delta))+(delta>0?' more':' less')+' than the same period last week';
    return;
  }
  const track=document.createElement('div'); track.className='track';
  for(const [a,b] of spans){
    const first=Math.max(+start,a), last=Math.min(+end,b);
    if(last<=first)continue;
    const mark=document.createElement('i'); mark.className='segment';
    mark.style.left=((first-start)/(end-start)*100)+'%';
    mark.style.width=((last-first)/(end-start)*100)+'%';
    track.append(mark);
  }
  const hours=document.createElement('div'); hours.className='hours';
  for(const time of ['00','06','12','18','24']){
    const label=document.createElement('span');label.textContent=time;hours.append(label);
  }
  $('rhythm').replaceChildren();$('rhythm').append(track,hours);
}
$('quiet').onchange=()=>{data.quiet=$('quiet').checked;save();render();if(data.quiet&&!native?.allowed?.())native?.settings?.();};
$('access').onclick=()=>native?.settings?.();
$('cue').onchange=()=>{data.cue=$('cue').value;save();};
$('extend').onclick=()=>{
  const last=data.sessions[data.sessions.length-1];
  if(data.active||!last||last.id!==data.extendId)return;
  data.extensionBase=JSON.parse(JSON.stringify(last));
  data.sessions.pop();
  data.extendId=null;data.mode='focus';data.active=last;
  last.complete=false;last.target=last.duration+300000;
  toggle();setFull(true);
};
let touchY, initialLight;
function digitLight(value){$('fullClock').style.opacity=String(value);}
$('full').ontouchstart=e=>{touchY=e.touches[0].clientY;initialLight=data.light??1;};
$('full').ontouchmove=e=>{
  if(touchY==null)return;
  const move=touchY-e.touches[0].clientY;
  if(Math.abs(move)<8)return;
  e.preventDefault();
  data.light=Math.max(.12,Math.min(1,initialLight+move/(window.innerHeight*.7)));
  digitLight(data.light);
};
$('full').ontouchend=()=>{if(data.light!==initialLight)save();touchY=null;};
digitLight(data.light??1);
setInterval(tick,1000);
document.addEventListener('visibilitychange',tick);
tick();
