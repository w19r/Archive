(() => {
  const API = "https://archive-aph.onrender.com";
  const USER_TOKEN_KEY = "archive_user_jwt";
  const USER_DATA_KEY = "archive_user_info";
  const ADMIN_TOKEN_KEY = "archive_admin_jwt";

  let currentSlug = null;
  let currentPhotoId = null;
  let currentTitle = "";
  let authMode = "login"; // "login" | "register"
  let countsCache = {};
  let countsLoadedForSlug = null;
  let countsRequestInFlight = null;

  function detectSlug() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes("abdulmajeed")) return "abdulmajeed";
    if (p.includes("mohammed")) return "mohammed";
    return null;
  }

  function normalizePhotoId(photoId) {
    return String(photoId || "").replace(/\//g, "_");
  }

  function getToken() {
    return localStorage.getItem(USER_TOKEN_KEY);
  }

  function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    syncUI();
  }

  function clearSession() {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    syncUI();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(raw) {
    if (!raw) return "";
    const normalized = String(raw).includes("T") ? raw : String(raw).replace(" ", "T") + "Z";
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function setBadgeElement(el, count) {
    const num = Number(count || 0);
    if (num > 0) {
      el.textContent = num;
      el.classList.add("has-comments");
    } else {
      el.textContent = "";
      el.classList.remove("has-comments");
    }
  }

  function updatePhotoBadge(photoId, count) {
    const safeId = normalizePhotoId(photoId);
    const num = Number(count || 0);
    countsCache[safeId] = num;
    document.querySelectorAll("[data-count-for]").forEach((el) => {
      if (el.dataset.countFor === safeId) {
        setBadgeElement(el, num);
      }
    });
  }

  function applyCounts() {
    document.querySelectorAll("[data-count-for]").forEach((el) => {
      const id = el.dataset.countFor;
      setBadgeElement(el, countsCache[id] || 0);
    });
  }

  async function refreshCounts(slugOverride, force = false) {
    const slug = slugOverride || detectSlug();
    if (!slug) return;

    if (!force && countsLoadedForSlug === slug) {
      applyCounts();
      return;
    }

    if (countsRequestInFlight && !force) {
      await countsRequestInFlight;
      applyCounts();
      return;
    }

    countsRequestInFlight = (async () => {
      try {
        const res = await fetch(`${API}/api/comment-counts/${encodeURIComponent(slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        countsCache = data.counts || {};
        countsLoadedForSlug = slug;
        applyCounts();
      } catch {}
    })();

    await countsRequestInFlight;
    countsRequestInFlight = null;
  }

  // حقن درج التعليقات ونافذة الدخول فقط (بدون زر عائم)
  function mountUI() {
    if (document.getElementById("cm-drawer")) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="cm-backdrop" class="cm-backdrop"></div>

      <aside id="cm-drawer" class="cm-drawer" aria-hidden="true">
        <div class="cm-header">
          <div class="cm-header-info">
            <h3>التعليقات والذكريات</h3>
            <p id="cm-photo-title">—</p>
          </div>
          <button type="button" id="cm-close" class="cm-close" aria-label="إغلاق">×</button>
        </div>

        <div id="cm-user-bar" class="cm-user-bar"></div>

        <div id="cm-list" class="cm-list">
          <p class="cm-empty">جاري تحميل التعليقات...</p>
        </div>

        <div id="cm-footer" class="cm-footer">
          <form id="cm-form" class="cm-form auth-hidden">
            <textarea id="cm-input" placeholder="اكتب ذكرى أو دعاء أو تعليقاً على هذه الصورة..." minlength="2" maxlength="1000" required></textarea>
            <button type="submit" id="cm-submit" class="cm-btn">إرسال التعليق</button>
            <p id="cm-status" class="cm-status"></p>
          </form>
          <div id="cm-login-prompt">
            <button type="button" id="cm-open-auth-btn" class="cm-btn">سجّل دخولك أو أنشئ حساباً لإضافة تعليق</button>
          </div>
        </div>
      </aside>

      <div id="auth-modal" class="auth-modal" aria-hidden="true">
        <div class="auth-card">
          <div class="auth-card-head">
            <h3 id="auth-modal-title">تسجيل الدخول للتعليق</h3>
            <button type="button" id="auth-close" class="cm-close" aria-label="إغلاق">×</button>
          </div>

          <div class="auth-tabs">
            <button type="button" class="auth-tab active" data-mode="login">تسجيل الدخول</button>
            <button type="button" class="auth-tab" data-mode="register">حساب جديد</button>
          </div>

          <form id="auth-form">
            <div class="auth-field auth-hidden" id="auth-name-wrap">
              <label for="auth-name">الاسم الكامل</label>
              <input type="text" id="auth-name" placeholder="مثال: عبد الله العايدي" minlength="2" maxlength="60">
            </div>

            <div class="auth-field">
              <label for="auth-email">البريد الإلكتروني</label>
              <input type="email" id="auth-email" placeholder="name@example.com" required>
            </div>

            <div class="auth-field">
              <label for="auth-password">كلمة المرور</label>
              <input type="password" id="auth-password" placeholder="6 أحرف على الأقل" minlength="6" required>
            </div>

            <button type="submit" id="auth-submit" class="cm-btn">دخول</button>
            <p id="auth-status" class="cm-status"></p>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
    bindEvents();
    syncUI();
  }

  function syncUI() {
    const user = getUser();
    const token = getToken();
    const loggedIn = Boolean(user && token);

    const userBar = document.getElementById("cm-user-bar");
    const cmForm = document.getElementById("cm-form");
    const loginPrompt = document.getElementById("cm-login-prompt");

    if (userBar && cmForm && loginPrompt) {
      if (loggedIn) {
        userBar.innerHTML = `
          <span>تعلّق باسم: <strong>${escapeHtml(user.name)}</strong></span>
          <button type="button" id="cm-logout-btn" class="cm-link-btn">تسجيل خروج</button>
        `;
        document.getElementById("cm-logout-btn").addEventListener("click", () => {
          clearSession();
          if (currentPhotoId) loadComments();
        });
        cmForm.classList.remove("auth-hidden");
        loginPrompt.classList.add("auth-hidden");
      } else {
        userBar.innerHTML = `
          <span>يلزم تسجيل الدخول لإضافة تعليق</span>
          <button type="button" id="cm-bar-login" class="cm-link-btn">تسجيل دخول</button>
        `;
        document.getElementById("cm-bar-login").addEventListener("click", () => openAuthModal("login"));
        cmForm.classList.add("auth-hidden");
        loginPrompt.classList.remove("auth-hidden");
      }
    }
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isReg = mode === "register";
    document.getElementById("auth-modal-title").textContent = isReg
      ? "إنشاء حساب جديد للتعليق"
      : "تسجيل الدخول للتعليق";
    document.getElementById("auth-submit").textContent = isReg ? "إنشاء الحساب" : "دخول";
    const nameWrap = document.getElementById("auth-name-wrap");
    const nameInput = document.getElementById("auth-name");
    nameWrap.classList.toggle("auth-hidden", !isReg);
    nameInput.required = isReg;

    document.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    const st = document.getElementById("auth-status");
    st.textContent = "";
    st.className = "cm-status";
  }

  function openAuthModal(mode = "login") {
    setAuthMode(mode);
    const modal = document.getElementById("auth-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function closeDrawer() {
    document.getElementById("cm-drawer").classList.remove("open");
    document.getElementById("cm-backdrop").classList.remove("open");
    document.getElementById("cm-drawer").setAttribute("aria-hidden", "true");
  }

  async function openDrawer(slug, photoId, photoTitle = "") {
    mountUI();
    currentSlug = slug || detectSlug();
    currentPhotoId = normalizePhotoId(photoId);
    currentTitle = photoTitle || "صورة من الأرشيف";

    document.getElementById("cm-photo-title").textContent = currentTitle;
    document.getElementById("cm-status").textContent = "";
    document.getElementById("cm-drawer").classList.add("open");
    document.getElementById("cm-backdrop").classList.add("open");
    document.getElementById("cm-drawer").setAttribute("aria-hidden", "false");

    await loadComments();
  }

  async function loadComments() {
    const list = document.getElementById("cm-list");
    list.innerHTML = `<p class="cm-empty">جاري تحميل التعليقات...</p>`;

    try {
      const res = await fetch(
        `${API}/api/comments/${encodeURIComponent(currentSlug)}/${encodeURIComponent(currentPhotoId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "تعذر تحميل التعليقات");

      renderComments(data.comments || []);
    } catch (err) {
      list.innerHTML = `<p class="cm-empty" style="color:#b91c1c;">${escapeHtml(err.message || "تعذر الاتصال بالسيرفر")}</p>`;
    }
  }

  function renderComments(comments) {
    if (currentPhotoId) updatePhotoBadge(currentPhotoId, comments.length);

    const list = document.getElementById("cm-list");
    if (!comments.length) {
      list.innerHTML = `<p class="cm-empty">لا توجد تعليقات على هذه الصورة بعد. كن أول من يشارك ذكرى أو دعاء.</p>`;
      return;
    }

    const user = getUser();
    const hasAdmin = Boolean(getAdminToken());
    list.innerHTML = "";

    comments.forEach((c) => {
      const isOwner = user && String(user.id) === String(c.user_id);
      const canDelete = isOwner || hasAdmin;

      const card = document.createElement("div");
      card.className = "cm-item";
      card.innerHTML = `
        <div class="cm-item-top">
          <span class="cm-author">${escapeHtml(c.user_name)}</span>
          <div class="cm-meta">
            <span>${escapeHtml(formatDate(c.created_at))}</span>
            ${canDelete ? `<button type="button" class="cm-del-btn">حذف</button>` : ""}
          </div>
        </div>
        <p class="cm-body">${escapeHtml(c.content)}</p>
      `;

      if (canDelete) {
        card.querySelector(".cm-del-btn").addEventListener("click", async () => {
          if (!confirm("هل تريد حذف هذا التعليق؟")) return;
          const tokenToUse = isOwner ? getToken() : getAdminToken();
          try {
            const res = await fetch(`${API}/api/comments/${c.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${tokenToUse}` },
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.detail || "فشل حذف التعليق");
            card.remove();
            const remaining = list.querySelectorAll(".cm-item").length;
            updatePhotoBadge(currentPhotoId, remaining);
            if (!remaining) renderComments([]);
          } catch (err) {
            alert(err.message || "تعذر حذف التعليق");
          }
        });
      }

      list.appendChild(card);
    });
  }

  function bindEvents() {
    document.getElementById("cm-close").addEventListener("click", closeDrawer);
    document.getElementById("cm-backdrop").addEventListener("click", closeDrawer);
    document.getElementById("cm-open-auth-btn").addEventListener("click", () => openAuthModal("login"));
    document.getElementById("auth-close").addEventListener("click", closeAuthModal);

    document.getElementById("auth-modal").addEventListener("click", (e) => {
      if (e.target.id === "auth-modal") closeAuthModal();
    });

    document.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.addEventListener("click", () => setAuthMode(btn.dataset.mode));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (document.getElementById("auth-modal").classList.contains("open")) {
        e.stopPropagation();
        closeAuthModal();
      } else if (document.getElementById("cm-drawer").classList.contains("open")) {
        e.stopPropagation();
        closeDrawer();
      }
    });

    // إرسال نموذج تسجيل الدخول أو الحساب الجديد
    document.getElementById("auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("auth-status");
      const btn = document.getElementById("auth-submit");
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      const name = document.getElementById("auth-name").value.trim();

      btn.disabled = true;
      status.textContent = "جاري الاتصال بالسيرفر...";
      status.className = "cm-status";

      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = authMode === "register" ? { name, email, password } : { email, password };

      try {
        const res = await fetch(`${API}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "تعذر إتمام العملية");

        saveSession(data.token, data.user);
        e.target.reset();
        closeAuthModal();
        if (currentPhotoId) loadComments();
      } catch (err) {
        status.textContent = err.message || "حدث خطأ غير متوقع";
        status.className = "cm-status err";
      } finally {
        btn.disabled = false;
      }
    });

    // إرسال تعليق جديد (يطلب تسجيل الدخول إذا لم يكن مسجلاً)
    document.getElementById("cm-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!getToken() || !getUser()) {
        openAuthModal("login");
        return;
      }

      const input = document.getElementById("cm-input");
      const status = document.getElementById("cm-status");
      const btn = document.getElementById("cm-submit");
      const content = input.value.trim();

      if (content.length < 2) {
        status.textContent = "يرجى كتابة تعليق من حرفين على الأقل";
        status.className = "cm-status err";
        return;
      }

      btn.disabled = true;
      status.textContent = "جاري النشر...";
      status.className = "cm-status";

      try {
        const res = await fetch(
          `${API}/api/comments/${encodeURIComponent(currentSlug)}/${encodeURIComponent(currentPhotoId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (res.status === 401) {
          clearSession();
          openAuthModal("login");
          throw new Error("يرجى تسجيل الدخول أولاً لإضافة تعليق");
        }
        if (!res.ok) throw new Error(data.detail || "فشل إرسال التعليق");

        input.value = "";
        status.textContent = "✓ تم نشر تعليقك";
        status.className = "cm-status ok";
        await loadComments();
      } catch (err) {
        status.textContent = err.message || "تعذر نشر التعليق";
        status.className = "cm-status err";
      } finally {
        btn.disabled = false;
      }
    });
  }

  // إتاحة الدوال لملف gallery.js
  window.ArchiveComments = {
    open: openDrawer,
    openAuth: openAuthModal,
    close: closeDrawer,
    refreshCounts,
    applyCounts,
  };

  document.addEventListener("DOMContentLoaded", () => {
    mountUI();
    if (detectSlug()) {
      refreshCounts();
    } else {
      fetch(`${API}/api/health`).catch(() => {});
    }
  });
})();
