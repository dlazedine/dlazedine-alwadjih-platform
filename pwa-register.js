<!-- ===== PWA: Service Worker ===== -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .then((reg) => {
          console.log('✅ SW مسجّل بنطاق:', reg.scope);
          // تحديث فوري عند إصدار جديد
          reg.addEventListener('updatefound', () => {
            const sw = reg.installing;
            sw?.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                // نسخة جديدة جاهزة — أخبر المستخدم
                if (confirm('توفّر تحديث جديد للتطبيق. هل تريد إعادة التحميل الآن؟')) {
                  sw.postMessage({ type: 'SKIP_WAITING' });
                  location.reload();
                }
              }
            });
          });
        })
        .catch((err) => console.warn('⚠️ فشل تسجيل SW:', err));
    });
  }
</script>