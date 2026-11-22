document.addEventListener("DOMContentLoaded", () => {
  const API = window.API_BASE || "https://archive-aph.onrender.com";
  const TOKEN_KEY = "archive_admin_jwt";

  const loginSection = document.getElementById("login-section");
  const panelSection = document.getElementById("panel-section");
  const branchBadge = document.getElementById("branch-badge");
  const logoutBtn = document.getElementById("logout-btn");

  const yearSelect = document.getElementById("year-select");
  let yearsHtml = "";
  for (let y = 2026; y >= 1970; y--) yearsHtml += `<option value="${y}">${y}</option>`;
  yearsHtml += `<option value="custom">كتابة سنة/تاريخ مخصص (مثال: 2014-05-10)...</option>`;
  yearSelect.innerHTML = yearsHtml;

  window.toggleCustomInput = (selectId, inputId) => {
    const isCustom = document.getElementById(selectId).value === "custom";
    const input = document.getElementById(inputId);
    input.style.display = isCustom ? "block" : "none";
    input.required = isCustom;
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveAssetUrl(path) {
    if (!path) return "";
    if (/^(https?:|data:|\/)/i.test(path)) return path;
    return "/" + String(path).replace(/^(\.\.\/)+/, "");
  }

  function attachThumbWithFallback(imgEl, item) {
    const sources = [
      resolveAssetUrl(item.thumb),
      resolveAssetUrl(item.view),
      resolveAssetUrl(item.image),
      item.blur || "",
    ].filter(Boolean);

    let idx = 0;
    imgEl.onerror = () => {
      idx += 1;
      if (idx < sources.length) {
        imgEl.src = sources[idx];
      } else {
        imgEl.onerror = null;
      }
    };
    imgEl.src = sources[0] || "";
  }

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
  function setLoggedIn(state, branch = "") {
    loginSection.classList.toggle("hidden", state);
    panelSection.classList.toggle("hidden", !state);
    logoutBtn.classList.toggle("hidden", !state);
    if (branch) branchBadge.textContent = `branch: ${branch}`;
  }

  if (getToken()) {
    setLoggedIn(true);
    fetch(`${API}/api/health`).then(r => r.json()).then(d => {
      if (d.branch) branchBadge.textContent = `branch: ${d.branch}`;
    }).catch(() => {});
  }

  // 1. تسجيل دخول الإدارة
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("login-status");
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    status.textContent = "جاري التحقق...";
    status.className = "status-msg";

    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.getElementById("admin-password").value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "فشل تسجيل الدخول");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      document.getElementById("admin-password").value = "";
      setLoggedIn(true, data.branch);
    } catch (err) {
      status.textContent = err.message || "تعذر الاتصال بالسيرفر";
      status.className = "status-msg err";
    } finally {
      btn.disabled = false;
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setLoggedIn(false);
  });

  // 2. معاينة الصورة المختارة
  const dropzone = document.getElementById("dropzone");
  const photoInput = document.getElementById("photo-file");
  const previewBox = document.getElementById("preview-box");
  const previewImg = document.getElementById("preview-img");
  const previewMeta = document.getElementById("preview-meta");

  dropzone.addEventListener("click", () => photoInput.click());
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      photoInput.files = e.dataTransfer.files;
      showPreview(e.dataTransfer.files[0]);
    }
  });
  photoInput.addEventListener("change", () => {
    if (photoInput.files[0]) showPreview(photoInput.files[0]);
  });

  function showPreview(file) {
    previewImg.src = URL.createObjectURL(file);
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    previewMeta.textContent = `${file.name} (${mb} MB)`;
    previewBox.classList.add("show");
  }

  // 3. رفع الصورة وتوليد الجودات وتحديث JSON بضغطة واحدة
  document.getElementById("admin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = photoInput.files[0];
    const status = document.getElementById("status");
    const btn = document.getElementById("submit-btn");

    if (!file) {
      status.textContent = "يرجى اختيار صورة أولاً";
      status.className = "status-msg err";
      return;
    }

    const slug = document.getElementById("target-archive").value;
    const year = yearSelect.value === "custom" ? document.getElementById("custom-year").value : yearSelect.value;
    const titleEl = document.getElementById("title-select");
    const title = titleEl.value === "custom" ? document.getElementById("custom-title").value : titleEl.value;
    const descEl = document.getElementById("desc-select");
    const desc = descEl.value === "custom" ? document.getElementById("custom-desc").value : descEl.value;

    const fd = new FormData();
    fd.append("slug", slug);
    fd.append("year", year);
    fd.append("title", title);
    fd.append("desc", desc);
    fd.append("photo", file);

    btn.disabled = true;
    btn.textContent = "جاري الضغط والرفع إلى GitHub...";
    status.textContent = "يتم توليد الـ 3 جودات وتحديث الـ JSON بـ Commit واحد...";
    status.className = "status-msg";

    try {
      const res = await fetch(`${API}/api/admin/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setLoggedIn(false); }
      if (!res.ok) throw new Error(data.detail || "فشل النشر");

      status.textContent = "✓ تم رفع الصورة بجميع جوداتها وتحديث الأرشيف بنجاح!";
      status.className = "status-msg ok";
      photoInput.value = "";
      previewBox.classList.remove("show");
    } catch (err) {
      status.textContent = err.message || "حدث خطأ أثناء الرفع";
      status.className = "status-msg err";
    } finally {
      btn.disabled = false;
      btn.textContent = "ضغط ورفع ونشر المنشور";
    }
  });

  // 4. نافذة تعديل المنشور
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const editThumb = document.getElementById("edit-thumb");
  const editPostIdEl = document.getElementById("edit-post-id");
  const editYearInput = document.getElementById("edit-year");
  const editTitleInput = document.getElementById("edit-title");
  const editDescInput = document.getElementById("edit-desc");
  const editSaveBtn = document.getElementById("edit-save-btn");
  const editStatus = document.getElementById("edit-status");

  let editingContext = null;

  function openEditModal(slug, item, cardEl) {
    editingContext = { slug, item, cardEl };
    attachThumbWithFallback(editThumb, item);
    editPostIdEl.textContent = `ID: ${item.id || "-"}`;
    editYearInput.value = item.year || "";
    editTitleInput.value = item.title || "";
    editDescInput.value = item.desc || "";
    editStatus.textContent = "";
    editStatus.className = "status-msg";
    editModal.classList.add("open");
    editModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeEditModal() {
    editModal.classList.remove("open");
    editModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    editingContext = null;
  }

  document.getElementById("edit-close-btn").addEventListener("click", closeEditModal);
  document.getElementById("edit-cancel-btn").addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editModal.classList.contains("open")) closeEditModal();
  });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editingContext) return;

    const { slug, item, cardEl } = editingContext;
    const year = editYearInput.value.trim();
    const title = editTitleInput.value.trim();
    const desc = editDescInput.value.trim();

    if (!year || !title) {
      editStatus.textContent = "يرجى إدخال التاريخ والعنوان";
      editStatus.className = "status-msg err";
      return;
    }

    editSaveBtn.disabled = true;
    editSaveBtn.textContent = "جاري الحفظ في GitHub...";
    editStatus.textContent = "يتم تحديث ملف الأرشيف دون المساس بالتعليقات...";
    editStatus.className = "status-msg";

    try {
      const res = await fetch(
        `${API}/api/admin/posts/${encodeURIComponent(slug)}/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ year, title, desc }),
        }
      );
      const data = await res.json();
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        closeEditModal();
        setLoggedIn(false);
        return;
      }
      if (!res.ok) throw new Error(data.detail || "فشل حفظ التعديلات");

      // تحديث البيانات في الذاكرة والصفحة مباشرة
      item.year = data.item?.year ?? year;
      item.title = data.item?.title ?? title;
      item.desc = data.item?.desc ?? desc;

      cardEl.querySelector(".post-title").textContent = item.title || "بدون عنوان";
      cardEl.querySelector(".post-meta").textContent = `${item.year || ""} • ID: ${item.id || "-"}`;
      cardEl.querySelector(".post-desc-preview").textContent = item.desc || "";

      delStatus.textContent = `✓ تم تحديث "${item.title}" على GitHub بنجاح`;
      delStatus.className = "status-msg ok";
      closeEditModal();
    } catch (err) {
      editStatus.textContent = err.message || "تعذر حفظ التعديلات";
      editStatus.className = "status-msg err";
    } finally {
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = "حفظ التعديلات";
    }
  });

  // 5. عرض وتعديل وحذف المنشورات
  const loadBtn = document.getElementById("load-posts-btn");
  const postsList = document.getElementById("posts-list");
  const delStatus = document.getElementById("delete-status");

  loadBtn.addEventListener("click", async () => {
    const loadedSlug = document.getElementById("target-archive").value;
    postsList.innerHTML = `<p class="sub">جاري جلب المنشورات...</p>`;
    delStatus.textContent = "";

    try {
      const res = await fetch(`${API}/api/admin/posts/${loadedSlug}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setLoggedIn(false); return; }
      if (!res.ok) throw new Error(data.detail || "فشل جلب المنشورات");

      if (!data.posts.length) {
        postsList.innerHTML = `<p class="sub">لا توجد منشورات حالياً.</p>`;
        return;
      }

      postsList.innerHTML = "";
      data.posts.forEach((item) => {
        const div = document.createElement("div");
        div.className = "post-item";
        div.innerHTML = `
          <div class="post-left">
            <img class="post-thumb" alt="" loading="lazy">
            <div class="post-info-col">
              <div class="post-title">${escapeHtml(item.title || "بدون عنوان")}</div>
              <div class="post-meta">${escapeHtml(item.year || "")} • ID: ${escapeHtml(item.id || "-")}</div>
              <div class="post-desc-preview">${escapeHtml(item.desc || "")}</div>
            </div>
          </div>
          <div class="post-actions">
            <button type="button" class="btn-edit">تعديل</button>
            <button type="button" class="btn-delete">حذف</button>
          </div>
        `;

        attachThumbWithFallback(div.querySelector(".post-thumb"), item);

        div.querySelector(".btn-edit").addEventListener("click", () => {
          openEditModal(loadedSlug, item, div);
        });

        div.querySelector(".btn-delete").addEventListener("click", async () => {
          if (!confirm(`حذف "${item.title}"؟`)) return;
          delStatus.textContent = "جاري الحذف من GitHub...";
          delStatus.className = "status-msg";
          try {
            const dRes = await fetch(
              `${API}/api/admin/posts/${encodeURIComponent(loadedSlug)}/${encodeURIComponent(item.id)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` },
              }
            );
            if (!dRes.ok) throw new Error("فشل الحذف");
            delStatus.textContent = "✓ تم الحذف بنجاح";
            delStatus.className = "status-msg ok";
            div.remove();
          } catch (err) {
            delStatus.textContent = err.message;
            delStatus.className = "status-msg err";
          }
        });

        postsList.appendChild(div);
      });
    } catch (err) {
      postsList.innerHTML = "";
      delStatus.textContent = err.message;
      delStatus.className = "status-msg err";
    }
  });
});
