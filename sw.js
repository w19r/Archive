const CACHE_NAME = 'alaydi-core-v2';
const IMAGES_CACHE = 'alaydi-images-v1';

// الملفات البرمجية والصفحات فقط
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

// 1. التثبيت وحفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 2. التفعيل: مسح الأكواد القديمة فقط دون المساس بالصور المحفوظة!
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // نقوم بمسح الكاش القديم للأكواد، ولكننا نحافظ على كاش الصور (IMAGES_CACHE)
          if (key !== CACHE_NAME && key !== IMAGES_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. التعامل مع الطلبات بذكاء (Stale-While-Revalidate للصور)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // إذا كان الطلب عبارة عن صورة (من مجلد الأرشيف أو عبر سيرفر الضغط)
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i) || url.hostname.includes('wsrv.nl')) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // إذا كانت الصورة مخزنة مسبقاً، اعرضها فوراً وبدون إنترنت نهائياً
          if (cachedResponse) {
            return cachedResponse;
          }
          // وإذا لم تكن مخزنة، جلبها من الشبكة واحفظها للأبد
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // في حال انقطاع النت ولم تكن مخزنة
            return new Response('الصورة غير متوفرة بدون إنترنت', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // باقي ملفات الموقع والصفحات
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
