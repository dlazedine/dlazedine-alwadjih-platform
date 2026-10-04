// pwa-register.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then((reg) => console.log('✅ SW مسجّل بنطاق:', reg.scope))
      .catch((err) => console.warn('⚠️ فشل التسجيل:', err));
  });
}