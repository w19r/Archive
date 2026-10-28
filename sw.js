importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'alaydi-core-v1.201';
const IMAGES_CACHE = 'alaydi-images-v1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.ico',
  '/mohammed/',
  '/mohammed/index.html',
  '/abdulmajeed/',
  '/abdulmajeed/index.html',
  '/assets/data/mohammed.json',
  '/assets/data/abdulmajeed.json',
  '/assets/fonts/thmanyahseriftext-Regular.woff2',
  '/assets/fonts/thmanyahseriftext-Medium.woff2'
];

// 1. التثبيت
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 2. التفعيل ومسح الكاش القديم للأكواد فقط (مع الحفاظ على الصور)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGES_CACHE && !key.toLowerCase().includes('onesignal')) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. إدارة الطلبات (مع استثناء سيرفرات OneSignal تماماً لكي تتسجل الأجهزة فوراً)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // مهم جداً: عدم اعتراض طلبات OneSignal أو أي سيرفر خارجي (ما عدا سيرفر الصور)
  if (
    url.hostname.includes('onesignal.com') ||
    url.hostname.includes('formspree.io') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    (url.origin !== self.location.origin && !url.hostname.includes('wsrv.nl'))
  ) {
    return;
  }

  // أ) كاش الصور الدائم
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i) || url.hostname.includes('wsrv.nl')) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => new Response('الصورة غير متوفرة بدون إنترنت', { status: 404 }));
        });
      })
    );
    return;
  }

  // ب) صفحات الموقع (HTML): جلب الأحدث من الإنترنت أولاً لمنع الشاشة البيضاء، والعودة للكاش عند انقطاع النت
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // ج) باقي الملفات (الخطوط والـ JSON)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. الاستماع لرسالة زر التحديث
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || (event.data && event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
});
