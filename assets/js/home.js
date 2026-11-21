document.addEventListener("DOMContentLoaded", () => {
  // 1. إخفاء شاشة البداية
  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => splash.classList.add("fade-out"), 1100);
  }

  // 2. زر الإشعارات البيضاوي (OneSignal)
  const notifyPill = document.getElementById("notify-pill-banner");
  const notifyPillText = document.getElementById("notify-pill-text");
  const notifyPillActions = document.getElementById("notify-pill-actions");
  const acceptNotifyBtn = document.getElementById("accept-notify-btn");
  const rejectNotifyBtn = document.getElementById("reject-notify-btn");

  acceptNotifyBtn?.addEventListener("click", async () => {
    if (notifyPillText) notifyPillText.innerText = "جاري تسجيل الجهاز في الإشعارات...";
    if (notifyPillActions) notifyPillActions.style.display = "none";

    try {
      if (window.OneSignal) {
        await window.OneSignal.Notifications.requestPermission();
        await window.OneSignal.User.PushSubscription.optIn();
      }
      if (notifyPillText) notifyPillText.innerText = "✓ تم تفعيل الإشعارات بنجاح!";
      localStorage.setItem("hideArchivePill_v2", "true");
      setTimeout(() => notifyPill?.classList.remove("show"), 1500);
    } catch (err) {
      console.warn("OneSignal Subscribe Error:", err);
      notifyPill?.classList.remove("show");
    }
  });

  rejectNotifyBtn?.addEventListener("click", () => {
    notifyPill?.classList.remove("show");
    localStorage.setItem("hideArchivePill_v2", "true");
  });

  // 3. درج (حول مشروع الأرشيف)
  const aboutBtn = document.getElementById("aboutToggleBtn");
  const aboutDrawer = document.getElementById("aboutDrawer");
  aboutBtn?.addEventListener("click", () => {
    const isOpen = aboutDrawer.classList.toggle("open");
    aboutBtn.classList.toggle("active", isOpen);
    aboutBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.getElementById("goToFormLink")?.addEventListener("click", () => {
    setTimeout(() => document.getElementById("contributor-name")?.focus(), 500);
  });

  // 4. نموذج المساهمة
  const form = document.getElementById("my-contact-form");
  const status = document.getElementById("form-status");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = form.querySelector(".btn-submit");
    const originalBtnText = btn.innerText;
    btn.innerText = "جاري الإرسال...";

    try {
      const response = await fetch(event.target.action, {
        method: form.method,
        body: new FormData(event.target),
        headers: { Accept: "application/json" }
      });
      if (response.ok) {
        status.innerHTML = "شكرًا لك! تم إرسال رسالتك بنجاح.";
        status.style.color = "var(--sand-deep)";
        form.reset();
      } else {
        status.innerHTML = "عذراً، حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.";
        status.style.color = "#d9534f";
      }
    } catch {
      status.innerHTML = "حدث خطأ في الاتصال، تأكد من جودة الإنترنت.";
      status.style.color = "#d9534f";
    }
    btn.innerText = originalBtnText;
    setTimeout(() => { status.innerHTML = ""; }, 5000);
  });

  // 5. شريط تحديث PWA
  let swRegistration = null;
  let newWorker = null;
  const updateBanner = document.getElementById("update-banner");
  const refreshBtn = document.getElementById("refresh-app-btn");

  function showUpdateBar() {
    if (sessionStorage.getItem("justUpdatedArchive") === "true") {
      sessionStorage.removeItem("justUpdatedArchive");
      return;
    }
    updateBanner?.classList.add("show");
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      setTimeout(async () => {
        try {
          swRegistration = await navigator.serviceWorker.getRegistration();
          if (!swRegistration) swRegistration = await navigator.serviceWorker.register("/sw.js");
          if (swRegistration.waiting && navigator.serviceWorker.controller) {
            newWorker = swRegistration.waiting;
            showUpdateBar();
          }
          swRegistration.addEventListener("updatefound", () => {
            newWorker = swRegistration.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) showUpdateBar();
            });
          });
        } catch (err) {
          console.warn("SW check note:", err);
        }
      }, 2500);
    });

    refreshBtn?.addEventListener("click", async () => {
      refreshBtn.innerText = "جاري التحديث...";
      updateBanner?.classList.remove("show");
      sessionStorage.setItem("justUpdatedArchive", "true");
      try {
        const workerToActivate = swRegistration?.waiting || newWorker;
        if (workerToActivate) workerToActivate.postMessage({ action: "skipWaiting" });
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.filter((n) => n.startsWith("alaydi-core")).map((n) => caches.delete(n)));
        }
      } catch {}
      setTimeout(() => window.location.reload(), 300);
    });
  }
});