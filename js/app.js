const $=s=>document.querySelector(s);
let db=JSON.parse(localStorage.getItem('velanChit')||'null')||{members:[],chits:[],pay:{}};
const save=()=>localStorage.setItem('velanChit',JSON.stringify(db));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const rs=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nm=id=>(db.members.find(x=>x.id==id)||{}).name||'-';
const getC=id=>db.chits.find(c=>c.id==id);
const key=(c,m,id)=>c.id+'_'+m+'_'+id;
const base=c=>c.value/c.months;
const winnerOf=(c,m)=>c.rounds[m]&&c.rounds[m].winner;
const div=(c,m)=>(c.rounds[m]&&c.rounds[m].dividend)||0;
const wonBy=(c,m,id)=>{for(let k=0;k<=m;k++)if(winnerOf(c,k)==id)return true;return false};
const due=(c,m,id)=>base(c)-(wonBy(c,m,id)?0:div(c,m));
const curM=c=>{const s=new Date(c.start),n=new Date();return Math.min(c.months-1,Math.max(0,(n.getFullYear()-s.getFullYear())*12+n.getMonth()-s.getMonth()))};
const nextM=c=>{for(let m=0;m<c.months;m++)if(!winnerOf(c,m))return m;return -1};
let tab='home',view=null,auc=null;

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;view=null;render()});
function render(){
 $('#title').textContent={home:'Dashboard',mem:'Members',chit:'Chits',auc:'Auction',set:'Settings'}[tab];
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
 $('#fab').style.display=(tab=='mem'||(tab=='chit'&&!view))?'block':'none';
 $('#main').innerHTML=({home:vHome,mem:vMem,chit:vChit,auc:vAuc,set:vSet}[tab])();
}
const empty=t=>`<div class="empty">${t}</div>`;
function modal(h){$('#modal').innerHTML=`<div class="sheet">${h}<button class="btn" onclick="closeM()">Done</button></div>`;$('#modal').classList.add('open')}
function closeM(){$('#modal').classList.remove('open');render()}
function addNew(){tab=='mem'?memForm():chitForm()}

function vHome(){
 let col=0,pen=0;
 db.chits.forEach(c=>{const cur=curM(c);for(let m=0;m<c.months;m++)c.members.forEach(id=>{const d=due(c,m,id);if(db.pay[key(c,m,id)])col+=d;else if(m<=cur)pen+=d})});
 let h=`<div class="grid"><div class="stat s1"><b>${db.members.length}</b><span>Members</span></div><div class="stat s2"><b>${db.chits.length}</b><span>Chits</span></div><div class="stat s3"><b>${rs(col)}</b><span>Collected</span></div><div class="stat s4"><b>${rs(pen)}</b><span>Pending dues</span></div></div><h3>Active chits</h3>`;
 if(!db.chits.length)return h+empty('No chits yet. Add members, then create a chit.');
 return h+db.chits.map(c=>{const d=c.members.length?Math.round(100*Object.keys(c.rounds).filter(m=>c.rounds[m].winner).length/c.months):0;
  return `<div class="card" onclick="tab='chit';view='${c.id}';render()"><div><strong>${esc(c.name)}</strong><small>${rs(c.value)} • ${c.type=='fixed'?'Fixed':'Auction'}</small><div class="bar"><i style="width:${d}%"></i></div></div><span class="pill v">${d}%</span></div>`}).join('');
}
function vMem(){
 if(!db.members.length)return empty('No members yet. Tap + to add one.');
 return db.members.map(m=>`<div class="card"><div class="av">${esc(m.name[0]).toUpperCase()}</div><div><strong>${esc(m.name)}</strong><small>${esc(m.phone||'No phone')}</small></div><button class="pill" style="border:0" onclick="delMem('${m.id}')">Delete</button></div>`).join('');
}
function memForm(){modal(`<h3>New member</h3><label>Name</label><input id="mn"><label>Phone</label><input id="mp" type="tel"><button class="btn g" onclick="saveMem()">Save member</button>`)}
function saveMem(){const n=$('#mn').value.trim();if(!n)return alert('Enter a name');db.members.push({id:uid(),name:n,phone:$('#mp').value.trim()});save();closeM()}
function delMem(id){if(db.chits.some(c=>c.members.includes(id)))return alert('This member is in a chit. Remove the chit first.');if(confirm('Delete member?')){db.members=db.members.filter(m=>m.id!=id);save();render()}}

function vChit(){
 if(view)return vDetail(getC(view));
 if(!db.chits.length)return empty('No chits yet. Tap + to create one.');
 return db.chits.map(c=>`<div class="card" onclick="view='${c.id}';render()"><div class="mo" style="background:${c.type=='fixed'?'#6366f1':'#ec4899'}">${c.type=='fixed'?'F':'A'}</div><div><strong>${esc(c.name)}</strong><small>${rs(c.value)} • ${c.months} months • ${rs(base(c))}/month</small></div><button class="pill" style="border:0" onclick="event.stopPropagation();delChit('${c.id}')">Delete</button></div>`).join('');
}
function delChit(id){if(confirm('Delete this chit and its payments?')){db.chits=db.chits.filter(c=>c.id!=id);save();render()}}
function chitForm(){
 if(db.members.length<2)return alert('Add at least 2 members first');
 modal(`<h3>New chit</h3><label>Name</label><input id="cn"><label>Chit value (₹)</label><input id="cv" type="number"><label>Months (= number of members)</label><input id="cm" type="number"><label>Type</label><select id="ct"><option value="fixed">Fixed chit</option><option value="auction">Auction chit (dividend)</option></select><label>Commission %</label><input id="cc" type="number" value="5"><label>Start date</label><input id="cd" type="date" value="${new Date().toISOString().slice(0,10)}"><label>Members</label>${db.members.map(m=>`<label class="chk"><input type="checkbox" class="cmem" value="${m.id}"><span>${esc(m.name)}</span></label>`).join('')}<button class="btn g" onclick="saveChit()">Create chit</button>`);
}
function saveChit(){
 const ids=[...document.querySelectorAll('.cmem:checked')].map(x=>x.value),v=+$('#cv').value,mo=+$('#cm').value,n=$('#cn').value.trim();
 if(!n||v<=0||mo<2)return alert('Fill name, value and months');
 if(ids.length!=mo)return alert('Select exactly '+mo+' members (one per month)');
 db.chits.push({id:uid(),name:n,value:v,months:mo,type:$('#ct').value,comm:+$('#cc').value||0,start:$('#cd').value,members:ids,rounds:{}});save();closeM()
}
function vDetail(c){
 let h=`<button class="back" onclick="view=null;render()">‹ Back</button><div class="hero ${c.type}"><h2>${esc(c.name)}</h2><p>${rs(c.value)} • ${c.months} months • ${c.type=='fixed'?'Fixed':'Auction'}</p></div>`;
 for(let m=0;m<c.months;m++){const w=winnerOf(c,m),p=c.members.filter(id=>db.pay[key(c,m,id)]).length;
  h+=`<div class="row" onclick="openMonth('${c.id}',${m})"><div class="mo">${m+1}</div><div><strong>${w?esc(nm(w)):'Winner pending'}</strong><small>${rs(base(c))}${c.type=='auction'&&w?' • dividend '+rs(div(c,m)):''}</small></div><span class="pill ${p==c.members.length?'g':''}">${p}/${c.members.length} paid</span></div>`}
 return h;
}
function openMonth(cid,m){
 const c=getC(cid);let h=`<h3>Month ${m+1}</h3>`;
 if(c.type=='fixed')h+=`<label>Winner</label><select onchange="setW('${cid}',${m},this.value)"><option value="">Select winner</option>${c.members.map(id=>`<option value="${id}" ${winnerOf(c,m)==id?'selected':''}>${esc(nm(id))}</option>`).join('')}</select>`;
 else h+=`<p class="muted">Winner by auction: ${winnerOf(c,m)?esc(nm(winnerOf(c,m))):'not held yet'}</p>`;
 h+=`<p class="muted">Tick when paid</p>`+c.members.map(id=>`<label class="chk"><input type="checkbox" ${db.pay[key(c,m,id)]?'checked':''} onchange="togglePay('${cid}',${m},'${id}',this.checked)"><span>${esc(nm(id))}</span><b>${rs(due(c,m,id))}</b></label>`).join('');
 modal(h);
}
function setW(cid,m,v){const c=getC(cid);if(v)c.rounds[m]={winner:v,dividend:0};else delete c.rounds[m];save()}
function togglePay(cid,m,id,on){const k=key(getC(cid),m,id);on?db.pay[k]=1:delete db.pay[k];save()}

function vAuc(){
 const cs=db.chits.filter(c=>c.type=='auction');
 if(!cs.length)return empty('Create an auction chit first.');
 if(!auc||!getC(auc.cid)){const c=cs[0];auc={cid:c.id,m:nextM(c),st:'idle',bids:[]}}
 const c=getC(auc.cid);
 let h=`<label>Chit</label><select onchange="pickAuc(this.value)">${cs.map(x=>`<option value="${x.id}" ${x.id==c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`;
 if(auc.m<0)return h+empty('All months of this chit are done 🎉');
 h+=`<div class="hero auction"><h2>Month ${auc.m+1} auction</h2><p>Chit value ${rs(c.value)} • commission ${c.comm}%</p></div>`;
 if(auc.st=='idle')return h+`<button class="btn g" onclick="auc.st='live';render()">▶ Start auction</button>`;
 if(auc.st=='live')return h+`<span class="pill">LIVE</span><label>Member</label><select id="bm">${c.members.filter(id=>!wonBy(c,auc.m,id)).map(id=>`<option value="${id}">${esc(nm(id))}</option>`).join('')}</select><label>Bid: amount member will take (₹)</label><input id="ba" type="number"><button class="btn" onclick="addBid()">Add bid</button>${auc.bids.map(b=>`<div class="row"><div><strong>${esc(nm(b.m))}</strong></div><b>${rs(b.a)}</b></div>`).join('')}<button class="btn r" onclick="stopAuc()">■ Stop and get result</button>`;
 const r=auc.res;
 return h+`<div class="card"><div><strong>🏆 ${esc(nm(r.winner))}</strong><small>Takes ${rs(r.bid)}</small></div></div><div class="grid"><div class="stat s2"><b>${rs(r.d)}</b><span>Discount</span></div><div class="stat s4"><b>${rs(r.cm)}</b><span>Commission</span></div><div class="stat s3"><b>${rs(r.dv)}</b><span>Dividend each</span></div><div class="stat s1"><b>${rs(base(c)-r.dv)}</b><span>Others pay</span></div></div><button class="btn" onclick="auc=null;render()">Next auction</button>`;
}
function pickAuc(id){const c=getC(id);auc={cid:id,m:nextM(c),st:'idle',bids:[]};render()}
function addBid(){const a=+$('#ba').value,c=getC(auc.cid);if(!a||a<=0||a>c.value)return alert('Bid must be between 1 and '+c.value);const m=$('#bm').value;auc.bids=auc.bids.filter(b=>b.m!=m);auc.bids.push({m,a});render()}
function stopAuc(){
 const c=getC(auc.cid);if(!auc.bids.length)return alert('Add at least one bid');
 const w=auc.bids.reduce((x,y)=>y.a<x.a?y:x),d=c.value-w.a,cm=c.value*c.comm/100,dv=Math.max(0,(d-cm)/c.members.length);
 c.rounds[auc.m]={winner:w.m,bid:w.a,dividend:dv};save();auc.res={winner:w.m,bid:w.a,d,cm,dv};auc.st='done';render();
}
function vSet(){return `<button class="btn g" onclick="backup()">⬇ Backup data</button><label style="display:block;margin-top:14px">Restore from backup</label><input type="file" accept=".json" onchange="restore(this.files[0])"><button class="btn r" onclick="if(confirm('Delete ALL data?')){db={members:[],chits:[],pay:{}};save();render()}">Reset all data</button><p class="muted" style="margin-top:14px">Data is stored only in this browser. Back up often.</p>`}
function backup(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));a.download='velan-chit-backup.json';a.click()}
function restore(f){if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.members||!d.chits)throw 0;db=d;save();render();alert('Restored')}catch(e){alert('Invalid backup file')}})}
render();
