// ============================================================
//  نظام المصادقة الموحّد — يخدم كل أدوات البوابة
//  يعتمد على: firebase-config.js (يجب استدعاؤه قبله)
// ============================================================

const SESSION_KEY = 'pgb_session';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // ساعتان

let __cachedUsers = [];
let __cloudUsersReady = false;
let __cloudUsersReadyPromise = null;

// ============================================================
//  أدوات مساعدة
// ============================================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateRandomPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(length);
        window.crypto.getRandomValues(arr);
        for (let i = 0; i < length; i++) pass += chars[arr[i] % chars.length];
    } else {
        for (let i = 0; i < length; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    }
    return pass;
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'pgb_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
    return (await hashPassword(password)) === hash;
}

// ============================================================
//  مزامنة المستخدمين من Firestore
// ============================================================
function listenToCloudUsers() {
    if (__cloudUsersReadyPromise) return __cloudUsersReadyPromise;
    const docRef = getUsersDocRef();
    if (!docRef) {
        __cloudUsersReady = true;
        __cloudUsersReadyPromise = Promise.resolve([]);
        return __cloudUsersReadyPromise;
    }
    const snapshotPromise = new Promise((resolve) => {
        docRef.onSnapshot(
            (doc) => {
                __cachedUsers = (doc.exists && Array.isArray(doc.data().list)) ? doc.data().list : [];
                __cloudUsersReady = true;
                resolve(__cachedUsers);
                // إشعار الصفحة بأي تحديث
                document.dispatchEvent(new CustomEvent('users-updated', { detail: __cachedUsers }));
            },
            (error) => {
                console.error('⚠️ تعذّر الاتصال بقاعدة البيانات:', error);
                __cloudUsersReady = true;
                resolve(__cachedUsers);
            }
        );
    });
    const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => { __cloudUsersReady = true; resolve(__cachedUsers); }, 8000)
    );
    __cloudUsersReadyPromise = Promise.race([snapshotPromise, timeoutPromise]);
    return __cloudUsersReadyPromise;
}

function getUsers() { return __cachedUsers; }

async function saveUsers(users) {
    __cachedUsers = users;
    try {
        const docRef = getUsersDocRef();
        if (!docRef) throw new Error('خدمة السحابة غير متاحة');
        await docRef.set({ list: users, updatedAt: new Date().toISOString() });
        return true;
    } catch (e) {
        console.error('⚠️ تعذّر حفظ المستخدمين:', e);
        return false;
    }
}

function findUserByUsername(username) {
    if (!username) return null;
    const needle = username.toLowerCase();
    return __cachedUsers.find(u =>
        (u.username || '').toLowerCase() === needle ||
        (u.email || '').toLowerCase() === needle
    );
}

// ============================================================
//  مصادقة مجهولة (صامتة) — لإرضاء قواعد Firestore فقط
// ============================================================
function ensureAnonymousAuth() {
    if (!fbAuth) return Promise.resolve(null);
    const authPromise = new Promise((resolve) => {
        if (fbAuth.currentUser) { resolve(fbAuth.currentUser); return; }
        fbAuth.signInAnonymously().catch((err) => console.error('⚠️ تعذّر الاتصال بالمصادقة:', err));
        const unsub = fbAuth.onAuthStateChanged((user) => { if (user) { unsub(); resolve(user); } });
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    return Promise.race([authPromise, timeoutPromise]);
}

// ============================================================
//  إنشاء أول حساب مدير تلقائياً (إذا كانت القاعدة فارغة)
// ============================================================
async function initializeUsersIfEmpty() {
    await ensureAnonymousAuth();
    await listenToCloudUsers();
    if (!__cachedUsers || __cachedUsers.length === 0) {
        const randomPassword = generateRandomPassword(10);
        const adminPasswordHash = await hashPassword(randomPassword);
        const initialUsers = [{
            id: 'admin_' + generateId(),
            username: 'admin',
            fullName: 'درويش الهلالي',
            email: 'dlazedine68@gmail.com',
            school: 'المقاطعة الثانية - قسنطينة',
            role: 'inspector',
            passwordHash: adminPasswordHash,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            mustChangePassword: true,
            active: true
        }];
        __cachedUsers = initialUsers;
        await saveUsers(initialUsers);
        window.__freshAdminPassword = randomPassword;
    }
    return __cachedUsers;
}

// ============================================================
//  الجلسة (session)
// ============================================================
function saveSession(user) {
    const session = {
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            email: user.email,
            school: user.school
        },
        startedAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_KEY + '_persistent', JSON.stringify(session));
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY)
                 || localStorage.getItem(SESSION_KEY + '_persistent');
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (Date.now() > s.expiresAt) { clearSession(); return null; }
        return s;
    } catch (e) { return null; }
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY + '_persistent');
}

// يحمي أي صفحة — يُعيد المستخدم للبوابة إن لم يكن مُسجّلاً
function requireAuth(requiredRole) {
    const session = loadSession();
    if (!session) {
        window.location.replace('index.html');
        return null;
    }
    if (requiredRole && session.user.role !== requiredRole) {
        window.location.replace('index.html');
        return null;
    }
    return session.user;
}

// ============================================================
//  تسجيل الدخول / الخروج (للبوابة الرئيسية)
// ============================================================
async function loginWithCredentials(username, password) {
    if (!__cloudUsersReady) await listenToCloudUsers();
    const user = findUserByUsername(username);
    if (!user) throw new Error('اسم المستخدم غير موجود');
    if (!user.active) throw new Error('هذا الحساب معطّل حالياً');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error('كلمة المرور غير صحيحة');

    // تحديث آخر دخول
    user.lastLogin = new Date().toISOString();
    const idx = __cachedUsers.findIndex(u => u.id === user.id);
    if (idx !== -1) { __cachedUsers[idx].lastLogin = user.lastLogin; saveUsers(__cachedUsers); }

    saveSession(user);
    return user;
}

function logout() {
    clearSession();
    window.location.href = 'index.html';
}