const $=id=>document.getElementById(id), native=window.Native;
let data={sessions:[],active:null,minutes:25,goal:300,mode:'focus'},page='focus',period='day',offset=0,dialogPurpose='timer';
try{const raw=native?native.load():localStorage.getItem('sokin');if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed.sessions))data={...data,...parsed};}}catch(e){$('notice').hidden=false;$('notice').textContent='Could not read saved results.';}
function save(){const raw=JSON.stringify(data);if(native)native.save(raw);else localStorage.setItem('sokin',raw)}
function alarm(at){if(native)native.alarm(at)}
function duration(ms){let m=Math.floor(ms/60000);if(ms>0&&m===0)return Math.floor(ms/1000)+'s';return m>=60?Math.floor(m/60)+'h'+(m%60?' '+(m%60)+'m':''):m+' min'}
function clock(ms){let n=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function totalByDay(){let totals={};for(const s of data.sessions){for(const [k,v] of Object.entries(Engine.split(s.spans)))totals[k]=(totals[k]||0)+v;}const s=data.active;if(s&&s.mode==='focus'){let spans=s.spans.slice();if(s.running)spans.push([s.since,Math.min(Date.now(),s.deadline)]);for(const [k,v] of Object.entries(Engine.split(spans)))totals[k]=(totals[k]||0)+v;}return totals;}
let noticeTimer;
function finish(complete, discard=false){const s=data.active;if(!s)return;Engine.closeSpan(s,Date.now());s.ended=Date.now();s.complete=complete;s.duration=Engine.elapsed(s,Date.now());if(!discard&&s.mode==='focus'&&s.duration>0)data.sessions.push(s);data.active=null;
if (complete && s.mode==='focus') {
  data.studyMinutes = s.target / 60000;
  data.mode = 'break';
  data.minutes = breakLength(data.studyMinutes);
} else if (s.mode==='break') {
  data.mode='focus';
  data.minutes=data.studyMinutes || 25;
}
alarm(0);save();$('notice').hidden=false;$('notice').textContent=s.mode==='focus'?'Focus saved: '+duration(s.duration)+'.':'Break finished.';if (discard) $('notice').textContent = 'Session discarded.';
clearTimeout(noticeTimer);
noticeTimer=setTimeout(()=>{$('notice').hidden=true;},3500);
$('endDialog').close();
setFull(false);render();}
function breakLength(minutes) { return minutes >= 45 ? 10 : 5; }
function toggle(){let s=data.active;if(s&&s.running&&Date.now()>=s.deadline){finish(true);return;}if(!s){if(data.mode==='focus')data.studyMinutes=data.minutes;$('notice').hidden=true;s={id:Date.now(),started:Date.now(),task:$('task').value.trim()||'Focus',mode:data.mode,target:data.minutes*60000,spans:[],running:false};data.active=s;}if(s.running){Engine.closeSpan(s,Date.now());alarm(0);}else{s.since=Date.now();s.deadline=s.since+s.target-Engine.elapsed(s,s.since);s.running=true;alarm(s.deadline);}save();render();}
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
function render(){const s=data.active;let remaining=s?s.target-Engine.elapsed(s,Date.now()):data.minutes*60000;$('fullClock').classList.toggle('long',remaining>5999999);const label=s?(s.running?'Pause':'Resume'):'Start '+data.minutes+' min'+(data.mode==='break'?' break':'');$('clock').textContent=$('fullClock').textContent=clock(remaining);$('start').textContent=$('fullPause').textContent=label;$('stop').hidden=!s;$('status').textContent=s?(s.running?(s.mode==='focus'?'Studying':'On a break'):'Paused'):data.mode==='focus'?'Ready to focus':'Ready for a break';$('fullStatus').textContent=$('status').textContent;$('fullTask').textContent=s?s.task:$('task').value;$('fill').style.width=(s?Math.min(100,100*(1-remaining/s.target)):0)+'%';$('expand').hidden=!s;$('subjects').hidden=!!s||data.mode==='break';$('task').disabled=!!s;if(s)$('task').value=['Fokus','Focus'].includes(s.task)?'':s.task;document.querySelectorAll('[data-min]').forEach(b=>{b.classList.toggle('selected',+b.dataset.min===data.minutes);b.disabled=!!s;b.textContent=data.mode==='focus'?b.dataset.min+' + '+breakLength(+b.dataset.min):b.dataset.min+' min';});$('custom').disabled=!!s;$('custom').textContent=[25,45,60].includes(data.minutes)?'Custom':data.minutes+' min';document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===data.mode);b.disabled=!!s;});if(page==='progress')renderProgress(totalByDay());}
function renderProgress(totals){let start=new Date();start.setHours(0,0,0,0);if(period==='week')start.setDate(start.getDate()-((start.getDay()+6)%7)+offset*7);else start.setDate(start.getDate()+offset);let end=new Date(start);end.setDate(end.getDate()+(period==='week'?7:1));$('periodLabel').textContent=start.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+(period==='week'?' – '+new Date(end-1).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'');$('next').disabled=offset>=0;let relevant=data.sessions.filter(s=>s.spans.some(p=>p[0]<+end&&p[1]>+start));renderSubjects(relevant,start,end);let buckets=[],labels=[];if(period==='week'){for(let i=0;i<7;i++){let d=new Date(start);d.setDate(d.getDate()+i);buckets.push(totals[Engine.dayKey(d)]||0);labels.push(['M','Tu','W','Th','F','Sa','Su'][i]);}}else{for(let i=0;i<6;i++){let a=new Date(start);a.setHours(i*4);let b=new Date(start);b.setHours(i*4+4);let sum=0;let sessions=[...data.sessions];if(data.active?.mode==='focus'){let s=data.active; sessions.push({...s,spans:[...s.spans,...(s.running?[[s.since,Math.min(Date.now(),s.deadline)]]:[])]});}for(let s of sessions)for(let p of s.spans)sum+=Math.max(0,Math.min(p[1],+b)-Math.max(p[0],+a));buckets.push(sum);labels.push(String(i*4).padStart(2,'0'));}}$('periodTotal').textContent=duration(buckets.reduce((a,b)=>a+b,0));$('sessionsCount').textContent=relevant.length;$('longest').textContent=duration(Math.max(0,...relevant.map(s=>s.duration)));$('chart').replaceChildren();let max=Math.max(1,...buckets);buckets.forEach((v,i)=>{let col=document.createElement('div');col.className='barcol';let value=document.createElement('div');value.className='small';value.style.fontSize='10px';value.textContent=v?duration(v):'';let bar=document.createElement('div');bar.className='bar'+(v===Math.max(...buckets)?' today':'');bar.style.height=(v ? Math.max(2,v/max*85) : 0)+'px';let label=document.createElement('span');label.className='small';label.textContent=labels[i];col.append(value,bar,label);$('chart').append(col);});let today=totals[Engine.dayKey(new Date())]||0;$('goalText').textContent=duration(today)+' / '+duration(data.goal*60000);$('goalFill').style.width=Math.min(100,today/(data.goal*60000)*100)+'%';}
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
$('endDialog').oncancel=event=>{event.preventDefault();keepGoing();};$('confirmEnd').onclick=()=>{$('endDialog').close();finish(false);};$('custom').onclick=()=>numberDialog('timer');$('goalEdit').onclick=()=>numberDialog('goal');$('cancelDialog').onclick=()=>$('numberDialog').close();$('saveDialog').onclick=()=>{let n=+$('minutes').value,max=dialogPurpose==='goal'?720:180;if(!Number.isInteger(n)||n<1||n>max){$('validation').textContent='Enter a whole number from 1 to '+max+'.';return;}if(dialogPurpose==='goal')data.goal=n;else data.minutes=n;save();$('numberDialog').close();render();};document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{data.minutes=+b.dataset.min;save();render();});document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{data.mode=b.dataset.mode;data.minutes=data.mode==='break'?breakLength(data.studyMinutes||25):(data.studyMinutes||25);save();render();});document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));$('dayBtn').onclick=()=>changePeriod('day');$('weekBtn').onclick=()=>changePeriod('week');function changePeriod(p){period=p;offset=0;$('dayBtn').classList.toggle('selected',p==='day');$('weekBtn').classList.toggle('selected',p==='week');render();}$('prev').onclick=()=>{offset--;render();};$('next').onclick=()=>{if(offset<0)offset++;render();};function tick(){if(data.active?.running&&Date.now()>=data.active.deadline){finish(true);if(native)native.done();}else render();}setInterval(tick,1000);document.addEventListener('visibilitychange',tick);tick();

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
