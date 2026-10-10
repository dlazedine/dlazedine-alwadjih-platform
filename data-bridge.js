// data-bridge.js - الجسر الموحد للبيانات (نسخة كاملة مع login)
(function() {
    const firebaseConfig = {
        apiKey: "AIzaSyBdv2RJ7EzlnVQcXyyozlLhVKdgwaKQdaY",
        authDomain: "mou3ladja.firebaseapp.com",
        projectId: "mou3ladja",
        storageBucket: "mou3ladja.firebasestorage.app",
        messagingSenderId: "986880549463",
        appId: "1:986880549463:web:b4de098099622040bfb912"
    };
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    let fbDb = null, fbAuth = null;
    try { fbDb = firebase.firestore(); fbAuth = firebase.auth(); } catch (e) { console.warn('Firebase غير متاح:', e); }

    const SUPABASE_URL = "https://yzxyttieobyblznaehcl.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u";
    const _anon = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const getSb = async () => (window.PortalCloud ? await window.PortalCloud.ready : _anon());

    async function ensureAnonAuth() {
        if (!fbAuth) return null;
        if (fbAuth.currentUser) return fbAuth.currentUser;
        try {
            const cred = await fbAuth.signInAnonymously();
            return cred.user;
        } catch (e) { console.warn('Firebase anon auth failed:', e); return null; }
    }

    async function ensureSupabaseSession() {
        const sb = await getSb();
        const { data } = await sb.auth.getSession();
        return (data && data.session) || null;      // لا تسجيل دخول مجهول: يتجاوز سياسات الحماية ويستبدل الجلسة
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'pgb_salt_2026');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    window.DataBridge = {
        // ============ دوال المستخدمين ============
        async getUsers() {
            try {
                const sb = await getSb();
                const { data, error } = await sb.from('wajih_profiles').select('*').order('created_at');
                if (error) throw error;
                return (data || []).map(u => ({ id: u.id, username: u.username, fullName: u.full_name || u.username, email: '', role: u.role, school: u.school || '', active: u.active !== false }));
            } catch (e) { console.warn('getUsers:', e); return []; }
        },
        async saveUsers(users) {     // الحسابات تُدار من تبويب «إدارة المستخدمين» (Supabase): لا كتابة في Firestore
            return true;
        },
        async getCredentials() { return {}; },
        async saveCredential(userId, hash) { return true; },

        // ============ ✅ دالة تسجيل الدخول الموحدة ============
        async login(username, password) {
            if (!window.PortalCloud) return { success: false, message: 'نظام الدخول غير محمّل' };
            const r = await window.PortalCloud.login(username, password);
            return r.success ? { success: true, user: r.user } : { success: false, message: r.error };
        },

        // ============ دوال المعالجة البيداغوجية ============
        async getPedagogicalRecords() {
            let records = [];
            try {
                await ensureAnonAuth();
                const doc = fbDb ? await fbDb.collection('platform_shared').doc('pedagogical_records').get() : null;
                if (doc && doc.exists && doc.data().recordsJson) {
                    const parsed = JSON.parse(doc.data().recordsJson);
                    if (Array.isArray(parsed)) records = parsed;
                }
            } catch(e) { console.warn('Firestore fetch error:', e); }
            try {
                await ensureSupabaseSession();
                const sbm = await getSb();
                const { data, error } = await sbm.from('traitement_records').select('*').order('created_at', { ascending: false });
                if (!error && data) {
                    const existingIds = new Set(records.map(r => r.id));
                    data.forEach(r => { if (r.id && !existingIds.has(r.id)) records.push(r); });
                }
            } catch(e) { console.warn('Supabase fetch error:', e); }
            try {
                const local = JSON.parse(localStorage.getItem('traitementData') || '[]');
                const existingIds = new Set(records.map(r => r.id));
                local.forEach(r => { if (r.id && !existingIds.has(r.id)) records.push(r); });
            } catch(e) {}
            return records.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        },
        async savePedagogicalRecords(records) {
            try {
                await ensureAnonAuth();
                if (fbDb) await fbDb.collection('platform_shared').doc('pedagogical_records').set({
                    updatedAt: new Date().toISOString(),
                    recordsJson: JSON.stringify(records)
                }, { merge: true });
            } catch (e) { console.warn('Firestore save:', e); }
            localStorage.setItem('traitementData', JSON.stringify(records));   // يُزامَن تلقائياً مع Supabase عبر portal-cloud.js
            return true;
        },

        // ============ دوال المراقبة ============
        async getActivities() {
            const log = await this.getActivityLog(1000);
            return log.map(r => ({ id: r.id, owner_id: r.teacher_id, title: r.activity_title, created_at: r.created_at }));
        },
        async getActivityLog(limit = 300) {
            try {
                const sb = await getSb(), L = (window.PORTAL_CFG && PORTAL_CFG.LABELS) || {}, H = window.PORTAL_CFG && PORTAL_CFG.HIDE;
                const { data, error } = await sb.from('wajih_activity').select('*').order('created_at', { ascending: false }).limit(limit);
                if (error) return [];
                return (data || []).filter(r => !(H && H.test(r.key || ''))).map(r => ({ id: r.id, action: r.action, teacher_id: r.user_id, teacher_name: r.user_name, activity_title: L[r.key] || r.key, created_at: r.created_at }));
            } catch (e) { return []; }
        },
        async logActivity(teacherId, teacherName, action, title) {
            try { if (window.PortalCloud && PortalCloud.log) await PortalCloud.log(action, 'traitementData'); }
            catch (e) { console.warn('Log activity failed:', e); }
        },

        // ============ دوال الشعار ============
        async getBrandingLogo() {
            try {
                if (!fbDb) return localStorage.getItem('footerMuqataaLogo');
                const doc = await fbDb.collection('platform_shared').doc('branding').get();
                return doc.exists ? (doc.data().muqataaLogo || null) : null;
            } catch(e) { return null; }
        },
        async saveBrandingLogo(dataUrl) {
            try {
                await ensureAnonAuth();
                if (fbDb) await fbDb.collection('platform_shared').doc('branding').set({
                    muqataaLogo: dataUrl, updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) { console.warn('Branding save:', e); }
            localStorage.setItem('footerMuqataaLogo', dataUrl);
        }
    };
    console.log('✅ DataBridge جاهز');
})();