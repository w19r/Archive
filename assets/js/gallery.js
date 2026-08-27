
document.addEventListener("DOMContentLoaded", () => {
    

    const container = document.getElementById("gallery-container");
    

    if (!container || typeof galleryData === 'undefined') {
        console.error("البيانات أو الحاوية مفقودة.");
        return;
    }


    galleryData.sort((a, b) => parseInt(a.year) - parseInt(b.year));


    galleryData.forEach(item => {
        // إنشاء عنصر البطاقة
        const card = document.createElement("article");
        card.className = "photo-card";

        // حقن كود HTML داخل البطاقة مع متغيرات البيانات
        card.innerHTML = `
            <div class="photo-frame">
                <span class="year-badge">${item.year}</span>
                <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async">
            </div>
            <div class="photo-info">
                <h2 class="photo-title">${item.title}</h2>
                <p class="photo-desc">${item.desc}</p>
            </div>
        `;

        // إضافة البطاقة إلى الحاوية الرئيسية في الصفحة
        container.appendChild(card);
    });
});
