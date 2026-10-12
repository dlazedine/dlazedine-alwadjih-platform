/* carnet-tanqit.js — دفتر التنقيط والمتابعة (التعليم المتوسط) — الإصدار 2
   وفق مراسلة وزارة التربية الوطنية 270/و.ت.و/م.ع.ت/25 المؤرخة في 2025/11/11:
     م.ت.م   = (معدل تقويم النشاطات + علامة الفرض) ÷ 2
     م.ف.م.ت = (م.ت.م + علامة الاختبار على 40) ÷ 3        [الاختبار على 20 ثم ×2]
     المعدل السنوي = (معدل الفصل 1 + 2 + 3) ÷ 3
   • عدّة أقسام يديرها الأستاذ بنفسه (إضافة، تسمية، حذف، قائمة تلاميذ).
   • الوقفة التقويمية: قبل الاختبار تُفرز القائمة المتعثرين والهشّين، مع العلامة اللازمة في الاختبار لبلوغ 10،
     وأضعف المحاور، وبرمجة المعالجة (تاريخ، نمط، حالة).
   • العلامات تُحفظ في carnet_tanqit_v1 (تُزامَن مع صفّ صاحب الحساب فقط ولا يعدّلها غيره).
   • أسماء التلاميذ تُحفظ في local_carnet_names_v1 على الجهاز فقط، ولا تُزامَن. */
(function () {
  'use strict';
  const KEY = 'carnet_tanqit_v1', NKEY = 'local_carnet_names_v1';
  const COLS = [
    ['استجواب شفوي أو كتابي', 3, 'استجواب'], ['مناقشات', 2, 'مناقشات'], ['المشاركة والفعالية', 2, 'مشاركة'],
    ['التحضيرات والمبادرات', 2, 'تحضيرات'], ['واجبات منزلية', 2, 'واجبات'], ['بحوث ومشاريع', 2, 'بحوث'],
    ['إحضار واستعمال أدوات التعلم', 2, 'أدوات'], ['الغيابات والتأخرات', 2, 'غيابات'], ['سلوك التلاميذ', 3, 'سلوك']
  ];
  const GROUPS = [['أنشطة صفية', 0, 3, 'g1'], ['أنشطة لا صفية', 3, 6, 'g2'], ['الانضباط والمواظبة', 6, 9, 'g3']];
  const SEMN = ['الأول', 'الثاني', 'الثالث'];
  const MODES = ['حصة دعم فردية', 'فوج معالجة', 'ورشة داخل القسم', 'عمل منزلي موجَّه'];
  const STAT = ['لم تُبرمج', 'مبرمجة', 'مؤجلة', 'أُنجزت'];

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const W = (v) => (window.toWesternDigits ? window.toWesternDigits(String(v)) : String(v));
  const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(W(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const f2 = (n) => (n == null || isNaN(n)) ? '—' : (Math.round(n * 100) / 100).toFixed(2);
  const uid = () => 'c' + Math.random().toString(36).slice(2, 7);
  const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  const maskDate = (v) => { const d = W(v).replace(/\D/g, '').slice(0, 8); let o = d.slice(0, 2); if (d.length > 2) o += '/' + d.slice(2, 4); if (d.length > 4) o += '/' + d.slice(4); return o; };

  let D = null, NM = {}, roLabel = '', sem = 1, tab = 'grid', RO = false, tmr = null, showFrag = false, openSet = {};
  const blankRow = () => ({ a: COLS.map(() => null), f: null, t: null });
  const fresh = () => { const id = uid(); return { v: 2, year: '2025/2026', subject: 'اللغة العربية', level: '', thr: 10, max: COLS.map((c) => c[1]), classes: [{ id, name: 'القسم 1', n: 0 }], cur: id, s: { [id]: { 1: [], 2: [], 3: [] } }, chk: {}, rem: {} }; };
  function migrate(d) {
    if (d && d.v === 2 && d.classes && d.classes.length) { d.s = d.s || {}; d.chk = d.chk || {}; d.rem = d.rem || {}; d.thr = d.thr || 10; return d; }
    const n = fresh(); if (!d || !d.s) return n;
    const c = n.classes[0]; n.s[c.id] = { 1: d.s[1] || [], 2: d.s[2] || [], 3: d.s[3] || [] };
    c.n = Math.max(0, ...[1, 2, 3].map((k) => (d.s[k] || []).length));
    n.year = d.year || n.year; n.subject = d.subject || n.subject; n.level = d.level || ''; if (d.max && d.max.length === 9) n.max = d.max;
    return n;
  }
  function load() {
    try { D = migrate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { D = fresh(); }
    try { NM = JSON.parse(localStorage.getItem(NKEY) || '{}') || {}; } catch (e) { NM = {}; }
    if (!D.classes.find((c) => c.id === D.cur)) D.cur = D.classes[0].id;
    const c = cls();
    if (!c.n && typeof students !== 'undefined' && students.length) c.n = students.length;   // أول مرة: حجم القسم من الشبكة
  }
  function save() {
    if (RO) return; clearTimeout(tmr);
    tmr = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(D)); localStorage.setItem(NKEY, JSON.stringify(NM)); } catch (e) {} }, 400);
  }
  const cls = () => D.classes.find((c) => c.id === D.cur) || D.classes[0];
  const sd = (cid, s) => { D.s[cid] = D.s[cid] || {}; return (D.s[cid][s] = D.s[cid][s] || []); };
  const rows = (c) => { c = c || cls(); const r = sd(c.id, sem); while (r.length < c.n) r.push(blankRow()); return r; };
  const nameOf = (c, i) => ((NM[c.id] || [])[i] || '').trim() || (RO ? 'تلميذ ' + (i + 1) : '');

  /* ----- الحساب ----- */
  function calc(r) {
    const any = r.a.some((x) => x != null) || r.f != null || r.t != null;
    const L = r.a.reduce((s, x) => s + (x || 0), 0), Nn = L + (r.f || 0), O = Nn / 2, S = (r.t || 0) * 2, T = O + S, U = T / 3;
    return { any, L, N: Nn, O, S, T, U, V: any ? mention(U) : '' };
  }
  function mention(u0) {
    const u = Math.round(u0 * 100) / 100;
    if (u > 20) return 'خطأ في الإدخال'; if (u >= 18) return 'ممتاز'; if (u > 16) return 'جيد جداً'; if (u > 14) return 'جيد';
    if (u > 10) return 'مرضٍ'; if (u === 10) return 'وسط عموما'; if (u > 0) return 'غير مرضٍ'; return 'خطأ في الإدخال';
  }
  /* ----- الوقفة التقويمية: فرز المتعثرين قبل الاختبار ----- */
  function analyse(c) {
    const R = rows(c).slice(0, c.n), thr = D.thr || 10;
    const used = D.max.map((_, k) => R.some((r) => r.a[k] != null)), fUsed = R.some((r) => r.f != null);
    return R.map((r, i) => {
      const k = calc(r), miss = [];
      used.forEach((u, j) => { if (u && r.a[j] == null) miss.push(COLS[j][2]); });
      if (fUsed && r.f == null) miss.push('الفرض');
      const rat = [];
      r.a.forEach((v, j) => { if (v != null && D.max[j] > 0) rat.push([v / D.max[j], COLS[j][2]]); });
      if (r.f != null) rat.push([r.f / 20, 'الفرض']);
      const weak = rat.filter((x) => x[0] < 0.6).sort((a, b) => a[0] - b[0]).slice(0, 3).map((x) => x[1]);
      let lvl = 'none';
      if (k.any) lvl = miss.length ? 'incomplete' : (k.O < thr - 2 ? 'urgent' : k.O < thr ? 'weak' : k.O < thr + 2 ? 'fragile' : 'ok');
      return { i, any: k.any, cc: k.O, need: Math.max(0, (3 * thr - k.O) / 2), lvl, miss, weak, done: k.any && !miss.length, U: k.U, hasT: r.t != null };
    });
  }
  const LV = { urgent: ['عاجل', '#c0392b'], weak: ['متعثر', '#d35400'], fragile: ['هشّ', '#b7950b'], ok: ['', ''], none: ['', ''], incomplete: ['ناقص', '#7f8c8d'] };
  const remGet = (c, i) => ((((D.rem[c.id] || {})[sem]) || {})[i]) || { d: '', m: '', f: '', st: 'لم تُبرمج', n: '' };
  const remSet = (c, i) => { const a = (D.rem[c.id] = D.rem[c.id] || {}), b = (a[sem] = a[sem] || {}); return (b[i] = b[i] || { d: '', m: '', f: '', st: 'لم تُبرمج', n: '' }); };

  /* ----- الأنماط ----- */
  function css() {
    if (document.getElementById('carnetCss')) return;
    const s = document.createElement('style'); s.id = 'carnetCss';
    s.textContent = `
#carnet{--cn-ink:var(--text,#1f2a44);--cn-line:var(--border,#ddd5bd);--cn-navy:var(--navy,#1f3864);--cn-gold:var(--gold,#c49b3f);--cn-mut:var(--muted,#6b7280)}
#carnet .cn-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
#carnet .chip,#carnet .pill,#carnet .cn-btn{font:inherit;font-size:13px;border:1px solid var(--cn-line);background:#fff;color:var(--cn-ink);border-radius:999px;padding:5px 14px;cursor:pointer}
#carnet .chip.on,#carnet .pill.on{background:var(--cn-navy);color:#fff;border-color:var(--cn-navy);font-weight:700}
#carnet .chip.add{border-style:dashed;color:var(--cn-mut)}
#carnet .pill{border-radius:8px}
#carnet .cn-btn{border-radius:8px;background:var(--cn-navy);color:#fff;border:0}
#carnet .cn-btn.sec{background:#fff;color:var(--cn-navy);border:1px solid var(--cn-navy)}
#carnet .cn-btn.dg{background:#a01c2c}
#carnet .cn-sep{flex:1}
#carnet details{border:1px solid var(--cn-line);border-radius:10px;padding:6px 12px;margin:0 0 10px;background:#fffdf6}
#carnet summary{cursor:pointer;font-weight:700;font-size:13px;color:var(--cn-navy)}
#carnet details .cn-row{margin-top:8px}
#carnet label{font-size:12.5px;color:var(--cn-mut)}
#carnet input[type=text],#carnet select,#carnet textarea{font:inherit;font-size:13px;border:1px solid var(--cn-line);border-radius:8px;padding:5px 8px;background:#fff}
#carnet textarea{width:100%;min-height:90px}
#carnet .cn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 12px}
#carnet .cn-card{border:1px solid var(--cn-line);border-radius:10px;padding:8px 12px;background:#fff}
#carnet .cn-card b{display:block;font-size:20px;color:var(--cn-navy);line-height:1.3}
#carnet .cn-card span{font-size:12px;color:var(--cn-mut)}
#carnet .cn-card.alert b{color:#c0392b}
#carnet .cn-wrap{overflow:auto;max-height:68vh;border:1px solid var(--cn-line);border-radius:10px}
#carnet table{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}
#carnet th,#carnet td{padding:3px 5px;text-align:center;border-bottom:1px solid #eee6d0;border-left:1px solid #f1ead6;white-space:nowrap}
#carnet thead th{position:sticky;top:0;z-index:3;color:#fff;font-weight:600;background:var(--cn-navy)}
#carnet thead tr.h2 th{top:27px;font-size:11.5px;font-weight:500}
#carnet th.g1{background:#2f5496}#carnet th.g2{background:#2a7f86}#carnet th.g3{background:#6b4f8a}#carnet th.gc{background:#8a6a1f}#carnet th.gt{background:#a5522a}
#carnet td.sticky,#carnet th.sticky{position:sticky;z-index:2;background:#fff}
#carnet thead th.sticky{z-index:4;background:var(--cn-navy)}
#carnet .s0{right:0;min-width:34px}#carnet .s1{right:34px;min-width:150px;text-align:right!important;box-shadow:-2px 0 0 #eee6d0}
#carnet tbody tr:nth-child(even) td{background:#fcf9ef}#carnet tbody tr:nth-child(even) td.sticky{background:#fcf9ef}
#carnet input.n{width:44px;text-align:center;border:1px solid transparent;border-bottom:1px solid var(--cn-line);border-radius:4px;padding:3px 2px;background:transparent;font:inherit}
#carnet input.n:focus{outline:2px solid var(--cn-gold);background:#fff}
#carnet input.bad{background:#fadbd8!important;border-color:#c0392b}
#carnet td.calc{background:#f5efd8!important;font-weight:600}
#carnet td.res{background:#e9f0fb!important;font-weight:700;color:var(--cn-navy)}
#carnet .cn-nm{font-weight:600}
#carnet .tag{display:inline-block;border-radius:6px;padding:1px 8px;color:#fff;font-size:11.5px}
#carnet .cn-note{font-size:12.5px;color:var(--cn-mut);margin:6px 0 10px}
#carnet .cn-ro{color:#a01c2c;font-weight:700;margin:0 0 10px}
#carnet .cn-warn{background:#fff4e5;border:1px solid #f0c987;border-radius:8px;padding:6px 10px;font-size:13px;margin:0 0 10px}
#carnet td.l{text-align:right}#carnet .cn-sm{font-size:11.5px;color:var(--cn-mut)}
@media print{body.cn-printing .container>*:not(#carnet){display:none!important}body.cn-printing #carnet .cn-noprint{display:none!important}body.cn-printing #carnet .cn-wrap{max-height:none;overflow:visible}body.cn-printing #carnet input,body.cn-printing #carnet select{border:0!important;background:transparent!important;appearance:none}}`;
    document.head.appendChild(s);
  }
  function mount() {
    if (document.getElementById('carnet')) return; css();
    const card = document.createElement('div'); card.className = 'card'; card.id = 'carnet';
    card.innerHTML = '<div class="card-title">دفتر التنقيط والمتابعة — التقويم المستمر (التعليم المتوسط)</div><div id="cnBody"></div>';
    (document.querySelector('.container') || document.body).appendChild(card);
    card.addEventListener('click', onClick); card.addEventListener('input', onInput); card.addEventListener('change', onInput);
    card.addEventListener('toggle', (e) => { if (e.target.dataset && e.target.dataset.k) openSet[e.target.dataset.k] = e.target.open; }, true);
  }

  /* ----- العرض ----- */
  function render() {
    const host = document.getElementById('cnBody'); if (!host || !D) return;
    const c = cls();
    host.innerHTML = bar(c) + (tab === 'annual' ? annualView(c) : tab === 'rem' ? remView(c) : gridView(c));
    if (tab === 'grid') stats(c);
  }
  function bar(c) {
    const chips = D.classes.map((k) => `<button class="chip ${k.id === D.cur ? 'on' : ''}" data-act="cls" data-id="${k.id}">${esc(k.name)}</button>`).join('') + (RO ? '' : '<button class="chip add" data-act="addcls">+ قسم جديد</button>');
    const modes = [['grid', 'جدول التنقيط'], ['rem', 'الوقفة التقويمية والمعالجة'], ['annual', 'الحصيلة السنوية']].map((m) => `<button class="pill ${tab === m[0] ? 'on' : ''}" data-act="tab" data-t="${m[0]}">${m[1]}</button>`).join('');
    const semp = tab === 'annual' ? '' : [1, 2, 3].map((k) => `<button class="pill ${sem === k ? 'on' : ''}" data-act="sem" data-s="${k}">الفصل ${SEMN[k - 1]}</button>`).join('');
    const op = (k) => (openSet[k] ? ' open' : '');
    const mgr = RO ? '' : `<details data-k="mgr"${op('mgr')}><summary>إدارة القسم «${esc(c.name)}» وقائمة التلاميذ</summary>
      <div class="cn-row"><label>اسم القسم <input type="text" data-f="cname" value="${esc(c.name)}" style="width:130px"></label>
        <label>عدد التلاميذ <input type="text" data-f="csize" value="${c.n}" style="width:60px;text-align:center"></label>
        <button class="cn-btn sec" data-act="impNames">جلب الأسماء من شبكة التقويم أعلاه</button>
        <button class="cn-btn sec" data-act="impTest">جلب علامات الاختبار من الشبكة</button>
        <span class="cn-sep"></span><button class="cn-btn dg" data-act="delcls">حذف هذا القسم</button></div>
      <div class="cn-note">الصق أسماء التلاميذ (اسم في كل سطر) ثم اضغط «حفظ القائمة». الأسماء تبقى على هذا الجهاز ولا تُرفع إلى السحابة.</div>
      <textarea data-f="cnames" placeholder="اللقب والاسم — سطر لكل تلميذ">${esc((NM[c.id] || []).slice(0, c.n).join('\n'))}</textarea>
      <div class="cn-row"><button class="cn-btn" data-act="saveNames">حفظ القائمة</button></div></details>`;
    const set = RO ? '' : `<details data-k="set"${op('set')}><summary>إعدادات الدفتر والعلامات القصوى</summary>
      <div class="cn-row"><label>المستوى <select data-f="level"><option value="">—</option>${['الأولى', 'الثانية', 'الثالثة', 'الرابعة'].map((x) => `<option ${D.level === x ? 'selected' : ''}>${x}</option>`).join('')}</select> متوسط</label>
        <label>المادة <input type="text" data-f="subject" value="${esc(D.subject || '')}" style="width:150px"></label>
        <label>الموسم <input type="text" data-f="year" value="${esc(D.year || '')}" style="width:90px"></label>
        <label>عتبة التعثر (م.ت.م) <input type="text" data-f="thr" value="${D.thr}" style="width:50px;text-align:center"></label></div>
      <div class="cn-row">${COLS.map((k, i) => `<label>${k[2]} <input type="text" data-f="max" data-i="${i}" value="${D.max[i]}" style="width:44px;text-align:center"></label>`).join('')}</div></details>`;
    const tools = `<div class="cn-row cn-noprint">${tab === 'rem' ? '<button class="cn-btn sec" data-act="remXls">تصدير قائمة المعالجة (Excel)</button>' : '<button class="cn-btn sec" data-act="xls">تصدير دفتر هذا القسم (Excel)</button>'}${tab !== 'rem' && D.classes.length > 1 ? '<button class="cn-btn sec" data-act="xlsAll">تصدير كل الأقسام</button>' : ''}<button class="cn-btn sec" data-act="print">طباعة</button></div>`;
    return `<div class="cn-noprint"><div class="cn-row">${chips}</div><div class="cn-row">${modes}</div>${semp ? `<div class="cn-row">${semp}</div>` : ''}${mgr}${set}${tools}</div>${RO ? '<div class="cn-ro">وضع الاطلاع فقط' + (roLabel ? ' — دفتر ' + esc(roLabel) : '') + ': دفتر التنقيط لصاحب الحساب وحده، ولا يمكن تعديله أو حذفه.</div>' : ''}`;
  }
  function gridView(c) {
    const R = rows(c), n = c.n;
    if (!n) return '<div class="cn-warn">لا يوجد تلاميذ في هذا القسم بعد. افتح «إدارة القسم» ثم الصق قائمة الأسماء أو اضبط عدد التلاميذ.</div>';
    const g1 = GROUPS.map((g) => `<th colspan="${g[2] - g[1]}" class="${g[3]}">${g[0]}</th>`).join('');
    const hd = `<thead><tr class="h1"><th rowspan="2" class="sticky s0">#</th><th rowspan="2" class="sticky s1">أسماء التلاميذ</th>${g1}<th colspan="6" class="gc">النتائج</th></tr>
      <tr class="h2">${COLS.map((k, i) => `<th class="${GROUPS.find((g) => i >= g[1] && i < g[2])[3]}" title="${esc(k[0])}">${k[2]}<br>/${D.max[i]}</th>`).join('')}
      <th class="gc">المجموع<br>/20</th><th class="gc">الفرض<br>/20</th><th class="gc">م.ت.م</th><th class="gt">الاختبار<br>/20</th><th class="gt">المعدل<br>الفصلي</th><th class="gt">التقدير</th></tr></thead>`;
    const body = R.slice(0, n).map((r, i) => {
      const k = calc(r);
      return `<tr data-r="${i}"><td class="sticky s0">${i + 1}</td><td class="sticky s1 cn-nm">${esc(nameOf(c, i))}</td>
        ${COLS.map((_, j) => `<td><input class="n" data-f="a" data-r="${i}" data-k="${j}" value="${r.a[j] == null ? '' : r.a[j]}" ${RO ? 'disabled' : ''}></td>`).join('')}
        <td class="calc" data-o="L">${k.any ? f2(k.L) : ''}</td><td><input class="n" data-f="f" data-r="${i}" value="${r.f == null ? '' : r.f}" ${RO ? 'disabled' : ''}></td>
        <td class="calc" data-o="O">${k.any ? f2(k.O) : ''}</td><td><input class="n" data-f="t" data-r="${i}" value="${r.t == null ? '' : r.t}" ${RO ? 'disabled' : ''}></td>
        <td class="res" data-o="U">${k.any ? f2(k.U) : ''}</td><td class="res" data-o="V">${esc(k.V)}</td></tr>`;
    }).join('');
    return `<div class="cn-cards" id="cnCards"></div><div class="cn-wrap"><table>${hd}<tbody>${body}</tbody></table></div>
      <details data-k="how"${openSet.how ? ' open' : ''} style="margin-top:10px"><summary>طريقة الحساب (مراسلة الوزارة 270 المؤرخة في 2025/11/11)</summary>
      <div class="cn-note" style="margin:8px 0 0">م.ت.م = (مجموع النشاطات + الفرض) ÷ 2 &nbsp;|&nbsp; المعدل الفصلي = (م.ت.م + الاختبار×2) ÷ 3 &nbsp;|&nbsp; الحقول تقبل الكسور (1.5) وتتلوّن بالأحمر إن خرجت عن العلامة القصوى.</div></details>`;
  }
  function stats(c) {
    const el = document.getElementById('cnCards'); if (!el) return;
    const K = rows(c).slice(0, c.n).map(calc).filter((x) => x.any), A = analyse(c);
    const pass = K.filter((x) => x.U >= 10).length, bad = A.filter((a) => a.lvl === 'urgent' || a.lvl === 'weak').length;
    const card = (v, l, cl) => `<div class="cn-card ${cl || ''}"><b>${v}</b><span>${l}</span></div>`;
    el.innerHTML = card(K.length + ' / ' + c.n, 'المنقَّطون') + card(K.length ? f2(K.reduce((s, x) => s + x.U, 0) / K.length) : '—', 'المعدل العام للقسم') +
      card(K.length ? f2(pass / K.length * 100) + '٪' : '—', 'نسبة الناجحين (≥10)') + card(bad, 'متعثرون عند الوقفة التقويمية (م.ت.م أقل من ' + (D.thr || 10) + ')', bad ? 'alert' : '');
  }
  function annualView(c) {
    const n = c.n; if (!n) return '<div class="cn-warn">لا يوجد تلاميذ في هذا القسم.</div>';
    const rr = [1, 2, 3].map((s) => sd(c.id, s));
    const lines = Array.from({ length: n }, (_, i) => {
      const u = rr.map((R) => (R[i] && calc(R[i]).any) ? calc(R[i]).U : null), have = u.filter((x) => x != null), y = have.length === 3 ? have.reduce((a, b) => a + b, 0) / 3 : null;
      return `<tr><td>${i + 1}</td><td class="l cn-nm">${esc(nameOf(c, i))}</td>${u.map((x) => `<td>${f2(x)}</td>`).join('')}<td class="res">${f2(y)}</td><td>${y == null ? '<span class="cn-sm">بانتظار اكتمال الفصول</span>' : esc(mention(y))}</td></tr>`;
    }).join('');
    return `<div class="cn-note">المعدل السنوي = (معدل الفصل 1 + 2 + 3) ÷ 3، ويظهر عند اكتمال الفصول الثلاثة.</div><div class="cn-wrap"><table><thead><tr><th>#</th><th>أسماء التلاميذ</th><th>الفصل 1</th><th>الفصل 2</th><th>الفصل 3</th><th>المعدل السنوي</th><th>التقدير</th></tr></thead><tbody>${lines}</tbody></table></div>`;
  }
  /* ----- الوقفة التقويمية والمعالجة المبرمجة ----- */
  function remView(c) {
    if (!c.n) return '<div class="cn-warn">لا يوجد تلاميذ في هذا القسم.</div>';
    const A = analyse(c), thr = D.thr || 10;
    const chk = ((D.chk[c.id] = D.chk[c.id] || {})[sem]) || '';
    const flagged = A.filter((a) => a.lvl === 'urgent' || a.lvl === 'weak' || (showFrag && a.lvl === 'fragile')).sort((a, b) => a.cc - b.cc);
    const incomplete = A.filter((a) => a.lvl === 'incomplete' || a.lvl === 'none'), noData = A.every((a) => a.lvl === 'none');
    const D0 = RO ? ' disabled' : '';
    const head = `<div class="cn-row cn-noprint"><b style="font-size:13px">الوقفة التقويمية — الفصل ${SEMN[sem - 1]}:</b>
        <label>تاريخ التثبيت <input type="text" data-f="chk" value="${esc(chk)}" placeholder="jj/mm/aaaa" style="width:110px;text-align:center"${D0}></label>
        ${RO ? '' : '<button class="cn-btn sec" data-act="chkToday">تثبيت اليوم</button>'}
        <label><input type="checkbox" data-f="frag" ${showFrag ? 'checked' : ''}> إظهار الهشّين (م.ت.م بين ${thr} و${thr + 2})</label></div>`;
    const warn = noData ? '<div class="cn-warn">لم يُدخَل أي تنقيط في هذا الفصل بعد.</div>' : incomplete.length ? `<div class="cn-warn">تنبيه: ${incomplete.length} تلميذاً ينقصهم تنقيط (${incomplete.slice(0, 6).map((a) => esc(nameOf(c, a.i) || '#' + (a.i + 1)) + (a.miss.length ? ' [' + a.miss.join('، ') + ']' : '')).join(' — ')}${incomplete.length > 6 ? ' …' : ''}). أكمل تنقيطهم ليُدرجوا في الفرز.</div>` : '';
    const sum = `<div class="cn-cards"><div class="cn-card alert"><b>${A.filter((a) => a.lvl === 'urgent').length}</b><span>حالات عاجلة (م.ت.م أقل من ${thr - 2})</span></div><div class="cn-card alert"><b>${A.filter((a) => a.lvl === 'weak').length}</b><span>متعثرون (من ${thr - 2} إلى أقل من ${thr})</span></div><div class="cn-card"><b>${A.filter((a) => a.lvl === 'fragile').length}</b><span>هشّون (من ${thr} إلى أقل من ${thr + 2})</span></div><div class="cn-card"><b>${A.filter((a) => a.lvl === 'ok').length}</b><span>مستقرّون</span></div></div>`;
    if (!flagged.length) return head + warn + sum + '<div class="cn-note">لا يوجد متعثرون حسب العلامات الحالية.</div>';
    const rm = flagged.map((a, n) => {
      const R = remGet(c, a.i), t = LV[a.lvl];
      const fin = a.hasT ? `${f2(a.U)} ${a.U >= 10 ? '✓' : '✗'}` : '—';
      return `<tr><td>${n + 1}</td><td class="l cn-nm">${esc(nameOf(c, a.i) || 'تلميذ ' + (a.i + 1))}</td><td>${f2(a.cc)}</td><td><span class="tag" style="background:${t[1]}">${t[0]}</span></td><td>${f2(a.need)}</td><td class="l">${esc(a.weak.join('، ') || '—')}</td>
        <td><input type="text" data-f="rd" data-r="${a.i}" value="${esc(R.d)}" placeholder="jj/mm/aaaa" style="width:96px;text-align:center"${D0}></td>
        <td><select data-f="rm" data-r="${a.i}"${D0}><option value="">—</option>${MODES.map((m) => `<option ${R.m === m ? 'selected' : ''}>${m}</option>`).join('')}</select></td>
        <td><select data-f="rs" data-r="${a.i}"${D0}>${STAT.map((m) => `<option ${R.st === m ? 'selected' : ''}>${m}</option>`).join('')}</select></td>
        <td><input type="text" data-f="rn" data-r="${a.i}" value="${esc(R.n)}" placeholder="ملاحظة" style="width:150px"${D0}></td><td>${fin}</td></tr>`;
    }).join('');
    return head + warn + sum + (RO ? '' : `<div class="cn-row cn-noprint"><label>إسناد تاريخ لكل القائمة <input type="text" data-f="allDate" placeholder="jj/mm/aaaa" style="width:110px;text-align:center"></label><button class="cn-btn sec" data-act="allDate">تطبيق</button><label>النمط <select data-f="allMode"><option value="">—</option>${MODES.map((m) => `<option>${m}</option>`).join('')}</select></label><button class="cn-btn sec" data-act="allMode">تطبيق</button></div>`) + `
      <div class="cn-note">«الاختبار اللازم» هو أدنى علامة (من 20) تُبلغ المتعلم معدلاً فصلياً قدره ${thr}: (${3 * thr} − م.ت.م) ÷ 2. «أضعف المحاور» تُستخرج من الأعمدة التي لا تتجاوز 60٪ من علامتها القصوى. العمود الأخير يُملأ بعد إدخال علامة الاختبار.</div>
      <div class="cn-wrap"><table><thead><tr><th>#</th><th>التلميذ</th><th>م.ت.م</th><th>المستوى</th><th>الاختبار اللازم /20</th><th>أضعف المحاور</th><th>تاريخ المعالجة</th><th>النمط</th><th>الحالة</th><th>ملاحظة</th><th>المعدل بعد الاختبار</th></tr></thead><tbody>${rm}</tbody></table></div>`;
  }

  /* ----- التفاعل ----- */
  function recalcRow(i) {
    const tr = document.querySelector(`#carnet tr[data-r="${i}"]`); if (!tr) return;
    const k = calc(rows()[i]), set = (o, v) => { const e = tr.querySelector(`[data-o="${o}"]`); if (e) e.innerHTML = v; };
    set('L', k.any ? f2(k.L) : ''); set('O', k.any ? f2(k.O) : ''); set('U', k.any ? f2(k.U) : ''); set('V', esc(k.V)); stats(cls());
  }
  function onInput(e) {
    const t = e.target, f = t.dataset && t.dataset.f; if (!f || RO) return;
    const c = cls(), isChange = e.type === 'change';
    const chk = (mx) => { const v = num(t.value); t.classList.toggle('bad', v != null && (v < 0 || v > mx)); t.title = (v != null && (v < 0 || v > mx)) ? 'خارج المجال (0 — ' + mx + ')' : ''; };
    if (f === 'a') { const i = +t.dataset.r, k = +t.dataset.k; rows()[i].a[k] = num(t.value); chk(D.max[k]); recalcRow(i); save(); }
    else if (f === 'f') { const i = +t.dataset.r; rows()[i].f = num(t.value); chk(20); recalcRow(i); save(); }
    else if (f === 't') { const i = +t.dataset.r; rows()[i].t = num(t.value); chk(20); recalcRow(i); save(); }
    else if (f === 'subject') { D.subject = t.value; save(); }
    else if (f === 'year') { D.year = t.value; save(); }
    else if (f === 'level' && isChange) { D.level = t.value; save(); }
    else if (f === 'cname') { c.name = t.value || c.name; save(); if (isChange) render(); }
    else if (f === 'csize' && isChange) { const v = Math.max(0, Math.min(80, Math.round(num(t.value) || 0))); c.n = v; save(); render(); }
    else if (f === 'thr' && isChange) { const v = num(t.value); D.thr = v && v > 2 && v <= 20 ? v : 10; save(); render(); }
    else if (f === 'max' && isChange) { const v = num(t.value), i = +t.dataset.i; D.max[i] = v == null || v <= 0 ? COLS[i][1] : v; save(); render(); }
    else if (f === 'chk') { const m = maskDate(t.value); t.value = m; ((D.chk[c.id] = D.chk[c.id] || {})[sem]) = m; save(); }
    else if (f === 'frag' && isChange) { showFrag = t.checked; render(); }
    else if (f === 'rd') { const m = maskDate(t.value); t.value = m; remSet(c, +t.dataset.r).d = m; save(); }
    else if (f === 'rm' && isChange) { remSet(c, +t.dataset.r).m = t.value; save(); }
    else if (f === 'rs' && isChange) { remSet(c, +t.dataset.r).st = t.value; save(); }
    else if (f === 'rn') { remSet(c, +t.dataset.r).n = t.value; save(); }
    else if (f === 'allDate') { t.value = maskDate(t.value); }
  }
  function onClick(e) {
    const b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, c = cls();
    if (act === 'cls') { D.cur = b.dataset.id; save(); render(); }
    else if (act === 'sem') { sem = +b.dataset.s; if (tab === 'annual') tab = 'grid'; render(); }
    else if (act === 'tab') { tab = b.dataset.t; render(); }
    else if (RO && !['xls', 'xlsAll', 'print', 'remXls'].includes(act)) return;
    else if (act === 'addcls') { const nm = prompt('اسم القسم الجديد (مثال: 3م2):'); if (!nm || !nm.trim()) return; const id = uid(); D.classes.push({ id, name: nm.trim(), n: 0 }); D.s[id] = { 1: [], 2: [], 3: [] }; D.cur = id; openSet.mgr = true; save(); render(); }
    else if (act === 'delcls') { if (D.classes.length < 2) { alert('لا يمكن حذف القسم الوحيد.'); return; } if (!confirm('حذف القسم «' + c.name + '» وكل علاماته وقائمة تلاميذه نهائياً؟')) return; D.classes = D.classes.filter((k) => k.id !== c.id); delete D.s[c.id]; delete D.chk[c.id]; delete D.rem[c.id]; delete NM[c.id]; D.cur = D.classes[0].id; save(); render(); }
    else if (act === 'saveNames') { const ta = document.querySelector('#carnet [data-f="cnames"]'), L = ta.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 80); NM[c.id] = L; c.n = L.length || c.n; openSet.mgr = true; save(); render(); }
    else if (act === 'impNames') { if (typeof students === 'undefined' || !students.length) { alert('لا توجد أسماء في شبكة التقويم.'); return; } const L = students.map((s) => (s.name || '').trim()); if (!L.some(Boolean)) { alert('شبكة التقويم لا تحوي أسماء بعد.'); return; } if (!confirm('نسخ ' + L.length + ' اسماً من الشبكة إلى القسم «' + c.name + '»؟')) return; NM[c.id] = L; c.n = L.length; openSet.mgr = true; save(); render(); }
    else if (act === 'impTest') {
      if (typeof students === 'undefined' || !students.length) { alert('الشبكة فارغة.'); return; }
      const mt = (typeof maxTotal === 'function') ? maxTotal() : 20; if (!mt) return;
      if (!confirm('نسخ علامات الاختبار (محوَّلة إلى 20) من الشبكة إلى «' + c.name + '» — الفصل ' + SEMN[sem - 1] + '؟ تُطابَق الأسماء بالترتيب وتُستبدل العلامات الحالية.')) return;
      const R = rows(c); R.forEach((r, i) => { if (!students[i]) return; const tot = PREFIXES.reduce((s, p) => s + (+students[i][p] || 0), 0); r.t = Math.round(tot / mt * 20 * 100) / 100; });
      tab = 'grid'; save(); render();
    }
    else if (act === 'chkToday') { ((D.chk[c.id] = D.chk[c.id] || {})[sem]) = today(); save(); render(); }
    else if (act === 'allDate') { const v = maskDate((document.querySelector('#carnet [data-f="allDate"]') || {}).value || ''); if (v.length < 10) { alert('أدخل التاريخ بصيغة jj/mm/aaaa'); return; } analyse(c).filter((a) => a.lvl === 'urgent' || a.lvl === 'weak' || (showFrag && a.lvl === 'fragile')).forEach((a) => { const r = remSet(c, a.i); r.d = v; if (r.st === 'لم تُبرمج') r.st = 'مبرمجة'; }); save(); render(); }
    else if (act === 'allMode') { const v = (document.querySelector('#carnet [data-f="allMode"]') || {}).value; if (!v) return; analyse(c).filter((a) => a.lvl === 'urgent' || a.lvl === 'weak' || (showFrag && a.lvl === 'fragile')).forEach((a) => { remSet(c, a.i).m = v; }); save(); render(); }
    else if (act === 'print') { document.body.classList.add('cn-printing'); window.print(); setTimeout(() => document.body.classList.remove('cn-printing'), 500); }
    else if (act === 'xls') exportXlsx([c]);
    else if (act === 'xlsAll') exportXlsx(D.classes);
    else if (act === 'remXls') exportRem(c);
  }

  /* ----- تصدير Excel ----- */
  const sheetName = (s) => String(s).replace(/[\\\/?*\[\]:]/g, '-').slice(0, 31);
  function meta() { return ['school', 'teacher', 'classSection'].map((id) => { const e = document.getElementById(id); return (e && e.value) || ''; }); }
  function semSheet(c, s) {
    const m = meta(), n = c.n, R = sd(c.id, s), A = [];
    A.push(['اسم المتوسطة:', m[0], '', '', 'الأستاذ(ة):', m[1]]);
    A.push(['المستوى:', (D.level || '') + ' متوسط', '', '', 'القسم:', c.name]);
    A.push(['المادة:', D.subject || '', '', '', 'الموسم الدراسي:', D.year || '']);
    A.push(['دفتر التنقيط والمتابعة — الفصل ' + SEMN[s - 1]]);
    A.push(['م.ت.م = (معدل تقويم النشاطات + علامة الفرض) ÷ 2  |  المعدل الفصلي = (م.ت.م + علامة الاختبار/40) ÷ 3']);
    A.push([]);
    const H1 = ['الرقم', 'أسماء التلاميذ'], H2 = ['', ''];
    GROUPS.forEach((g) => { for (let k = g[1]; k < g[2]; k++) { H1.push(k === g[1] ? g[0] : ''); H2.push(COLS[k][0]); } });
    H1.push('المجموع من 20', 'الفرض من 20', 'المجموع العام', 'معدل المراقبة المستمرة (م.ت.م)', 'الاختبار من 20', 'الاختبار ×2 (من 40)', 'م.ت.م + الاختبار/40', 'المعدل الفصلي', 'الملاحظة والتقدير');
    for (let k = 0; k < 9; k++) H2.push('');
    A.push(H1); A.push(H2);
    A.push(['', 'الحد الأقصى', ...D.max, D.max.reduce((a, b) => a + b, 0), 20, 40, 20, 20, 40, 60, 20, '']);
    const r0 = A.length;
    for (let i = 0; i < n; i++) { const r = R[i] || blankRow(), k = calc(r); A.push([i + 1, nameOf(c, i), ...r.a.map((x) => x == null ? '' : x), k.any ? k.L : '', r.f == null ? '' : r.f, k.any ? k.N : '', k.any ? k.O : '', r.t == null ? '' : r.t, k.any ? k.S : '', k.any ? k.T : '', k.any ? k.U : '', k.V]); }
    const ws = XLSX.utils.aoa_to_sheet(A);
    for (let i = 0; i < n; i++) {
      const rr = r0 + i + 1, put = (col, f) => { const cell = ws[col + rr]; if (cell && cell.t === 'n') cell.f = f; };
      put('L', `SUM(C${rr}:K${rr})`); put('N', `L${rr}+M${rr}`); put('O', `N${rr}/2`); put('Q', `P${rr}*2`); put('R', `O${rr}+Q${rr}`); put('S', `R${rr}/3`);
      const mm = ws['T' + rr]; if (mm && mm.v) mm.f = `IF(ROUND(S${rr},2)>20,"خطأ",IF(ROUND(S${rr},2)>=18,"ممتاز",IF(ROUND(S${rr},2)>16,"جيد جداً",IF(ROUND(S${rr},2)>14,"جيد",IF(ROUND(S${rr},2)>10,"مرضٍ",IF(ROUND(S${rr},2)=10,"وسط عموما",IF(ROUND(S${rr},2)>0,"غير مرضٍ","خطأ")))))))`;
    }
    const lastR = r0 + n, st = lastR + 2, vals = A.slice(r0).filter((x) => x[18] !== '').map((x) => x[18]);
    XLSX.utils.sheet_add_aoa(ws, [['', 'عدد المنقَّطين', { t: 'n', v: vals.length, f: `COUNT(S${r0 + 1}:S${lastR})` }], ['', 'المعدل العام للقسم', { t: 'n', f: `IFERROR(AVERAGE(S${r0 + 1}:S${lastR}),0)`, v: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 }], ['', 'عدد الناجحين (≥10)', { t: 'n', f: `COUNTIF(S${r0 + 1}:S${lastR},">=10")`, v: vals.filter((x) => x >= 10).length }]], { origin: 'A' + st });
    ws['!merges'] = [{ s: { r: 3, c: 0 }, e: { r: 3, c: 19 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 19 } }, { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } }, { s: { r: 6, c: 5 }, e: { r: 6, c: 7 } }, { s: { r: 6, c: 8 }, e: { r: 6, c: 10 } }];
    for (let k = 11; k <= 19; k++) ws['!merges'].push({ s: { r: 6, c: k }, e: { r: 7, c: k } });
    ws['!cols'] = [{ wch: 6 }, { wch: 26 }, ...COLS.map(() => ({ wch: 12 })), { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 16 }, { wch: 11 }, { wch: 13 }, { wch: 14 }, { wch: 13 }, { wch: 16 }];
    if (window.XLSXFmt) XLSXFmt.polish(ws, { titleRows: [0, 1, 2, 3, 4], headerRows: [6, 7], tableFrom: 6, zebra: true });
    return ws;
  }
  function annualSheet(c) {
    const n = c.n, Y = [['الحصيلة السنوية — ' + (D.subject || '') + ' — ' + c.name], [], ['الرقم', 'أسماء التلاميذ', 'معدل الفصل 1', 'معدل الفصل 2', 'معدل الفصل 3', 'المعدل السنوي', 'التقدير']];
    for (let i = 0; i < n; i++) { const u = [1, 2, 3].map((s) => { const r = sd(c.id, s)[i]; return r && calc(r).any ? calc(r).U : ''; }), full = u.every((x) => x !== ''), y = full ? (u[0] + u[1] + u[2]) / 3 : ''; Y.push([i + 1, nameOf(c, i), ...u, y, y === '' ? '' : mention(y)]); }
    const wy = XLSX.utils.aoa_to_sheet(Y);
    for (let i = 0; i < n; i++) { const x = wy['F' + (4 + i)]; if (x && x.t === 'n') x.f = `(C${4 + i}+D${4 + i}+E${4 + i})/3`; }
    wy['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]; wy['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    if (window.XLSXFmt) XLSXFmt.polish(wy, { titleRows: [0], headerRows: [2], tableFrom: 2, zebra: true });
    return wy;
  }
  function save2(wb, name) { if (window.XLSXFmt) XLSXFmt.write(wb, name); else { wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, name); } }
  function exportXlsx(list) {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محمّلة'); return; }
    const wb = XLSX.utils.book_new(), one = list.length === 1;
    list.forEach((c) => {
      for (let s = 1; s <= 3; s++) XLSX.utils.book_append_sheet(wb, semSheet(c, s), sheetName(one ? 'الفصل ' + SEMN[s - 1] : c.name + ' ف' + s));
      XLSX.utils.book_append_sheet(wb, annualSheet(c), sheetName(one ? 'الحصيلة السنوية' : c.name + ' سنوي'));
    });
    save2(wb, 'دفتر_التنقيط_' + (one ? list[0].name : 'كل_الأقسام') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }
  function exportRem(c) {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محمّلة'); return; }
    const A = analyse(c).filter((a) => a.lvl === 'urgent' || a.lvl === 'weak' || (showFrag && a.lvl === 'fragile')).sort((a, b) => a.cc - b.cc), thr = D.thr || 10, m = meta();
    const X = [['قائمة المعالجة المبرمجة قبل الاختبار — القسم ' + c.name + ' — الفصل ' + SEMN[sem - 1]], ['المتوسطة: ' + m[0] + ' | الأستاذ(ة): ' + m[1] + ' | المادة: ' + (D.subject || '') + ' | الوقفة التقويمية: ' + (((D.chk[c.id] || {})[sem]) || '—')], [],
      ['الرقم', 'التلميذ', 'م.ت.م', 'المستوى', 'الاختبار اللازم لبلوغ ' + thr + ' (من 20)', 'أضعف المحاور', 'تاريخ المعالجة', 'النمط', 'الحالة', 'ملاحظة', 'المعدل بعد الاختبار']];
    A.forEach((a, n) => { const R = remGet(c, a.i); X.push([n + 1, nameOf(c, a.i) || 'تلميذ ' + (a.i + 1), a.cc, LV[a.lvl][0], a.need, a.weak.join('، '), R.d, R.m, R.st, R.n, a.hasT ? a.U : '']); });
    const ws = XLSX.utils.aoa_to_sheet(X);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
    ws['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 9 }, { wch: 10 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 11 }, { wch: 26 }, { wch: 14 }];
    if (window.XLSXFmt) XLSXFmt.polish(ws, { titleRows: [0, 1], headerRows: [3], tableFrom: 3, zebra: true });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName('المعالجة ف' + sem));
    save2(wb, 'المعالجة_المبرمجة_' + c.name + '_ف' + sem + '_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  /* ----- ربط بالصفحة ----- */
  function init() { if (typeof students === 'undefined') { setTimeout(init, 200); return; } load(); mount(); render(); }
  window.Carnet = {
    view(json, label) { try { D = migrate(JSON.parse(json)); } catch (e) { D = fresh(); } NM = {}; roLabel = label || ''; RO = true; sem = 1; tab = 'grid'; if (!D.classes.find((c) => c.id === D.cur)) D.cur = D.classes[0].id; render(); },
    reset() { RO = false; roLabel = ''; load(); render(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
