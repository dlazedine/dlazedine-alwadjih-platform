/* wj-shell.js — غلاف مشترك لأدوات المنظومة المستقلة (تقويم نتائج الاختبار، فحص الاختبارات)
   • حراسة الدخول (جلسة Supabase) • شريط التنقل الموحّد • بيانات المستخدم وسجل الأستاذ • قائمة المتوسطات */
(function () {
  'use strict';
  const WJ = window.WJ = {};
  const RL = { inspector: 'مفتش', supervisor: 'مشرف', teacher: 'أستاذ' };
  const never = () => new Promise(() => {});
  WJ.ready = (async () => {
    const c = await PortalCloud.ready;
    const { data: s } = await c.auth.getSession();
    if (!s.session) { location.replace('index.html'); return never(); }
    const { data: me } = await c.from('wajih_profiles').select('*').eq('id', s.session.user.id).single();
    if (!me || !me.active) { location.replace('index.html'); return never(); }
    WJ.c = c; WJ.me = me; WJ.role = me.role; WJ.insp = me.role === 'inspector'; WJ.staff = me.role !== 'teacher';
    const { data: p } = await c.from('wajih_prof').select('id,data').eq('user_id', me.id).maybeSingle();
    WJ.prof = p || null;
    WJ.bar();
    return WJ;
  })();

  WJ.schools = async () => {
    try {
      const { data } = await WJ.c.from('wajih_settings').select('value').eq('key', 'schools').maybeSingle();
      if (data && Array.isArray(data.value) && data.value.length) return data.value;
    } catch (e) {}
    return (window.PORTAL_CFG && PORTAL_CFG.SCHOOLS) || [];
  };
  WJ.act = (action, key) => WJ.c.from('wajih_activity').insert({ user_id: WJ.me.id, user_name: WJ.me.full_name || WJ.me.username, user_role: WJ.me.role, action, key }).then(() => {}, () => {});

  WJ.bar = () => {
    const css = document.createElement('style');
    css.textContent = '#wj-bar{display:flex;gap:6px 10px;align-items:center;flex-wrap:wrap;background:#081729;color:#fff;border:2px solid #c49b3f;border-radius:12px;padding:8px 14px;margin:0 0 14px;font:14px/1.6 Tahoma,Arial,sans-serif;direction:rtl}#wj-bar a,#wj-bar button{color:#e6c874;background:transparent;border:1px solid #c49b3f66;border-radius:8px;padding:3px 11px;text-decoration:none;font:inherit;cursor:pointer}#wj-bar a:hover,#wj-bar button:hover{background:#c49b3f;color:#081729}#wj-bar a.on{background:#c49b3f;color:#081729;font-weight:bold}#wj-bar .sp{flex:1}#wj-bar .u{font-size:13px;color:#e6c874}@media print{#wj-bar{display:none!important}}';
    document.head.appendChild(css);
    const here = location.pathname.split('/').pop() || 'index.html';
    const L = [['index.html', '→ البوابة'], ['data-prof.html', 'بيانات الأساتذة'], ['tawqim-nataij.html', 'تقويم النتائج'], ['fahs-ikhtibar.html', 'فحص الاختبارات']];
    if (WJ.insp) L.push(['dashboard.html', 'لوحة التحكم']);
    const b = document.createElement('div'); b.id = 'wj-bar'; b.className = 'no-print';
    b.innerHTML = L.map(([h, t]) => `<a href="${h}" class="${h === here ? 'on' : ''}">${t}</a>`).join('') + `<span class="sp"></span><span class="u"></span><button type="button">خروج</button>`;
    b.querySelector('.u').textContent = (WJ.me.full_name || WJ.me.username) + ' · ' + RL[WJ.me.role];
    b.querySelector('button').onclick = async () => { try { await PortalCloud.signOut(); } catch (e) {} location.href = 'index.html'; };
    (document.querySelector('.container') || document.body).prepend(b);
  };
})();
