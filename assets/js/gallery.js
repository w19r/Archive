document.addEventListener("DOMContentLoaded", () => {
    
    const container = document.getElementById("gallery-container");
    
    if (!container || typeof galleryData === 'undefined') {
        console.error("البيانات أو الحاوية مفقودة.");
        return;
    }

    galleryData.sort((a, b) => parseInt(a.year) - parseInt(b.year));

    galleryData.forEach(item => {
        const card = document.createElement("article");
        card.className = "photo-card";


        card.innerHTML = `
            <div class="photo-frame">
                <span class="year-badge">${item.year}</span>
                <img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async">
            </div>
            <div class="photo-info">
                <div class="info-header">
                    <h2 class="photo-title">${item.title}</h2>
                    <a href="${item.image}" download class="download-btn" title="تنزيل الصورة">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </a>
                </div>
                <p class="photo-desc">${item.desc}</p>
            </div>
        `;

        container.appendChild(card);
    });
});
