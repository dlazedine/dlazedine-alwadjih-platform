/* ربط تبويبي «إدارة المستخدمين» و«مراقبة النشاطات» بـ Supabase (يُحمَّل بعد سكربت اللوحة) */
(function(){'use strict';
const pu=document.getElementById('panel-users');if(pu)pu.innerHTML='<div id="cloudUsers" style="padding:16px"></div>';
const LBL=PORTAL_CFG.LABELS;
let P=[];
window.renderUsersList=function(){};
window.refreshLog=async function(){const feed=document.getElementById('logFeed');
try{const c=await PortalCloud.ready;
const[a,b]=await Promise.all([c.from('wajih_activity').select('*').order('created_at',{ascending:false}).limit(300),c.from('wajih_profiles').select('*')]);
if(a.error)throw a.error;P=b.data||[];
_logCache=(a.data||[]).filter(r=>!PORTAL_CFG.HIDE.test(r.key)).map(r=>({action:r.action,teacher_id:r.user_id,teacher_name:r.user_name,activity_title:LBL[r.key]||r.key,created_at:r.created_at}));
populateTeacherFilter();renderLog();updateMonitorStats();drawStats()}
catch(e){console.error(e);if(feed)feed.innerHTML='<div style="text-align:center;padding:20px">تعذّر تحميل السجل (تأكد من تشغيل supabase.sql)</div>'}};
window.populateTeacherFilter=function(){const s=document.getElementById('monitorFilterTeacher'),v=s.value;
s.innerHTML='<option value="">كل المستخدمين</option>'+P.map(u=>`<option value="${u.id}">${escapeHtml(u.full_name||u.username)}</option>`).join('');s.value=v};
const drawStats=function(){const tb=document.getElementById('teacherStatsBody');if(!tb)return;
const th=tb.closest('table').querySelectorAll('th')[2];if(th)th.textContent='اسم المستخدم';const T=P.filter(u=>u.role==='teacher');
if(!T.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px">لا يوجد أساتذة مسجّلون بعد.</td></tr>';return}
const R=T.map(u=>{const e=_logCache.filter(r=>r.teacher_id===u.id);return{u,n:e.length,l:e[0]}}).sort((a,b)=>b.n-a.n);
tb.innerHTML=R.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${escapeHtml(r.u.full_name||'—')}</strong></td><td>${escapeHtml(r.u.username)}</td><td>${r.n}</td><td>${r.l?escapeHtml(r.l.activity_title):'—'}</td><td>${r.l?new Date(r.l.created_at).toLocaleString('ar-DZ'):'—'}</td><td>${r.u.active?'نشط':'معطّل'}</td></tr>`).join('')};
window.updateMonitorStats=function(){const t=new Set(P.filter(u=>u.role==='teacher').map(u=>u.id)),d=new Date().toDateString();document.getElementById('monitorTotalActions').textContent=_logCache.length;document.getElementById('monitorActiveTeachers').textContent=new Set(_logCache.filter(r=>t.has(r.teacher_id)).map(r=>r.teacher_id)).size;document.getElementById('monitorToday').textContent=_logCache.filter(r=>new Date(r.created_at).toDateString()===d).length};
window.renderTeacherStats=()=>refreshLog();
window.initMonitor=async function(){await refreshLog();setInterval(refreshLog,30000)};
const _rl=window.refreshLog;
window.refreshLog=async function(){const ck=window.event&&window.event.type==='click';const bs=ck?[...document.querySelectorAll('[onclick="refreshLog()"],[onclick="renderTeacherStats()"]')]:[];
bs.forEach(b=>{b.dataset.t=b.dataset.t||b.innerHTML;b.disabled=true;b.innerHTML='جارٍ التحديث...'});
try{await _rl()}finally{bs.forEach(b=>{b.disabled=false;b.innerHTML='✓ تم التحديث';setTimeout(()=>{b.innerHTML=b.dataset.t},1500)})}};
})();
