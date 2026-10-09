/* ============================================================
   pwa.js — تسجيل Service Worker وتفعيل تشغيل التطبيق دون اتصال
   ============================================================ */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // تسجيل اختياري عند توفر service-worker.js
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // صامت في بيئة التطوير
        });
    });
}
