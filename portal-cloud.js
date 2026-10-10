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
const EX=/session|portalUser|^sb-|firebase|avatar|media_files|Logo|^pc_|redirect/i;
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
const ev=T.filter(r=>!C.HIDE.test(r.key)&&!(le[r.key]>now-6e4)).map(r=>({user_id:prof.id,user_name:prof.full_name||prof.username,user_role:prof.role,action:le[r.key]?'update':'create',key:r.key}));
T.forEach(r=>le[r.key]=now);rawSet.call(localStorage,'pc_ev',JSON.stringify(le));if(ev.length)c.from('wajih_activity').insert(ev).then(()=>{})}
catch(e){console.warn('sync',e.message||e);Object.keys(snap).forEach(k=>{if(pending[k]===undefined){pending[k]=snap[k];if(sa[k])pendAct[k]=true}})}}
async function pull(){const c=await ready;const{data,error}=await c.from('portal_data').select('key,value,owner,updated_at');if(error||!data)return 0;
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
async function login(u,p){u=(u||'').trim().toLowerCase();if(!u||!p)return{success:false,error:'أدخل اسم المستخدم وكلمة المرور'};
const bad={success:false,error:'اسم المستخدم أو كلمة المرور غير صحيحة'},c=await ready;
const{data:em}=await c.rpc('wj_email_for_username',{u});if(!em)return bad;
const{data,error}=await c.auth.signInWithPassword({email:em,password:p});if(error)return bad;
const{data:pr}=await c.from('wajih_profiles').select('*').eq('id',data.user.id).single();
if(!pr||!pr.active){await c.auth.signOut();return{success:false,error:'الحساب غير مفعّل'}}
prof=pr;if(pr.must_change)await forceChange(c);const user=saveSession(prof);await pull();return{success:true,user}}
const lastLog={};async function log(action,key){try{if((action||'update')==='update'){const n=Date.now();if(lastLog[key]&&n-lastLog[key]<60000)return;lastLog[key]=n}const c=await ready;let p=prof;if(!p){const{data:s}=await c.auth.getSession();if(!s.session)return;const{data}=await c.from('wajih_profiles').select('*').eq('id',s.session.user.id).single();p=data}
if(!p)return;await c.from('wajih_activity').insert({user_id:p.id,user_name:p.full_name||p.username,user_role:p.role,action:action||'update',key:key})}catch(e){console.warn('log',e&&e.message||e)}}
window.PortalCloud={ready,login,signOut,flush,log,get profile(){return prof}};
(async()=>{const c=await ready,{data}=await c.auth.getSession();const has=!!(sessionStorage.getItem('pgb_session')||localStorage.getItem('pgb_session_persistent'));
if(!data.session){if(has)clearSession();return}if(!has){await c.auth.signOut();return}
const{data:p}=await c.from('wajih_profiles').select('*').eq('id',data.session.user.id).single();if(!p||!p.active){await signOut();return}
prof=p;if(p.must_change)await forceChange(c);const n=await pull();const g='pc_r:'+location.pathname;
if(n&&Date.now()-(+sessionStorage.getItem(g)||0)>6e4){sessionStorage.setItem(g,Date.now());location.reload()}})();
addEventListener('pagehide',()=>{if(prof&&Object.keys(pending).length)flush()});
})();
