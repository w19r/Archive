const CACHE_NAME = 'alaydi-archive-v2';

// الملفات الأساسية المحفوظة تلقائياً للعمل بدون إنترنت
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

// 1. تثبيت المحرك وحفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 2. تفعيل المحرك ومسح أي كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. جلب الصفحات والصور من الذاكرة عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // حفظ نسخة من أي صورة أو ملف يفتحه الزائر ليعمل لاحقاً بدون نت
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // في حال انقطاع الإنترنت يعود للنسخة المحفوظة
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
