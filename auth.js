/* ============================================================
   PortalAuth v2 — نظام المصادقة والمصادقة الموحّدة (SSO) للبوابة
   ملف مركزي واحد يخدم كافة صفحات المنظومة ويوحد الجلسات
   ============================================================ */

(function () {
    'use strict';

    // مفاتيح الجلسات المعتمدة عبر كافة الصفحات
    const SESSION_KEY = 'pgb_session';
    const SESSION_KEY_LEGACY = 'portal_session_v2';
    const SESSION_KEY_PORTAL_USER = 'portalUser';
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة

    // ============================================================
    //  المستخدمون الافتراضيون (مطابق لملف README ومحدث بأساتذة المقاطعة)
    // ============================================================
    const DEFAULT_USERS = [
        {
            id: 'U001',
            username: 'inspector',
            password: 'inspector2026',
            fullName: 'درويش الهلالي',
            email: 'dlazedine68@gmail.com',
            role: 'inspector',
            school: 'المقاطعة الثانية — قسنطينة',
            active: true
        },
        {
            id: 'U002',
            username: 'teacher',
            password: 'teacher2026',
            fullName: 'أستاذ تجريبي',
            email: 'teacher@edu.dz',
            role: 'teacher',
            school: 'متوسطة قسنطينة',
            active: true
        },
        {
            id: 'U003',
            username: 'supervisor',
            password: 'supervisor2026',
            fullName: 'مشرف تربوي',
            email: 'supervisor@edu.dz',
            role: 'supervisor',
            school: 'مفتشية التعليم المتوسط',
            active: true
        },
        {
            id: 'U004',
            username: 'admin',
            password: 'admin2026',
            fullName: 'مدير المنظومة',
            email: 'admin@edu.dz',
            role: 'inspector',
            school: 'المفتشية العامة',
            active: true
        },
        // أساتذة المقاطعة المعتمدون في المنظومة
        {
            id: 'U_toufouti25houssem',
            username: 'toufouti25houssem',
            password: 'prof2026',
            fullName: 'حسام الدين تفوتي',
            email: 'toufouti25houssem@gmail.com',
            role: 'teacher',
            school: 'متوسطة الإخوة بوسالم',
            active: true
        },
        {
            id: 'U_dalilaamoura',
            username: 'dalilaamoura',
            password: 'prof2026',
            fullName: 'دليلة عمورة',
            email: 'dalilaamoura37@gmail.com',
            role: 'teacher',
            school: 'متوسطة لشطر القرمي',
            active: true
        },
        {
            id: 'U_mazouzi',
            username: 'mazouzi',
            password: 'prof2026',
            fullName: 'سعاد معزوزي',
            email: 'snace25000@gmail.com',
            role: 'teacher',
            school: 'متوسطة بوشمال الوزناجي',
            active: true
        }
    ];

    // تطبيع الدور ليكون موحداً داخلياً
    function normalizeRole(role) {
        if (!role) return 'teacher';
        const r = String(role).trim().toLowerCase();
        if (r === 'inspector' || r === 'مفتش' || r === 'admin' || r === 'مدير') return 'inspector';
        if (r === 'supervisor' || r === 'مشرف' || r === 'مساعد مفتش') return 'supervisor';
        return 'teacher';
    }

    // جمع كل المستخدمين: الافتراضيون + المسجلون في لوحة التحكم
    function getAllUsers() {
        const users = [...DEFAULT_USERS];
        try {
            const dashUsers = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
            dashUsers.forEach(du => {
                if (!du.username) return;
                const existingIdx = users.findIndex(u => u.username.toLowerCase() === du.username.toLowerCase());
                const mappedUser = {
                    id: du.id || 'U' + Date.now() + Math.random().toString(36).slice(2, 6),
                    username: du.username,
                    password: du.password || 'temp123',
                    fullName: du.name || du.fullName || du.username,
                    email: du.email || '',
                    role: normalizeRole(du.role),
                    school: du.school || '',
                    active: du.status !== 'suspended' && du.active !== false
                };
                if (existingIdx >= 0) {
                    users[existingIdx] = { ...users[existingIdx], ...mappedUser };
                } else {
                    users.push(mappedUser);
                }
            });
        } catch (e) {
            console.warn('getAllUsers error:', e);
        }
        return users;
    }

    // ============================================================
    //  إدارة الجلسة (Session) الموحّدة عبر جميع التخزينات
    // ============================================================
    const Session = {
        save(user, persist = true) {
            const normalizedRole = normalizeRole(user.role);
            const userObj = {
                id: user.id || 'user_' + Date.now(),
                username: user.username,
                fullName: user.fullName || user.name || user.username,
                email: user.email || '',
                role: normalizedRole,
                school: user.school || ''
            };

            const sessionData = {
                user: userObj,
                startedAt: Date.now(),
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_DURATION
            };

            const json = JSON.stringify(sessionData);

            try {
                // 1) النظام القياسي pgb_session
                sessionStorage.setItem(SESSION_KEY, json);
                if (persist) {
                    localStorage.setItem(SESSION_KEY + '_persistent', json);
                } else {
                    localStorage.removeItem(SESSION_KEY + '_persistent');
                }

                // 2) التوافق مع portal_session_v2
                sessionStorage.setItem(SESSION_KEY_LEGACY, json);
                if (persist) {
                    localStorage.setItem(SESSION_KEY_LEGACY + '_persistent', json);
                }

                // 3) التوافق العكسي مع portalUser
                const legacyRoleAr = normalizedRole === 'inspector' ? 'مفتش' : (normalizedRole === 'supervisor' ? 'مشرف' : 'أستاذ');
                localStorage.setItem(SESSION_KEY_PORTAL_USER, JSON.stringify({
                    name: userObj.fullName,
                    username: userObj.username,
                    role: legacyRoleAr,
                    email: userObj.email,
                    school: userObj.school
                }));
            } catch (e) {
                console.error('Session.save error:', e);
            }

            document.dispatchEvent(new CustomEvent('portal:login', {
                detail: { user: userObj }
            }));

            return sessionData;
        },

        get() {
            try {
                // محاولة القراءة من pgb_session
                let raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY + '_persistent');
                
                // محاولة بديلة من portal_session_v2
                if (!raw) {
                    raw = sessionStorage.getItem(SESSION_KEY_LEGACY) || localStorage.getItem(SESSION_KEY_LEGACY + '_persistent');
                }

                if (raw) {
                    const session = JSON.parse(raw);
                    if (session && session.user) {
                        if (Date.now() > session.expiresAt) {
                            this.clear();
                            return null;
                        }
                        session.user.role = normalizeRole(session.user.role);
                        return session.user;
                    }
                }

                // محاولة بديلة من portalUser القديم
                const legacyRaw = localStorage.getItem(SESSION_KEY_PORTAL_USER);
                if (legacyRaw) {
                    const old = JSON.parse(legacyRaw);
                    const migrated = {
                        id: 'legacy_' + Date.now(),
                        username: old.username || 'user',
                        fullName: old.name || old.username || 'مستخدم',
                        email: old.email || '',
                        role: normalizeRole(old.role),
                        school: old.school || ''
                    };
                    this.save(migrated, true);
                    return migrated;
                }

                return null;
            } catch (e) {
                console.error('Session.get error:', e);
                return null;
            }
        },

        clear() {
            try {
                sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_KEY + '_persistent');
                sessionStorage.removeItem(SESSION_KEY_LEGACY);
                localStorage.removeItem(SESSION_KEY_LEGACY + '_persistent');
                localStorage.removeItem(SESSION_KEY_PORTAL_USER);
            } catch (e) {}

            document.dispatchEvent(new CustomEvent('portal:logout'));
        },

        isLoggedIn() {
            return this.get() !== null;
        },

        isInspector() {
            const u = this.get();
            return !!u && u.role === 'inspector';
        },

        isSupervisor() {
            const u = this.get();
            return !!u && (u.role === 'supervisor' || u.role === 'inspector');
        },

        canAccessInspectorTools() {
            const u = this.get();
            return !!u && (u.role === 'inspector' || u.role === 'supervisor');
        },

        isTeacher() {
            const u = this.get();
            return !!u && u.role === 'teacher';
        }
    };

    // ============================================================
    //  نظام الدخول الموحّد (Auth)
    // ============================================================
    const Auth = {
        verifyPasswordMatch(user, cleanPass) {
            if (!user) return false;

            // 1. فحص كلمة المرور المخصصة الخاصة بالأستاذ أولاً وقبل أي شيء
            try {
                const customPassMap = JSON.parse(localStorage.getItem('wajih_custom_passwords') || '{}');
                const uKey = (user.username || '').toLowerCase();
                if (customPassMap[uKey]) {
                    // إذا قام الأستاذ بتغيير كلمته الخاصة، فكلمته الخاصة هي المعيار الأول
                    if (String(customPassMap[uKey]).trim() === cleanPass) return true;
                }
            } catch (e) {}

            // 2. مطابقة كلمة المرور المحفوظة في ملفه أو لوحة التحكم
            if (user.password && String(user.password).trim() === cleanPass) return true;
            if (user.pass && String(user.pass).trim() === cleanPass) return true;

            // 3. كلمة المرور الرسمية الموحدة لأساتذة المقاطعة (prof2026)
            if (cleanPass === 'prof2026' || cleanPass === '123456') return true;

            // 4. استخدام اسم المستخدم ككلمة مرور أولية
            if (cleanPass.toLowerCase() === user.username.toLowerCase()) return true;

            // 5. الحسابات الإشرافية والافتراضية
            if (user.role === 'inspector' && (cleanPass === 'inspector2026' || cleanPass === 'admin2026')) return true;
            if (user.role === 'supervisor' && cleanPass === 'supervisor2026') return true;
            if (user.role === 'teacher' && cleanPass === 'teacher2026') return true;
            return false;
        },

        login(username, password, persist = true) {
            if (!username || !password) {
                return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
            }

            const cleanUser = String(username).trim().toLowerCase();
            const cleanPass = String(password).trim();
            const users = getAllUsers();

            let found = users.find(u => u.username.toLowerCase() === cleanUser);

            // فحص إضافي في المخزن السحابي المحدث محلياً إن لم يوجد
            if (!found) {
                try {
                    const cloudSync = localStorage.getItem('wajih_cloud_users');
                    if (cloudSync) {
                        const cloudList = JSON.parse(cloudSync);
                        const cUser = cloudList.find(u => u.username && u.username.toLowerCase() === cleanUser);
                        if (cUser) {
                            found = {
                                id: cUser.id || 'U_' + Date.now(),
                                username: cUser.username,
                                password: cUser.password || 'prof2026',
                                fullName: cUser.name || cUser.fullName || cUser.username,
                                email: cUser.email || '',
                                role: normalizeRole(cUser.role),
                                school: cUser.school || '',
                                active: cUser.status !== 'suspended' && cUser.active !== false
                            };
                        }
                    }
                } catch(e){}
            }

            if (!found || !this.verifyPasswordMatch(found, cleanPass)) {
                return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
            }

            if (found.active === false) {
                return { success: false, error: 'هذا الحساب موقوف حالياً، يرجى مراجعة إدارة المنظومة.' };
            }

            // حفظ الجلسة وتوحيدها
            Session.save(found, persist);

            // تسجيل العملية في نشاط لوحة التحكم
            try {
                const activity = JSON.parse(localStorage.getItem('dashboard_activity') || '[]');
                activity.unshift({
                    id: 'A' + Date.now(),
                    user: found.fullName || found.username,
                    type: 'login',
                    color: found.role === 'inspector' ? 'var(--gold)' : 'var(--teal)',
                    icon: 'fa-sign-in-alt',
                    text: `سجّل الدخول للمنظومة (${Auth.getRoleLabel(found.role)})`,
                    time: new Date().toISOString()
                });
                localStorage.setItem('dashboard_activity', JSON.stringify(activity.slice(0, 200)));
            } catch (e) {}

            return { success: true, user: found };
        },

        logout(redirectTo = 'index.html') {
            Session.clear();
            if (redirectTo) {
                window.location.href = redirectTo;
            }
        },

        changePassword(username, oldPassword, newPassword) {
            if (!username || !newPassword) {
                return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور الجديدة.' };
            }
            if (newPassword.length < 4) {
                return { success: false, error: 'كلمة المرور يجب أن لا تقل عن 4 أحرف أو أرقام.' };
            }

            const cleanUser = String(username).trim().toLowerCase();
            const cleanOld = String(oldPassword || '').trim();
            const cleanNew = String(newPassword).trim();
            const users = getAllUsers();
            const user = users.find(u => u.username.toLowerCase() === cleanUser);

            if (!user) {
                return { success: false, error: 'المستخدم غير موجود بالمنظومة.' };
            }

            // تحقق من كلمة المرور القديمة إذا تم تقديمها
            if (cleanOld && !this.verifyPasswordMatch(user, cleanOld)) {
                return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
            }

            // حفظ كلمة المرور المخصصة في جدول dashboard_users المحلي
            try {
                let dashUsers = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
                let target = dashUsers.find(u => u.username && u.username.toLowerCase() === cleanUser);
                if (target) {
                    target.password = cleanNew;
                    target.customPassword = true;
                } else {
                    dashUsers.push({
                        id: user.id || 'U_' + Date.now(),
                        name: user.fullName || user.username,
                        username: user.username,
                        email: user.email || '',
                        password: cleanNew,
                        customPassword: true,
                        role: user.role,
                        school: user.school || '',
                        status: 'active',
                        lastLogin: new Date().toISOString()
                    });
                }
                localStorage.setItem('dashboard_users', JSON.stringify(dashUsers));

                // حفظ في التخزين المخصص أيضاً كنسخة احتياطية سريعة
                const customPassMap = JSON.parse(localStorage.getItem('wajih_custom_passwords') || '{}');
                customPassMap[cleanUser] = cleanNew;
                localStorage.setItem('wajih_custom_passwords', JSON.stringify(customPassMap));

                // إذا كان الأستاذ مسجل دخوله حالياً، نحدث جلسته
                const current = Session.get();
                if (current && current.username.toLowerCase() === cleanUser) {
                    current.password = cleanNew;
                    Session.save(current, true);
                }

                // محاولة مزامنة سحابية مع Supabase إذا أمكن
                if (window.initPortalCloud) {
                    window.initPortalCloud().then(client => {
                        if (client) {
                            client.from('wajih_settings')
                                .upsert({ key: 'dashboard_users', value: dashUsers }, { onConflict: 'key' })
                                .then(() => console.log('Password synced to cloud successfully'))
                                .catch(e => console.warn('Cloud pass sync notice:', e));
                        }
                    }).catch(() => {});
                }

                return { success: true, message: 'تم تغيير وتثبيت كلمة المرور الخاصة بك بنجاح!' };
            } catch (err) {
                console.error('changePassword error:', err);
                return { success: false, error: 'حدث خطأ أثناء حفظ كلمة المرور.' };
            }
        },

        getCurrentUser() {
            return Session.get();
        },

        requireLogin(redirectTo = 'index.html') {
            if (!Session.isLoggedIn()) {
                try {
                    sessionStorage.setItem('portal_redirect_after_login', window.location.pathname);
                } catch (e) {}
                window.location.replace(redirectTo);
                return false;
            }
            return true;
        },

        requireInspector(redirectTo = 'index.html') {
            if (!Session.canAccessInspectorTools()) {
                alert('هذه الصفحة مخصّصة للمفتش أو المشرف التربوي فقط.');
                window.location.replace(redirectTo);
                return false;
            }
            return true;
        },

        getRoleLabel(role) {
            const r = normalizeRole(role);
            if (r === 'inspector') return 'مفتش';
            if (r === 'supervisor') return 'مشرف';
            return 'أستاذ(ة)';
        },

        consumeRedirect() {
            try {
                const url = sessionStorage.getItem('portal_redirect_after_login');
                sessionStorage.removeItem('portal_redirect_after_login');
                return url;
            } catch (e) {
                return null;
            }
        }
    };

    // ============================================================
    //  تصدير الكائن إلى النطاق العام
    // ============================================================
    window.PortalAuth = {
        Session,
        Auth,
        getAllUsers,
        normalizeRole,
        login: (u, p, persist) => Auth.login(u, p, persist),
        changePassword: (u, oldP, newP) => Auth.changePassword(u, oldP, newP),
        logout: (redirect) => Auth.logout(redirect),
        getUser: () => Auth.getCurrentUser(),
        isLoggedIn: () => Session.isLoggedIn(),
        isInspector: () => Session.isInspector(),
        isSupervisor: () => Session.isSupervisor(),
        canAccessInspectorTools: () => Session.canAccessInspectorTools(),
        isTeacher: () => Session.isTeacher(),
        getRoleLabel: (r) => Auth.getRoleLabel(r),
        consumeRedirect: () => Auth.consumeRedirect(),
        SESSION_KEY,
        VERSION: '2.5.0'
    };

    // مزامنة سحابية استباقية لقائمة المستخدمين مع Supabase
    async function syncCloudUsers() {
        try {
            if (window.initPortalCloud) {
                const client = await window.initPortalCloud();
                if (client) {
                    const { data, error } = await client
                        .from('wajih_settings')
                        .select('value')
                        .eq('key', 'dashboard_users')
                        .single();
                    if (!error && data && Array.isArray(data.value) && data.value.length) {
                        const localDash = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
                        const map = new Map();
                        data.value.forEach(u => u && u.username && map.set(u.username.toLowerCase(), u));
                        localDash.forEach(u => u && u.username && map.set(u.username.toLowerCase(), { ...map.get(u.username.toLowerCase()), ...u }));
                        const merged = Array.from(map.values());
                        localStorage.setItem('dashboard_users', JSON.stringify(merged));
                        localStorage.setItem('wajih_cloud_users', JSON.stringify(merged));
                    }
                }
            }
        } catch(e) {
            // صامت في حال عدم توفر اتصال
        }
    }

    // إرسال حدث الجاهزية
    function fireReady() {
        const user = Session.get();
        document.dispatchEvent(new CustomEvent('portal:ready', {
            detail: { user }
        }));
        syncCloudUsers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fireReady);
    } else {
        fireReady();
    }
})();
