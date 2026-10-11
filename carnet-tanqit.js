/* carnet-tanqit.js — دفتر التنقيط والمتابعة (التعليم المتوسط) مرتبط بـ«تقويم النتائج»
   وفق مراسلة وزارة التربية الوطنية رقم 270 المؤرخة في 2025/11/11 (التقويم البيداغوجي 2025-2026، مرحلة المتوسط):
     م.ت.م  (معدل التقويم المستمر)  = (معدل تقويم النشاطات + علامة الفرض) ÷ 2
     م.ف.م.ت (المعدل الفصلي للمادة) = (م.ت.م + علامة الاختبار على 40) ÷ 3      [الاختبار على 20 ثم ×2 ليصير على 40]
     المعدل السنوي = (معدل الفصل 1 + 2 + 3) ÷ 3
   • أسماء التلاميذ تُؤخذ من شبكة «تقويم النتائج» ولا تُخزَّن هنا (تبقى على الجهاز).
   • العلامات تُحفظ في مفتاح carnet_tanqit_v1 (تُزامَن مع صفّ صاحب الحساب فقط، ولا يعدّلها غيره). */
(function () {
  'use strict';
  const KEY = 'carnet_tanqit_v1';
  const COLS = [
    ['استجواب شفوي أو كتابي', 3], ['مناقشات', 2], ['المشاركة والفعالية', 2],
    ['التحضيرات والمبادرات', 2], ['واجبات منزلية', 2], ['بحوث ومشاريع', 2],
    ['إحضار واستعمال أدوات التعلم', 2], ['الغيابات والتأخرات', 2], ['سلوك التلاميذ', 3]
  ];
  const GROUPS = [['تقويم أنشطة صفية', 0, 3], ['تقويم أنشطة لا صفية', 3, 6], ['الانضباط والمواظبة', 6, 9]];
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(window.toWesternDigits ? toWesternDigits(String(v)) : v).replace(',', '.')); return isNaN(n) ? null : n; };
  const f2 = (n) => (n == null || isNaN(n)) ? '—' : (Math.round(n * 100) / 100).toFixed(2);

  let D = null, sem = 1, RO = false, tmr = null;
  const blankRow = () => ({ a: COLS.map(() => null), f: null, t: null });
  const fresh = () => ({ v: 1, year: '2025/2026', subject: 'اللغة العربية', level: '', max: COLS.map((c) => c[1]), s: { 1: [], 2: [], 3: [] } });
  function load() {
    try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
    if (!D || !D.s) D = fresh();
    D.max = (D.max && D.max.length === 9) ? D.max : COLS.map((c) => c[1]);
  }
  function save() {
    if (RO) return;
    clearTimeout(tmr);
    tmr = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }, 400);
  }
  const N = () => (typeof students !== 'undefined' ? students.length : 0);
  const rows = () => { const r = D.s[sem] = D.s[sem] || []; while (r.length < N()) r.push(blankRow()); return r; };

  /* ----- الحساب (مطابق لدفتر التنقيط المعتمد) ----- */
  function calc(r) {
    const any = r.a.some((x) => x != null) || r.f != null || r.t != null;
    const L = r.a.reduce((s, x) => s + (x || 0), 0);
    const Nn = L + (r.f || 0), O = Nn / 2, S = (r.t || 0) * 2, T = O + S, U = T / 3;
    return { any, L, N: Nn, O, S, T, U, V: any ? mention(U) : '' };
  }
  function mention(u0) {
    const u = Math.round(u0 * 100) / 100;
    if (u > 20) return 'خطأ في الإدخال'; if (u >= 18) return 'ممتــــاز'; if (u > 16) return 'جيد جداً'; if (u > 14) return 'جيـــــــد';
    if (u > 10) return 'مــــرضٍ'; if (u === 10) return 'وسط عموما'; if (u > 0) return 'غير مرضٍ'; return 'خطأ في الإدخال';
  }

  /* ----- الواجهة ----- */
  function css() {
    if (document.getElementById('carnetCss')) return;
    const s = document.createElement('style'); s.id = 'carnetCss';
    s.textContent = '#carnet .cn-tabs button{margin:2px}#carnet .cn-tabs .on{background:var(--gold);color:#081729;font-weight:bold}#carnet .cn-wrap{overflow-x:auto}#carnet table{border-collapse:collapse;width:100%;min-width:1100px;font-size:13px}#carnet th,#carnet td{border:1px solid var(--border);padding:3px 4px;text-align:center}#carnet thead th{background:var(--navy);color:#fff;font-weight:bold}#carnet thead .g2 th{background:var(--navy-light)}#carnet tbody tr:nth-child(even){background:rgba(196,155,63,.08)}#carnet input.n{width:54px;text-align:center;border:1px solid var(--border);border-radius:6px;padding:3px}#carnet input.bad{background:#fadbd8;border-color:#c0392b}#carnet .cn-name{text-align:right;min-width:150px}#carnet .cn-note{font-size:12px;color:var(--muted);margin:6px 0}#carnet .cn-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}#carnet .cn-stats div{border:1px solid var(--border);border-radius:10px;padding:6px 12px;background:#fffdf6}#carnet .cn-ro{color:#a01c2c;font-weight:bold;margin:6px 0}@media print{#carnet .cn-tabs,#carnet .cn-tools{display:none}}';
    document.head.appendChild(s);
  }
  function mount() {
    if (document.getElementById('carnet')) return;
    css();
    const card = document.createElement('div'); card.className = 'card'; card.id = 'carnet';
    card.innerHTML = '<div class="card-title">📒 دفتر التنقيط والمتابعة — التقويم المستمر (التعليم المتوسط)</div><div id="cnBody"></div>';
    (document.querySelector('.container') || document.body).appendChild(card);
  }
  function render() {
    const host = document.getElementById('cnBody'); if (!host || !D) return;
    const R = rows(), n = N();
    const head = `<div class="cn-tools no-print" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
      <span class="cn-tabs">${[1, 2, 3].map((k) => `<button class="btn btn-outline ${k === sem ? 'on' : ''}" data-s="${k}">الفصل ${['الأول', 'الثاني', 'الثالث'][k - 1]}</button>`).join('')}<button class="btn btn-outline ${sem === 0 ? 'on' : ''}" data-s="0">الحصيلة السنوية</button></span>
      <label>المستوى: <select id="cnLvl" ${RO ? 'disabled' : ''}><option value="">—</option>${['الأولى', 'الثانية', 'الثالثة', 'الرابعة'].map((x) => `<option ${D.level === x ? 'selected' : ''}>${x}</option>`).join('')}</select> متوسط</label>
      <label>المادة: <input id="cnSub" value="${esc(D.subject || '')}" style="width:150px" ${RO ? 'disabled' : ''}></label>
      <label>الموسم: <input id="cnYear" value="${esc(D.year || '')}" style="width:90px" ${RO ? 'disabled' : ''}></label>
      ${RO ? '' : '<button class="btn btn-gold" id="cnImp">⬇️ استيراد علامات الاختبار من شبكة التقويم</button>'}
      <button class="btn btn-outline" id="cnXls">📊 تصدير Excel</button>
    </div>${RO ? '<div class="cn-ro">وضع الاطلاع فقط — دفتر التنقيط لصاحب الحساب وحده.</div>' : ''}`;
    if (sem === 0) { host.innerHTML = head + annual(); wire(host); return; }
    const hd1 = `<tr><th rowspan="2">الرقم</th><th rowspan="2">أسماء التلاميذ</th>${GROUPS.map((g) => `<th colspan="${g[2] - g[1]}">${g[0]}</th>`).join('')}<th rowspan="2">المجموع من 20</th><th rowspan="2">الفرض من 20</th><th rowspan="2">م.ت.م<br><small>(نشاطات+فرض)÷2</small></th><th rowspan="2">الاختبار من 20</th><th rowspan="2">الاختبار ×2<br><small>(من 40)</small></th><th rowspan="2">المعدل الفصلي<br><small>(م.ت.م+اخ/40)÷3</small></th><th rowspan="2">الملاحظة والتقدير</th></tr>`;
    const hd2 = `<tr class="g2">${COLS.map((c, i) => `<th>${c[0]}<br><small>/ <input class="n mx" data-i="${i}" value="${D.max[i]}" style="width:36px" ${RO ? 'disabled' : ''}></small></th>`).join('')}</tr>`;
    const body = R.slice(0, n).map((r, i) => {
      const c = calc(r), nm = (students[i] && students[i].name) || '';
      return `<tr data-r="${i}"><td>${i + 1}</td><td class="cn-name" data-nm="${i}">${esc(nm)}</td>${COLS.map((cc, k) => `<td><input class="n a" data-r="${i}" data-k="${k}" value="${r.a[k] == null ? '' : r.a[k]}" ${RO ? 'disabled' : ''}></td>`).join('')}
        <td data-o="L">${c.any ? f2(c.L) : ''}</td><td><input class="n f" data-r="${i}" value="${r.f == null ? '' : r.f}" ${RO ? 'disabled' : ''}></td>
        <td data-o="O">${c.any ? f2(c.O) : ''}</td><td><input class="n t" data-r="${i}" value="${r.t == null ? '' : r.t}" ${RO ? 'disabled' : ''}></td>
        <td data-o="S">${c.any ? f2(c.S) : ''}</td><td data-o="U"><b>${c.any ? f2(c.U) : ''}</b></td><td data-o="V">${esc(c.V)}</td></tr>`;
    }).join('');
    host.innerHTML = head + `<div class="cn-note">الحقول تقبل الكسور (مثال 1.5). يُحتسب المعدل وفق مراسلة الوزارة 270/و.ت.و/م.ع.ت/25: م.ف.م.ت = (م.ت.م + علامة الاختبار/40) ÷ 3.</div>
      <div class="cn-wrap"><table><thead>${hd1}${hd2}</thead><tbody>${body}</tbody></table></div><div class="cn-stats" id="cnStats"></div>`;
    wire(host); stats();
  }
  function stats() {
    const el = document.getElementById('cnStats'); if (!el) return;
    const U = rows().slice(0, N()).map(calc).filter((c) => c.any).map((c) => c.U);
    const pass = U.filter((u) => u >= 10).length;
    el.innerHTML = U.length ? `<div>المتعلمون المنقَّطون: <b>${U.length}</b></div><div>المعدل العام للقسم: <b>${f2(U.reduce((a, b) => a + b, 0) / U.length)}</b></div><div>الناجحون (≥10): <b>${pass}</b> (${f2(pass / U.length * 100)}٪)</div><div>أعلى معدل: <b>${f2(Math.max(...U))}</b></div><div>أدنى معدل: <b>${f2(Math.min(...U))}</b></div>` : '<div>لا علامات بعد.</div>';
  }
  function annual() {
    const n = N(), rr = [1, 2, 3].map((s) => (D.s[s] || []));
    const lines = Array.from({ length: n }, (_, i) => {
      const u = rr.map((R) => (R[i] && calc(R[i]).any) ? calc(R[i]).U : null), have = u.filter((x) => x != null);
      const y = have.length === 3 ? have.reduce((a, b) => a + b, 0) / 3 : null;
      return `<tr><td>${i + 1}</td><td class="cn-name">${esc((students[i] && students[i].name) || '')}</td>${u.map((x) => `<td>${f2(x)}</td>`).join('')}<td><b>${f2(y)}</b></td><td>${y == null ? 'ينتظر اكتمال الفصول' : esc(mention(y))}</td></tr>`;
    }).join('');
    return `<div class="cn-note">المعدل السنوي = (معدل الفصل 1 + معدل الفصل 2 + معدل الفصل 3) ÷ 3، ويظهر عند اكتمال الفصول الثلاثة.</div><div class="cn-wrap"><table><thead><tr><th>الرقم</th><th>أسماء التلاميذ</th><th>الفصل 1</th><th>الفصل 2</th><th>الفصل 3</th><th>المعدل السنوي</th><th>التقدير</th></tr></thead><tbody>${lines}</tbody></table></div>`;
  }
  function recalcRow(i) {
    const tr = document.querySelector(`#carnet tr[data-r="${i}"]`); if (!tr) return;
    const c = calc(rows()[i]), set = (k, v) => { const e = tr.querySelector(`[data-o="${k}"]`); if (e) e.innerHTML = v; };
    set('L', c.any ? f2(c.L) : ''); set('O', c.any ? f2(c.O) : ''); set('S', c.any ? f2(c.S) : ''); set('U', `<b>${c.any ? f2(c.U) : ''}</b>`); set('V', esc(c.V));
    stats();
  }
  function wire(host) {
    host.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { sem = +b.dataset.s; render(); });
    const L = host.querySelector('#cnLvl'), S = host.querySelector('#cnSub'), Y = host.querySelector('#cnYear');
    if (L) L.onchange = () => { D.level = L.value; save(); };
    if (S) S.oninput = () => { D.subject = S.value; save(); };
    if (Y) Y.oninput = () => { D.year = Y.value; save(); };
    host.querySelectorAll('input.mx').forEach((e) => e.onchange = () => { const v = num(e.value); D.max[+e.dataset.i] = v == null ? COLS[+e.dataset.i][1] : v; save(); render(); });
    const chk = (e, mx) => { const v = num(e.value); e.classList.toggle('bad', v != null && (v < 0 || v > mx)); e.title = (v != null && (v < 0 || v > mx)) ? 'القيمة خارج المجال (0 — ' + mx + ')' : ''; };
    host.querySelectorAll('input.a').forEach((e) => { const k = +e.dataset.k; chk(e, D.max[k]); e.oninput = () => { rows()[+e.dataset.r].a[k] = num(e.value); chk(e, D.max[k]); recalcRow(+e.dataset.r); save(); }; });
    host.querySelectorAll('input.f').forEach((e) => { chk(e, 20); e.oninput = () => { rows()[+e.dataset.r].f = num(e.value); chk(e, 20); recalcRow(+e.dataset.r); save(); }; });
    host.querySelectorAll('input.t').forEach((e) => { chk(e, 20); e.oninput = () => { rows()[+e.dataset.r].t = num(e.value); chk(e, 20); recalcRow(+e.dataset.r); save(); }; });
    const imp = host.querySelector('#cnImp');
    if (imp) imp.onclick = () => {
      if (typeof students === 'undefined' || !students.length) return;
      const mt = (typeof maxTotal === 'function') ? maxTotal() : 20;
      if (!mt) return;
      if (!confirm('نسخ علامات الاختبار (من شبكة التقويم أعلاه، محوَّلة إلى 20) إلى هذا الفصل؟ ستُستبدل العلامات الحالية.')) return;
      rows().forEach((r, i) => { if (!students[i]) return; const tot = PREFIXES.reduce((s, p) => s + (+students[i][p] || 0), 0); r.t = Math.round(tot / mt * 20 * 100) / 100; });
      save(); render();
    };
    const x = host.querySelector('#cnXls'); if (x) x.onclick = exportXlsx;
  }

  /* ----- تصدير Excel منسّق (جداول بحدود وألوان، مع المعادلات الحيّة) ----- */
  function exportXlsx() {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محمّلة'); return; }
    const wb = XLSX.utils.book_new(), n = N(), meta = [document.getElementById('school'), document.getElementById('teacher'), document.getElementById('classSection')].map((e) => (e && e.value) || '');
    const SEM = ['الأول', 'الثاني', 'الثالث'];
    const colL = (i) => XLSX.utils.encode_col(i);
    for (let s = 1; s <= 3; s++) {
      const R = D.s[s] || [], A = [];
      A.push(['اسم المتوسطة:', meta[0], '', '', 'الأستاذ(ة):', meta[1]]);
      A.push(['المستوى:', (D.level || '') + ' متوسط', '', '', 'القسم:', meta[2]]);
      A.push(['المادة:', D.subject || '', '', '', 'الموسم الدراسي:', D.year || '']);
      A.push(['دفتر التنقيط والمتابعة — الفصل ' + SEM[s - 1]]);
      A.push(['م.ت.م = (معدل تقويم النشاطات + علامة الفرض) ÷ 2  |  المعدل الفصلي = (م.ت.م + علامة الاختبار/40) ÷ 3']);
      A.push([]);
      const H1 = ['الرقم', 'أسماء التلاميذ'], H2 = ['', ''];
      GROUPS.forEach((g) => { for (let k = g[1]; k < g[2]; k++) { H1.push(k === g[1] ? g[0] : ''); H2.push(COLS[k][0]); } });
      H1.push('المجموع من 20', 'الفرض من 20', 'المجموع العام', 'معدل المراقبة المستمرة (م.ت.م)', 'الاختبار من 20', 'الاختبار ×2 (من 40)', 'م.ت.م + الاختبار/40', 'المعدل الفصلي', 'الملاحظة والتقدير');
      for (let k = 0; k < 9; k++) H2.push(''); 
      A.push(H1); A.push(H2);
      A.push(['', 'الحد الأقصى', ...D.max, D.max.reduce((a, b) => a + b, 0), 20, 40, 20, 20, 40, 60, 20, '']);
      const r0 = A.length;
      for (let i = 0; i < n; i++) {
        const r = R[i] || blankRow(), c = calc(r);
        A.push([i + 1, (students[i] && students[i].name) || '', ...r.a.map((x) => x == null ? '' : x), c.any ? c.L : '', r.f == null ? '' : r.f, c.any ? c.N : '', c.any ? c.O : '', r.t == null ? '' : r.t, c.any ? c.S : '', c.any ? c.T : '', c.any ? c.U : '', c.V]);
      }
      const ws = XLSX.utils.aoa_to_sheet(A);
      for (let i = 0; i < n; i++) {
        const rr = r0 + i + 1, g = (c) => ws[c + rr];
        const put = (c, f) => { const cell = ws[c + rr]; if (cell && cell.t === 'n') cell.f = f; };
        put('L', `SUM(C${rr}:K${rr})`); put('N', `L${rr}+M${rr}`); put('O', `N${rr}/2`); put('Q', `P${rr}*2`); put('R', `O${rr}+Q${rr}`); put('S', `R${rr}/3`);
        const m = ws['T' + rr]; if (m && m.v) m.f = `IF(ROUND(S${rr},2)>20,"خطأ",IF(ROUND(S${rr},2)>=18,"ممتــــاز",IF(ROUND(S${rr},2)>16,"جيد جداً",IF(ROUND(S${rr},2)>14,"جيـــــــد",IF(ROUND(S${rr},2)>10,"مــــرضٍ",IF(ROUND(S${rr},2)=10,"وسط عموما",IF(ROUND(S${rr},2)>0,"غير مرضٍ","خطأ")))))))`;
      }
      const lastR = r0 + n;
      const st = lastR + 2;
      XLSX.utils.sheet_add_aoa(ws, [['', 'عدد المنقَّطين', { t: 'n', v: A.slice(r0).filter((x) => x[18] !== '').length, f: `COUNT(S${r0 + 1}:S${lastR})` }], ['', 'المعدل العام للقسم', { t: 'n', f: `IFERROR(AVERAGE(S${r0 + 1}:S${lastR}),0)`, v: 0 }], ['', 'عدد الناجحين (≥10)', { t: 'n', f: `COUNTIF(S${r0 + 1}:S${lastR},">=10")`, v: 0 }]], { origin: 'A' + st });
      const avg = A.slice(r0).filter((x) => x[18] !== '').map((x) => x[18]);
      ws['C' + (st + 1)].v = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : 0;
      ws['C' + (st + 2)].v = avg.filter((x) => x >= 10).length;
      ws['!merges'] = [{ s: { r: 3, c: 0 }, e: { r: 3, c: 19 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 19 } },
        { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } }, { s: { r: 6, c: 5 }, e: { r: 6, c: 7 } }, { s: { r: 6, c: 8 }, e: { r: 6, c: 10 } }];
      for (let c = 11; c <= 19; c++) ws['!merges'].push({ s: { r: 6, c }, e: { r: 7, c } });
      ws['!cols'] = [{ wch: 6 }, { wch: 26 }, ...COLS.map(() => ({ wch: 12 })), { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 16 }, { wch: 11 }, { wch: 13 }, { wch: 14 }, { wch: 13 }, { wch: 16 }];
      if (window.XLSXFmt) XLSXFmt.polish(ws, { titleRows: [0, 1, 2, 3, 4], headerRows: [6, 7], tableFrom: 6, zebra: true });
      XLSX.utils.book_append_sheet(wb, ws, 'الفصل ' + SEM[s - 1]);
    }
    // ورقة الحصيلة السنوية
    const Y = [['الحصيلة السنوية — ' + (D.subject || '')], [], ['الرقم', 'أسماء التلاميذ', 'معدل الفصل 1', 'معدل الفصل 2', 'معدل الفصل 3', 'المعدل السنوي', 'التقدير']];
    for (let i = 0; i < n; i++) {
      const u = [1, 2, 3].map((s) => { const r = (D.s[s] || [])[i]; return r && calc(r).any ? calc(r).U : ''; });
      const full = u.every((x) => x !== ''), y = full ? (u[0] + u[1] + u[2]) / 3 : '';
      Y.push([i + 1, (students[i] && students[i].name) || '', ...u, y, y === '' ? '' : mention(y)]);
    }
    const wy = XLSX.utils.aoa_to_sheet(Y);
    for (let i = 0; i < n; i++) { const c = wy['F' + (4 + i)]; if (c && c.t === 'n') c.f = `(C${4 + i}+D${4 + i}+E${4 + i})/3`; }
    wy['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    wy['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    if (window.XLSXFmt) XLSXFmt.polish(wy, { titleRows: [0], headerRows: [2], tableFrom: 2, zebra: true });
    XLSX.utils.book_append_sheet(wb, wy, 'الحصيلة السنوية');
    const name = 'دفتر_التنقيط_' + (meta[2] || 'قسم') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    if (window.XLSXFmt) XLSXFmt.write(wb, name); else { wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, name); }
  }

  /* ----- ربط بالصفحة ----- */
  function hook() {
    const rt = window.renderTable;
    if (typeof rt === 'function' && !rt.__cn) {
      window.renderTable = function () { const r = rt.apply(this, arguments); try { render(); } catch (e) {} return r; };
      window.renderTable.__cn = 1;
    }
    document.addEventListener('input', (e) => {                       // تحديث الأسماء فقط عند الكتابة في الشبكة
      if (!e.target.closest || !e.target.closest('#mainTable')) return;
      document.querySelectorAll('#carnet [data-nm]').forEach((c) => { const i = +c.dataset.nm; c.textContent = (students[i] && students[i].name) || ''; });
    });
  }
  function init() {
    if (typeof students === 'undefined') { setTimeout(init, 200); return; }
    load(); mount(); hook(); render();
  }
  /* وضع الاطلاع (المفتش/المشرف): يُستدعى من صفحة تقويم النتائج */
  window.Carnet = {
    view(json) { try { D = JSON.parse(json); } catch (e) { D = fresh(); } if (!D.s) D = fresh(); RO = true; sem = 1; render(); },
    reset() { RO = false; load(); render(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)); else setTimeout(init, 0);
})();
