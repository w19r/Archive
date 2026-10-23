<div dir="rtl" align="center">

# 🕊️ أرشيف عائلة العايدي الرقمي | Alaydi Family Digital Archive

**منصة رقمية تفاعلية لتوثيق سيرة وصور شهداء عائلة العايدي وحفظ ذكرياتهم عبر السنين.**

[![الموقع المباشر](https://img.shields.io/badge/Live_Website-archive.abdallahalaydi.com-8A6741?style=for-the-badge&logo=google-chrome&logoColor=white)](https://archive.abdallahalaydi.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![PWA Ready](https://img.shields.io/badge/PWA-Supported-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#)

<br>

[زيارة الأرشيف الرئيسي](https://archive.abdallahalaydi.com/) • [أرشيف الشهيد محمد](https://archive.abdallahalaydi.com/mohammed/) • [أرشيف الشهيد عبد المجيد](https://archive.abdallahalaydi.com/abdulmajeed/)

</div>

---

<div dir="rtl">

## 📖 نبذة عن المشروع

أُنشئ **أرشيف عائلة العايدي** بمبادرة فردية لترسيخ تاريخ العائلة وتوثيق السيرة العطرة والصور النادرة لشهدائنا؛ **الشهيد محمد العايدي** (1980 – 2025) و**الشهيد عبد المجيد العايدي** (1978 – 2014)، لتبقى ذكراهم حية ومحفورة في الذاكرة الرقمية عبر الأجيال.

إلى جانب قيمته الإنسانية والتوثيقية، صُمم هذا المشروع ليكون تطبيقاً هندسياً متكاملاً يعتمد على معمارية المواقع الثابتة المدعومة بالواجهات البرمجية السحابية (Serverless Static Architecture) مع التركيز العالي على الأداء، تجربة المستخدم (UX)، وأرشفة محركات البحث والذكاء الاصطناعي.

---

## ⚙️ المميزات الهندسية والتقنية (Key Features)

* **محرك تحليل وترتيب زمني ذكي (Smart Chronological Parser):** خوارزمية مخصصة بـ JavaScript قادرة على قراءة وتحليل صيغ تواريخ متعددة ومعقدة (تاريخ كامل `YYYY-MM-DD`، شهر وسنة `YYYY-MM`، سنة منفردة، تواريخ تقريبية `~YYYY`، أو نطاق زمني بين سنتين `YYYY-YYYY`) وحساب نقطة المنتصف الزمنية لترتيب الذكريات بدقة من الأحدث للأقدم والعكس، مع حساب المدة المنقضية تلقائياً.
* **إدارة محتوى ديناميكية (Cloud JSON API):** فصل كامل بين الكود البرمجي والبيانات عبر جلب الذكريات والصور ديناميكياً باستخدام واجهة `JSONBin.io` مع وجود لوحة إدارة مخصصة (`admin/`) لتحديث الأرشيف دون الحاجة لتعديل الكود المصدري.
* **تطبيق ويب تقدمي (Progressive Web App - PWA):** دعم كامل للتثبيت كتطبيق مستقل على أجهزة iOS وAndroid، مع شاشة ترحيب افتتاحية (Splash Screen) تعمل تلقائياً في وضع `standalone`.
* **تهيئة متقدمة لمحركات البحث والذكاء الاصطناعي (Technical SEO & AI Schema):**
  * تضمين البيانات المهيكلة (`JSON-LD` وفق معيار `Schema.org`) لتغذية محركات البحث ونماذج الذكاء الاصطناعي بالسيرة الكاملة والدقيقة للشهداء.
  * دعم كامل لوسوم المشاركة الاجتماعية (Open Graph & Twitter Cards).
  * خريطة موقع (`sitemap.xml`) وملف توجيه العناكب (`robots.txt`).
* **تجربة مستخدم تفاعلية وبصرية هادئة:**
  * تصميم متجاوب (Responsive Design) بألوان دافئة وخطوط عربية مخصصة (`Thamania Sans` و `Thamania Text`).
  * عارض صور مكبر (Lightbox) مع إغلاق سلس، وشريط تقدم قراءة علوي (Reading Progress Bar).
  * تحميل كسول للصور (Lazy Loading) ومؤثرات ظهور انسيابية باستخدام `IntersectionObserver API`.
  * دعم الروابط المباشرة للذكريات (`Deep Linking` عبر `?id=`) مع التمرير التلقائي وتم
