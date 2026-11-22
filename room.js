const $=id=>document.getElementById(id);
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
const money=(n,c)=>Number.isFinite(n)?new Intl.NumberFormat('zh-HK',{style:'currency',currency:c,currencyDisplay:'code'}).format(n):'待確認';
const num=n=>Number(n).toLocaleString('en-HK',{maximumFractionDigits:4});
const room=new URL(location.href).searchParams.get('room');
const shared=room==='c';
let run=0;
function bytes(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
function reset(){
 run++;$('pass').value='';$('pass').type='password';$('reveal').textContent='顯示';$('reveal').setAttribute('aria-pressed','false');
 $('panel').replaceChildren();$('room').hidden=true;$('gate').hidden=false;$('lock').hidden=true;$('feedback').textContent='';
 $('form').hidden=!['a','b'].includes(room);$('form').querySelector('[type=submit]').disabled=false;
 $('intro').textContent=shared?'開啟專屬報告…':$('form').hidden?'請用你收到嘅個人連結開啟報告。':'輸入密碼，查看你嘅部署同逐股分析。';
}
async function unlock(){
 const generation=++run,button=$('form').querySelector('[type=submit]');button.disabled=true;$('feedback').textContent='讀取中…';
 let phase='load';
 try{
  const r=await fetch('./'+room+'.enc.json',{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error();
  const e=await r.json();if(e.v!==2||e.mode!==(shared?'link':'password'))throw Error();phase='key';
  let key;
  if(shared){
   const token=new URLSearchParams(location.hash.slice(1)).get('k');if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))throw Error();
   key=await crypto.subtle.importKey('raw',bytes(token.replace(/-/g,'+').replace(/_/g,'/')),'AES-GCM',false,['decrypt']);
  }else{
   if(e.iterations!==600000)throw Error();
   const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode($('pass').value.trim()),'PBKDF2',false,['deriveKey']);
   key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:e.iterations,salt:bytes(e.salt)},raw,{name:'AES-GCM',length:256},false,['decrypt']);
  }
  const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv)},key,bytes(e.data));
  if(generation!==run)return;phase='format';
  const payload=JSON.parse(new TextDecoder().decode(data));if(payload.room!==room||!payload.account?.brief)throw Error();
  draw(payload.account);$('gate').hidden=true;$('room').hidden=false;$('lock').hidden=shared;$('pass').value='';$('report-title').focus();
 }catch{if(generation===run){$('intro').textContent=shared?'專屬報告':'私人投資手記';
 $('feedback').textContent=phase==='load'?'未能載入報告，請重新整理。':phase==='format'?'報告格式未能讀取。':shared?'連結未完整或已失效，請重新開啟完整專屬連結。':'密碼未能解鎖呢份報告。';}}
 finally{if(generation===run)button.disabled=false;}
}
$('form').onsubmit=e=>{e.preventDefault();unlock();};
$('reveal').onclick=()=>{const show=$('pass').type==='password';$('pass').type=show?'text':'password';$('reveal').textContent=show?'隱藏':'顯示';$('reveal').setAttribute('aria-pressed',String(show));};
$('lock').onclick=()=>{reset();$('pass').focus();};
window.addEventListener('pagehide',reset);
window.addEventListener('pageshow',e=>{if(e.persisted&&shared)unlock();});
reset();if(shared)unlock();

function frame(title,cls=''){const s=el('section',null,'module '+cls);s.append(el('h2',title));return s;}
function fact(host,label,value){const d=el('div',null,'fact');d.append(el('small',label),el('strong',value));host.append(d);}
function note(host,label,body){const d=el('div',null,'point');d.append(el('small',label),el('p',body));host.append(d);}
function chart(series){
 const area=el('figure',null,'plot');
 if(series.length<2){area.append(el('figcaption',series.length?'只核實到一個收市價，未足以畫趨勢。':'暫缺已核實收市行情。'));return area;}
 const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
 function shape(tag,attrs,txt){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(txt)n.textContent=txt;svg.append(n);return n;}
 svg.setAttribute('viewBox','0 0 500 142');svg.setAttribute('role','img');svg.setAttribute('aria-label','已核實收市走勢，由 '+series[0].join('：')+' 至 '+series.at(-1).join('：'));
 const values=series.map(x=>x[1]),min=Math.min(...values),max=Math.max(...values),space=Math.max(max-min,max*.002);
 const time=series.map(x=>Date.parse(x[0]+'T12:00:00Z')),start=time[0],end=time.at(-1);
 const xy=values.map((v,i)=>[9+414*(time[i]-start)/(end-start),114-85*(v-min)/space]);
 for(const y of [29,71.5,114]){shape('line',{x1:9,x2:425,y1:y,y2:y,stroke:'#dce4ed','stroke-dasharray':'3 4'});shape('text',{x:436,y:y+4,fill:'#596979','font-size':11},(min+(114-y)*space/85).toFixed(2));}
 const points=xy.map(p=>p.join(',')).join(' ');shape('polygon',{points:'9,129 '+points+' 423,129',fill:'#eaf0fc'});
 shape('polyline',{points,fill:'none',stroke:'#315ea9','stroke-width':2.8,'stroke-linejoin':'round'});
 xy.forEach(([x,y],i)=>{const p=shape('circle',{cx:x,cy:y,r:i===xy.length-1?4:2.6,fill:'#315ea9'});const t=document.createElementNS(ns,'title');t.textContent=series[i].join(' · ');p.append(t);});
 const cap=el('figcaption');cap.append(el('span',series[0][0]),el('span','收市 · '+series.length+' 個觀察日'),el('span',series.at(-1)[0]));area.append(svg,cap);return area;
}
function details(a,sym,host){
 const s=a.brief.stocks[sym],p=a.positions.find(x=>x.symbol===sym),series=s.series,last=series.at(-1),previous=series.at(-2);
 host.replaceChildren();host.tabIndex=-1;
 const flag=el('span',s.label,'pill'),top=el('div',null,'spread');top.append(el('span',p?'已確認持倉 · '+num(p.qty)+' 股':'自選觀察 · 未持有','kicker'),flag);
 const h=el('h3',sym+'　'+s.name),price=el('div',null,'quote');
 price.append(el('strong',last?money(last[1],s.currency):'收市價待核'));
 if(last&&previous){const v=(last[1]/previous[1]-1)*100;price.append(el('span',(v>=0?'+':'')+v.toFixed(2)+'%','move '+(v>=0?'gain':'loss')));}
 host.append(top,h,price,el('p',last?last[0]+' 正式收市'+(previous?' · 變幅對比 '+previous[0]:''):'未有可核實嘅收市價同變幅。','meta'));
 host.append(chart(series));note(host,'點睇',s.reason);note(host,'下一步睇咩',s.watch);note(host,'幾時要重估',s.risk);
 if(s.range)note(host,'最近已核實全日低位／高位',money(s.range[1],s.currency)+' ／ '+money(s.range[0],s.currency));
 if(p){const parts=[p.price==null&&p.qty>0&&Number.isFinite(p.value)?'截圖每股約 '+money(p.value/p.qty,p.currency):null,p.cost!=null?'平均成本 '+money(p.cost,p.currency):null,p.value!=null?'市值 '+money(p.value,p.currency):null].filter(Boolean);if(parts.length)note(host,'持倉快照 · '+a.asOf,parts.join('　'));}
 if(s.sources.length){const nav=el('div',null,'sources');for(const source of s.sources){const l=el('a',source.label+' ↗');l.href=source.url;l.target='_blank';l.rel='noopener noreferrer';nav.append(l);}host.append(nav);}
}

const colors=['#5758b7','#64a89b','#eda057','#87a3d6','#b77eae','#80a25e','#d48180','#6497a9','#d3b351','#a58fd2','#677a84','#a98f75','#78947e','#b5a4bf'];
function exposure(account){
 const box=frame('持倉分布','mix'),rows=account.positions;
 const units=new Set(rows.map(p=>p.currency)),currency=units.size===1?rows[0].currency:account.currency;
 const fx=account.allocationFX;
 if(rows.some(p=>!Number.isFinite(p.value)||p.value<0||(!units.has(currency)&&!fx)||(p.currency!==currency&&!(fx?.[p.currency]>0)))){
  box.append(el('p','市值或匯率待核，暫未能計齊所有持倉比例。','meta'));return box;
 }
 const items=rows.map(p=>({...p,base:p.value*(p.currency===currency?1:fx[p.currency])})).sort((a,b)=>b.base-a.base);
 const total=items.reduce((s,p)=>s+p.base,0);
 if(!total){box.append(el('p','暫無可計算市值。'));return box;}
 const body=el('div',null,'mixbody'),disc=el('div',null,'wheel'),center=el('div',null,'wheeltext'),cap=el('small','持倉'),big=el('strong'),svgns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(svgns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');center.append(cap,big);
 const legend=el('div',null,'mixlegend'),readout=el('p',null,'readout');readout.setAttribute('aria-live','polite');let active=-1;
 const segments=[],buttons=[];
 function select(i){active=i;const p=items[i];big.textContent=(100*p.base/total).toFixed(1)+'%';cap.textContent=p.symbol;
 readout.textContent=p.symbol+' · '+num(p.qty)+' 股 · '+money(p.value,p.currency)+(p.currency!==currency?' ≈ '+money(p.base,currency):'');
 buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));segments.forEach((c,j)=>c.setAttribute('stroke-width',String(j===i?17:13)));}
 let used=0;
 items.forEach((p,i)=>{let share=p.base/total*100;const color=colors[i%colors.length],c=document.createElementNS(svgns,'circle');
 for(const [k,v] of Object.entries({cx:50,cy:50,r:39,pathLength:100,fill:'none',stroke:color,'stroke-dasharray':Math.max(0,share-Math.min(.5,share*.08))+' '+(100-share+Math.min(.5,share*.08)),'stroke-dashoffset':-used,transform:'rotate(-90 50 50)'}))c.setAttribute(k,String(v));
 used+=share;c.addEventListener('click',()=>select(i));segments.push(c);svg.append(c);
 const b=el('button',null,'legenditem'),dot=document.createElementNS(svgns,'svg');dot.setAttribute('width','10');dot.setAttribute('height','10');dot.setAttribute('aria-hidden','true');const d=document.createElementNS(svgns,'circle');d.setAttribute('cx',5);d.setAttribute('cy',5);d.setAttribute('r',4);d.setAttribute('fill',color);dot.append(d);
 b.append(dot,el('span',account.large?(account.brief.stocks[p.symbol]?.name||p.symbol)+' · '+p.symbol:p.symbol),el('strong',share.toFixed(1)+'%'));b.type='button';b.onclick=()=>select(i);buttons.push(b);legend.append(b);});
 disc.append(svg,center);body.append(disc,legend);box.append(el('p',items.length+' 隻 · '+money(account.securitiesTotal??total,currency)+' 證券市值','meta'),body,readout,el('p',account.asOf+' 快照 · 百分比以全部持股市值計，現金另列。'+(units.size>1?' 美股按截圖折算，1 美元約 '+num(fx.USD)+' 港元。':''),'meta'));if(units.size>1){
 const splits=el('div',null,'regions');
 for(const [cc,label] of [['HKD','港股'],['USD','美股']]){const sum=items.filter(p=>p.currency===cc).reduce((v,p)=>v+p.base,0);if(sum>0)fact(splits,label+' · 佔證券市值',(100*sum/total).toFixed(1)+'%');}
 box.append(splits);}
 select(0);return box;
}
function outlink(url,label){if(!url||!/^https:\/\//.test(url))return document.createTextNode('');const a=el('a',label+' ↗','outlink');a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a;}
function bulletin(b){
 const f=frame('最值得留意嘅新聞','bulletin');
 for(const item of b.news||[]){const ar=el('article',null,'bullet');ar.append(el('small',item.when,'time'),el('h3',item.title),el('p',item.fact),el('p',item.impact,'impact'),outlink(item.source,'查閱來源'));f.append(ar);}
 if(!b.news?.length)f.append(el('p','今期未有已核實嘅重大消息。','meta'));return f;
}
function candidates(b){
 const f=frame('值得留意嘅新股','ideas');for(const i of b.ideas||[]){const ar=el('article');ar.append(el('small',i.stage,'pill'),el('h3',i.name+'　'+i.ticker),el('p',i.when,'meta'),el('p',i.why));note(ar,'值得睇嘅條件',i.watch);note(ar,'風險',i.risk);ar.append(outlink(i.source,'公司公告'));if(i.extraSource)ar.append(outlink(i.extraSource,'招股書'));f.append(ar);}
 if(!b.ideas?.length)f.append(el('p','今期未有符合條件嘅新股。','meta'));return f;
}
function navigation(pairs){
 const nav=el('nav',null,'rail');nav.setAttribute('aria-label','報告分區');
 for(const [title,icon,target] of pairs){
 const b=el('button');b.type='button';const glyph=el('span',icon,'navglyph');glyph.setAttribute('aria-hidden','true');b.append(glyph,el('span',title));
 b.setAttribute('aria-pressed',String(nav.children.length===0));b.onclick=()=>{for(const sibling of nav.children)sibling.setAttribute('aria-pressed',String(sibling===b));target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});};nav.append(b);}
 return nav;
}

function draw(a){
 const b=a.brief,root=$('panel'),h=el('h1',a.name+' 嘅部署');h.id='report-title';h.tabIndex=-1;
 const expired=Date.now()>=Date.parse(b.expires);
 const head=el('header',null,'deskhead');head.append(el('small',b.published+' 更新 · 香港時間'),h,el('p',b.session+' 交易日　／　'+(expired?'部署已到期':b.kind)));
 const grid=el('div',null,'desk'+(a.large?' elder':'')),lead=frame(expired?'上次部署':b.kind,'lead'),snap=frame('戶口快照','snapshot');
 lead.append(el('h3',b.headline),el('p',b.summary));
 if(b.simple){const tbl=el('table',null,'simple');for(const line of b.simple){let tr=tbl.insertRow();line.forEach(x=>tr.append(el('td',x)));}lead.append(tbl);}
 const actions=el('div',null,'actions'),list=frame('逐股動向','instruments'),detail=frame('','security');detail.setAttribute('aria-label','個股分析');
 const syms=Object.keys(b.stocks),buttons=new Map();
 function pick(s,mobile=false){
  for(const [key,btn] of buttons){btn.setAttribute('aria-pressed',String(s===key));}
  details(a,s,detail);if(mobile){detail.focus({preventScroll:true});detail.scrollIntoView({block:'nearest'});}
 }
 for(const [sym,label,body] of b.priorities){
  const button=el('button',null,'action');button.type='button';const copy=el('span');copy.append(el('strong',sym+'　'+label),el('small',body));button.append(copy,el('span','↗'));button.onclick=()=>{if(buttons.get(sym)?.hidden)list.querySelector('.filters button')?.click();pick(sym,true);};actions.append(button);
 }
 lead.append(actions,el('small','適用至 '+new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(b.expires))+' 香港時間；港股以當地收市為限。','meta'));
 snap.append(el('p',a.asOf+' 確認 · '+a.broker,'meta'));
 fact(snap,a.balanceNote?'資產淨值 · '+a.balanceNote:'資產淨值',a.navDisplay||money(a.nav,a.currency));
 fact(snap,a.cashDisplay?'美元現金':'現金總值',a.cashDisplay||money(a.cash,a.currency));
 fact(snap,'已確認持倉',a.positions.length+' 隻');snap.append(el('p',a.note,'meta'));
 const rows=el('div',null,'rows');
 for(const sym of syms){
  const s=b.stocks[sym],btn=el('button',null,'stockrow'),identity=el('span'),price=el('span');
  btn.type='button';identity.append(el('strong',sym),el('small',s.name));const last=s.series.at(-1);
  price.append(el('strong',last?num(last[1]):'待核'),el('small',s.label));btn.append(identity,price);btn.onclick=()=>pick(sym,window.matchMedia('(max-width:760px)').matches);buttons.set(sym,btn);rows.append(btn);
 }
 if(a.large||b.watchlist?.length){const filters=el('div',null,'filters'),choices=a.large?[['全部',()=>true],['港股',s=>/^\d/.test(s)],['美股',s=>!/^\d/.test(s)]]:[['全部',()=>true],['持倉',s=>!b.watchlist.includes(s)],['自選',s=>b.watchlist.includes(s)]];
 for(const [name,test] of choices){const btn=el('button',name);btn.type='button';btn.setAttribute('aria-pressed',String(name==='全部'));btn.onclick=()=>{for(const c of filters.children)c.setAttribute('aria-pressed',String(c===btn));for(const [sym,row] of buttons)row.hidden=!test(sym);pick(syms.find(test));};filters.append(btn);}list.append(filters);}
 list.append(el('p','揀一隻睇走勢、條件同風險。','meta'),rows);
 const past=el('details',null,'module history');past.append(el('summary','上次部署紀錄 · '+a.review.date));for(const i of a.review.items)note(past,i.title,i.body);
 const held=el('details',null,'module history');held.append(el('summary','持倉明細 · '+a.asOf));const wrap=el('div',null,'holder'),t=el('table');const hdr=t.createTHead().insertRow();for(const item of ['股票','股數','平均成本','截圖市值'])hdr.append(el('th',item));const body=t.createTBody();for(const p of a.positions){const tr=body.insertRow();for(const x of [p.symbol,num(p.qty),money(p.cost,p.currency),money(p.value,p.currency)])tr.append(el('td',x));}wrap.append(t);held.append(wrap);
 const mix=exposure(a),news=bulletin(b),ideas=candidates(b),sheet=el('div',null,'sheet'),area=el('div',null,'workarea');
 grid.append(lead,mix,news,ideas,snap,list,detail,held,past);sheet.append(head,grid);
 area.append(navigation([['部署','▦',lead],['分布','◔',mix],['新聞','≡',news],['新股','◇',ideas],['持股','▤',list]]),sheet);root.replaceChildren(area);pick(b.priorities[0][0]);
}
