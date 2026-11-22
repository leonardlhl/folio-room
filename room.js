const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const cash = (v, currency) => v == null ? '待核實' :
  new Intl.NumberFormat('en-HK',{style:'currency',currency,currencyDisplay:'code'}).format(v);
const number = value => Number(value).toLocaleString('en-HK',{maximumFractionDigits:4});
const bytes = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
let book, revision = 0, selected = null, visit = null;
function lock() {
  revision++; book = null; selected = null; visit = null; $('pass').value = ''; $('pass').type = 'password';
  $('reveal').textContent='顯示'; $('reveal').setAttribute('aria-pressed','false');
  $('members').replaceChildren(); $('panel').replaceChildren(); $('room').hidden=true;
  $('gate').hidden=false; $('lock').hidden=true; $('feedback').textContent='';
  $('form').querySelector('[type=submit]').disabled=false;
}
$('lock').addEventListener('click',()=>{lock();$('pass').focus()});
window.addEventListener('pagehide',lock);
$('reveal').addEventListener('click',()=>{
  const show=$('pass').type==='password'; $('pass').type=show?'text':'password';
  $('reveal').textContent=show?'隱藏':'顯示'; $('reveal').setAttribute('aria-pressed',String(show));
});
$('form').addEventListener('submit',async ev=>{
  ev.preventDefault();
  const run=++revision, button=ev.currentTarget.querySelector('[type=submit]');
  button.disabled=true; $('feedback').textContent='解鎖中…';
  let stage='load';
  try{
    const response=await fetch('./report.enc.json',{cache:'no-store',credentials:'omit'});
    if(!response.ok) throw Error('load');
    const enc=await response.json();
    if(enc.v!==1 || enc.iterations!==600000) throw Error('format');
    stage='unlock';
    const input=await crypto.subtle.importKey('raw',new TextEncoder().encode($('pass').value.trim()),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:enc.iterations,salt:bytes(enc.salt)},input,{name:'AES-GCM',length:256},false,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(enc.iv)},key,bytes(enc.data));
    if(run!==revision) return;
    book=JSON.parse(new TextDecoder().decode(plain)); $('pass').value='';
    visit=crypto.randomUUID(); showChooser(); $('gate').hidden=true; $('room').hidden=false; $('lock').hidden=false;
    $('choose-title').focus();
  }catch{
    if(run!==revision) return;
    book=null; $('feedback').textContent=stage==='load'?'讀取報告失敗，請重新整理再試。':'解鎖失敗，請核對密碼；如密碼正確，請重新載入報告。';
  }finally{if(run===revision)button.disabled=false;}
});
function card(title,cls=''){
  const n=el('section',undefined,'card '+cls);n.append(el('h2',title));return n;
}
function portfolio(a){
  const box=card('戶口快照','wide'),grid=el('div',undefined,'statgrid');
  for(const [label,value] of [['帳戶淨值',cash(a.nav,a.currency)],['現金總值',cash(a.cash,a.currency)],['持倉數目',a.positions.length+' 隻']]){
    const stat=el('div',undefined,'stat');stat.append(el('small',label),el('strong',value));grid.append(stat);
  }box.append(grid);
  const ranked=a.positions.filter(p=>Number.isFinite(p.weight)).sort((x,y)=>y.weight-x.weight).slice(0,3);
  if(ranked.length===3 && ranked.every(p=>p.weight>=0) && ranked.reduce((s,p)=>s+p.weight,0)<=100){
    const parts=ranked.map(p=>[p.symbol,p.weight]);parts.push(['其他及現金',100-ranked.reduce((s,p)=>s+p.weight,0)]);
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 100 2');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('bars');
    const legend=el('div',undefined,'legend');let start=0;
    parts.forEach(([label,weight],i)=>{const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',String(start));rect.setAttribute('y','0');rect.setAttribute('width',String(weight));rect.setAttribute('height','2');rect.setAttribute('fill',['#5672a9','#99b2da','#b8cdbf','#dbe0e7'][i]);svg.append(rect);start+=weight;legend.append(el('span',label+' '+weight.toFixed(1)+'%','l'+i));});box.append(svg,legend);
  }
  box.append(el('p',a.note,'note'));return box;
}
function holdings(a){
  const details=el('details',undefined,'card wide'); details.open=!a.large;
  details.append(el('summary','持倉明細 · '+a.positions.length+' 隻'));
  const scroll=el('div',undefined,'holder'), table=el('table'), head=table.createTHead().insertRow();
  for(const label of ['股票','股數','截圖價','平均成本','截圖市值']){const th=el('th',label);th.scope='col';head.append(th);}
  const body=table.createTBody();
  for(const p of a.positions){const row=body.insertRow();for(const v of [p.symbol,number(p.qty),cash(p.price,p.currency),cash(p.cost,p.currency),cash(p.value,p.currency)])row.append(el('td',v));}
  scroll.append(table);details.append(scroll);return details;
}
function showChooser(returnTo = null) {
  selected = null;
  $('panel').replaceChildren();
  $('detail').hidden = true;
  $('chooser').hidden = false;
  const nav = $('members');
  nav.replaceChildren();
  book.accounts.forEach((person, i) => {
    const button = el('button', undefined, 'member member-' + i);
    button.type = 'button';
    const badge = el('span', person.name.slice(0, 1), 'monogram');
    const arrow = el('span', '↗', 'enter-arrow');
    badge.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(badge, el('strong', person.name), arrow);
    button.addEventListener('click', () => {
      history.pushState({folioVisit:visit, account:i}, '');
      showAccount(i);
    });
    nav.append(button);
  });
  if (returnTo !== null) nav.children[returnTo]?.focus();
}
function showAccount(index) {
  const a = book.accounts[index], panel = $('panel');
  selected = index;
  $('chooser').hidden = true;
  $('detail').hidden = false;
  const title=el('div',undefined,'title'),h=el('h1',a.name+' 嘅報告');h.tabIndex=-1;
  title.append(h,el('p',a.broker+' · 持倉截至 '+a.asOf,'sub'));
  const grid=el('div',undefined,'board'+(a.large?' large':''));
  const focus=card(a.large?'買賣簡表':'最近部署'),tl=card('覆核時間線');
  focus.append(el('p',a.review.date+' 嘅紀錄','short when'));
  for(const item of a.review.items){const row=el('div',undefined,'decision');row.append(el('b',item.title),el('p',item.body));focus.append(row);}
  for(const e of a.timeline){const row=el('div',undefined,'event');row.append(el('span',e.date,'when'),el('b',e.title),el('p',e.body));tl.append(row);}
  if(a.large)grid.append(focus,tl,portfolio(a));else grid.append(portfolio(a),focus,tl);
  grid.append(holdings(a));panel.replaceChildren(title,grid);h.focus();
}

$('back').addEventListener('click', () => {
  if (history.state?.folioVisit === visit && selected !== null) history.back();
  else showChooser(selected);
});
window.addEventListener('popstate', event => {
  if (!book) return;
  const state = event.state;
  if (state?.folioVisit === visit && Number.isInteger(state.account) && book.accounts[state.account]) {
    showAccount(state.account);
  } else {
    showChooser(selected);
  }
});
