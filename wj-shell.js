/* ============================================================
   wj-shell.js — قشرة المنظومة الموحدة (WJ Shell)
   تربط واجهات الوجيه بنظام الجلسة الموحد وعميل Supabase السحابي
   ============================================================ */
(function() {
    'use strict';

    const DEFAULT_SCHOOLS = [
        'متوسطة قريبة رابح',
        'متوسطة زويني الطاهر',
        'متوسطة لشطر القرمي',
        'متوسطة لعطيوي بلقاسم',
        'متوسطة خميسي الجندلي',
        'متوسطة طافر عمّار',
        'متوسطة مراشدي معمر',
        'متوسطة بن باديس',
        'متوسطة علي غرباوي',
        'متوسطة مصطفى عبد النوري',
        'متوسطة رابح بوباكور',
        'متوسطة قريوعة عبد الحميد',
        'متوسطة الخنساء',
        'متوسطة بلحرش عمار',
        'متوسطة هواري بومدين',
        'متوسطة يحياوي صالح',
        'متوسطة بومعزة رشيد',
        'متوسطة بوقفة مسعود',
        'متوسطة نور الملاك الخاصة',
        'متوسطة الشيماء الخاصة',
        'متوسطة نوبا العالمية الخاصة'
    ];

    function getCurrentPortalUser() {
        try {
            if (window.PortalAuth && typeof window.PortalAuth.getCurrentUser === 'function') {
                const u = window.PortalAuth.getCurrentUser();
                if (u) return u;
            }
            const s = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
            if (s) {
                const parsed = JSON.parse(s);
                if (parsed && parsed.user) return parsed.user;
            }
            const pu = localStorage.getItem('portalUser');
            if (pu) {
                const p = JSON.parse(pu);
                let role = 'teacher';
                if (p.role === 'مفتش' || p.role === 'inspector') role = 'inspector';
                else if (p.role === 'مشرف' || p.role === 'supervisor') role = 'supervisor';
                return {
                    id: p.id || 'U_LOCAL',
                    username: p.username || 'user',
                    full_name: p.name || 'مستخدم المنظومة',
                    email: p.email || '',
                    role: role,
                    school: p.school || ''
                };
            }
        } catch (e) {
            console.warn('WJ getUser error:', e);
        }
        // افتراضي لمفتش المقاطعة
        return {
            id: 'U001',
            username: 'inspector',
            full_name: 'درويش الهلالي',
            email: 'dlazedine68@gmail.com',
            role: 'inspector',
            school: 'المقاطعة الثانية — قسنطينة'
        };
    }

    const WJ = {
        c: null,
        me: null,
        role: 'inspector',
        insp: true,
        staff: true,
        prof: null,

        async schools() {
            if (this.c) {
                try {
                    const { data, error } = await this.c
                        .from('wajih_settings')
                        .select('value')
                        .eq('key', 'schools')
                        .single();
                    if (!error && data && Array.isArray(data.value) && data.value.length) {
                        try { localStorage.setItem('wajih_schools', JSON.stringify(data.value)); } catch(e){}
                        return data.value;
                    }
                } catch (e) {
                    console.warn('WJ.schools cloud fetch error:', e);
                }
            }
            try {
                const cached = localStorage.getItem('wajih_schools');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
            return [...DEFAULT_SCHOOLS];
        },

        async act(action, kind, details = {}) {
            try {
                if (this.c && this.me) {
                    await this.c.from('wajih_activities').insert({
                        user_id: this.me.id && this.me.id.length === 36 ? this.me.id : null,
                        user_name: this.me.full_name || this.me.username || 'مستخدم',
                        action: action || 'activity',
                        target_type: kind || 'general',
                        details: details || {}
                    });
                }
            } catch (e) {
                // تدوين صامت دون تعطيل واجهة المستخدم
            }
        }
    };

    WJ.ready = new Promise(async (resolve) => {
        const client = window.initPortalCloud ? await window.initPortalCloud() : null;
        WJ.c = client;
        const user = getCurrentPortalUser();
        WJ.me = user;
        WJ.role = (user.role || 'teacher').toLowerCase();
        WJ.insp = WJ.role === 'inspector' || WJ.role === 'admin';
        WJ.staff = WJ.insp || WJ.role === 'supervisor';
        WJ.prof = {
            id: user.id,
            data: {
                name: user.full_name || user.fullName || user.username,
                inst: user.school || ''
            }
        };
        window.WJ = WJ;
        resolve(WJ);
    });

    window.WJ = WJ;
})();
