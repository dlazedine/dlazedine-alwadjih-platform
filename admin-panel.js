/* لوحة السحابة: كل نشاط + من أضافه + تعديل المفتش + إدارة الحسابات
   تحسينات هذه النسخة:
   • يقرأ بيانات المستخدم عبر PortalCloud.me() (مخزَّنة) بدل استعلامات مكررة مع بقية ملفات اللوحة.
   • لا يجلب قيمة كل نشاط (قد تبلغ مئات الآلاف من الحروف)؛ يجلب البيانات الوصفية فقط، والقيمة عند الضغط على «عرض».
   • التصفية (touched والمفاتيح المخفية) تتم في الخادم مع حدّ أقصى للصفوف.
   • زر حذف الحساب لم يعد يشغّل معالج حذف النشاط معه (كان يحمل السمتين data-d و data-x معاً). */
(function () {
  'use strict';
  const P = window.PortalCloud; if (!P) return;
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RL = { inspector: 'مفتش', supervisor: 'مشرف', teacher: 'أستاذ' };
  const HIDE_PATTERNS = ['photo', 'logo', 'avatar', 'img', 'media'];
  function dlg(title, val, ok, ro) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style="background:#fff;color:#222;padding:16px;border-radius:12px;width:min(94vw,640px)"><b>${esc(title)}</b>${ro ? ' <small style="color:#a01c2c">(عرض فقط)</small>' : ''}<textarea ${ro ? 'readonly' : ''} style="width:100%;height:280px;margin:8px 0;direction:ltr;font-family:monospace">${esc(val)}</textarea>${ro ? '' : '<button data-s>حفظ</button> '}<button data-x>${ro ? 'إغلاق' : 'إلغاء'}</button></div>`;
    d.querySelector('[data-x]').onclick = () => d.remove();
    const sv = d.querySelector('[data-s]');
    if (sv) sv.onclick = async () => { if (await ok(d.querySelector('textarea').value)) d.remove(); };
    document.body.appendChild(d);
  }
  addEventListener('DOMContentLoaded', async () => {
    const c = await P.ready;
    const me = await P.me();
    if (!me || !['inspector', 'supervisor'].includes(me.role)) return;
    const I = me.role === 'inspector', OO = (PORTAL_CFG.OWNER_ONLY || []);
    const mk = p => { const x = document.createElement('section'); x.className = 'cp'; x.style.cssText = 'margin:16px 0;padding:0 8px;direction:rtl;overflow-x:auto'; p.appendChild(x); return x; };
    const boxU = mk(document.getElementById('cloudUsers') || document.body), boxD = mk(document.getElementById('panel-monitor') || document.body);
    const qa = q => [...boxU.querySelectorAll(q), ...boxD.querySelectorAll(q)], q1 = q => boxU.querySelector(q) || boxD.querySelector(q);
    const STYLE = '<style>.cp input,.cp select,.cp button{font:inherit;padding:7px 12px;border-radius:9px;border:1px solid #d8cfb8;margin:3px}.cp button{background:#1f3864;color:#fff;border:0;cursor:pointer}.cp button.dl{background:#a01c2c}.cp th,.cp td{padding:8px;text-align:right}.cp h2{color:#1f3864}</style>';
    const logAct = (action, key, detail) => P.log(action, key, detail);
    let busy = false;

    async function draw() {
      if (busy) return; busy = true;
      try {
        let qd = c.from('portal_data')
          .select('owner,key,shared,updated_at,updated_by_name,updated_by_role,edited_by_name')
          .eq('touched', true);
        HIDE_PATTERNS.forEach(h => { qd = qd.not('key', 'ilike', '%' + h + '%'); });
        const [{ data: D }, { data: U }] = await Promise.all([
          qd.order('updated_at', { ascending: false }).limit(200),
          c.from('wajih_profiles').select('*').order('created_at').limit(500)
        ]);
        boxD.innerHTML = STYLE + `<h2>☁️ النشاطات المتزامنة مع Supabase</h2><p style="font-size:13px">${I ? 'يمكنك تعديل أي نشاط أو حذفه، عدا نقاط «تقويم النتائج» ودفتر التنقيط فهي لصاحب الحساب وحده (عرض فقط).' : 'عرض فقط: التعديل للمفتش.'}</p>
<table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th>النشاط</th><th>أضافه</th><th>آخر تحديث</th><th></th></tr>${(D || []).map(r => { const ro = !I || OO.includes(r.key); return `<tr style="border-top:1px solid #ddd"><td>${esc(PORTAL_CFG.LABELS[r.key] || r.key)}${r.shared ? ' 🌐' : ''}<br><small style="opacity:.6">${esc(r.key)}</small></td><td>${esc(r.updated_by_name)} <small>(${RL[r.updated_by_role] || ''})</small>${r.edited_by_name ? `<br><small>عدّله: ${esc(r.edited_by_name)}</small>` : ''}</td><td>${new Date(r.updated_at).toLocaleString('ar-DZ')}</td><td><button data-v="${esc(r.owner)}|${esc(r.key)}">${ro ? 'عرض' : 'عرض/تعديل'}</button>${ro ? '' : ` <button class="dl" data-d="${esc(r.owner)}|${esc(r.key)}">حذف</button>`}</td></tr>`; }).join('') || '<tr><td>لا نشاط بعد</td></tr>'}</table>`;
        boxU.innerHTML = STYLE + `<h2>👥 الحسابات</h2><table style="width:100%;font-size:13px;border-collapse:collapse">${(U || []).map(u => `<tr style="border-top:1px solid #ddd"><td>${esc(u.username)}</td><td>${esc(u.full_name)}</td><td>${esc(u.school || '')}</td><td>${RL[u.role] || ''}</td><td>${u.active ? 'مفعّل' : 'معطّل'}${u.must_change ? ' · بانتظار التأمين' : ''}</td><td>${I && u.id !== me.id ? `<button data-t="${u.id}|${u.active}">${u.active ? 'تعطيل' : 'تفعيل'}</button> <button data-r="${u.id}">كلمة مرور جديدة</button> <button class="dl" data-acc="${u.id}">حذف</button>` : ''}</td></tr>`).join('')}</table>
${I ? `<div style="margin-top:10px"><input id="cu" placeholder="اسم المستخدم (لاتيني)" autocomplete="off"> <input id="cf" placeholder="الاسم الكامل" autocomplete="off"> <input id="cs" placeholder="المؤسسة" autocomplete="off"> <select id="cr"><option value="teacher">أستاذ</option><option value="supervisor">مشرف</option><option value="inspector">مفتش</option></select> <input id="cp" type="password" placeholder="كلمة مرور مؤقتة (10+)" autocomplete="new-password"> <button id="ca">إضافة حساب</button></div>` : ''}`;

        qa('[data-v]').forEach(b => b.onclick = async () => {
          const [o, k] = b.dataset.v.split('|');
          const { data: r, error } = await c.from('portal_data').select('value').eq('owner', o).eq('key', k).maybeSingle();   // القيمة تُجلب عند الطلب فقط
          if (error || !r) { alert(error ? error.message : 'لم يعد هذا النشاط موجوداً'); return; }
          const ro = !I || OO.includes(k);
          dlg(k, r.value || '', async v => {
            if (ro) return true;
            let j = false; try { JSON.parse(r.value); j = true; } catch (e) {}
            if (j) try { JSON.parse(v); } catch (e) { alert('صيغة JSON غير صالحة'); return false; }
            const { error: e2 } = await c.from('portal_data').update({ value: v, updated_at: new Date().toISOString(), edited_by_name: me.full_name || me.username, edited_at: new Date().toISOString() }).eq('owner', o).eq('key', k);
            if (e2) { alert(e2.message); return false; }
            logAct('update', k, 'تعديل من المفتش'); busy = false; draw(); return true;
          }, ro);
        });
        qa('[data-d]').forEach(b => b.onclick = async () => {
          if (!confirm('حذف هذا النشاط نهائياً؟')) return;
          const [o, k] = b.dataset.d.split('|');
          const { error } = await c.from('portal_data').delete().eq('owner', o).eq('key', k);
          if (error) { alert(error.message); return; }
          logAct('delete', k, 'حذف من المفتش'); busy = false; draw();
        });
        qa('[data-t]').forEach(b => b.onclick = async () => { const [id, a] = b.dataset.t.split('|'); const { error } = await c.from('wajih_profiles').update({ active: a !== 'true' }).eq('id', id); if (error) alert(error.message); busy = false; draw(); });
        qa('[data-r]').forEach(b => b.onclick = async () => {
          const p = prompt('كلمة مرور مؤقتة جديدة (10 أحرف فأكثر):'); if (!p) return;
          if (p.length < 10) { alert('كلمة المرور قصيرة'); return; }
          const { error } = await c.rpc('wj_reset_password', { uid: b.dataset.r, new_pass: p });
          alert(error ? error.message : 'تم. سيختار المستخدم كلمة جديدة عند أول دخول.');
        });
        qa('[data-acc]').forEach(b => b.onclick = async () => {
          if (!confirm('حذف هذا الحساب نهائياً؟')) return;
          const w = confirm('هل تحذف أيضاً بياناته ونشاطاته؟\nموافق = حذف الكل، إلغاء = إبقاء بياناته');
          const { error } = await c.rpc('wj_delete_user', { uid: b.dataset.acc, wipe: w });
          if (error) alert(error.message); busy = false; draw();
        });
        const ca = q1('#ca');
        if (ca) ca.onclick = async () => {
          const u = q1('#cu').value.trim().toLowerCase(), p = q1('#cp').value;
          if (!/^[a-z0-9_.-]{4,30}$/.test(u) || p.length < 10) { alert('اسم مستخدم (4-30 حرفاً لاتينياً/أرقام) وكلمة مرور 10 أحرف على الأقل'); return; }
          ca.disabled = true;
          try {
            const c2 = window.supabase.createClient(PORTAL_CFG.SUPABASE_URL, PORTAL_CFG.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'pc-tmp' } });
            const { data, error } = await c2.auth.signUp({ email: u + '@' + PORTAL_CFG.EMAIL_DOMAIN, password: p });
            if (error || !data.user) { alert(error ? error.message : 'تعذّر الإنشاء'); return; }
            if (data.user.identities && data.user.identities.length === 0) { alert('اسم المستخدم مستعمل من قبل'); return; }
            const full = q1('#cf').value.trim(), inst = q1('#cs').value.trim();
            const { error: e2 } = await c.from('wajih_profiles').insert({ id: data.user.id, username: u, full_name: full, school: inst || null, role: q1('#cr').value, must_change: true, active: true });
            if (e2) { alert(e2.message); return; }
            await c.from('wajih_prof').insert({ user_id: data.user.id, data: { name: full, inst }, updated_by_name: me.full_name || me.username });
            if (!data.session) alert('تنبيه: أُنشئ الحساب لكن Supabase يطلب تأكيد البريد قبل الدخول، فلن يتعرّف النظام على الحساب.\nعطّل ذلك من: Authentication ← Providers ← Email ← إلغاء «Confirm email»، ثم أكّد الحسابات المعلّقة من Authentication ← Users.');
            logAct('create', 'wajih_profiles', 'إنشاء حساب: ' + u);
          } finally { ca.disabled = false; }
          busy = false; draw();
        };
      } catch (e) {
        console.warn('admin-panel draw:', e);
        boxD.innerHTML = STYLE + '<p style="padding:8px">تعذّر تحميل البيانات: ' + esc(e.message || e) + '</p>';
      } finally { busy = false; }
    }
    draw();
  });
})();
