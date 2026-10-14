/* amal-dashboard.js — لسان «الأعمال الموجهة» في لوحة التحكم (بنفس خصائص لسان المعالجة البيداغوجية)
   • يعرض كل الأعمال الموجهة المضافة من الأساتذة في البنك المشترك (جدول activities) مع بطاقات إحصائية وتصفية.
   • للمفتش: معاينة كاملة، تصدير Word لكل عمل، تصدير CSV للقائمة، إضافة عمل جديد، وحذف.
   • «مراقبة النشاطات» تبقى كما هي. يُحمَّل هذا الملف بعد سكربتات لوحة التحكم. */
(function () {
  'use strict';
  const P = window.PortalCloud; if (!P) return;
  const tabsBar = document.querySelector('.main-tabs'), after = document.getElementById('panel-pedagogical');
  if (!tabsBar || !after) return;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) { console.log(m); } };
  const fdate = (d) => { try { return new Date(d).toLocaleString('ar-DZ'); } catch (e) { return ''; } };
  const fday = () => { try { return new Date().toLocaleDateString('fr-FR'); } catch (e) { return ''; } };
  const SUBJECTS = ['اللغة العربية', 'الرياضيات', 'اللغة الفرنسية', 'اللغة الإنجليزية'];
  const LEVELS = ['السنة الأولى متوسط', 'السنة الثانية متوسط', 'السنة الثالثة متوسط', 'السنة الرابعة متوسط'];
  const PEDS = ['تمهيدي', 'أساسي', 'دعم', 'تعزيز'];
  const STYLES = ['تعاوني', 'فردي', 'مشروع', 'حل مشكلات', 'دراسة حالة', 'تمثيل أدوار', 'عصف ذهني', 'تعاقد', 'أنشطة متدرجة', 'مراكز تعلم', 'مجموعات مرنة', 'محاكاة'];
  const IN = 'padding:7px 11px;border:1.5px solid var(--border-color);border-radius:7px;font-family:inherit;font-size:12.5px;width:100%;box-sizing:border-box';
  const SEL = 'padding:5px 10px;border-radius:7px;border:1.5px solid var(--border-color);font-family:inherit;font-size:12px';

  let R = [], prof = {}, loaded = false;

  /* ----- اللسان واللوحة ----- */
  const tab = document.createElement('div');
  tab.className = 'main-tab'; tab.dataset.maintab = 'amal';
  tab.innerHTML = '<i class="fas fa-bullseye"></i> الأعمال الموجهة';
  tabsBar.appendChild(tab);

  const panel = document.createElement('div');
  panel.className = 'tab-panel'; panel.id = 'panel-amal';
  panel.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="number" id="amTotal">0</div><div class="label">إجمالي الأعمال الموجهة</div></div>
      <div class="stat-card"><div class="number" id="amTeachers">0</div><div class="label">الأساتذة المُنشِئون</div></div>
      <div class="stat-card"><div class="number" id="amLevels">0</div><div class="label">المستويات المعنية</div></div>
      <div class="stat-card"><div class="number" id="amMonth">0</div><div class="label">أُضيفت هذا الشهر</div></div>
    </div>
    <div class="card-box">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
        <h3 style="margin-bottom:0;"><i class="fas fa-list-alt"></i> كل الأعمال الموجهة المُضافة من الأساتذة</h3>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <select id="amFTeacher" style="${SEL}"><option value="">كل الأساتذة</option></select>
          <select id="amFLevel" style="${SEL}"><option value="">كل المستويات</option></select>
          <select id="amFPed" style="${SEL}"><option value="">كل الأنواع</option>${PEDS.map((x) => `<option>${x}</option>`).join('')}</select>
          <button class="btn btn-sm btn-info" id="amRefresh"><i class="fas fa-sync"></i> تحديث</button>
          <button class="btn btn-sm btn-gold" id="amCsv"><i class="fas fa-download"></i> تصدير CSV</button>
          <button class="btn btn-sm btn-success" id="amAdd"><i class="fas fa-plus-circle"></i> إضافة عمل موجه جديد</button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="teacher-table">
          <thead><tr><th>#</th><th>المؤسسة</th><th>الأستاذ</th><th>العنوان</th><th>المادة</th><th>المستوى</th><th>النوع / النمط</th><th>التاريخ</th><th>الإجراءات</th></tr></thead>
          <tbody id="amBody"><tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:20px;">اضغط "تحديث"</td></tr></tbody>
        </table>
      </div>
    </div>`;
  after.parentNode.insertBefore(panel, after.nextSibling);

  tab.addEventListener('click', () => {
    document.querySelectorAll('.main-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active'); panel.classList.add('active');
    load();
  });
  const $ = (id) => document.getElementById(id);

  /* ----- التحميل ----- */
  async function load() {
    const body = $('amBody'); if (!body) return;
    body.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:20px;"><i class="fas fa-spinner fa-spin"></i> جارٍ استرجاع الأعمال...</td></tr>';
    try {
      const c = await P.ready;
      const [a, p] = await Promise.all([
        c.from('activities').select('*').order('created_at', { ascending: false }),
        c.from('wajih_profiles').select('id,full_name,username,school')
      ]);
      if (a.error) throw a.error;
      prof = {}; (p.data || []).forEach((u) => { prof[u.id] = u; });
      R = (a.data || []).map((r) => ({ ...r, _school: (prof[r.owner_id] && prof[r.owner_id].school) || '', _by: r.owner_name || (prof[r.owner_id] && (prof[r.owner_id].full_name || prof[r.owner_id].username)) || '' }));
      loaded = true; stats(); fillFilters(); render();
    } catch (e) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">تعذّر تحميل الأعمال الموجهة: ' + esc(e.message || e) + '<br><small>تأكد من تنفيذ supabase-fix.sql (قسم جدول activities).</small></td></tr>';
    }
  }
  function stats() {
    const m = new Date().getMonth(), y = new Date().getFullYear();
    $('amTotal').textContent = R.length;
    $('amTeachers').textContent = new Set(R.map((r) => r.owner_id || r._by).filter(Boolean)).size;
    $('amLevels').textContent = new Set(R.map((r) => r.level).filter(Boolean)).size;
    $('amMonth').textContent = R.filter((r) => { const d = new Date(r.created_at); return d.getMonth() === m && d.getFullYear() === y; }).length;
  }
  function fillFilters() {
    const fill = (id, first, vals) => { const s = $(id), prev = s.value; s.innerHTML = `<option value="">${first}</option>` + vals.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(''); s.value = prev; };
    fill('amFTeacher', 'كل الأساتذة', [...new Set(R.map((r) => r._by).filter(Boolean))]);
    fill('amFLevel', 'كل المستويات', [...new Set(R.map((r) => r.level).filter(Boolean))]);
  }
  const filtered = () => {
    const t = $('amFTeacher').value, l = $('amFLevel').value, p = $('amFPed').value;
    return R.filter((r) => (!t || r._by === t) && (!l || r.level === l) && (!p || r.pedagogy === p));
  };
  function render() {
    const body = $('amBody'), rows = filtered();
    if (!rows.length) { body.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد أعمال مطابقة</td></tr>'; return; }
    body.innerHTML = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(r._school || '—')}</td>
        <td><strong>${esc(r._by || '—')}</strong></td>
        <td>${esc(r.title || '—')}</td>
        <td>${esc(r.subject || '—')}</td>
        <td>${esc(r.level || '—')}</td>
        <td><span style="background:#eef3f9; color:#0e2744; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">${esc(r.pedagogy || '—')}</span> <span style="background:#e5f4ed; color:#155724; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">${esc(r.style || '—')}</span></td>
        <td style="font-size:11.5px; color:var(--text-muted); white-space:nowrap;">${r.created_at ? fdate(r.created_at) : '—'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-info" data-v="${esc(r.id)}" title="عرض"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-gold" data-w="${esc(r.id)}" title="Word"><i class="fas fa-file-word"></i></button>
          <button class="btn btn-sm btn-danger" data-d="${esc(r.id)}" title="حذف"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`).join('');
  }
  $('amBody').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) view(b.dataset.v); else if (b.dataset.w) word(b.dataset.w); else if (b.dataset.d) del(b.dataset.d);
  });
  ['amFTeacher', 'amFLevel', 'amFPed'].forEach((id) => $(id).addEventListener('change', render));
  $('amRefresh').onclick = () => load().then(() => toast('✅ تم تحميل ' + R.length + ' عمل موجه', 'success'));
  $('amCsv').onclick = csv;
  $('amAdd').onclick = openAdd;

  /* ----- المعاينة ----- */
  const FIELDS = [['الموضوع', 'topic'], ['المستوى البيداغوجي', 'pedagogy'], ['نمط النشاط', 'style'], ['الأقسام', 'classes'], ['الأفواج', 'groups']];
  const TEXTS = [['وصف النشاط', 'description'], ['وضعية الانطلاق', 'start_situation'], ['دور الأستاذ', 'teacher_role'], ['عمل الأفواج', 'group_work'], ['وضعية الختام', 'end_situation'], ['النص (المادة)', 'text'], ['الأسئلة', 'questions'], ['الإجابة النموذجية', 'answer']];
  const arr = (v) => (Array.isArray(v) ? v : []);
  const listTxt = (v) => arr(v).map((x) => (typeof x === 'object' ? (x.name || x.label || x.id || '') : x)).filter(Boolean).join('، ');
  function view(id) {
    const r = R.find((x) => x.id === id); if (!r) return;
    const row = (k, v) => v ? `<tr><td style="padding:5px 8px;border:1px solid #ddd;background:#f8fbfd;width:30%;"><strong>${k}</strong></td><td style="padding:5px 8px;border:1px solid #ddd;white-space:pre-wrap;">${esc(v)}</td></tr>` : '';
    const head = FIELDS.map(([k, f]) => row(k, r[f])).join('') + row('المتعلمون المعنيون', listTxt(r.students)) + row('الذكاءات المتعددة', listTxt(r.intelligences)) + row('أنماط التعلم (VARK)', listTxt(r.vark));
    const body = TEXTS.map(([k, f]) => row(k, r[f])).join('');
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed; inset:0; background:rgba(9,28,51,0.65); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;';
    ov.innerHTML = `<div style="background:#fff; border-radius:12px; padding:20px; max-width:850px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.3); border-top:3.5px solid var(--gold); direction:rtl; text-align:right;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:2px solid var(--gold); padding-bottom:8px;">
        <h3 style="margin:0; color:var(--primary); font-size:15px; font-weight:700;"><i class="fas fa-bullseye"></i> تفاصيل العمل الموجه</h3>
        <button data-x style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);">&times;</button></div>
      <p style="font-size:13px; margin-bottom:4px;"><strong>العنوان:</strong> ${esc(r.title || '—')}</p>
      <p style="font-size:12.5px; margin-bottom:12px;"><strong>الأستاذ:</strong> ${esc(r._by || '—')} | <strong>المؤسسة:</strong> ${esc(r._school || '—')} | <strong>المادة:</strong> ${esc(r.subject || '—')} | <strong>المستوى:</strong> ${esc(r.level || '—')} | <strong>التاريخ:</strong> ${r.created_at ? fdate(r.created_at) : '—'}</p>
      <table style="width:100%; border-collapse:collapse; font-size:12.5px;">${head}${body}</table></div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.hasAttribute('data-x')) ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ----- Word ----- */
  async function word(id) {
    const r = R.find((x) => x.id === id); if (!r) return;
    let insp = ''; try { const m = await P.me(); insp = (m && (m.full_name || m.username)) || ''; } catch (e) {}
    const td = 'border:1px solid #333;padding:5px;';
    const row = (k, v) => v ? `<tr><td style="${td}width:28%;background:#f0f4f8;"><strong>${k}</strong></td><td style="${td}">${esc(v).replace(/\n/g, '<br>')}</td></tr>` : '';
    const html = `
      <div style="text-align:center;border-bottom:2px solid #0e2744;padding-bottom:10px;margin-bottom:15px;">
        <h3>الجمهورية الجزائرية الديمقراطية الشعبية</h3><h4>وزارة التربية الوطنية</h4>
        <h3 style="color:#0e2744;">بطاقة عمل موجه</h3></div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
        ${row('العنوان', r.title)}${row('الأستاذ(ة)', r._by)}${row('المؤسسة', r._school)}${row('المادة', r.subject)}${row('المستوى', r.level)}
        ${FIELDS.map(([k, f]) => row(k, r[f])).join('')}${row('المتعلمون المعنيون', listTxt(r.students))}${row('الذكاءات المتعددة', listTxt(r.intelligences))}${row('أنماط التعلم (VARK)', listTxt(r.vark))}</table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">${TEXTS.map(([k, f]) => row(k, r[f])).join('')}</table>
      <table style="width:100%;border:none;margin-top:22px;"><tr>
        <td style="border:none;width:50%;"><strong>توقيع الأستاذ(ة):</strong> .....................</td>
        <td style="border:none;width:50%;text-align:left;"><strong>المفتش(ة):</strong> ${esc(insp)} — ${fday()}</td></tr></table>`;
    const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl"><head><meta charset="utf-8"><title>عمل موجه</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page WordSection1{size:21cm 29.7cm;margin:2cm 1.8cm}div.WordSection1{page:WordSection1}
body{font-family:'Traditional Arabic','Simplified Arabic',Arial,sans-serif;direction:rtl;text-align:right;font-size:13pt;line-height:1.6}
h3,h4{font-family:Arial,sans-serif;text-align:center;margin:4pt 0}table{border-collapse:collapse;width:100%;direction:rtl}td,th{vertical-align:top;font-size:12pt;text-align:right}</style></head><body dir="rtl"><div class="WordSection1" dir="rtl">${html}</div></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff', full], { type: 'application/msword;charset=utf-8' }));
    a.download = 'عمل_موجه_' + String(r.title || 'نشاط').replace(/[\/\\?%*:|"<>]/g, '_').slice(0, 40) + '_' + fday().replace(/\//g, '-') + '.doc';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('✅ تم تصدير بطاقة Word', 'success');
  }

  /* ----- CSV ----- */
  function csv() {
    const rows = filtered(); if (!rows.length) { toast('لا توجد أعمال لتصديرها', 'warning'); return; }
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    const head = ['المعرف', 'المؤسسة', 'الأستاذ', 'العنوان', 'المادة', 'المستوى', 'الموضوع', 'المستوى البيداغوجي', 'نمط النشاط', 'الأقسام', 'الأفواج', 'تاريخ الإضافة'];
    const lines = [head.map(q).join(',')].concat(rows.map((r) => [r.id, r._school, r._by, r.title, r.subject, r.level, r.topic, r.pedagogy, r.style, r.classes, r.groups, r.created_at ? fdate(r.created_at) : ''].map(q).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'الأعمال_الموجهة_' + fday().replace(/\//g, '-') + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('✅ تم تصدير ملف CSV', 'success');
  }

  /* ----- حذف ----- */
  async function del(id) {
    const r = R.find((x) => x.id === id); if (!r) return;
    if (!confirm('حذف العمل الموجه «' + (r.title || '') + '» نهائياً من البنك المشترك؟')) return;
    const c = await P.ready, { error } = await c.from('activities').delete().eq('id', id);
    if (error) { toast('تعذّر الحذف: ' + error.message, 'error'); return; }
    P.log('delete', 'amal_activity', (r.title || '') + (r.subject ? ' — ' + r.subject : '') + ' (' + (r._by || '') + ')');
    R = R.filter((x) => x.id !== id); stats(); fillFilters(); render();
    toast('🗑️ تم حذف العمل الموجه', 'success');
  }

  /* ----- إضافة ----- */
  function openAdd() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed; inset:0; background:rgba(9,28,51,0.65); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;';
    const opts = (a) => a.map((x) => `<option>${x}</option>`).join('');
    const fg = (label, inner) => `<div style="margin-bottom:10px;"><label style="font-weight:700;font-size:12px;display:block;margin-bottom:4px;">${label}</label>${inner}</div>`;
    const ta = (id, label) => fg(label, `<textarea id="${id}" rows="2" style="${IN}"></textarea>`);
    ov.innerHTML = `<div style="background:#fff; border-radius:12px; padding:22px; max-width:640px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.3); direction:rtl; text-align:right; border-top:3.5px solid var(--gold);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:2px solid var(--gold); padding-bottom:8px;">
        <h3 style="margin:0; color:var(--primary); font-size:15px; font-weight:700;"><i class="fas fa-plus-circle"></i> إضافة عمل موجه إلى البنك المشترك</h3>
        <button data-x style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-muted);">&times;</button></div>
      ${fg('العنوان', `<input id="nwT" type="text" style="${IN}" placeholder="عنوان العمل الموجه">`)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${fg('المادة', `<select id="nwS" style="${IN}">${opts(SUBJECTS)}</select>`)}${fg('المستوى', `<select id="nwL" style="${IN}">${opts(LEVELS)}</select>`)}
        ${fg('المستوى البيداغوجي', `<select id="nwP" style="${IN}">${opts(PEDS)}</select>`)}${fg('نمط النشاط', `<select id="nwSt" style="${IN}">${opts(STYLES)}</select>`)}
        ${fg('الموضوع', `<input id="nwTp" type="text" style="${IN}">`)}${fg('الأقسام', `<input id="nwC" type="text" style="${IN}" placeholder="مثال: 1م2، 2م4">`)}</div>
      ${ta('nwD', 'وصف النشاط')}${ta('nwSS', 'وضعية الانطلاق')}${ta('nwTR', 'دور الأستاذ')}${ta('nwGW', 'عمل الأفواج')}${ta('nwE', 'وضعية الختام')}
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
        <button class="btn btn-outline" data-x>إلغاء</button><button class="btn btn-success" id="nwSave"><i class="fas fa-save"></i> حفظ</button></div></div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.hasAttribute('data-x')) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelector('#nwSave').onclick = async () => {
      const v = (id) => ov.querySelector('#' + id).value.trim();
      if (!v('nwT')) { toast('العنوان إلزامي', 'error'); return; }
      const me = await P.me(); if (!me) { toast('لا توجد جلسة', 'error'); return; }
      const row = { owner_id: me.id, owner_name: me.full_name || me.username, title: v('nwT'), subject: v('nwS'), level: v('nwL'), topic: v('nwTp'), pedagogy: v('nwP'), style: v('nwSt'), classes: v('nwC'), groups: '',
        start_situation: v('nwSS'), teacher_role: v('nwTR'), group_work: v('nwGW'), end_situation: v('nwE'), text: '', questions: '', answer: '', description: v('nwD'), students: [], intelligences: [], vark: [], goal_id: 'k1' };
      const c = await P.ready, { error } = await c.from('activities').insert(row);
      if (error) { toast('تعذّر الحفظ: ' + error.message, 'error'); return; }
      P.log('create', 'amal_activity', row.title + ' — ' + row.subject + ' (' + row.owner_name + ')');
      ov.remove(); await load(); toast('✅ تمت إضافة العمل الموجه', 'success');
    };
  }

  /* تحديث حيّ عند تغيّر البنك أثناء فتح اللسان */
  P.ready.then((c) => {
    try { c.channel('amal_dash_live').on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => { if (panel.classList.contains('active') && loaded) load(); }).subscribe(); } catch (e) {}
  });
})();
