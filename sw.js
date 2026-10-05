/* ======================================================================
   sw.js — Service Worker لمنظومة «الوجيه»
   • يوضع في جذر الموقع بجانب index.html (نطاقه هو المجلد الذي يوجد فيه)
   • ارفع رقم VERSION كلما أضفتَ ملفاً جديداً أو غيّرتَ قائمة LOCAL
   ====================================================================== */
const VERSION = 'v1.0.0';
const PRE = 'wajih-pre-' + VERSION;   // ملفات المنظومة (قشرة التطبيق)
const RUN = 'wajih-run-' + VERSION;   // مكتبات CDN والخطوط
const MAX_RUN = 90;                   // أقصى عدد عناصر في ذاكرة CDN

/* ملفات المنظومة: تُحفظ عند التثبيت (كل ملف على حدة، فغياب ملف لا يُفشل التثبيت) */
const LOCAL = [
  "./",
  "admin-panel.js",
  "amal.html",
  "app.js",
  "arabic.html",
  "auth.js",
  "cv.html",
  "dashboard-supabase.js",
  "dashboard.html",
  "data-prof.html",
  "datefmt.js",
  "export-word.js",
  "index.html",
  "manifest.webmanifest",
  "moualaja.html",
  "niqash.css",
  "niqash.html",
  "niqash.js",
  "offline.html",
  "portal-cloud.js",
  "rapport-peda.html",
  "rapport-tarsim.html",
  "report.css",
  "style.css",
  "supabase-config.js",
  "taqyim.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/favicon-32.png",
  "icons/icon-180.png"
];

/* مكتبات خارجية: تُحفظ محاولةً (best-effort) وما سواها يُحفظ عند أول استعمال */
const CDN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js",
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap"
];

/* لا تُخزَّن أبداً: الحسابات والبيانات الحيّة (Supabase / Firebase) وخدمات ديناميكية */
const NEVER_HOSTS = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com', 'api.qrserver.com', 'wa.me'];
const isNever = (u) => /(^|\.)supabase\.(co|in)$/.test(u.hostname) || /(^|\.)firebaseio\.com$/.test(u.hostname) || NEVER_HOSTS.includes(u.hostname);

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const pre = await caches.open(PRE);
    await Promise.allSettled(LOCAL.map((u) => pre.add(new Request(u, { cache: 'reload' }))));
    const run = await caches.open(RUN);
    await Promise.allSettled(CDN.map(async (u) => {                     // نخزّن فقط ما نتحقق من نجاحه (CORS + res.ok)
      const res = await withTimeout(fetch(u, { mode: 'cors', credentials: 'omit' }), 8000);
      if (res.ok) await run.put(u, res);
    }));
    /* لا skipWaiting هنا: يُفعَّل الإصدار الجديد عندما يضغط المستخدم «تحديث» (انظر pwa.js) */
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('wajih-') && k !== PRE && k !== RUN) await caches.delete(k);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;          // POST وطلبات Range: مباشرة من الشبكة
  const u = new URL(r.url);
  if (!/^https?:$/.test(u.protocol) || isNever(u)) return;           // بيانات حيّة: لا تدخل الـ SW
  if (r.mode === 'navigate') return e.respondWith(navigate(e));
  if (u.origin === location.origin) return e.respondWith(local(r, u));
  e.respondWith(swr(e, r));
});

/* الصفحات: الشبكة أولاً (لتصل التحديثات وتعمل حراسة الدخول)، ثم النسخة المحفوظة، ثم صفحة offline.html */
async function navigate(e) {
  const r = e.request, u = new URL(r.url), key = new Request(u.origin + u.pathname);   // المفتاح بلا ?query
  try {
    const pre = await e.preloadResponse;
    const res = pre || await withTimeout(fetch(r), 6000);
    if (res && res.ok && res.type === 'basic' && !res.redirected) (await caches.open(PRE)).put(key, res.clone());
    return res;
  } catch (_) {
    return (await caches.match(key)) || (await caches.match(new Request(u.origin + u.pathname.replace(/\/?$/, '/') + 'index.html'))) || (await caches.match('offline.html'));
  }
}

/* ملفات المنظومة (JS/CSS): الشبكة أولاً لتفادي تعارض الإصدارات، والأيقونات والخطوط: الذاكرة أولاً */
async function local(r, u) {
  const c = await caches.open(PRE);
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(u.pathname)) { const hit = await c.match(r); if (hit) return hit; }
  try {
    const res = await withTimeout(fetch(r), 5000);
    if (res.ok && res.type === 'basic') c.put(r, res.clone());
    return res;
  } catch (_) {
    return (await c.match(r, { ignoreSearch: true })) || Response.error();
  }
}

/* مكتبات CDN والخطوط: نسخة محفوظة فوراً + تحديث في الخلفية.
   الاستجابات «المبهمة» (opaque) لا تُحفظ مباشرة لأن حالتها غير معروفة (قد تكون صفحة خطأ)،
   بل تُجلب نسخة CORS من الرابط نفسه وتُحفظ إن نجحت. */
async function swr(e, r) {
  const c = await caches.open(RUN), hit = await c.match(r);
  const store = async (url) => {
    try { const x = await fetch(url, { mode: 'cors', credentials: 'omit' }); if (x.ok) { await c.put(url, x); trim(c); } } catch (_) {}
  };
  if (hit) { e.waitUntil(store(r.url)); return hit; }
  try {
    const res = await fetch(r);
    if (res.ok) { await c.put(r, res.clone()); trim(c); }
    else if (res.type === 'opaque') e.waitUntil(store(r.url));
    return res;
  } catch (_) { return Response.error(); }
}
async function trim(c) { const ks = await c.keys(); if (ks.length > MAX_RUN) await Promise.all(ks.slice(0, ks.length - MAX_RUN).map((k) => c.delete(k))); }
