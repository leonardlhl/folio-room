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
  draw(payload.account);$('gate').hidden=true;$('room').hidden=false;$('lock').hidden=shared;$('pass').value='';$('report-title').focus({preventScroll:true});window.scrollTo(0,0);
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
 for(const y of [29,71.5,114]){shape('line',{x1:9,x2:425,y1:y,y2:y,stroke:'#e9e9ef','stroke-dasharray':'3 4'});shape('text',{x:436,y:y+4,fill:'#596979','font-size':11},(min+(114-y)*space/85).toFixed(2));}
 const rising=values.at(-1)>=values[0],ink=rising?'#159d85':'#8a69c7';
 const defs=shape('defs',{}),gradient=document.createElementNS(ns,'linearGradient');
 gradient.id='price-wash';gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');
 for(const [offset,opacity] of [['0%','.36'],['100%','.015']]){
  const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',rising?'#46d6b8':'#c0a5f0');stop.setAttribute('stop-opacity',opacity);gradient.append(stop);
 }
 defs.append(gradient);
 const points=xy.map(p=>p.join(',')).join(' ');shape('polygon',{points:'9,129 '+points+' 423,129',fill:'url(#price-wash)'});
 shape('polyline',{points,fill:'none',stroke:ink,'stroke-width':2.8,'stroke-linejoin':'round'});
 xy.forEach(([x,y],i)=>{const p=shape('circle',{cx:x,cy:y,r:i===xy.length-1?4:2.6,fill:ink});const t=document.createElementNS(ns,'title');t.textContent=series[i].join(' · ');p.append(t);});
 const cap=el('figcaption');cap.append(el('span',series[0][0]),el('span','收市 · '+series.length+' 個觀察日'),el('span',series.at(-1)[0]));area.append(svg,cap);return area;
}
const hkTime = new Intl.DateTimeFormat('zh-HK', {
 timeZone:'Asia/Hong_Kong', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
});
function priceText(value) {
 const fragment=document.createDocumentFragment();
 const amounts=/(?:US\$|HK\$|USD\s*|HKD\s*|\$)\s*\d+(?:,\d{3})*(?:\.\d+)?/gi;
 let cursor=0;
 for(const match of value.matchAll(amounts)){
  fragment.append(value.slice(cursor,match.index),el('strong',match[0],'trade-amount'));
  cursor=match.index+match[0].length;
 }
 fragment.append(value.slice(cursor));
 return fragment;
}
function tradeLevels(brief, symbol, summary) {
 const stock=brief.stocks[symbol], levels=stock.levels||{};
 const ends=levels.until||brief.expires;
 const box=el('article',null,'trade-row');
 const top=el('div',null,'trade-name');
 top.append(el('strong',symbol+' · '+stock.name));
 const time=el('time',null,'trade-time');time.dateTime=ends;if(stock.currency==='HKD'&&!levels.until)time.dataset.localClose='true';top.append(time);
 const fields=el('dl',null,'trade-fields');
 for(const [label,value] of [['買入／加倉',levels.buy],['賣出／減倉',levels.sell]]){
  const field=el('div'),description=el('dd');
  description.append(priceText(value||'今期未列價'));
  field.append(el('dt',label),description);fields.append(field);
 }
 const observation=el('p',null,'trade-trigger');
 observation.append(el('span','觀察條件','trade-prefix'),priceText(levels.trigger||summary||stock.watch||''));
 box.append(top,fields,observation);
 if(levels.risk){
  const risk=el('p',null,'trade-risk');risk.append(priceText(levels.risk));box.append(risk);
 }
 return box;
}
function refreshLevelTimes(){
 for(const stamp of document.querySelectorAll('.trade-time')){
  const deadline=new Date(stamp.dateTime),expired=Date.now()>=deadline.getTime();
  stamp.textContent=(expired?'已到期 · ':'至 ')+hkTime.format(deadline)+' 香港時間'+(stamp.dataset.localClose?' · 港股以當地收市為限':'');
  stamp.closest('.trade-row').classList.toggle('archived',expired);
 }
}
window.setInterval(refreshLevelTimes,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshLevelTimes();});

function details(a,sym,host){
 const s=a.brief.stocks[sym],p=a.positions.find(x=>x.symbol===sym),series=s.series,last=series.at(-1),previous=series.at(-2);
 host.replaceChildren();host.tabIndex=-1;
 const flag=el('span',s.label,'pill'),top=el('div',null,'spread');top.append(el('span',p?'已確認持倉 · '+num(p.qty)+' 股':'自選觀察 · 未持有','kicker'),flag);
 const h=el('h3',sym+'　'+s.name),price=el('div',null,'quote');
 price.append(el('strong',last?money(last[1],s.currency):'收市價待核'));
 if(last&&previous){const v=(last[1]/previous[1]-1)*100;price.append(el('span',(v>=0?'+':'')+v.toFixed(2)+'%','move '+(v>=0?'gain':'loss')));}
 host.append(top,h,price,el('p',last?last[0]+' 正式收市'+(previous?' · 變幅對比 '+previous[0]:''):'未有可核實嘅收市價同變幅。','meta'));
 host.append(tradeLevels(a.brief,sym));if(host.isConnected)refreshLevelTimes();
 host.append(chart(series));note(host,'點睇',s.reason);note(host,'下一步睇咩',s.watch);note(host,'幾時要重估',s.risk);
 if(s.range)note(host,'最近已核實全日低位／高位',money(s.range[1],s.currency)+' ／ '+money(s.range[0],s.currency));
 if(p){const parts=[p.price==null&&p.qty>0&&Number.isFinite(p.value)?'截圖每股約 '+money(p.value/p.qty,p.currency):null,p.cost!=null?'平均成本 '+money(p.cost,p.currency):null,p.value!=null?'市值 '+money(p.value,p.currency):null].filter(Boolean);if(parts.length)note(host,'持倉快照 · '+a.asOf,parts.join('　'));}
 if(s.sources.length){const nav=el('div',null,'sources');for(const source of s.sources){const l=el('a',source.label+' ↗');l.href=source.url;l.target='_blank';l.rel='noopener noreferrer';nav.append(l);}host.append(nav);}
}

// Use the same hue for a holding's sectors and legend marker.
const colors=['#57b3ee','#ffad77','#ae90e8','#64cdb8','#f58fa3','#f4c557','#97a5ec','#42b7c7','#da91cc','#a8c576','#f39970','#a193d5','#73c4db','#d6ae63'];
function svgNode(tag,attrs){
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
 return node;
}
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
 const legend=el('div',null,'mixlegend'),readout=el('p',null,'readout');readout.setAttribute('aria-live','polite');
 const segments=[],buttons=[];
 function select(i){
  const p=items[i];cap.textContent=p.symbol;big.textContent=(100*p.base/total).toFixed(1)+'%';
  readout.textContent=p.symbol+' · '+num(p.qty)+' 股 · '+money(p.value,p.currency)+(p.currency!==currency?' ≈ '+money(p.base,currency):'');
  buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
  segments.forEach((g,j)=>g.classList.toggle('selected',j===i));
 }
 let used=0;
 items.forEach((p,i)=>{
  const share=p.base/total*100,color=colors[i%colors.length],gap=Math.min(.45,share*.08);
  const segment=svgNode('g',{class:'slice'}),arc={cx:50,cy:50,pathLength:100,fill:'none',stroke:color,'stroke-dasharray':(share-gap)+' '+(100-share+gap),'stroke-dashoffset':-used,transform:'rotate(-90 50 50)'};
  for(const [r,w,alpha] of [[27.6,7.4,.22],[34.6,5.4,.4],[40.7,4,.61]]){
   segment.append(svgNode('circle',{...arc,r,'stroke-width':w,'stroke-opacity':alpha}));
  }
  const angle=(used+share/2)*Math.PI/50-Math.PI/2;
  const marker=svgNode('circle',{cx:50+44.1*Math.cos(angle),cy:50+44.1*Math.sin(angle),r:share>=3?1.4:.8,fill:color});
  segment.append(marker);
  const hit=svgNode('circle',{...arc,r:34,'stroke-width':21,'stroke-opacity':0,'pointer-events':'stroke'});segment.append(hit);
  segment.addEventListener('click',()=>select(i));segments.push(segment);svg.append(segment);used+=share;
  const b=el('button',null,'legenditem'),dot=svgNode('svg',{width:14,height:14,viewBox:'0 0 14 14','aria-hidden':true});
  dot.append(svgNode('circle',{cx:7,cy:7,r:6.7,fill:color,'fill-opacity':.25}),svgNode('circle',{cx:7,cy:7,r:3.4,fill:color}));
  b.append(dot,el('span',account.large?(account.brief.stocks[p.symbol]?.name||p.symbol)+' · '+p.symbol:p.symbol),el('strong',share.toFixed(1)+'%'));
  b.type='button';b.onclick=()=>select(i);buttons.push(b);legend.append(b);
 });
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
 const b=el('button');b.type='button';const glyph=svgNode('svg',{class:'navglyph',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.65,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':true});
 glyph.append(svgNode('path',{d:icon}));b.append(glyph,el('span',title));
 b.setAttribute('aria-pressed',String(nav.children.length===0));b.onclick=()=>{for(const sibling of nav.children)sibling.setAttribute('aria-pressed',String(sibling===b));target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});};nav.append(b);}
 return nav;
}

function moverCard(account,showSecurity){
 const move=account.mover,position=account.positions.find(p=>p.symbol===move?.symbol);
 if(!position || !Number.isFinite(move.change))return null;
 const card=el('section',null,'mover');
 card.setAttribute('aria-label','持倉焦點');
 const daily=move.kind==='daily', rising=move.change>0;
 const magnitude=(rising?'＋':'−')+money(Math.abs(move.change),move.currency);
 const title=el('h2',move.symbol+' · '+(daily?(rising?'當日盈利貢獻最大':'當日虧損影響最大'):(rising?'持倉市值增加最多':'持倉市值減少最多')));
 const head=el('div',null,'mover-heading');
 head.append(el('span','持倉焦點','mover-label'),title);
 const stat=el('strong',magnitude,'mover-stat '+(rising?'positive':'negative'));
 const description=[];
 if(daily){
  description.push('券商當日盈虧');
  if(Number.isFinite(move.accountDayPL) && move.accountDayPL*move.change>0)
   description.push('佔戶口當日'+(rising?'升幅':'跌幅')+' '+num(Math.round(1000*move.change/move.accountDayPL)/10)+'%');
 }else{
  description.push('兩次截圖市值變動', (rising?'＋':'−')+Math.abs(move.percent).toFixed(1)+'%');
 }
 const basis=daily?move.to+' 截圖':move.from+' 至 '+move.to+' 截圖';
 const detail=el('button','睇 '+move.symbol+' 持倉','mover-detail');
 detail.type='button';detail.onclick=()=>showSecurity(move.symbol);
 const quote=position.price??(position.qty>0 && Number.isFinite(position.value)?position.value/position.qty:null);
 const reference=account.brief.stocks[move.symbol]?.series?.at(-1);
 if(daily && reference?.[1]>0 && reference[0]<move.to && Date.parse(move.to)-Date.parse(reference[0])<=7*86400000 && quote>0){
  const pct=(quote/reference[1]-1)*100;
  description.push('截圖價較 '+reference[0].slice(5).replace('-','/')+' 收市 '+(pct>=0?'＋':'−')+Math.abs(pct).toFixed(1)+'%');
 }
 const priceLabel=position.price==null?'每股折算約 ':'每股 ';
 const footer=el('div',null,'mover-foot');
 footer.append(el('span',basis+' · '+num(position.qty)+' 股'+(Number.isFinite(quote)?' · '+priceLabel+money(quote,move.currency):'')+
  (move.comparable<move.total?' · 可比較 '+move.comparable+'/'+move.total+' 隻':'')),detail);
 card.append(head,stat,el('p',description.join(' · '),'mover-basis'),footer);
 return card;
}

function paperPortfolio(data) {
 const box=frame('模擬投資組合','paper-portfolio');
 box.id='paper-portfolio';
 const title=box.firstElementChild;
 title.id='paper-portfolio-heading';
 box.setAttribute('aria-labelledby',title.id);

 const layout=el('div',null,'paper-layout');
 const journal=el('div',null,'paper-journal'),performance=el('aside',null,'paper-performance');
 layout.append(journal,performance);
 const dailyHead=el('div',null,'paper-daily-head');
 dailyHead.append(el('h3','每日模擬交易'));
 const choose=el('label','美股交易日','paper-date');
 const picker=el('select');
 for(const day of data.days){
  const option=el('option',day.date);
  option.value=day.date;
  picker.append(option);
 }
 choose.append(picker);
 dailyHead.append(choose);
 const daily=el('div',null,'paper-daily-body');
 daily.setAttribute('aria-live','polite');
 journal.append(dailyHead,daily);
 const pnl=n=>Number.isFinite(n)?(n>0?'+':'')+money(n,'USD'):'待核';

 function showTrades(title,trades) {
  daily.append(el('h4',title));
  if(!trades.length){
   daily.append(el('p','呢日暫無已記錄嘅模擬買賣。','meta'));
   return;
  }
  const holder=el('div',null,'paper-table-wrap'),table=el('table',null,'paper-table');
  table.setAttribute('aria-label',title);
  const header=table.createTHead().insertRow();
  for(const x of ['股票','狀態','股數','每股價','淨盈虧']){
   const th=el('th',x);th.scope='col';header.append(th);
  }
  const body=table.createTBody();
  for(const x of trades){
   const tr=body.insertRow(),details=el('td',x.action);
   if(x.detail)details.append(el('small',x.detail));
   tr.append(el('th',x.ticker),details,el('td',Number.isFinite(x.qty)?num(x.qty):'—'),
             el('td',Number.isFinite(x.price)?num(x.price):'—'),
             el('td',Number.isFinite(x.pnl)?pnl(x.pnl):'—',x.pnl>0?'positive':x.pnl<0?'negative':''));
   tr.firstElementChild.scope='row';
  }
  holder.append(table);
  daily.append(holder);
 }

 function showDay(){
  const d=data.days.find(day=>day.date===picker.value);
  daily.replaceChildren();
  if(!d){
   daily.append(el('p','暫無模擬紀錄。','meta'));
   return;
  }
  showTrades('共用現金組合',d.portfolio);
  showTrades('獨立單筆模擬',d.standalone);
  if(d.reconciliation?.nav==null && d.date>=data.nav?.date){
   daily.append(el('p',d.reconciliation?'全組合淨值仍待核對。':'呢日嘅全組合收市對帳仍待更新。','meta'));
  }
 }
 picker.addEventListener('change',showDay);
 showDay();

 performance.append(el('h3','累積盈虧'),
                    el('p','共用現金組合 · 已平倉淨額','paper-metric-label'),
                    el('strong',pnl(data.portfolio.net),'paper-net '+(data.portfolio.net<0?'negative':'positive')),
                    el('p','已核實 '+data.portfolio.closed+' 筆 · '+data.portfolio.wins+' 筆錄得淨利','meta'));
 const figures=el('dl',null,'paper-figures');
 for(const [label,value] of [
   ['起始模擬資金',money(data.startingCash,'USD')],
   ['已入帳模擬注資',money(data.deposits??0,'USD')],
   ['全組合淨值',Number.isFinite(data.nav?.nav)?money(data.nav.nav,'USD'):'待核'],
   ['可用模擬現金',Number.isFinite(data.nav?.cash)?money(data.nav.cash,'USD'):'待核'],
   ['獨立單筆累積淨額',pnl(data.standalone.net)]
 ]){
  const item=el('div');item.append(el('dt',label),el('dd',value));figures.append(item);
 }
 performance.append(figures,el('p','獨立單筆已平倉 '+data.standalone.closed+' 筆，每筆按 US$1,000 模擬。','meta'));
 if(data.nav?.date)performance.append(el('p','最近對帳 '+data.nav.date+' 美東收市','meta'));
 if(data.positions.length){
  const holdings=el('div',null,'paper-holdings');
  holdings.append(el('h4','模擬持倉狀態'));
  for(const position of data.positions){
   const copy=position.pending?'退出價待核':Number.isFinite(position.value)?
      '市值 '+money(position.value,'USD')+'；帳面 '+pnl(position.unrealized)+'（'+position.date+'）':'市值待核';
   holdings.append(el('p',position.ticker+' '+num(position.qty)+' 股 · '+copy,'meta'));
  }
  performance.append(holdings);
 }

 const review=el('div',null,'paper-review');
 if(data.lessons.length){
  const lessons=el('div',null,'paper-lessons');
  lessons.append(el('h3','覆盤筆記'));
  for(const x of data.lessons)note(lessons,x.title,x.body);
  review.append(lessons);
 }
 const follow=el('div',null,'paper-followup');
 follow.append(el('h3','待確認'));
 if(data.confirmation)note(follow,'需要你確認',data.confirmation);
 if(data.pendingEntries.length)note(follow,'待行情核對',data.pendingEntries.join('、')+' 嘅正式開市成交價有差異。');
 if(data.pendingExits.length)note(follow,'退出待核',data.pendingExits.join('、')+' 嘅退出價或入場前提仍待核。');
 if(!data.confirmation && !data.pendingEntries.length && !data.pendingExits.length)follow.append(el('p','目前無待確認項目。','meta'));
 review.append(follow);
 box.append(el('p','紙上交易紀錄 · 日期按美東交易日 · 金額以美元計','meta'),layout,review);
 return box;
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
 const metrics=el('div',null,'metrics');snap.append(metrics);
 fact(metrics,a.balanceNote?'資產淨值 · '+a.balanceNote:'資產淨值',a.navDisplay||money(a.nav,a.currency));
 fact(metrics,a.cashDisplay?'美元現金':'現金總值',a.cashDisplay||money(a.cash,a.currency));
 fact(metrics,'已確認持倉',a.positions.length+' 隻');snap.append(el('p',a.note,'meta'));
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
 const priceBoard=frame('買賣價位','priceboard');
 priceBoard.append(el('p',b.session+' 交易日 · 價位同條件按個人戶口列出','meta'));
 const priorityNotes=new Map(b.priorities.map(([sym,,summary])=>[sym,summary]));
 const shown=new Set([...priorityNotes.keys(),...syms.filter(sym=>b.stocks[sym].levels)]);
 const cards=el('div',null,'trade-cards');
 for(const sym of shown)cards.append(tradeLevels(b,sym,priorityNotes.get(sym)));
 priceBoard.append(cards);
 const mix=exposure(a),news=bulletin(b),ideas=candidates(b),sheet=el('div',null,'sheet'),area=el('div',null,'workarea');
 grid.append(priceBoard,snap,mix,lead,news,ideas,list,detail,held,past);
 const paper=a.paperDashboard?paperPortfolio(a.paperDashboard):null;
 if(paper)grid.append(paper);
 sheet.append(head);
 const mover=moverCard(a,symbol=>{
  if(buttons.get(symbol)?.hidden)list.querySelector('.filters button')?.click();
  pick(symbol,true);
 });
 if(mover)sheet.append(mover);
 sheet.append(grid);
 const links=[['價位','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',priceBoard],['分布','M10 3a9 9 0 1 0 11 11H10z M14 2v8h8a9 9 0 0 0-8-8z',mix],['新聞','M4 4h16v16H4z M7 8h10 M7 12h4 M14 12h3 M7 16h10',news],['新股','M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',ideas],['持股','M3 19h18 M6 15V9 M12 15V4 M18 15v-5',list]];
 if(paper)links.push(['模擬','M4 4h16v16H4z M7 15l4-4 2 2 4-5',paper]);
 const rail=navigation(links);
 if(paper)rail.classList.add('paper-enabled');
 area.append(rail,sheet);root.replaceChildren(area);pick(b.priorities[0][0]);refreshLevelTimes();
}
