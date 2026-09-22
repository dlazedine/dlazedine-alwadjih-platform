// ============================================================
//  إعداد Firebase الموحّد — يُستدعى من كل صفحات البوابة
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBdv2RJ7EzlnVQcXyyozlLhVKdgwaKQdaY",
    authDomain: "mou3ladja.firebaseapp.com",
    projectId: "mou3ladja",
    storageBucket: "mou3ladja.firebasestorage.app",
    messagingSenderId: "986880549463",
    appId: "1:986880549463:web:b4de098099622040bfb912",
    measurementId: "G-E0BZPDCZB9"
};

let fbAuth = null;
let fbDb = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        fbAuth = firebase.auth();
        fbDb = firebase.firestore();

        // تفعيل التخزين المحلي الدائم (يعمل حتى بدون اتصال)
        try {
            fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        } catch (e) {}
    } else {
        console.error('⚠️ تعذّر تحميل مكتبة Firebase — تحقق من الاتصال بالإنترنت');
    }
} catch (e) {
    console.error('⚠️ فشل تهيئة Firebase:', e);
}

// مرجع المستخدمين الموحّد (كل الأدوات تقرأ من هنا)
function getUsersDocRef() {
    if (!fbDb) return null;
    try { return fbDb.collection('platform_shared').doc('users'); }
    catch (e) { console.error('⚠️ تعذّر الوصول لمجموعة المستخدمين:', e); return null; }
}