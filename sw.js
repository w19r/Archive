importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'alaydi-core-v2.0';
const IMAGES_CACHE = 'alaydi-images-v2';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.ico',
  '/mohammed/',
  '/abdulmajeed/',
  '/assets/fonts/thmanyahseriftext-Regular.woff2',
  '/assets/fonts/thmanyahseriftext-Medium.woff2'
];

// 1. التثبيت الآمن (لا يفشل الـ Service Worker لو تعذر ملف واحد)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        CORE_ASSETS.map((asset) =>
          fetch(asset, { cache: 'no-cache' })
            .then((res) => {
              if (res && res.ok) return cache.put(asset, res);
            })
            .catch(() => {})
        )
      )
    )
  );
});

// 2. التفعيل ومسح كل الكاشات القديمة تلقائياً عند جميع الزوار (مع حماية OneSignal)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (
            key !== CACHE_NAME &&
            key !== IMAGES_CACHE &&
            !key.toLowerCase().includes('onesignal')
          ) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. إدارة الطلبات
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // استثناء OneSignal والسيرفرات الخارجية ولوحة الأدمن تماماً
  if (
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('formspree.io') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.startsWith('/admin') ||
    (url.origin !== self.location.origin && !url.hostname.includes('wsrv.nl'))
  ) {
    return;
  }

  // أ) الصور: Cache-First للسرعة، مع فحص السيرفر بدون كاش 404 للصور الجديدة
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i) || url.hostname.includes('wsrv.nl')) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then((cache) =>
        cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          const req = url.origin === self.location.origin
            ? fetch(url.href, { cache: 'no-cache' })
            : fetch(event.request);

          return req
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => new Response('', { status: 404 }));
        })
      )
    );
    return;
  }

  // ب) الخطوط: Cache-First لأنها ثابتة ولا تتغير
  if (url.pathname.match(/\.(woff2?|ttf|otf)$/i)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // ج) الصفحات (HTML): Network-First دائماً، والعودة للكاش فقط عند انقطاع الإنترنت
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request, { ignoreSearch: true })
            .then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // د) ملفات الكود والبيانات (JSON, JS, CSS): Network-First مع إعادة تحقق فورية من السيرفر
  event.respondWith(
    fetch(url.href, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || new Response('', { status: 503 }))
      )
  );
});

// 4. الاستماع لرسالة زر التحديث
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || (event.data && event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
});
