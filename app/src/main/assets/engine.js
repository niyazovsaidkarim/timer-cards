// Pure time accounting: intervals are capped at the deadline and split at local midnight.
(function(root){
function elapsed(s,now){return s.spans.reduce((n,p)=>n+p[1]-p[0],0)+(s.running?Math.max(0,Math.min(now,s.deadline)-s.since):0)}
function closeSpan(s,now){if(s.running){let end=Math.min(now,s.deadline);if(end>s.since)s.spans.push([s.since,end]);s.running=false;}}
function split(spans){let out={};for(let [a,b] of spans){while(a<b){let d=new Date(a),key=dayKey(d);let next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();let end=Math.min(b,next);out[key]=(out[key]||0)+end-a;a=end;}}return out;}
function dayKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const api={elapsed,closeSpan,split,dayKey};if(typeof module!=='undefined')module.exports=api;else root.Engine=api;
})(typeof window!=='undefined'?window:globalThis);
