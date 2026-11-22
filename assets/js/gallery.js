(() => {
  const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const BATCH_SIZE = 12;

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBytes(bytes) {
    if (!bytes || Number.isNaN(Number(bytes))) return null;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`;
  }

  function analyzeDateInput(rawInput) {
    if (!rawInput) return null;
    const str = String(rawInput).trim();
    const rangeMatch = str.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/);
    if (rangeMatch) {
      const y1 = parseInt(rangeMatch[1], 10), y2 = parseInt(rangeMatch[2], 10);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const midMs = Math.round((new Date(minY, 0, 1).getTime() + new Date(maxY, 11, 31).getTime()) / 2);
      return { isApprox: true, minYear: minY, maxYear: maxY, sortTime: midMs, badgeText: minY === maxY ? `${minY}` : `بين ${minY} – ${maxY}`, refDate: new Date(midMs) };
    }
    const fullMatch = str.match(/^(\d{4})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})$/);
    if (fullMatch) {
      const y = parseInt(fullMatch[1], 10), m = parseInt(fullMatch[2], 10) - 1, d = parseInt(fullMatch[3], 10);
      if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
        return { isApprox: false, minYear: y, maxYear: y, sortTime: new Date(y, m, d).getTime(), badgeText: `${d} ${ARABIC_MONTHS[m]} ${y}`, refDate: new Date(y, m, d) };
      }
    }
    const dmyMatch = str.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})$/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10), m = parseInt(dmyMatch[2], 10) - 1, y = parseInt(dmyMatch[3], 10);
      if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
        return { isApprox: false, minYear: y, maxYear: y, sortTime: new Date(y, m, d).getTime(), badgeText: `${d} ${ARABIC_MONTHS[m]} ${y}`, refDate: new Date(y, m, d) };
      }
    }
    const monthMatch = str.match(/^(\d{4})\s*[-/]\s*(\d{1,2})$/);
    if (monthMatch) {
      const y = parseInt(monthMatch[1], 10), m = parseInt(monthMatch[2], 10) - 1;
      if (m >= 0 && m < 12) {
        return { isApprox: false, minYear: y, maxYear: y, sortTime: new Date(y, m, 15).getTime(), badgeText: `${ARABIC_MONTHS[m]} ${y}`, refDate: new Date(y, m, 15) };
      }
    }
    const myMatch = str.match(/^(\d{1,2})\s*[-/]\s*(\d{4})$/);
    if (myMatch) {
      const m = parseInt(myMatch[1], 10) - 1, y = parseInt(myMatch[2], 10);
      if (m >= 0 && m < 12) {
        return { isApprox: false, minYear: y, maxYear: y, sortTime: new Date(y, m, 15).getTime(), badgeText: `${ARABIC_MONTHS[m]} ${y}`, refDate: new Date(y, m, 15) };
      }
    }
    const yearMatch = str.match(/(\d{4})/);
    if (yearMatch) {
      const y = parseInt(yearMatch[1], 10), isApprox = str.includes("~") || str.includes("تقريب") || str.includes("حوالي");
      return { isApprox, minYear: y, maxYear: y, sortTime: new Date(y, 0, 1).getTime(), badgeText: isApprox ? `قرابة ${y}` : `عام ${y}`, refDate: new Date(y, 0, 1) };
    }
    return null;
  }

  function calculateElapsedText(dateInfo) {
    if (!dateInfo || !dateInfo.refDate) return "";
    const now = new Date(), dateObj = dateInfo.refDate, prefix = dateInfo.isApprox ? "منذ قرابة " : "منذ ";
    let years = now.getFullYear() - dateObj.getFullYear(), months = now.getMonth() - dateObj.getMonth();
    if (now.getDate() < dateObj.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    if (years < 0) return "";
    if (years === 0 && months === 0) return "هذا الشهر";
    if (years === 0) return months === 1 ? `${prefix}شهر` : months === 2 ? `${prefix}شهرين` : months <= 10 ? `${prefix}${months} أشهر` : `${prefix}${months} شهراً`;
    if (years === 1) return `${prefix}عام`;
    if (years === 2) return `${prefix}عامين`;
    return years <= 10 ? `${prefix}${years} أعوام` : `${prefix}${years} عاماً`;
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg || "تم نسخ الرابط بنجاح!";
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function cropImageToDataUrl(url, targetW, targetH) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetW; canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          const scale = Math.max(targetW / img.width, targetH / img.height);
          const sw = targetW / scale, sh = targetH / scale;
          ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } catch { resolve(url); }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }

  function renderSkeletons(container, count = 6) {
    container.innerHTML = Array.from({ length: count }).map(() => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-media"></div>
        <div class="skeleton-body">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line full"></div>
        </div>
      </div>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const config = window.ARCHIVE_CONFIG;
    const container = document.getElementById("gallery-container");
    if (!config || !container) return;

    // عرض Skeleton فوراً
    renderSkeletons(container, 6);

    // شريط التقدم والشريط العائم
    const floatingDock = document.getElementById("floatingDock");
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const bar = document.getElementById("progress-bar");
      if (bar) bar.style.width = docHeight > 0 ? `${(scrollTop / docHeight) * 100}%` : "0%";
      if (floatingDock) floatingDock.classList.toggle("visible", scrollTop > 300);
    }, { passive: true });

    document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // حساب المدة منذ الارتقاء
    const martyrdomElapsed = calculateElapsedText(analyzeDateInput(config.martyrdomDate));
    const elapsedEl = document.getElementById("martyrdom-elapsed");
    if (martyrdomElapsed && elapsedEl) elapsedEl.textContent = `• (${martyrdomElapsed})`;

    const targetId = new URLSearchParams(window.location.search).get("id");
    let galleryData = [];
    let sortNewestFirst = true;
    let renderedCount = 0;
    let currentLightboxIndex = -1;

    // عناصر الـ Lightbox
    const lightbox = document.getElementById("lightbox");
    const lbImg = document.getElementById("lightbox-img");
    const lbTitle = document.getElementById("lightbox-title");
    const lbDate = document.getElementById("lightbox-date");
    const lbDesc = document.getElementById("lightbox-desc");
    const lbCounter = document.getElementById("lightbox-counter");
    const lbDownloadBtn = document.getElementById("lightbox-download-btn");
    const lbCommentBtn = document.getElementById("lightbox-comment-btn");
    const lbShareBtn = document.getElementById("lightbox-share-btn");

    // عناصر نافذة شروط التنزيل
    const downloadModal = document.getElementById("download-modal");
    const modalFileSize = document.getElementById("modal-file-size");
    const confirmDownloadBtn = document.getElementById("confirm-download-btn");

    function openCommentsFor(item) {
      if (item && window.ArchiveComments) {
        window.ArchiveComments.open(config.slug, item._id, item.title);
      }
    }

    async function shareItem(item) {
      const itemId = item._id;
      const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(itemId)}`;
      const shareTitle = `${item.title || config.shareTitle} - ${config.shareTitle}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: item.desc || config.shareTitle, url: shareUrl });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("تم نسخ رابط الصورة بنجاح!");
      } catch {
        showToast("تعذر النسخ التلقائي");
      }
    }

    async function openDownloadModal(item) {
      const imgUrl = item.image;
      confirmDownloadBtn.href = imgUrl;
      confirmDownloadBtn.setAttribute("download", imgUrl.split("/").pop() || "archive-photo.jpg");
      const knownSize = formatBytes(item.sizeBytes);
      modalFileSize.textContent = knownSize || "جاري الحساب...";
      downloadModal.classList.add("open");
      downloadModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      if (!knownSize) {
        try {
          const res = await fetch(imgUrl, { method: "HEAD" });
          const bytes = res.headers.get("Content-Length");
          modalFileSize.textContent = formatBytes(Number(bytes)) || "الدقة الأصلية";
        } catch {
          modalFileSize.textContent = "الدقة الأصلية";
        }
      }
    }

    function closeDownloadModal() {
      downloadModal.classList.remove("open");
      downloadModal.setAttribute("aria-hidden", "true");
      if (!lightbox.classList.contains("open")) document.body.style.overflow = "";
    }

    document.getElementById("cancel-download-btn")?.addEventListener("click", closeDownloadModal);
    confirmDownloadBtn?.addEventListener("click", () => setTimeout(closeDownloadModal, 150));
    downloadModal?.addEventListener("click", (e) => { if (e.target === downloadModal) closeDownloadModal(); });

    function showLightboxAt(index) {
      if (!galleryData.length) return;
      currentLightboxIndex = (index + galleryData.length) % galleryData.length;
      const item = galleryData[currentLightboxIndex];
      const badgeText = item._dateInfo ? item._dateInfo.badgeText : item.year;
      const elapsed = calculateElapsedText(item._dateInfo);

      lbTitle.textContent = item.title || "";
      lbDate.textContent = elapsed ? `${badgeText} (${elapsed})` : badgeText;
      lbDesc.textContent = item.desc || "";
      lbCounter.textContent = `${currentLightboxIndex + 1} / ${galleryData.length}`;

      // عرض النسخة السريعة أولاً ثم الترقية بسلاسة إلى view عالية الدقة
      const fastSrc = item.thumb || item.image;
      const hqSrc = item.view || item.image;
      lbImg.alt = item.title || "";
      lbImg.src = fastSrc;

      if (hqSrc !== fastSrc) {
        lbImg.classList.add("loading-hq");
        const preloader = new Image();
        preloader.onload = () => {
          if (galleryData[currentLightboxIndex] === item) {
            lbImg.src = hqSrc;
            lbImg.classList.remove("loading-hq");
          }
        };
        preloader.onerror = () => lbImg.classList.remove("loading-hq");
        preloader.src = hqSrc;
      } else {
        lbImg.classList.remove("loading-hq");
      }

      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.getElementById("lightbox-close")?.addEventListener("click", closeLightbox);
    document.getElementById("lightbox-prev")?.addEventListener("click", () => showLightboxAt(currentLightboxIndex - 1));
    document.getElementById("lightbox-next")?.addEventListener("click", () => showLightboxAt(currentLightboxIndex + 1));
    lbDownloadBtn?.addEventListener("click", () => {
      if (galleryData[currentLightboxIndex]) openDownloadModal(galleryData[currentLightboxIndex]);
    });
    lbCommentBtn?.addEventListener("click", () => {
      if (galleryData[currentLightboxIndex]) openCommentsFor(galleryData[currentLightboxIndex]);
    });
    lbShareBtn?.addEventListener("click", () => {
      if (galleryData[currentLightboxIndex]) shareItem(galleryData[currentLightboxIndex]);
    });
    lightbox?.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

    // تنقل بالكيبورد وبالسحب على الجوال (مع احترام درج التعليقات ونافذة الحساب)
    document.addEventListener("keydown", (e) => {
      if (document.getElementById("auth-modal")?.classList.contains("open")) return;
      if (document.getElementById("cm-drawer")?.classList.contains("open")) return;
      if (downloadModal.classList.contains("open") && e.key === "Escape") return closeDownloadModal();
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") showLightboxAt(currentLightboxIndex - 1);
      else if (e.key === "ArrowLeft") showLightboxAt(currentLightboxIndex + 1);
    });

    let touchStartX = 0;
    lightbox?.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    lightbox?.addEventListener("touchend", (e) => {
      if (document.getElementById("cm-drawer")?.classList.contains("open")) return;
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) showLightboxAt(diff > 0 ? currentLightboxIndex - 1 : currentLightboxIndex + 1);
    }, { passive: true });

    // مراقب ظهور البطاقات
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          cardObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    function buildCard(item, index) {
      const badgeText = item._dateInfo ? item._dateInfo.badgeText : item.year;
      const elapsedText = calculateElapsedText(item._dateInfo);
      const displaySrc = item.thumb || item.image;
      const safePhotoId = String(item._id || "").replace(/\//g, "_");

      const card = document.createElement("article");
      card.className = `photo-card ${item._id === targetId ? "highlighted" : ""}`;
      card.id = `post-${item._id}`;

      card.innerHTML = `
        <div class="photo-frame" title="اضغط لتكبير الصورة">
          <span class="year-badge">${escapeHtml(badgeText)}</span>
          ${item.blur ? `<img class="photo-blur" src="${item.blur}" alt="" aria-hidden="true">` : ""}
          <img class="photo-main" src="${displaySrc}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
          <div class="img-error-box" style="display:none;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
            <span>تعذر تحميل الصورة</span>
          </div>
        </div>
        <div class="photo-info">
          <div class="info-header">
            <div class="title-wrap">
              <h2 class="photo-title">${escapeHtml(item.title)}</h2>
              ${elapsedText ? `<span class="time-ago-sub">${escapeHtml(elapsedText)}</span>` : ""}
            </div>
            <div class="actions">
              <button type="button" class="action-btn comment-btn" data-comment-id="${escapeHtml(safePhotoId)}" title="التعليقات والذكريات" aria-label="التعليقات والذكريات">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span class="cm-count-badge" data-count-for="${escapeHtml(safePhotoId)}"></span>
              </button>
              <button type="button" class="action-btn share-btn" title="مشاركة الصورة" aria-label="مشاركة الصورة">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              </button>
              <button type="button" class="action-btn download-trigger-btn" title="تنزيل الصورة الأصلية" aria-label="تنزيل الصورة الأصلية">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
            </div>
          </div>
          <p class="photo-desc">${escapeHtml(item.desc)}</p>
        </div>
      `;

      const frame = card.querySelector(".photo-frame");
      const mainImg = card.querySelector(".photo-main");
      const errBox = card.querySelector(".img-error-box");

      const markLoaded = () => {
        mainImg.classList.add("is-loaded");
        frame.classList.add("is-loaded");
      };

      if (mainImg.complete && mainImg.naturalWidth > 0) {
        markLoaded();
      } else {
        mainImg.addEventListener("load", markLoaded, { once: true });
        mainImg.addEventListener("error", () => {
          mainImg.style.display = "none";
          errBox.style.display = "flex";
        }, { once: true });
      }

      frame.addEventListener("click", () => showLightboxAt(index));
      card.querySelector(".comment-btn").addEventListener("click", () => openCommentsFor(item));
      card.querySelector(".share-btn").addEventListener("click", () => shareItem(item));
      card.querySelector(".download-trigger-btn").addEventListener("click", () => openDownloadModal(item));

      return card;
    }

    // التحميل على دفعات
    const sentinel = document.getElementById("gallery-sentinel");
    function renderNextBatch(count = BATCH_SIZE) {
      const end = Math.min(renderedCount + count, galleryData.length);
      const frag = document.createDocumentFragment();
      for (let i = renderedCount; i < end; i++) {
        const card = buildCard(galleryData[i], i);
        frag.appendChild(card);
        cardObserver.observe(card);
      }
      container.appendChild(frag);
      renderedCount = end;

      window.ArchiveComments?.applyCounts?.();

      if (sentinel) {
        sentinel.innerHTML = renderedCount < galleryData.length
          ? `<span class="load-more-hint">جاري عرض ${renderedCount} من ${galleryData.length} صورة...</span>`
          : "";
      }
    }

    const batchObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && renderedCount < galleryData.length) {
        renderNextBatch(BATCH_SIZE);
      }
    }, { rootMargin: "400px 0px" });

    function resetAndRender(jumpToTarget = false) {
      galleryData.sort((a, b) => {
        const tA = a._dateInfo ? a._dateInfo.sortTime : 0;
        const tB = b._dateInfo ? b._dateInfo.sortTime : 0;
        return sortNewestFirst ? (tB - tA) : (tA - tB);
      });

      container.innerHTML = "";
      renderedCount = 0;

      let initialBatch = BATCH_SIZE;
      if (jumpToTarget && targetId) {
        const idx = galleryData.findIndex((x) => x._id === targetId);
        if (idx >= initialBatch) initialBatch = idx + 6;
      }

      renderNextBatch(initialBatch);
      if (sentinel) batchObserver.observe(sentinel);

      if (jumpToTarget && targetId) {
        const el = document.getElementById(`post-${targetId}`);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      }
    }

    document.getElementById("sort-toggle-btn")?.addEventListener("click", () => {
      sortNewestFirst = !sortNewestFirst;
      const label = document.getElementById("sort-label");
      if (label) label.textContent = sortNewestFirst ? "الترتيب: الأحدث أولاً" : "الترتيب: الأقدم أولاً";
      resetAndRender(false);
    });

    // جلب ملف الـ JSON
    try {
      const response = await fetch(config.dataUrl);
      if (!response.ok) throw new Error("fetch_failed");
      const result = await response.json();
      galleryData = (result.record?.gallery || []).map((item, idx) => ({
        ...item,
        _id: String(item.id || `${idx}`),
        _dateInfo: analyzeDateInput(item.year)
      }));

      if (galleryData.length > 0) {
        document.getElementById("total-memories").textContent = galleryData.length;
        const validInfos = galleryData.map((i) => i._dateInfo).filter(Boolean);
        if (validInfos.length > 0) {
          const minY = Math.min(...validInfos.map((i) => i.minYear));
          const maxY = Math.max(...validInfos.map((i) => i.maxYear));
          document.getElementById("time-span").textContent = minY === maxY ? `${minY}` : `${minY} - ${maxY}`;
        }
        document.getElementById("stats-section").style.display = "block";
      }

      resetAndRender(true);
      window.ArchiveComments?.refreshCounts?.(config.slug);
    } catch {
      container.innerHTML = `<p style="text-align:center; color:var(--mist); grid-column:1/-1;">عذراً، تعذر تحميل الأرشيف حالياً.</p>`;
    }

    // تصدير PDF
    const exportPdfBtn = document.getElementById("export-pdf-btn");
    const pdfBtnLabel = document.getElementById("pdf-btn-label");
    const pdfStage = document.getElementById("pdf-render-stage");

    exportPdfBtn?.addEventListener("click", async () => {
      if (!galleryData.length) return showToast("لا توجد صور جاهزة للتصدير حالياً");
      const originalLabel = pdfBtnLabel.textContent;
      exportPdfBtn.disabled = true;
      pdfBtnLabel.textContent = "جاري تحضير ملف الـ PDF...";

      try {
        await Promise.all([
          loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
          loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
        ]);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
        const perPage = 4;
        const cardsPagesCount = Math.ceil(galleryData.length / perPage);
        const totalPages = cardsPagesCount + 1;

        pdfBtnLabel.textContent = `تجهيز الغلاف (1 / ${totalPages})...`;
        const croppedCoverImg = await cropImageToDataUrl(config.coverUrl, 480, 540);
        const qrImg = await cropImageToDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(config.canonicalUrl)}`, 180, 180);
        const timeSpanText = document.getElementById("time-span")?.textContent || "-";

        pdfStage.innerHTML = `
          <div class="pdf-page-header"><span>أرشيف عائلة عبد الله العايدي</span><span>وثيقة أرشيفية مصوّرة</span></div>
          <div class="pdf-cover-box">
            <img class="pdf-cover-img" src="${croppedCoverImg}" alt="${escapeHtml(config.martyrName)}">
            <h1 class="pdf-cover-title">${escapeHtml(config.pdfTitle)}</h1>
            <p class="pdf-cover-sub">${escapeHtml(config.pdfSubtitle)}</p>
            <div class="pdf-cover-pills">
              <div class="pdf-cover-pill"><span>تاريخ الارتقاء</span><strong>${escapeHtml(config.martyrdomLabel)}</strong></div>
              <div class="pdf-cover-pill"><span>إجمالي الصور الموثقة</span><strong>${galleryData.length} صورة (${timeSpanText})</strong></div>
            </div>
            <div class="pdf-cover-qr"><img src="${qrImg}" alt="QR"><span>امسح الرمز لتصفح الأرشيف الرقمي المباشر</span></div>
          </div>
          <div class="pdf-page-footer"><span>صفحة 1 من ${totalPages}</span><span dir="ltr">${config.shortUrl}</span></div>
        `;

        let canvas = await html2canvas(pdfStage, { scale: 2, useCORS: true, backgroundColor: "#FAF6F0" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, 210, 297);

        for (let p = 0; p < cardsPagesCount; p++) {
          const pageNumber = p + 2;
          pdfBtnLabel.textContent = `جاري التجهيز (${pageNumber} / ${totalPages})...`;
          const pageItems = galleryData.slice(p * perPage, (p + 1) * perPage);

          const processedCards = await Promise.all(pageItems.map(async (item) => ({
            croppedImg: await cropImageToDataUrl(item.thumb || item.image, 600, 600),
            badgeText: item._dateInfo ? item._dateInfo.badgeText : item.year,
            elapsedText: calculateElapsedText(item._dateInfo),
            title: item.title || "",
            desc: item.desc || ""
          })));

          pdfStage.innerHTML = `
            <div class="pdf-page-header"><span>${escapeHtml(config.pdfTitle)}</span><span>سجل الصور والذكريات</span></div>
            <div class="pdf-cards-grid">
              ${processedCards.map((c) => `
                <div class="pdf-card">
                  <div class="pdf-card-frame"><span class="pdf-year-badge">${escapeHtml(c.badgeText)}</span><img src="${c.croppedImg}" alt=""></div>
                  <div class="pdf-card-info">
                    <div class="pdf-card-title">${escapeHtml(c.title)}</div>
                    ${c.elapsedText ? `<div class="pdf-card-elapsed">${escapeHtml(c.elapsedText)}</div>` : ""}
                    <div class="pdf-card-desc">${escapeHtml(c.desc)}</div>
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="pdf-page-footer"><span>صفحة ${pageNumber} من ${totalPages}</span><span dir="ltr">${config.shortUrl}</span></div>
          `;

          canvas = await html2canvas(pdfStage, { scale: 2, useCORS: true, backgroundColor: "#FAF6F0" });
          pdf.addPage();
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", 0, 0, 210, 297);
        }

        pdfStage.innerHTML = "";
        pdf.save(config.pdfFileName);
        pdfBtnLabel.textContent = "✓ تم تنزيل الـ PDF";
        setTimeout(() => { pdfBtnLabel.textContent = originalLabel; exportPdfBtn.disabled = false; }, 2500);
      } catch (err) {
        console.error("PDF Export Error:", err);
        pdfBtnLabel.textContent = "تعذر التصدير، حاول مجدداً";
        setTimeout(() => { pdfBtnLabel.textContent = originalLabel; exportPdfBtn.disabled = false; }, 2500);
      }
    });

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  });
})();
