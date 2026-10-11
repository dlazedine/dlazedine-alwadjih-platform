/* admin-extras.js — إضافات لوحة التحكم: المتصلون الآن + إدارة إعلانات شاشة الدخول (المفتش والمشرف) */
(function () {
  'use strict';
  const P = window.PortalCloud; if (!P) return;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RL = { inspector: 'مفتش', supervisor: 'مشرف', teacher: 'أستاذ' };
  const KIND = { seminar: '🎓 ندوة', news: '📰 خبر', notice: '📌 إعلان' };
  const PAGES = { 'index.html': 'البوابة', '': 'البوابة', 'niqash.html': 'ركن النقاش', 'moualaja.html': 'منصة المعالجة', 'arabic.html': 'منصة اللغة العربية', 'amal.html': 'الأعمال الموجهة', 'taqyim.html': 'التقييم', 'documents.html': 'بنك الوثائق', 'data-prof.html': 'بيانات الأساتذة', 'rapport-peda.html': 'التقرير التربوي', 'rapport-tarsim.html': 'تقرير الترسيم', 'tawqim-nataij.html': 'تقويم النتائج', 'fahs-ikhtibar.html': 'فحص الاختبارات', 'dashboard.html': 'لوحة التحكم', 'cv.html': 'السيرة الذاتية', 'proposals.html': 'المشاركات' };
  const CSS = '<style>.ax input,.ax select,.ax textarea,.ax button{font:inherit;padding:7px 12px;border-radius:9px;border:1px solid #d8cfb8;margin:3px}.ax button{background:#1f3864;color:#fff;border:0;cursor:pointer}.ax button.dg{background:#a01c2c}.ax button.gr{background:#6b7280}.ax h2{color:#1f3864}.ax table{width:100%;border-collapse:collapse;font-size:13px}.ax th,.ax td{padding:7px;text-align:right;border-top:1px solid #ddd}.ax .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#1d9e5a;margin-left:6px}.ax textarea{width:100%;min-height:70px}</style>';

  addEventListener('DOMContentLoaded', async () => {
    const c = await P.ready; const me = await P.me(); if (!me || !['inspector', 'supervisor'].includes(me.role)) return;
    P.presence.start();

    /* ---------- المتصلون الآن ---------- */
    const mon = document.getElementById('panel-monitor'); if (mon) {
      const box = document.createElement('section'); box.className = 'ax'; box.style.cssText = 'margin:16px 0;padding:0 8px;direction:rtl;overflow-x:auto';
      mon.insertBefore(box, mon.firstChild);
      const draw = (list) => {
        list = (list || P.presence.list()).slice().sort((a, b) => String(b.since).localeCompare(String(a.since)));
        box.innerHTML = CSS + `<h2><span class="dot"></span>المتصلون الآن (${list.length})</h2>` + (list.length ? `<table><tr><th>الاسم</th><th>الصفة</th><th>الصفحة الحالية</th><th>منذ</th></tr>${list.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(RL[u.role] || '')}</td><td>${esc(PAGES[u.page] || u.page)}</td><td>${new Date(u.since).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')}</table>` : '<p>لا أحد متصل حالياً.</p>');
      };
      draw(); addEventListener('pc:presence', (e) => draw(e.detail)); setInterval(() => draw(), 30000);
    }

    /* ---------- إعلانات شاشة الدخول ---------- */
    const host = document.getElementById('cloudUsers') || document.getElementById('panel-users'); if (!host) return;
    const sec = document.createElement('section'); sec.className = 'ax'; sec.style.cssText = 'margin:20px 0;padding:0 8px;direction:rtl'; host.appendChild(sec);
    let rows = [], editing = null;
    async function load() {
      const { data, error } = await c.from('wajih_announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) { sec.innerHTML = CSS + '<h2>📢 إعلانات شاشة الدخول</h2><p>تعذّر التحميل: ' + esc(error.message) + ' (نفّذ supabase-fix.sql)</p>'; return; }
      rows = data || []; render();
    }
    function render() {
      const e = editing || {};
      sec.innerHTML = CSS + `<h2>📢 إعلانات شاشة الدخول (ندوات وأخبار)</h2>recommendation
<p style="font-size:13px">تظهر للجميع قبل الدخول إلى الموقع.</p>
<div><select id="anK"><option value="seminar">ندوة</option><option value="recommendation">توصية</option><option value="news">خبر</option><option value="notice">إعلان</option></select>
<input id="anT" placeholder="العنوان" style="min-width:260px"> <input id="anD" placeholder="التاريخ والتوقيت (مثال: 12/11/2026 على 09:00)"> <input id="anP" placeholder="المكان">
<input id="anL" placeholder="رابط (اختياري) https://..." dir="ltr" style="min-width:240px"><textarea id="anB" placeholder="التفاصيل"></textarea>
<label><input type="checkbox" id="anPin"> تثبيت في الأعلى</label> <button id="anS">${editing ? 'حفظ التعديل' : 'نشر الإعلان'}</button>${editing ? ' <button class="gr" id="anC">إلغاء</button>' : ''}</div>
<table><tr><th>النوع</th><th>العنوان</th><th>التاريخ</th><th>الحالة</th><th></th></tr>${rows.map((r) => `<tr><td>${KIND[r.kind] || ''}</td><td>${esc(r.title)}${r.pinned ? ' 📌' : ''}</td><td>${esc(r.event_date || '')}</td><td>${r.active ? 'منشور' : 'مخفي'}</td><td><button data-e="${r.id}">تعديل</button> <button class="gr" data-t="${r.id}">${r.active ? 'إخفاء' : 'إظهار'}</button> <button class="dg" data-d="${r.id}">حذف</button></td></tr>`).join('') || '<tr><td colspan="5">لا إعلانات.</td></tr>'}</table>`;
      const $ = (i) => sec.querySelector('#' + i);
      $('anK').value = e.kind || 'seminar'; $('anT').value = e.title || ''; $('anD').value = e.event_date || ''; $('anP').value = e.place || ''; $('anL').value = e.link || ''; $('anB').value = e.body || ''; $('anPin').checked = !!e.pinned;
      $('anS').onclick = async () => {
        const t = $('anT').value.trim(); if (!t) { alert('العنوان إلزامي'); return; }
        let l = $('anL').value.trim(); if (l && !/^https?:\/\//i.test(l)) { alert('الرابط يجب أن يبدأ بـ https://'); return; }
        const row = { kind: $('anK').value, title: t, body: $('anB').value.trim(), event_date: $('anD').value.trim(), place: $('anP').value.trim(), link: l || null, pinned: $('anPin').checked, updated_at: new Date().toISOString() };
        const r = editing ? await c.from('wajih_announcements').update(row).eq('id', editing.id) : await c.from('wajih_announcements').insert({ ...row, created_by_name: me.full_name || me.username });
        if (r.error) { alert(r.error.message); return; }
        P.log(editing ? 'update' : 'create', 'announcements', t); editing = null; load();
      };
      const cn = $('anC'); if (cn) cn.onclick = () => { editing = null; render(); };
      sec.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => { editing = rows.find((x) => x.id === b.dataset.e); render(); sec.scrollIntoView(); });
      sec.querySelectorAll('[data-t]').forEach((b) => b.onclick = async () => { const r = rows.find((x) => x.id === b.dataset.t); await c.from('wajih_announcements').update({ active: !r.active }).eq('id', r.id); load(); });
      sec.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { if (!confirm('حذف هذا الإعلان؟')) return; await c.from('wajih_announcements').delete().eq('id', b.dataset.d); P.log('delete', 'announcements'); load(); });
    }
    load();
  });
})();
