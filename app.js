const $=id=>document.getElementById(id),DAY=864e5,
PHASES=["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"],
ICONS=["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"],
B={newMax:3,cresMax:32,qMax:70,fullMin:97},
pad2=n=>String(n).padStart(2,"0"),
day0=d=>(d=new Date(d),d.setHours(0,0,0,0),d),
add=(d,n)=>new Date(d.getTime()+n*DAY),
fmtLong=d=>`${pad2(d.getDate())} ${d.toLocaleString(void 0,{month:"long"})} ${d.getFullYear()}`,
fmtMon=d=>d.toLocaleString(void 0,{month:"short"});

const illumPct=d=>{
  const i=Astronomy.Illumination(Astronomy.Body.Moon,d);
  const f=i.fraction??i.phase_fraction??i.phaseFraction??i.frac??i.illumination;
  return (typeof f==="number"&&isFinite(f))?f*100:NaN;
};

const phaseIdx=(p,w)=>p<=B.newMax?0:p>=B.fullMin?4:w?(p<B.cresMax?1:p<B.qMax?2:3):(p>B.qMax?5:p>B.cresMax?6:7);

const dominantDay=d=>{
  const base=day0(d),tally=Array(8).fill(0);
  let mn=100,mx=0;
  for(let h=0;h<24;h++){
    const t=new Date(base); t.setHours(h,0,0,0);
    const p=illumPct(t);
    if(!isFinite(p)) return {idx:0,min:NaN,max:NaN};
    const wax=illumPct(new Date(t.getTime()+36e5))>=illumPct(new Date(t.getTime()-36e5));
    mn=Math.min(mn,p); mx=Math.max(mx,p);
    tally[phaseIdx(p,wax)]++;
  }
  let idx=0; for(let i=1;i<8;i++) if(tally[i]>tally[idx]) idx=i;
  return {idx,min:mn,max:mx};
};

const makeDom=()=>{
  const c=new Map();
  return d=>{
    const k=day0(d).toISOString().slice(0,10);
    if(!c.has(k)) c.set(k,dominantDay(d));
    return c.get(k);
  };
};

const prevNew=(now,dom,back=90)=>{
  const n=day0(now);
  for(let i=0;i<=back;i++){
    const d=add(n,-i);
    if(dom(d).idx===0 && dom(add(d,-1)).idx!==0) return d;
  }
  return add(n,-29);
};

const nextNew=(start,dom,ahead=60)=>{
  const s=day0(start);
  for(let i=1;i<=ahead;i++){
    const d=add(s,i);
    if(dom(d).idx===0 && dom(add(d,-1)).idx!==0) return d;
  }
  return add(s,29);
};

const clipRuns=labels=>{
  const runs=[];
  for(let i=0;i<labels.length;){
    const ph=labels[i]; let j=i+1;
    while(j<labels.length && labels[j]===ph) j++;
    runs.push({ph,len:j-i,start:i});
    i=j;
  }
  for(let i=0;i<runs.length;i++){
    const r=runs[i]; if(r.len!==5) continue;
    const L=runs[i-1],R=runs[i+1];
    let t=null;
    if(L&&L.len<=3) t="L"; else if(R&&R.len<=3) t="R";
    if(!t) continue;
    if(t==="L"){ labels[r.start]=L.ph; L.len++; r.len--; r.start++; }
    else { labels[r.start+r.len-1]=R.ph; R.len++; r.len--; }
  }
  return labels;
};

const buildCycle=(start,end,dom)=>{
  start=day0(start); end=day0(end);
  const days=[],labels=[];
  for(let d=start; d<end; d=add(d,1)) { days.push(d); labels.push(dom(d).idx); }
  clipRuns(labels);
  const labelAt=d=>{
    d=day0(d);
    if(d<start||d>=end) return dom(d).idx;
    return labels[Math.round((d-start)/DAY)];
  };
  return {start,end,labelAt};
};

let showNext=false;

const render=()=>{
  const now=new Date(),dom=makeDom();
  const curStart=prevNew(now,dom), nextStart=nextNew(curStart,dom), nextNext=nextNew(nextStart,dom);
  const cur=buildCycle(curStart,nextStart,dom);
  const view=showNext?buildCycle(nextStart,nextNext,dom):cur;

  const td=dom(now), todayIdx=cur.labelAt(now);
  $("tDate").textContent=fmtLong(now);
  $("tPhase").textContent=PHASES[todayIdx];
  $("tRange").textContent=isFinite(td.min)?`${Math.round(td.min)}–${Math.round(td.max)}%`:"—";

  const gridStart=add(view.start,-view.start.getDay()), cells=$("cells");
  cells.innerHTML="";
  for(let i=0;i<35;i++){
    const d=add(gridStart,i), inCycle=d>=view.start&&d<view.end;
    const el=document.createElement("div");
    el.className="cell"+(inCycle?"":" empty");
    if(!inCycle){ cells.appendChild(el); continue; }

    el.innerHTML=`<div class="date">${pad2(d.getDate())}</div>`+(d.getDate()===1?`<div class="month">${fmtMon(d)}</div>`:"");
    const ph=view.labelAt(d), prev=view.labelAt(add(d,-1));
    if(ph!==prev) el.innerHTML+=`<div class="icon">${ICONS[ph]}</div>`;
    if(!showNext && day0(d).toDateString()===day0(now).toDateString()) el.classList.add("todayMark");
    cells.appendChild(el);
  }
  $("btn").textContent=showNext?"Current Cycle":"Next Cycle";
};

$("btn").onclick=()=>{showNext=!showNext; render();};
render();
