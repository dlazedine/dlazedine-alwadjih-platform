/* PortalCloud: الدخول + المزامنة مع Supabase (يحلّ محلّ الحسابات المحلية) */

/* ---- الأرقام الغربية (0-9) في كل الصفحات: التواريخ والأعداد والحقول ---- */
(function(){const L=a=>(typeof a==='string'&&/^ar(-|$)/i.test(a));
const fix=(a,o)=>{o=Object.assign({},o||{});if(L(a)&&!o.numberingSystem){o.numberingSystem='latn'}return[a,o]};
['toLocaleString','toLocaleDateString','toLocaleTimeString'].forEach(m=>{const f=Date.prototype[m];Date.prototype[m]=function(a,o){const r=fix(a,o);return f.call(this,r[0],r[1])}});
const nf=Number.prototype.toLocaleString;Number.prototype.toLocaleString=function(a,o){const r=fix(a,o);return nf.call(this,r[0],r[1])};
const NF=Intl.NumberFormat;Intl.NumberFormat=function(a,o){const r=fix(a,o);return new NF(r[0],r[1])};Intl.NumberFormat.prototype=NF.prototype;Intl.NumberFormat.supportedLocalesOf=NF.supportedLocalesOf;
const DF=Intl.DateTimeFormat;Intl.DateTimeFormat=function(a,o){const r=fix(a,o);return new DF(r[0],r[1])};Intl.DateTimeFormat.prototype=DF.prototype;Intl.DateTimeFormat.supportedLocalesOf=DF.supportedLocalesOf;
const MAP={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
const RE=/[٠-٩۰-۹]/;const conv=t=>t.replace(/[٠-٩۰-۹]/g,c=>MAP[c]);
addEventListener('input',e=>{const el=e.target;if(!el||!/^(INPUT|TEXTAREA)$/.test(el.tagName)||e.isComposing)return;const ty=(el.type||'text').toLowerCase();if(!/^(text|search|tel|number|date|textarea|)$/.test(ty))return;
const v=el.value;if(typeof v!=='string'||!RE.test(v))return;const a=el.selectionStart,b=el.selectionEnd;el.value=conv(v);try{el.setSelectionRange(a,b)}catch(x){}},true);
window.toWesternDigits=conv})();
(function(){'use strict';const C=window.PORTAL_CFG,SH='00000000-0000-0000-0000-000000000000';
const EX=/session|portalUser|^sb-|firebase|avatar|media_files|Logo|^pc_|^local_|redirect/i;
const rawSet=Storage.prototype.setItem,RL={inspector:'مفتش',supervisor:'مشرف',teacher:'أستاذ'};
let prof=null,pending={},pendAct={},timer=null,gest=0;
const ready=new Promise(res=>{const go=()=>res(window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY));
if(window.supabase&&window.supabase.createClient)go();else{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=go;document.head.appendChild(s)}});
const ts=()=>{try{return JSON.parse(localStorage.getItem('pc_ts')||'{}')}catch(e){return{}}};
['click','keydown','input','change','submit','pointerdown','touchstart'].forEach(e=>addEventListener(e,()=>{gest=Date.now()},true));
function mergeVal(a,b){try{const A=JSON.parse(a),B=JSON.parse(b),K=x=>x&&x.id!==undefined?'i'+x.id:JSON.stringify(x);
const M=(r,l)=>{const s=new Set(r.map(K));return r.concat(l.filter(x=>!s.has(K(x))))};
if(Array.isArray(A)&&Array.isArray(B))return JSON.stringify(M(A,B));
if(A&&B&&typeof A==='object'&&typeof B==='object'&&!Array.isArray(A)){const o={...A};for(const k in B)o[k]=Array.isArray(A[k])&&Array.isArray(B[k])?M(A[k],B[k]):(k in A?A[k]:B[k]);return JSON.stringify(o)}}catch(e){}return b}
async function pullShared(){if(!prof||document.hidden)return;const c=await ready;const{data}=await c.from('portal_data').select('key,value,updated_at').eq('shared',true);if(!data)return;
let s={};try{s=JSON.parse(localStorage.getItem('pc_seen')||'{}')}catch(e){}const ch=[];
data.forEach(r=>{const u=Date.parse(r.updated_at);if(s[r.key]===u)return;s[r.key]=u;let v=r.value;if(pending[r.key]){v=mergeVal(r.value,pending[r.key]);pending[r.key]=v}
if(localStorage.getItem(r.key)!==v){rawSet.call(localStorage,r.key,v);ch.push(r.key)}});
rawSet.call(localStorage,'pc_seen',JSON.stringify(s));if(ch.length)window.dispatchEvent(new CustomEvent('pc:synced',{detail:{keys:ch}}))}
setInterval(()=>{if(document.body&&document.body.classList.contains('niqash-page'))pullShared()},3000);
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===localStorage&&prof&&!EX.test(k)){const t=ts();t[k]=Date.now();rawSet.call(localStorage,'pc_ts',JSON.stringify(t));pending[k]=String(v);if(Date.now()-gest<8000)pendAct[k]=true;clearTimeout(timer);timer=setTimeout(flush,C.SHARED_KEYS.includes(k)?300:1500)}};
async function flush(){if(!prof)return;const c=await ready,now=Date.now(),iso=new Date(now).toISOString(),snap=pending,sa=pendAct;pending={};pendAct={};
const rows=Object.entries(snap).filter(([k,v])=>v.length<9e5).map(([k,v])=>{const sh=C.SHARED_KEYS.includes(k);return{owner:sh?SH:prof.id,key:k,value:v,shared:sh,updated_by:prof.id,updated_by_name:prof.full_name||prof.username,updated_by_role:prof.role,updated_at:iso,touched:!!sa[k]}});
if(!rows.length)return;let seen={};try{seen=JSON.parse(localStorage.getItem('pc_seen')||'{}')}catch(e){}
const sk=rows.filter(r=>r.shared).map(r=>r.key),ch=[];
try{if(sk.length){const{data:rm}=await c.from('portal_data').select('key,value,updated_at').eq('owner',SH).in('key',sk);
(rm||[]).forEach(x=>{if(seen[x.key]!==Date.parse(x.updated_at)){const r=rows.find(q=>q.key===x.key);r.value=mergeVal(x.value,r.value);rawSet.call(localStorage,x.key,r.value);ch.push(x.key)}})}
const T=rows.filter(r=>r.touched),F=rows.filter(r=>!r.touched).map(({touched,...o})=>o);let err=null;
if(T.length)err=(await c.from('portal_data').upsert(T)).error;if(!err&&F.length)err=(await c.from('portal_data').upsert(F)).error;if(err)throw err;
rows.forEach(r=>{if(r.shared)seen[r.key]=now});rawSet.call(localStorage,'pc_seen',JSON.stringify(seen));
if(ch.length)window.dispatchEvent(new CustomEvent('pc:synced',{detail:{keys:ch}}));
let le={};try{le=JSON.parse(localStorage.getItem('pc_ev')||'{}')}catch(e){}
const base={user_id:prof.id,user_name:prof.full_name||prof.username,user_role:prof.role};let ev=[];
T.filter(r=>!C.HIDE.test(r.key)).forEach(r=>{const d=detailEvents(r.key,r.value);
if(d&&d.length){d.forEach(x=>ev.push({...base,action:x[0],key:r.key,detail:x[1]}))}
else if(!d&&!(le[r.key]>now-6e4))ev.push({...base,action:le[r.key]?'update':'create',key:r.key})});
T.forEach(r=>le[r.key]=now);rawSet.call(localStorage,'pc_ev',JSON.stringify(le));if(ev.length)insAct(c,ev).then(()=>{},()=>{})}
catch(e){console.warn('sync',e.message||e);Object.keys(snap).forEach(k=>{if(pending[k]===undefined){pending[k]=snap[k];if(sa[k])pendAct[k]=true}})}}
async function pull(){const c=await ready;const{data,error}=await c.from('portal_data').select('key,value,owner,updated_at').in('owner',[prof.id,SH]);if(error||!data)return 0;
const t=ts();let n=0;data.forEach(r=>{if(r.owner!==SH&&r.owner!==prof.id)return;const u=Date.parse(r.updated_at);
if(localStorage.getItem(r.key)!==r.value&&(!t[r.key]||u>=t[r.key])){rawSet.call(localStorage,r.key,r.value);t[r.key]=u;n++}});rawSet.call(localStorage,'pc_ts',JSON.stringify(t));let sn={};try{sn=JSON.parse(localStorage.getItem('pc_seen')||'{}')}catch(e){}data.forEach(r=>{if(r.owner===SH)sn[r.key]=Date.parse(r.updated_at)});rawSet.call(localStorage,'pc_seen',JSON.stringify(sn));return n}
function saveSession(p){const u={id:p.id,username:p.username,fullName:p.full_name||p.username,role:p.role,email:'',school:p.school||''};
const j=JSON.stringify({user:u,startedAt:Date.now(),expiresAt:Date.now()+864e5});
sessionStorage.setItem('pgb_session',j);sessionStorage.setItem('portal_session_v2',j);rawSet.call(localStorage,'pgb_session_persistent',j);rawSet.call(localStorage,'portal_session_v2_persistent',j);
rawSet.call(localStorage,'portalUser',JSON.stringify({name:u.fullName,username:u.username,role:RL[p.role],email:'',school:u.school}));return u}
function clearSession(){['pgb_session','portal_session_v2'].forEach(k=>sessionStorage.removeItem(k));['pgb_session_persistent','portal_session_v2_persistent','portalUser'].forEach(k=>localStorage.removeItem(k))}
async function signOut(){try{await flush()}catch(e){}const c=await ready;await c.auth.signOut();clearSession();prof=null}
function forceChange(c){return new Promise(res=>{const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;display:flex;align-items:center;justify-content:center;direction:rtl;font-family:Tajawal,sans-serif';
const s='width:100%;padding:8px;margin:5px 0;border:1px solid #ccc;border-radius:8px;box-sizing:border-box';
d.innerHTML=`<div style="background:#fff;color:#222;padding:20px;border-radius:14px;width:min(92vw,380px)"><h3>🔐 تأمين الحساب</h3><p style="font-size:13px">اختر اسم مستخدم وكلمة مرور جديدين قبل المتابعة.</p><input id="pcU" placeholder="اسم مستخدم جديد (لاتيني)" style="${s}"><input id="pcP" type="password" placeholder="كلمة مرور جديدة (10 أحرف فأكثر)" style="${s}"><div id="pcE" style="color:#a01c2c;font-size:12px"></div><button id="pcB" style="${s};background:#1f3864;color:#fff;cursor:pointer">حفظ ومتابعة</button></div>`;
document.body.appendChild(d);const E=t=>d.querySelector('#pcE').textContent=t;
d.querySelector('#pcB').onclick=async()=>{const u=d.querySelector('#pcU').value.trim().toLowerCase(),p=d.querySelector('#pcP').value;
if(!/^[a-z0-9_.-]{4,30}$/.test(u)||/^(setup|inspector|admin|teacher|supervisor)/.test(u))return E('اسم غير مقبول: 4-30 حرفاً لاتينياً/أرقاماً، ولا يبدأ باسم جاهز أو setup');
if(p.length<10)return E('كلمة المرور قصيرة');
let r=await c.auth.updateUser({password:p});if(r.error)return E(r.error.message);
r=await c.rpc('wj_complete_first_login',{new_username:u});if(r.error)return E('الاسم مستعمل أو غير صالح');
prof.username=u;prof.must_change=false;d.remove();res()}})}
/* ---- إغلاق الموقع مؤقتاً (قيد الاعتماد): يظهر الإعلان للجميع ولا يدخل غير المفتش ----
   الحالة تُقرأ من جدول wajih_site_status (يتحكم بها المفتش من لوحة التحكم دون تعديل GitHub)،
   وقيمة PORTAL_CFG.SITE_LOCK احتياطية إن تعذّر الجدول (force:true تجعلها ملزمة مهما كان الجدول). */
const SLC=C.SITE_LOCK||{};let lock={locked:!!SLC.locked,message:SLC.message||''};
try{const k=JSON.parse(localStorage.getItem('pc_lock')||'null');if(k&&typeof k.locked==='boolean')lock=k}catch(e){}
const LOCKMSG='الموقع قيد المراجعة والاعتماد الرسمي. الدخول مغلق مؤقتاً حتى لأصحاب الحسابات، وسيُفتح فور الاعتماد. نعتذر عن الإزعاج.';
let lv={show:false,inspector:false},lw=0;
function lockUI(show,inspector){lv={show:!!show,inspector:!!inspector};
if(!document.body){if(!lw){lw=1;addEventListener('DOMContentLoaded',()=>{lw=0;drawLock()})}return}drawLock()}
function drawLock(){let d=document.getElementById('pc-lock');
if(!lv.show){if(d)d.remove();document.documentElement.style.overflow='';return}
if(!d){d=document.createElement('div');d.id='pc-lock';document.body.appendChild(d)}
const m=lock.message||SLC.message||LOCKMSG;
if(lv.inspector){d.removeAttribute('data-ov');d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#a01c2c;color:#fff;text-align:center;padding:5px 10px;font:12.5px/1.6 Tahoma,Arial,sans-serif;direction:rtl';d.textContent='وضع الإغلاق مفعّل: الموقع مغلق على الجميع ما عداك. الرسالة المعروضة: '+m;document.documentElement.style.overflow=''}
else{d.setAttribute('data-ov','1');d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0e2744;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;direction:rtl;font-family:Tajawal,Tahoma,Arial,sans-serif';
d.innerHTML='<div style="max-width:560px;background:#fff;color:#1f2a44;border-radius:18px;border-top:6px solid #c49b3f;padding:28px 24px;box-shadow:0 10px 40px #0008"><div style="font-size:42px">🔒</div><h2 style="margin:8px 0;color:#1f3864;font-size:20px">الوجيه في الإشراف التربوي</h2><p style="line-height:2;font-size:15px;margin:0 0 14px"></p><a href="#" id="pc-lock-adm" style="font-size:12px;color:#6b7280">دخول مدير المنصة</a></div>';
d.querySelector('p').textContent=m;document.documentElement.style.overflow='hidden';
d.querySelector('#pc-lock-adm').onclick=e=>{e.preventDefault();window.__lockBypass=true;lockUI(false)}}}
async function loadLock(){try{const c=await ready;const{data,error}=await c.from('wajih_site_status').select('locked,message').eq('id',1).maybeSingle();
if(!error&&data)lock={locked:!!data.locked||!!SLC.force,message:data.message||SLC.message||''};else if(SLC.force)lock.locked=true}catch(e){}
rawSet.call(localStorage,'pc_lock',JSON.stringify(lock));return lock}
async function enforceLock(){await loadLock();if(!lock.locked){lockUI(false);return false}
let p=null;try{p=await me()}catch(e){}
if(p&&p.role==='inspector'){lockUI(true,true);return false}
if(p){try{await signOut()}catch(e){}}
if(!window.__lockBypass)lockUI(true,false);return true}
if(lock.locked)lockUI(true,false);
const lockReady=enforceLock();
async function login(u,p){u=(u||'').trim().toLowerCase();if(!u||!p)return{success:false,error:'أدخل اسم المستخدم وكلمة المرور'};
const bad={success:false,error:'اسم المستخدم أو كلمة المرور غير صحيحة'},c=await ready;const L=await loadLock();
const{data:em}=await c.rpc('wj_email_for_username',{u});if(!em)return L.locked?{success:false,error:(L.message||LOCKMSG)+' (الدخول متاح لمدير المنصة فقط)'}:bad;
const{data,error}=await c.auth.signInWithPassword({email:em,password:p});if(error)return bad;
const{data:pr}=await c.from('wajih_profiles').select('*').eq('id',data.user.id).single();
if(!pr||!pr.active){await c.auth.signOut();return{success:false,error:'الحساب غير مفعّل'}}
if(L.locked&&pr.role!=='inspector'){await c.auth.signOut();window.__lockBypass=false;lockUI(true,false);return{success:false,error:L.message||LOCKMSG}}
if(L.locked)lockUI(true,true);
prof=pr;if(pr.must_change)await forceChange(c);const user=saveSession(prof);await pull();startPresence();return{success:true,user}}
const lastLog={};
async function insAct(c,rows){const r=await c.from('wajih_activity').insert(rows);
if(r.error&&/detail/i.test(r.error.message||'')){const st=rows.map(x=>{const o={...x};delete o.detail;return o});return c.from('wajih_activity').insert(st)}return r}
async function me(){if(prof)return prof;const c=await ready;const{data:s}=await c.auth.getSession();if(!s.session)return null;const{data}=await c.from('wajih_profiles').select('*').eq('id',s.session.user.id).single();if(data&&data.active)prof=data;return prof}
async function log(action,key,detail){try{if((action||'update')==='update'&&!detail){const n=Date.now();if(lastLog[key]&&n-lastLog[key]<60000)return;lastLog[key]=n}const c=await ready;const p=await me();
if(!p)return;await insAct(c,{user_id:p.id,user_name:p.full_name||p.username,user_role:p.role,action:action||'update',key:key,detail:detail||null})}catch(e){console.warn('log',e&&e.message||e)}}

/* ---- تفاصيل نشاطات منصة اللغة العربية: ما أُضيف أو عُدّل أو حُذف من مقاطع ومذكرات ---- */
const DOM={oral:'فهم المنطوق',written:'فهم المكتوب',grammar:'الظواهر اللغوية',production:'الإنتاج الكتابي'};
const hs=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h};
function items(k,v){try{const J=JSON.parse(v),o={};
if(k==='didactic_portal_segments'&&Array.isArray(J))J.forEach(x=>{if(x&&x.id)o[x.id]={l:'مقطع: '+(x.title||x.id),h:hs(JSON.stringify(x))}});
else if(k==='didactic_portal_memos'&&J&&typeof J==='object'){let segs=[];try{segs=JSON.parse(localStorage.getItem('didactic_portal_segments')||'[]')}catch(e){}
Object.keys(J).forEach(id=>{const m=/^memo_(.+)_([a-z]+)$/.exec(id),sg=m&&segs.find(z=>z.id===m[1]),d=J[id]||{};
o[id]={l:'مذكرة '+(m?(DOM[m[2]]||m[2]):'')+(sg?' — '+sg.title:'')+(d.teacher?' (الأستاذ: '+d.teacher+')':''),h:hs(JSON.stringify(d))}})}
else return null;return o}catch(e){return null}}
function detailEvents(k,v){const cur=items(k,v);if(!cur)return null;const sk='pc_snap:'+k;let prev=null;try{prev=JSON.parse(localStorage.getItem(sk)||'null')}catch(e){}
const snap={};Object.keys(cur).forEach(i=>snap[i]=cur[i].h);rawSet.call(localStorage,sk,JSON.stringify(snap));if(!prev)return[];
const out=[];Object.keys(cur).forEach(i=>{if(!(i in prev))out.push(['create',cur[i].l]);else if(prev[i]!==cur[i].h)out.push(['update',cur[i].l])});
Object.keys(prev).forEach(i=>{if(!(i in cur))out.push(['delete','حذف عنصر ('+i+')'])});return out.slice(0,20)}

/* ---- المتصلون الآن (Realtime Presence) ---- */
let pres=null;
const pagePayload=()=>({id:prof.id,name:prof.full_name||prof.username,role:prof.role,page:(location.pathname.split('/').pop()||'index.html'),since:new Date().toISOString()});
function presList(){if(!pres)return[];const st=pres.presenceState(),m={};Object.values(st).forEach(a=>a.forEach(p=>{if(p&&p.id&&(!m[p.id]||String(p.since)>String(m[p.id].since)))m[p.id]=p}));return Object.values(m)}
async function startPresence(){if(pres||!prof)return;const c=await ready;
pres=c.channel('wajih-presence',{config:{presence:{key:prof.id+':'+Math.random().toString(36).slice(2,7)}}});
pres.on('presence',{event:'sync'},()=>window.dispatchEvent(new CustomEvent('pc:presence',{detail:presList()})));
pres.subscribe(st=>{if(st==='SUBSCRIBED')pres.track(pagePayload())})}
addEventListener('pagehide',()=>{try{if(pres)pres.untrack()}catch(e){}});
window.PortalCloud={ready,login,signOut,flush,log,me,lock:()=>lock,refreshLock:enforceLock,presence:{list:()=>presList(),start:startPresence},get profile(){return prof}};
(async()=>{const c=await ready,{data}=await c.auth.getSession();const has=!!(sessionStorage.getItem('pgb_session')||localStorage.getItem('pgb_session_persistent'));
if(!data.session){if(has)clearSession();return}if(!has){await c.auth.signOut();return}
const{data:p}=await c.from('wajih_profiles').select('*').eq('id',data.session.user.id).single();if(!p||!p.active){await signOut();return}
if(await lockReady)return;
prof=p;startPresence();if(p.must_change)await forceChange(c);const n=await pull();const g='pc_r:'+location.pathname;
if(n&&Date.now()-(+sessionStorage.getItem(g)||0)>6e4){sessionStorage.setItem(g,Date.now());location.reload()}})();
addEventListener('pagehide',()=>{if(prof&&Object.keys(pending).length)flush()});
})();
