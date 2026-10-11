/* portal-records.js — سجلات المعالجة البيداغوجية المشتركة
   • الجميع (مفتش، مشرف، أساتذة) يرون سجلات بعضهم.
   • التعديل والحذف: المفتش والمشرف لكل السجلات، والأستاذ في حدود سجلاته فقط.
   • لكل مستخدم صفّ خاص في portal_data، وهذا الملف يجمع الصفوف ويكتب بحسب الصلاحية. */
(function () {
  'use strict';
  const K1 = 'traitementData', K2 = 'studentsRecords', ZERO = '00000000-0000-0000-0000-000000000000';
  const staff = (p) => !!p && (p.role === 'inspector' || p.role === 'supervisor');
  const clean = (r) => { const o = { ...r }; delete o.ownerId; delete o.ownerName; return o; };
  const parse = (v, d) => { try { const x = JSON.parse(v); return x == null ? d : x; } catch (e) { return d; } };

  async function loadAll() {
    const c = await PortalCloud.ready;
    const { data, error } = await c.from('portal_data').select('owner,key,value,updated_by_name,updated_at').in('key', [K1, K2]);
    if (error) throw error;
    const by = {};
    (data || []).forEach((r) => {
      const o = by[r.owner] = by[r.owner] || { name: '', recs: [], plans: {}, at: '' };
      if (r.updated_by_name && r.owner !== ZERO) o.name = r.updated_by_name;
      if (r.key === K1) { o.recs = parse(r.value, []); if (!Array.isArray(o.recs)) o.recs = []; o.at = r.updated_at; }
      else o.plans = parse(r.value, {});
    });
    const seen = new Set(), records = [], plans = {}, snapshot = {};
    // صفوف الأساتذة أولاً ثم الصف القديم المشترك (ZERO) حتى لا تتكرر السجلات
    Object.keys(by).sort((a, b) => (a === ZERO) - (b === ZERO)).forEach((owner) => {
      const o = by[owner];
      const mine = [];
      o.recs.forEach((r) => {
        if (!r || !r.id || seen.has(r.id)) return;
        seen.add(r.id);
        const rec = { ...r, ownerId: owner, ownerName: r.ownerName || o.name || r.enseignant || '', created_at: r.created_at || o.at || '' };
        records.push(rec); mine.push(rec);
        if (o.plans && o.plans[r.id]) plans[r.id] = o.plans[r.id];
      });
      snapshot[owner] = sig(mine, plans);
    });
    return { records, plans, snapshot, owners: Object.keys(by) };
  }
  function sig(recs, plans) {
    const ids = recs.map((r) => r.id);
    const p = {}; ids.forEach((i) => { if (plans && plans[i]) p[i] = plans[i]; });
    return JSON.stringify([recs.map(clean), p]);
  }

  /* يكتب كل مجموعة تغيّرت إلى صفّ صاحبها. includeSelf=false: صف المستخدم نفسه تتولاه portal-cloud.js */
  async function saveAll(records, plans, opt) {
    opt = opt || {};
    const c = await PortalCloud.ready, me = await PortalCloud.me();
    if (!me) return { written: [], denied: [], error: 'no session' };
    const snap = opt.snapshot || window.__recSnap || {};
    const groups = {};
    Object.keys(snap).forEach((o) => { groups[o] = []; });                         // مجموعة فارغة = حذف كل سجلاتها
    records.forEach((r) => { const o = r.ownerId || me.id; (groups[o] = groups[o] || []).push(r); });
    const written = [], denied = [], now = new Date().toISOString();
    for (const owner of Object.keys(groups)) {
      const recs = groups[owner];
      if (sig(recs, plans) === snap[owner]) continue;                              // لا تغيير
      if (owner === me.id && opt.includeSelf === false) continue;
      if (owner !== me.id && !staff(me)) { denied.push(owner); continue; }
      const p = {}; recs.forEach((r) => { if (plans && plans[r.id]) p[r.id] = plans[r.id]; });
      const base = { owner, shared: owner === ZERO, updated_by: me.id, updated_by_name: me.full_name || me.username, updated_by_role: me.role, updated_at: now, touched: true };
      const { error } = await c.from('portal_data').upsert([
        { ...base, key: K1, value: JSON.stringify(recs.map(clean)) },
        { ...base, key: K2, value: JSON.stringify(p) }
      ]);
      if (error) { denied.push(owner); console.warn('records save', error.message); continue; }
      snap[owner] = sig(recs, plans); written.push(owner);
      if (owner !== me.id) PortalCloud.log('update', K1, 'تعديل سجلات الأستاذ(ة): ' + ((recs[0] && (recs[0].ownerName || recs[0].enseignant)) || owner));
    }
    return { written, denied };
  }

  const canEdit = (me, rec) => !!me && (staff(me) || !rec.ownerId || rec.ownerId === me.id);
  window.PortalRecords = { loadAll, saveAll, canEdit, isStaff: staff, ZERO };
})();
