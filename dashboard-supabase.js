/* ============================================================
   ربط تبويبي «إدارة المستخدمين» و«مراقبة النشاطات» بـ Supabase
   نسخة مطورة تدعم جميع مصادر الأساتذة (wajih_profiles + wajih_users + wajih_activity + Local)
   ============================================================ */
(function(){
    'use strict';
    const pu = document.getElementById('panel-users');
    if (pu && !document.getElementById('cloudUsers')) {
        pu.innerHTML = '<div id="cloudUsers" style="padding:16px"></div>';
    }
    const LBL = (window.PORTAL_CFG && window.PORTAL_CFG.LABELS) || {};
    let P = [];

    window.renderUsersList = function(){};

    window.refreshLog = async function() {
        const feed = document.getElementById('logFeed');
        try {
            const c = await PortalCloud.ready;
            
            // 1. جلب النشاطات الحية من wajih_activity
            let actData = [];
            const { data: acts, error: actErr } = await c.from('wajih_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(300);
            if (!actErr && acts) {
                actData = acts;
            }

            // 2. جلب الملفات التعريفية للمستخدمين من wajih_profiles و wajih_users
            let profiles = [];
            const idMap = new Map();

            // أ) من wajih_profiles
            try {
                const { data: prs } = await c.from('wajih_profiles').select('*');
                if (prs && Array.isArray(prs)) {
                    prs.forEach(u => {
                        if (u && u.id) idMap.set(u.id, {
                            id: u.id,
                            username: u.username || 'user',
                            full_name: u.full_name || u.username,
                            role: u.role || 'teacher',
                            active: u.active !== false
                        });
                    });
                }
            } catch(e) {}

            // ب) من wajih_users
            try {
                const { data: wusers } = await c.from('wajih_users').select('*');
                if (wusers && Array.isArray(wusers)) {
                    wusers.forEach(u => {
                        if (u && u.id && !idMap.has(u.id)) {
                            idMap.set(u.id, {
                                id: u.id,
                                username: u.username || 'user',
                                full_name: u.full_name || u.username,
                                role: u.role || 'teacher',
                                active: u.active !== false
                            });
                        }
                    });
                }
            } catch(e) {}

            // ج) استنتاج الأساتذة النشطين مباشرة من سجل العمليات الحي wajih_activity
            actData.forEach(r => {
                const uid = r.user_id || ('t_' + (r.user_name || '').replace(/\s+/g, '_'));
                if (!idMap.has(uid) && r.user_name) {
                    idMap.set(uid, {
                        id: uid,
                        username: r.user_name,
                        full_name: r.user_name,
                        role: r.user_role || 'teacher',
                        active: true
                    });
                }
            });

            // د) إضافة الأساتذة المسجلين محلياً في لوحة التحكم
            try {
                const dashUsers = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
                dashUsers.forEach(u => {
                    const uid = u.id || u.username;
                    if (!idMap.has(uid) && u.name) {
                        idMap.set(uid, {
                            id: uid,
                            username: u.username || u.name,
                            full_name: u.name,
                            role: u.role || 'teacher',
                            active: u.status !== 'suspended'
                        });
                    }
                });
            } catch(e) {}

            P = Array.from(idMap.values());

            const hideRegex = (window.PORTAL_CFG && window.PORTAL_CFG.HIDE) || /photo|logo|avatar|img|media/i;
            _logCache = actData.filter(r => !hideRegex.test(r.key || '')).map(r => ({
                action: r.action,
                teacher_id: r.user_id || ('t_' + (r.user_name || '').replace(/\s+/g, '_')),
                teacher_name: r.user_name,
                activity_title: LBL[r.key] || r.key || 'نشاط في المنظومة',
                created_at: r.created_at
            }));

            populateTeacherFilter();
            renderLog();
            updateMonitorStats();
            drawStats();

        } catch(e) {
            console.error('refreshLog error:', e);
            if (feed) feed.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">تعذّر تحميل السجل (تأكد من تشغيل supabase.sql)</div>';
        }
    };

    window.populateTeacherFilter = function() {
        const s = document.getElementById('monitorFilterTeacher');
        if (!s) return;
        const v = s.value;
        s.innerHTML = '<option value="">كل المستخدمين</option>' + 
            P.map(u => `<option value="${u.id}">${escapeHtml(u.full_name || u.username)}</option>`).join('');
        s.value = v;
    };

    const drawStats = function() {
        const tb = document.getElementById('teacherStatsBody');
        if (!tb) return;
        const th = tb.closest('table')?.querySelectorAll('th')[2];
        if (th) th.textContent = 'اسم المستخدم';

        // تصفية الأساتذة (استثناء المفتش)
        let T = P.filter(u => u.role !== 'inspector' && u.role !== 'admin');
        if (!T.length && P.length) {
            T = P;
        }

        if (!T.length) {
            tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">لا يوجد أساتذة مسجّلون بعد.</td></tr>';
            return;
        }

        const R = T.map(u => {
            const e = _logCache.filter(r => r.teacher_id === u.id || r.teacher_name === u.full_name || r.teacher_name === u.username);
            return {
                u,
                n: e.length,
                l: e[0] || null
            };
        }).sort((a, b) => b.n - a.n);

        tb.innerHTML = R.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(r.u.full_name || '—')}</strong></td>
                <td>${escapeHtml(r.u.username || '—')}</td>
                <td><span style="background:#eef3f9; color:#0e2744; padding:2px 8px; border-radius:10px; font-weight:700;">${r.n}</span></td>
                <td>${r.l ? escapeHtml(r.l.activity_title) : '—'}</td>
                <td style="font-size:11.5px; color:var(--text-muted);">${r.l ? new Date(r.l.created_at).toLocaleString('ar-DZ') : '—'}</td>
                <td><span style="color:${r.u.active ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">${r.u.active ? 'نشط' : 'معطّل'}</span></td>
            </tr>
        `).join('');
    };

    window.updateMonitorStats = function() {
        const teacherIds = new Set(P.filter(u => u.role !== 'inspector' && u.role !== 'admin').map(u => u.id));
        const todayStr = new Date().toDateString();
        const totalEl = document.getElementById('monitorTotalActions');
        const activeEl = document.getElementById('monitorActiveTeachers');
        const todayEl = document.getElementById('monitorToday');

        if (totalEl) totalEl.textContent = _logCache.length;
        if (activeEl) {
            const activeTeacherSet = new Set(_logCache.filter(r => teacherIds.has(r.teacher_id) || r.teacher_name).map(r => r.teacher_name || r.teacher_id));
            activeEl.textContent = activeTeacherSet.size;
        }
        if (todayEl) {
            todayEl.textContent = _logCache.filter(r => new Date(r.created_at).toDateString() === todayStr).length;
        }
    };

    window.renderTeacherStats = () => refreshLog();
    window.initMonitor = async function() {
        await refreshLog();
        setInterval(refreshLog, 30000);
    };

    const _rl = window.refreshLog;
    window.refreshLog = async function() {
        const ck = window.event && window.event.type === 'click';
        const bs = ck ? [...document.querySelectorAll('[onclick="refreshLog()"],[onclick="renderTeacherStats()"]')] : [];
        bs.forEach(b => {
            b.dataset.t = b.dataset.t || b.innerHTML;
            b.disabled = true;
            b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ التحديث...';
        });
        try {
            await _rl();
        } finally {
            bs.forEach(b => {
                b.disabled = false;
                b.innerHTML = '✓ تم التحديث';
                setTimeout(() => { b.innerHTML = b.dataset.t; }, 1500);
            });
        }
    };
})();
