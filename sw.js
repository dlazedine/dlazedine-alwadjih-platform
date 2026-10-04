/* ============================================================
   Service Worker — الوجيه في الإشراف التربوي
   استراتيجيات:
   - App Shell (الصفحات + الأيقونات + CSS/JS): Cache First + تحديث خلفي
   - Supabase / Firebase / Firestore / Auth: Network Only (ممنوع الكاش)
   - الخطوط (Google Fonts / cdnjs FontAwesome): Stale-While-Revalidate
   ============================================================ */

const APP_VERSION = 'wajih-v3.0.0';               // ⚠️ غيّر الرقم عند كل نشر جديد
const STATIC_CACHE  = `static-${APP_VERSION}`;
const FONTS_CACHE   = `fonts-${APP_VERSION}`;
const RUNTIME_CACHE = `runtime-${APP_VERSION}`;
const MAX_RUNTIME_ENTRIES = 60;

/* ---------- App Shell: الموارد الأساسية التي تُخزَّن مسبقًا ---------- */
const APP_SHELL = [
  './',
  './index.html',
  './amal.html',
  './arabic.html',
  './moualaja.html',
  './niqash.html',
  './taqyim.html',
  './dashboard.html',
  './cv.html',
  './data-prof.html',
  './rapport-peda.html',
  './rapport-tarsim.html',

  /* ملفات JS/CSS المحلية */
  './style.css',
  './niqash.css',
  './report.css',
  './app.js',
  './auth.js',
  './niqash.js',
  './portal-cloud.js',
  './admin-panel.js',
  './dashboard-supabase.js',
  './supabase-config.js',
  './datefmt.js',
  './export-word.js',

  /* manifest */
  './manifest.json',

  /* أيقونات (عدّلها حسب ما ولّدته فعلًا) */
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png'
];

/* ---------- استثناءات: يجب ألّا تُخزَّن أبدًا ---------- */
const NETWORK_ONLY_HOSTS = [
  'yzxyttieobyblznaehcl.supabase.co',   // Supabase REST + Realtime + Auth
  'supabase.co',
  'supabase.in',
  'firebaseapp.com',                    // Firebase Auth
  'firebaseio.com',
  'googleapis.com',                     // Firestore + Fonts API (نعالج الخطوط أدناه)
  'gstatic.com',                        // Firebase SDK + Fonts loader
  'firebase.google.com'
];

/* استثناء Google Fonts فقط من Googleapis لأننا نخزّنه في FONTS_CACHE */
const FONTS_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FONTS_EXT  = /\.(?:woff2?|ttf|otf|eot)$/i;

/* ============================================================
   تثبيت: تخزين App Shell
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // نستخدم addAll مع تجاهل الأخطاء الفردية (مثل ملف مفقود)
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try { await cache.add(new Request(url, { cache: 'reload' })); }
          catch (e) { console.warn('[SW] تعذّر تخزين:', url); }
        })
      );
      // تفعيل فوري بدون انتظار إغلاق التبويبات
      await self.skipWaiting();
    })()
  );
});

/* ============================================================
   تنشيط: تنظيف الكاش القديم
   ============================================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== FONTS_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      // التحكم الفوري بكل التبويبات المفتوحة
      await self.clients.claim();
    })()
  );
});

/* ============================================================
   استراتيجيات الجلب
   ============================================================ */

/* 1) Cache-First + تحديث خلفي (App Shell) */
async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) { networkPromise; return cached; }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  // آخر حلّ: صفحة offline
  return caches.match('./index.html');
}

/* 2) Stale-While-Revalidate (الخطوط + الموارد الخارجية المسموحة) */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || Response.error();
}

/* 3) Network-Only (Supabase / Firebase) */
function networkOnly(request) {
  return fetch(request);
}

/* 4) Runtime Cache للصور والموارد غير المتوقّعة */
async function networkFirstWithRuntimeCache(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone());
      // حدّ أقصى للعناصر
      const keys = await cache.keys();
      if (keys.length > MAX_RUNTIME_ENTRIES) {
        await cache.delete(keys[0]);
      }
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('غير متصل بالإنترنت', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* ============================================================
   موجّه الطلبات
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* تجاهل الطلبات غير GET (POST/PUT/DELETE لا تُخزَّن أبدًا) */
  if (req.method !== 'GET') return;

  /* تجاهل chrome-extension وغيرها */
  if (!url.protocol.startsWith('http')) return;

  /* 1) Supabase / Firebase: شبكة فقط */
  if (NETWORK_ONLY_HOSTS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(networkOnly(req));
    return;
  }

  /* 2) Google Fonts: Stale-While-Revalidate */
  if (FONTS_HOSTS.some((h) => url.hostname.endsWith(h)) || FONTS_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req, FONTS_CACHE));
    return;
  }

  /* 3) طلبات نفس الأصل (HTML / JS / CSS / صور) */
  if (url.origin === self.location.origin) {
    const dest = req.destination;

    // HTML + JS + CSS + manifest → Cache-First
    if (['document', 'script', 'style', 'manifest'].includes(dest)) {
      event.respondWith(cacheFirstWithUpdate(req));
      return;
    }

    // صور / أيقونات / خطوط محلية → Runtime
    if (['image', 'font'].includes(dest)) {
      event.respondWith(networkFirstWithRuntimeCache(req));
      return;
    }
  }

  /* 4) أي شيء آخر: شبكة عادية */
});

/* ============================================================
   رسائل من الصفحة (تحديث فوري عند إصدار نسخة جديدة)
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: APP_VERSION });
  }
});

/* ============================================================
   Background Sync (اختياري — لمزامنة النقاش عند عودة الشبكة)
   ============================================================ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-niqash') {
    event.waitUntil(
      (async () => {
        // نُبلغ كل التبويبات المفتوحة بإعادة المزامنة
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.postMessage({ type: 'RETRY_SYNC' }));
      })()
    );
  }
});

/* ============================================================
   Push Notifications (اختياري — قابل للحذف)
   ============================================================ */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'الوجيه', {
      body: data.body || 'لديك إشعار جديد',
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-96x96.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || './')
  );
});