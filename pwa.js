/* pwa.js — تسجيل الـ Service Worker، وإشعار التحديث، وزر تثبيت التطبيق */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;   // لا يعمل من file://

  const css = document.createElement('style');
  css.textContent = '.pwa-b{position:fixed;z-index:99998;bottom:12px;inset-inline:12px;max-width:460px;margin-inline:auto;background:#1f3864;color:#fff;border:2px solid #c49b3f;border-radius:14px;padding:10px 14px;display:flex;gap:10px;align-items:center;font:14px/1.6 Tahoma,Arial,sans-serif;direction:rtl;box-shadow:0 6px 24px #0005}.pwa-b span{flex:1}.pwa-b button{font:inherit;border-radius:9px;padding:5px 12px;cursor:pointer;border:1px solid #fff9;background:transparent;color:#fff}.pwa-b button.go{background:#c49b3f;border-color:#c49b3f;color:#1f2a44;font-weight:bold}@media print{.pwa-b{display:none!important}}';
  document.head.appendChild(css);

  function bar(id, text, label, onGo) {
    if (document.getElementById(id)) return;
    const d = document.createElement('div'); d.className = 'pwa-b'; d.id = id;
    d.innerHTML = '<span></span><button class="go"></button><button>لاحقاً</button>';
    d.querySelector('span').textContent = text;
    const go = d.querySelector('.go'); go.textContent = label;
    go.onclick = () => { d.remove(); onGo(); };
    d.lastChild.onclick = () => d.remove();
    document.body.appendChild(d);
  }

  /* ---- 1) التسجيل والتحديث ---- */
  let hadController = !!navigator.serviceWorker.controller, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }   // أول تثبيت (clients.claim): لا إعادة تحميل
    if (reloading) return;
    reloading = true; location.reload();                      // تحديث لاحق: أعد التحميل لتعمل الصفحة بالنسخة الجديدة
  });

  function offerUpdate(worker) {
    bar('pwa-update', 'تتوفر نسخة جديدة من المنظومة.', 'تحديث الآن', () => worker.postMessage('SKIP_WAITING'));
  }

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);                    // فحص كل ساعة
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    } catch (err) { console.warn('SW registration failed:', err); }
  });

  /* ---- 2) تثبيت التطبيق ---- */
  let deferred = null;
  const own = () => document.documentElement.hasAttribute('data-pwa-own-ui');   // صفحة install.html لها زرها الخاص
  window.PWA = {
    canInstall: () => !!deferred,
    installed: () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    install: async () => { if (!deferred) return false; deferred.prompt(); const c = await deferred.userChoice.catch(() => ({})); deferred = null; return c.outcome === 'accepted'; }
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    window.dispatchEvent(new Event('pwa:installable'));
    if (own() || window.PWA.installed() || localStorage.getItem('pwa_install_dismissed')) return;
    bar('pwa-install', 'ثبّت «الوجيه» على جهازك لفتحه كتطبيق.', 'تثبيت', () => window.PWA.install());
    const later = document.querySelector('#pwa-install button:last-child');
    if (later) later.addEventListener('click', () => { try { localStorage.setItem('pwa_install_dismissed', '1'); } catch (e) {} });
  });
  window.addEventListener('appinstalled', () => { const b = document.getElementById('pwa-install'); if (b) b.remove(); window.dispatchEvent(new Event('pwa:installed')); });
})();
