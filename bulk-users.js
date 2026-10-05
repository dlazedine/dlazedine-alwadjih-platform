/* bulk-users.js — إنشاء حسابات الأساتذة دفعة واحدة (المفتش فقط، داخل تبويب «إدارة المستخدمين»)
   • كل حساب يُنشأ عبر واجهة Supabase الرسمية، مع اسم مستخدم مؤقت وكلمة مرور مؤقتة عشوائية
   • يُجبَر الأستاذ عند أول دخول على اختيار اسم مستخدم وكلمة مرور جديدين
   • كلمات المرور المؤقتة تُعرض مرة واحدة فقط في هذه الصفحة ولا تُخزَّن في أي مكان */
(function () {
  'use strict';
  const P = window.PortalCloud; if (!P) return;
  const CFG = window.PORTAL_CFG, T = window.BULK = Object.assign({ gap: 1200, rateWait: 65 }, window.BULK || {});
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const RL = { teacher: 'أستاذ', supervisor: 'مشرف' };
  const rnd = (n) => { const b = new Uint32Array(n); crypto.getRandomValues(b); return [...b]; };
  const genUser = () => 'ens' + rnd(5).map((x) => '23456789'[x % 8]).join('');
  const genPass = () => { const C = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; return rnd(12).map((x) => C[x % C.length]).join(''); };
  const parse = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const a = l.split(/\t|;|,|،/).map((x) => x.trim()); return { name: a[0], inst: a[1] || '', user: (a[2] || '').toLowerCase() };
  }).filter((r) => r.name);

  addEventListener('DOMContentLoaded', async () => {
    const c = await P.ready; const { data: s } = await c.auth.getSession(); if (!s.session) return;
    const { data: me } = await c.from('wajih_profiles').select('*').eq('id', s.session.user.id).single();
    if (!me || me.role !== 'inspector') return;
    const host = document.getElementById('cloudUsers'); if (!host) return;
    const box = document.createElement('section'); box.className = 'bk'; box.style.cssText = 'margin:20px 0;padding:0 8px;direction:rtl'; host.appendChild(box);
    box.innerHTML = `<style>.bk h2{color:#1f3864}.bk textarea{width:100%;min-height:150px;font:inherit;padding:8px;border:1px solid #ddd5bd;border-radius:10px;direction:rtl}
.bk button,.bk select{font:inherit;padding:7px 14px;border-radius:9px;border:1px solid #d8cfb8;margin:3px}.bk button.p{background:#1f3864;color:#fff;border:0;cursor:pointer}.bk button.p:disabled{opacity:.5}
.bk table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.bk td,.bk th{border:1px solid #ddd5bd;padding:4px 8px;text-align:center}.bk .m{font-size:.85rem;color:#6b7280}.bk .er{color:#a01c2c}.bk .ok{color:#1d7a46}
.bk .pb{height:10px;background:#e5dcc5;border-radius:6px;overflow:hidden;margin:8px 0}.bk .pb i{display:block;height:100%;width:0;background:#c49b3f;transition:width .3s}</style>
<h2>👥 إنشاء حسابات دفعة واحدة</h2>
<p class="m">الصق القائمة، سطراً لكل أستاذ: <b>الاسم واللقب</b> ثم (اختيارياً) <b>المؤسسة</b> ثم <b>اسم مستخدم</b>. يمكنك لصق عمودين مباشرة من Excel. إن لم تكتب اسم مستخدم يُولَّد اسم مؤقت (مثل <bdi dir="ltr">ens48213</bdi>) ويختار الأستاذ اسمه النهائي عند أول دخول.</p>
<textarea id="bkT" placeholder="حمدوش سامية\tمتوسطة علي عرباوي&#10;براهيمي فاطمة\tمتوسطة مصطفى فيلالي"></textarea>
<div>الدور: <select id="bkR"><option value="teacher">أستاذ</option><option value="supervisor">مشرف</option></select> <button id="bkP" class="p">معاينة</button></div>
<div id="bkV"></div><div id="bkS" class="m"></div><div id="bkO"></div>`;
    const $ = (id) => box.querySelector('#' + id); let rows = [], res = [], stop = false, running = false;

    $('bkP').onclick = () => {
      rows = parse($('bkT').value);
      if (!rows.length) { $('bkV').innerHTML = '<p class="er">لا توجد أسماء.</p>'; return; }
      if (rows.length > 400) { $('bkV').innerHTML = '<p class="er">الحد الأقصى 400 اسم في المرة الواحدة.</p>'; return; }
      $('bkV').innerHTML = `<p><b>${rows.length}</b> حساباً سيُنشأ. هذه أول الأسماء للتأكد من الأعمدة:</p><table><tr><th>#</th><th>الاسم واللقب</th><th>المؤسسة</th><th>اسم المستخدم</th></tr>${rows.slice(0, 5).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.inst)}</td><td>${esc(r.user || 'مؤقت تلقائي')}</td></tr>`).join('')}</table>
<p class="m">⚠️ حد التسجيل في Supabase نحو 30 حساباً كل 5 دقائق افتراضياً؛ إن بلغتَه ينتظر البرنامج تلقائياً ويكمل. وللإسراع ارفع الحد مؤقتاً من <b>Authentication ← Rate Limits</b>.</p>
<button id="bkG" class="p">إنشاء ${rows.length} حساباً الآن</button> <button id="bkX" style="display:none">إيقاف</button>`;
      $('bkG').onclick = go; $('bkX').onclick = () => { stop = true; };
    };

    const wait = async (sec) => { for (let i = Math.round(sec); i > 0 && !stop; i--) { $('bkS').textContent = `بلغنا حد معدّل التسجيل، ينتظر البرنامج ${i} ثانية ثم يكمل...`; await sleep(T.rateWait === 65 ? 1000 : 5); } };
    async function signUp(c2, u, pw) {
      for (let k = 0; k < 4; k++) {
        const { data, error } = await c2.auth.signUp({ email: u + '@' + CFG.EMAIL_DOMAIN, password: pw });
        if (!error && data && data.user) return { id: data.user.id };
        if (error && (error.status === 429 || /rate limit/i.test(error.message))) { await wait(T.rateWait); continue; }
        return { err: error ? error.message : 'تعذّر الإنشاء' };
      }
      return { err: 'حد المعدّل: أعد المحاولة لاحقاً' };
    }

    async function go() {
      if (running) return; const role = $('bkR').value;
      if (!confirm(`سيتم إنشاء ${rows.length} حساباً بدور «${RL[role]}». هل تتابع؟`)) return;
      running = true; stop = false; res = []; $('bkG').disabled = true; $('bkX').style.display = ''; $('bkO').innerHTML = '';
      $('bkV').insertAdjacentHTML('beforeend', '<div class="pb"><i id="bkB"></i></div>');
      const c2 = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'pc-bulk' } });
      const taken = new Set(((await c.from('wajih_profiles').select('username')).data || []).map((x) => x.username));
      for (let i = 0; i < rows.length && !stop; i++) {
        const r = rows[i]; let u = /^[a-z0-9_.-]{4,30}$/.test(r.user) ? r.user : genUser();
        if (taken.has(u)) { if (r.user) { res.push({ ...r, user: r.user, pw: '', ok: false, msg: 'اسم المستخدم مستعمل' }); continue; } while (taken.has(u)) u = genUser(); }
        taken.add(u); const pw = genPass(); $('bkS').textContent = `جارٍ إنشاء الحساب ${i + 1} من ${rows.length}: ${r.name}`;
        const a = await signUp(c2, u, pw); let ok = false, msg = a.err || '';
        if (a.id) {
          const p1 = await c.from('wajih_profiles').insert({ id: a.id, username: u, full_name: r.name, school: r.inst || null, role, must_change: true });
          if (p1.error) msg = 'أُنشئ الدخول وتعذّر الملف: ' + p1.error.message;
          else { ok = true; await c.from('wajih_prof').insert({ user_id: a.id, data: { name: r.name, inst: r.inst || '' }, updated_by_name: me.full_name || me.username }); }
        }
        res.push({ ...r, user: u, pw: ok ? pw : '', ok, msg });
        $('bkB').style.width = Math.round(((i + 1) / rows.length) * 100) + '%'; await sleep(T.gap === 1200 ? 1200 : T.gap);
      }
      running = false; $('bkX').style.display = 'none'; finish();
    }

    function finish() {
      const okN = res.filter((x) => x.ok).length, bad = res.filter((x) => !x.ok);
      $('bkS').innerHTML = `<b class="${bad.length ? '' : 'ok'}">اكتمل: تم إنشاء ${okN} من ${rows.length} حساباً.</b>${stop ? ' (أُوقف يدوياً)' : ''}`;
      $('bkO').innerHTML = `<p class="er"><b>مهم:</b> كلمات المرور المؤقتة تظهر هنا مرة واحدة فقط ولا تُحفظ في أي مكان. نزّل الملف أو اطبع البطاقات الآن، وسلّم كل أستاذ بياناته على انفراد.</p>
<button id="bkC" class="p">تنزيل CSV</button> <button id="bkK" class="p">طباعة بطاقات الدخول</button>
${bad.length ? `<p class="er">تعذّر ${bad.length}: ${bad.map((x) => esc(x.name) + ' (' + esc(x.msg) + ')').join('، ')}. انسخ أسماءهم وأعد المحاولة.</p>` : ''}
<table><tr><th>#</th><th>الاسم</th><th>المؤسسة</th><th>اسم المستخدم</th><th>كلمة المرور المؤقتة</th></tr>${res.filter((x) => x.ok).map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${esc(x.inst)}</td><td dir="ltr">${esc(x.user)}</td><td dir="ltr">${esc(x.pw)}</td></tr>`).join('')}</table>`;
      $('bkC').onclick = csv; $('bkK').onclick = slips;
    }
    const OK = () => res.filter((x) => x.ok);
    function csv() {
      const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const t = [['الاسم', 'المؤسسة', 'اسم المستخدم المؤقت', 'كلمة المرور المؤقتة']].concat(OK().map((x) => [x.name, x.inst, x.user, x.pw])).map((r) => r.map(q).join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv;charset=utf-8' })); a.download = 'حسابات-الأساتذة.csv'; a.click();
    }
    function slips() {
      const link = new URL('install.html', location.href).href, w = window.open('', '_blank'); if (!w) return alert('اسمح بالنوافذ المنبثقة لهذه الصفحة ثم أعد المحاولة');
      w.document.write(`<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقات الدخول</title><style>body{font:14px/1.9 Tahoma,Arial,sans-serif;margin:10mm}.g{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.c{border:1.5px dashed #555;border-radius:8px;padding:8px 12px;break-inside:avoid}h3{margin:0;color:#1f3864;font-size:15px}.m{font-size:12px;color:#444}b{font-size:15px}</style></head><body><div class="g">${OK().map((x) => `<div class="c"><h3>تطبيق «الوجيه» — المقاطعة الثانية قسنطينة</h3><div>${esc(x.name)}${x.inst ? ' — ' + esc(x.inst) : ''}</div><div>اسم المستخدم: <b dir="ltr"><bdi>${esc(x.user)}</bdi></b></div><div>كلمة المرور المؤقتة: <b dir="ltr"><bdi>${esc(x.pw)}</bdi></b></div><div class="m">التثبيت: <bdi dir="ltr">${esc(link)}</bdi><br>عند أول دخول تختار اسم مستخدم وكلمة مرور جديدين. لا تشارك كلمة مرورك مع أحد.</div></div>`).join('')}</div><script>onload=()=>print()<\/script></body></html>`);
      w.document.close();
    }
  });
})();
