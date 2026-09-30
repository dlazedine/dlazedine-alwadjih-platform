/* ============================================================
   PortalAuth v2 — نظام المصادقة الموحّد للبوابة
   ملف مركزي واحد يخدم كل الصفحات
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    //  الثوابت
    // ============================================================
    const SESSION_KEY = 'portal_session_v2';
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة

    // ============================================================
    //  المستخدمون الافتراضيون (يُدمجون مع dashboard_users)
    // ============================================================
    const DEFAULT_USERS = [
        {
            id: 'U001',
            username: 'inspector',
            password: 'inspector2026',
            fullName: 'درويش الهلالي',
            email: 'dlazedine68@gmail.com',
            role: 'inspector',
            school: 'المقاطعة الثانية — قسنطينة'
        },
        {
            id: 'U002',
            username: 'teacher',
            password: 'teacher2026',
            fullName: 'أستاذ تجريبي',
            email: 'teacher@edu.dz',
            role: 'teacher',
            school: 'متوسطة قسنطينة'
        },
        {
            id: 'U003',
            username: 'admin',
            password: 'admin2026',
            fullName: 'مدير المنظومة',
            email: 'admin@edu.dz',
            role: 'inspector',
            school: 'المفتشية العامة'
        }
    ];

    // ============================================================
    //  جمع المستخدمين: افتراضي + المُدارون من لوحة التحكم
    // ============================================================
    function getAllUsers() {
        const users = [...DEFAULT_USERS];
        try {
            const dashUsers = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
            dashUsers.forEach(du => {
                if (!du.username) return;
                if (users.some(u => u.username.toLowerCase() === du.username.toLowerCase())) return;
                users.push({
                    id: du.id || 'U' + Date.now() + Math.random().toString(36).slice(2, 6),
                    username: du.username,
                    password: du.password || 'temp123',
                    fullName: du.name || du.fullName || du.username,
                    email: du.email || '',
                    role: (du.role === 'inspector' || du.role === 'مفتش') ? 'inspector' : 'teacher',
                    school: du.school || ''
                });
            });
        } catch (e) { /* تجاهل */ }
        return users;
    }

    // ============================================================
    //  إدارة الجلسة (Session)
    // ============================================================
    const Session = {
        /**
         * حفظ الجلسة
         */
        save(user, persist = true) {
            const session = {
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName || user.name || user.username,
                    email: user.email || '',
                    role: (user.role === 'مفتش' || user.role === 'inspector')
                        ? 'inspector'
                        : (user.role === 'أستاذ' || user.role === 'teacher')
                            ? 'teacher'
                            : user.role,
                    school: user.school || ''
                },
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_DURATION,
                source: user.source || 'local'
            };

            const json = JSON.stringify(session);

            try {
                // النظام الجديد
                sessionStorage.setItem(SESSION_KEY, json);
                if (persist) {
                    localStorage.setItem(SESSION_KEY + '_persistent', json);
                } else {
                    localStorage.removeItem(SESSION_KEY + '_persistent');
                }

                // توافق عكسي مع النظام القديم
                localStorage.setItem('portalUser', JSON.stringify({
                    name: session.user.fullName,
                    username: session.user.username,
                    role: session.user.role === 'inspector' ? 'مفتش' : 'أستاذ',
                    email: session.user.email
                }));
            } catch (e) {
                console.error('⚠️ فشل حفظ الجلسة:', e);
            }

            document.dispatchEvent(new CustomEvent('portal:login', {
                detail: { user: session.user }
            }));

            return session;
        },

        /**
         * قراءة الجلسة
         */
        get() {
            try {
                // 1) sessionStorage
                let raw = sessionStorage.getItem(SESSION_KEY);

                // 2) localStorage
                if (!raw) {
                    raw = localStorage.getItem(SESSION_KEY + '_persistent');
                }

                // 3) توافق عكسي
                if (!raw) {
                    const oldRaw = localStorage.getItem('portalUser');
                    if (oldRaw) {
                        const old = JSON.parse(oldRaw);
                        return this._migrateLegacy(old);
                    }
                    return null;
                }

                const session = JSON.parse(raw);
                if (!session || !session.user) return null;

                // فحص الانتهاء
                if (Date.now() > session.expiresAt) {
                    this.clear();
                    return null;
                }

                return session.user;
            } catch (e) {
                console.error('⚠️ فشل قراءة الجلسة:', e);
                return null;
            }
        },

        /**
         * مسح الجلسة
         */
        clear() {
            try {
                sessionStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_KEY + '_persistent');
                localStorage.removeItem('portalUser');
            } catch (e) { /* تجاهل */ }
        },

        isLoggedIn() {
            return this.get() !== null;
        },

        isInspector() {
            const user = this.get();
            return !!user && user.role === 'inspector';
        },

        isTeacher() {
            const user = this.get();
            return !!user && user.role === 'teacher';
        },

        /**
         * ترحيل جلسة قديمة
         */
        _migrateLegacy(old) {
            const migrated = {
                id: 'legacy_' + Date.now(),
                username: old.username || 'user',
                fullName: old.name || old.username || 'مستخدم',
                email: old.email || '',
                role: old.role === 'مفتش' ? 'inspector' : 'teacher',
                school: old.school || '',
                source: 'legacy'
            };
            try {
                this.save(migrated, false);
            } catch (e) { /* تجاهل */ }
            return migrated;
        }
    };

    // ============================================================
    //  نظام الدخول (Auth)
    // ============================================================
    const Auth = {
        /**
         * محاولة تسجيل الدخول
         * @returns {Object} { success: Boolean, user?: Object, error?: String }
         */
        login(username, password, persist = true) {
            if (!username || !password) {
                return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
            }

            const users = getAllUsers();
            const user = users.find(u =>
                u.username.toLowerCase() === username.toLowerCase().trim() &&
                u.password === password
            );

            if (!user) {
                return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
            }

            // حفظ الجلسة
            Session.save(user, persist);

            // تسجيل النشاط في لوحة التحكم
            try {
                const activity = JSON.parse(localStorage.getItem('dashboard_activity') || '[]');
                activity.unshift({
                    id: 'A' + Date.now(),
                    user: user.fullName,
                    type: 'login',
                    color: 'var(--maroon)',
                    icon: 'fa-sign-in-alt',
                    text: 'سجّل الدخول للمنظومة',
                    time: new Date().toISOString()
                });
                localStorage.setItem('dashboard_activity', JSON.stringify(activity.slice(0, 200)));
            } catch (e) { /* تجاهل */ }

            return { success: true, user };
        },

        /**
         * تسجيل الخروج
         */
        logout(redirectTo = 'index.html') {
            Session.clear();
            document.dispatchEvent(new CustomEvent('portal:logout'));

            if (redirectTo) {
                window.location.href = redirectTo;
            }
        },

        getCurrentUser() {
            return Session.get();
        },

        /**
         * فحص الصلاحيات
         */
        requireLogin(redirectTo = 'index.html') {
            if (!Session.isLoggedIn()) {
                try {
                    sessionStorage.setItem('portal_redirect_after_login', window.location.pathname);
                } catch (e) { /* تجاهل */ }
                window.location.href = redirectTo;
                return false;
            }
            return true;
        },

        requireInspector(redirectTo = 'index.html') {
            if (!Session.isInspector()) {
                alert('هذه الصفحة مخصّصة للمفتش فقط.');
                window.location.href = redirectTo;
                return false;
            }
            return true;
        },

        /**
         * ترجمة الدور للعربية
         */
        getRoleLabel(role) {
            return role === 'inspector' ? 'مفتش' : 'أستاذ';
        },

        /**
         * جلب عنوان URL لإعادة التوجيه بعد الدخول
         */
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
    //  تصدير عام
    // ============================================================
    window.PortalAuth = {
        // الكائنات
        Session,
        Auth,
        getAllUsers,

        // اختصارات مباشرة
        login: (u, p, persist) => Auth.login(u, p, persist),
        logout: (redirect) => Auth.logout(redirect),
        getUser: () => Auth.getCurrentUser(),
        isLoggedIn: () => Session.isLoggedIn(),
        isInspector: () => Session.isInspector(),
        isTeacher: () => Session.isTeacher(),
        getRoleLabel: (role) => Auth.getRoleLabel(role),
        consumeRedirect: () => Auth.consumeRedirect(),

        // ثوابت مفيدة
        SESSION_KEY: SESSION_KEY,
        SESSION_DURATION: SESSION_DURATION,
        VERSION: '2.0.0'
    };

    // ============================================================
    //  إطلاق حدث جاهزية
    // ============================================================
    function fireReady() {
        const user = Session.get();
        document.dispatchEvent(new CustomEvent('portal:ready', {
            detail: { user }
        }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fireReady);
    } else {
        fireReady();
    }

    console.log('%c✅ PortalAuth v2 جاهز', 'color:#c49b3f; font-weight:bold; font-size:12px;');

})();