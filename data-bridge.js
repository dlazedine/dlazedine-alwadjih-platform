// data-bridge.js - الجسر الموحد للبيانات
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
    const fbDb = firebase.firestore();
    const fbAuth = firebase.auth();

    const SUPABASE_URL = "https://yzxyttieobyblznaehcl.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u";
    const sbMain = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    async function ensureAnonAuth() {
        if (fbAuth.currentUser) return fbAuth.currentUser;
        try {
            const cred = await fbAuth.signInAnonymously();
            return cred.user;
        } catch (e) { console.warn('Firebase anon auth failed:', e); return null; }
    }

    async function ensureSupabaseSession() {
        const { data } = await sbMain.auth.getSession();
        if (data && data.session) return data.session;
        try {
            const { data: signInData } = await sbMain.auth.signInAnonymously();
            return signInData?.session || null;
        } catch (e) { console.warn('Supabase anon auth failed:', e); return null; }
    }

    window.DataBridge = {
        async getUsers() {
            await ensureAnonAuth();
            const doc = await fbDb.collection('platform_shared').doc('users').get();
            return doc.exists ? (doc.data().list || []) : [];
        },
        async saveUsers(users) {
            await ensureAnonAuth();
            const sanitized = users.map(u => { const c = {...u}; delete c.passwordHash; return c; });
            await fbDb.collection('platform_shared').doc('users').set({ list: sanitized, updatedAt: new Date().toISOString() });
            return true;
        },
        async getCredentials() {
            await ensureAnonAuth();
            const doc = await fbDb.collection('platform_shared').doc('credentials').get();
            return doc.exists ? (doc.data().hashes || {}) : {};
        },
        async saveCredential(userId, hash) {
            await ensureAnonAuth();
            const creds = await this.getCredentials();
            if (hash === null) delete creds[userId]; else creds[userId] = hash;
            await fbDb.collection('platform_shared').doc('credentials').set({ hashes: creds, updatedAt: new Date().toISOString() });
            return true;
        },
        async getPedagogicalRecords() {
            let records = [];
            try {
                await ensureAnonAuth();
                const doc = await fbDb.collection('platform_shared').doc('pedagogical_records').get();
                if (doc.exists && doc.data().recordsJson) {
                    const parsed = JSON.parse(doc.data().recordsJson);
                    if (Array.isArray(parsed)) records = parsed;
                }
            } catch(e) { console.warn('Firestore fetch error:', e); }
            try {
                await ensureSupabaseSession();
                const { data, error } = await sbMain.from('traitement_records').select('*').order('created_at', { ascending: false });
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
            await ensureAnonAuth();
            await fbDb.collection('platform_shared').doc('pedagogical_records').set({
                updatedAt: new Date().toISOString(),
                recordsJson: JSON.stringify(records)
            }, { merge: true });
            localStorage.setItem('traitementData', JSON.stringify(records));
            return true;
        },
        async getActivities() {
            await ensureSupabaseSession();
            const { data, error } = await sbMain.from('activities').select('id, owner_id, title, created_at');
            return error ? [] : (data || []);
        },
        async getActivityLog(limit = 300) {
            await ensureSupabaseSession();
            const { data, error } = await sbMain.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
            return error ? [] : (data || []);
        },
        async logActivity(teacherId, teacherName, action, title) {
            try {
                await ensureSupabaseSession();
                await sbMain.from('activity_log').insert({
                    teacher_id: teacherId, teacher_name: teacherName,
                    action: action, activity_title: title,
                    created_at: new Date().toISOString()
                });
            } catch(e) { console.warn('Log activity failed:', e); }
        },
        async getBrandingLogo() {
            try {
                const doc = await fbDb.collection('platform_shared').doc('branding').get();
                return doc.exists ? (doc.data().muqataaLogo || null) : null;
            } catch(e) { return null; }
        },
        async saveBrandingLogo(dataUrl) {
            await ensureAnonAuth();
            await fbDb.collection('platform_shared').doc('branding').set({
                muqataaLogo: dataUrl, updatedAt: new Date().toISOString()
            }, { merge: true });
            localStorage.setItem('footerMuqataaLogo', dataUrl);
        }
    };
    console.log('✅ DataBridge جاهز');
})();