/* PortalCloud: الدخول + المزامنة مع Supabase (يحلّ محلّ الحسابات المحلية) */
(function(){'use strict';const C=window.PORTAL_CFG,SH='00000000-0000-0000-0000-000000000000';
const EX=/session|portalUser|^sb-|firebase|avatar|media_files|Logo|^pc_|redirect/i;
const rawSet=Storage.prototype.setItem,RL={inspector:'مفتش',supervisor:'مشرف',teacher:'أستاذ'};
let prof=null,pending={},timer=null;
const ready=new Promise(res=>{const go=()=>res(window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY));
if(window.supabase&&window.supabase.createClient)go();else{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=go;document.head.appendChild(s)}});
const ts=()=>{try{return JSON.parse(localStorage.getItem('pc_ts')||'{}')}catch(e){return{}}};
Storage.prototype.setItem=function(k,v){rawSet.call(this,k,v);if(this===localStorage&&prof&&!EX.test(k)){const t=ts();t[k]=Date.now();rawSet.call(localStorage,'pc_ts',JSON.stringify(t));pending[k]=String(v);clearTimeout(timer);timer=setTimeout(flush,1500)}};
async function flush(){if(!prof)return;const c=await ready,now=new Date().toISOString();
const rows=Object.entries(pending).filter(([k,v])=>v.length<9e5).map(([k,v])=>{const sh=C.SHARED_KEYS.includes(k);return{owner:sh?SH:prof.id,key:k,value:v,shared:sh,updated_by:prof.id,updated_by_name:prof.full_name||prof.username,updated_by_role:prof.role,updated_at:now}});
const snap=pending;pending={};if(!rows.length)return;const{error}=await c.from('portal_data').upsert(rows);if(error){console.warn('sync',error.message);Object.assign(pending,snap)}else{const n=Date.now();let le={};try{le=JSON.parse(localStorage.getItem('pc_ev')||'{}')}catch(e){}const ev=rows.filter(r=>!C.HIDE.test(r.key)&&!(le[r.key]>n-6e4)).map(r=>({user_id:prof.id,user_name:prof.full_name||prof.username,user_role:prof.role,action:le[r.key]?'update':'create',key:r.key}));rows.forEach(r=>le[r.key]=n);rawSet.call(localStorage,'pc_ev',JSON.stringify(le));if(ev.length)c.from('wajih_activity').insert(ev).then(()=>{})}}
async function pull(){const c=await ready;const{data,error}=await c.from('portal_data').select('key,value,owner,updated_at');if(error||!data)return 0;
const t=ts();let n=0;data.forEach(r=>{if(r.owner!==SH&&r.owner!==prof.id)return;const u=Date.parse(r.updated_at);
if(localStorage.getItem(r.key)!==r.value&&(!t[r.key]||u>=t[r.key])){rawSet.call(localStorage,r.key,r.value);t[r.key]=u;n++}});rawSet.call(localStorage,'pc_ts',JSON.stringify(t));return n}
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
window.PortalCloud={ready,login,signOut,flush,get profile(){return prof}};
(async()=>{const c=await ready,{data}=await c.auth.getSession();const has=!!(sessionStorage.getItem('pgb_session')||localStorage.getItem('pgb_session_persistent'));
if(!data.session){if(has)clearSession();return}if(!has){await c.auth.signOut();return}
const{data:p}=await c.from('wajih_profiles').select('*').eq('id',data.session.user.id).single();if(!p||!p.active){await signOut();return}
prof=p;if(p.must_change)await forceChange(c);const n=await pull();const g='pc_r:'+location.pathname;
if(n&&Date.now()-(+sessionStorage.getItem(g)||0)>6e4){sessionStorage.setItem(g,Date.now());location.reload()}})();
addEventListener('pagehide',()=>{if(prof&&Object.keys(pending).length)flush()});
})();
