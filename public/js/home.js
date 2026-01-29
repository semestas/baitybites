/**
 * Baitybites Home Page Logic
 * Optimized for production: 
 * - IntersectionObserver for animations
 * - Centralized UI helpers via window.app
 */

function showTestimonyForm() {
    const userStr = localStorage.getItem('user');
    const nameInputWrapper = document.getElementById('nameInputWrapper');
    const loggedInUserDisplay = document.getElementById('loggedInUserDisplay');
    const testNameInput = document.getElementById('testName');
    const currentUserNameSpan = document.getElementById('currentUserName');
    const modalUserAvatar = document.getElementById('modalUserAvatar');
    const aliasHint = document.getElementById('aliasHint');

    if (userStr) {
        // Logged In
        const user = JSON.parse(userStr);
        nameInputWrapper.style.display = 'none';
        loggedInUserDisplay.style.display = 'flex';
        currentUserNameSpan.textContent = user.name;
        if (modalUserAvatar) {
            modalUserAvatar.src = user.avatar_url || '/assets/avatar-1.png';
            modalUserAvatar.alt = user.name;
        }
        aliasHint.style.display = 'block';
        testNameInput.value = user.name;
        testNameInput.removeAttribute('required');
    } else {
        // Guest
        nameInputWrapper.style.display = 'block';
        loggedInUserDisplay.style.display = 'none';
        aliasHint.style.display = 'none';
        testNameInput.value = '';
        testNameInput.setAttribute('required', 'true');
    }

    document.getElementById('testimonyModal').style.display = 'flex';
}

function enableAliasMode() {
    document.getElementById('loggedInUserDisplay').style.display = 'none';
    document.getElementById('nameInputWrapper').style.display = 'block';
    document.getElementById('aliasHint').style.display = 'none';
    const testNameInput = document.getElementById('testName');
    testNameInput.focus();
    testNameInput.select();
    testNameInput.setAttribute('required', 'true');
}

function hideTestimonyForm() {
    document.getElementById('testimonyModal').style.display = 'none';
}

async function loadContent() {
    const { apiCall, renderRatingStars, formatRelativeDate } = window.app;

    try {
        // 1. Load Gallery
        const galContainer = document.getElementById('gallery-container');
        const widgetRes = await apiCall('/public/instagram-widget').catch(() => ({ success: false }));

        if (widgetRes.success && widgetRes.data) {
            galContainer.innerHTML = '';
            const tempDiv = document.createElement('div');
            tempDiv.style.width = '100%';
            tempDiv.style.gridColumn = '1 / -1';
            tempDiv.innerHTML = widgetRes.data;

            // Execute scripts
            tempDiv.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            galContainer.appendChild(tempDiv);
        } else {
            const galJson = await apiCall('/public/gallery');
            if (galJson.success) {
                galContainer.innerHTML = galJson.data.map(item => `
                    <div class="gallery-item">
                        <img src="${item.image_url}" alt="${item.title || 'Galeri Baitybites'}">
                    </div>
                `).join('');
            }
        }

        // 2. Load Testimonials
        const testJson = await apiCall('/public/testimonials');
        const testContainer = document.getElementById('testimony-container');
        if (testJson.success) {
            testContainer.innerHTML = testJson.data.map(t => `
                <div class="testimony-card">
                    <div class="testimony-rating">${renderRatingStars(t.rating)}</div>
                    <p class="quote">"${t.content}"</p>
                    <div class="user-info">
                        <img src="${t.avatar_url || '/assets/avatar-1.png'}" alt="${t.name}">
                        <div>
                            <h4>
                                ${t.name}
                                ${t.role === 'Verified Customer' ? '<span class="verified-badge"><i data-lucide="check-circle" size="14"></i></span>' : ''}
                            </h4>
                            <div class="user-meta">
                                <span class="role">${t.role || 'Pelanggan'}</span>
                                <span class="dot">•</span>
                                <span class="date">${formatRelativeDate(t.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            if (window.app && window.app.initIcons) window.app.initIcons();
        }
    } catch (e) {
        console.error('Failed to load home content:', e);
    }
}

// Sparkle Animation Optimization (CPU/Battery Efficiency)
let sparkleInterval = null;
const observer = new IntersectionObserver((entries) => {
    const isVisible = entries[0].isIntersecting;
    if (isVisible && !sparkleInterval) {
        sparkleInterval = setInterval(autoSparkle, 1500);
    } else if (!isVisible && sparkleInterval) {
        clearInterval(sparkleInterval);
        sparkleInterval = null;
    }
}, { threshold: 0.1 });

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    const size = Math.random() * 8 + 4;
    sparkle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${['#f59638', '#fff', '#ec6817'][Math.floor(Math.random() * 3)]};
        box-shadow: 0 0 10px currentColor;
    `;
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 800);
}

function autoSparkle() {
    const content = document.querySelector('.hero-content');
    if (content) {
        const rect = content.getBoundingClientRect();
        createSparkle(
            rect.left + Math.random() * rect.width,
            rect.top + Math.random() * rect.height
        );
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadContent();

    const heroBtn = document.querySelector('.cta-button');
    if (heroBtn) {
        heroBtn.addEventListener('mousemove', (e) => {
            if (Math.random() > 0.8) createSparkle(e.clientX, e.clientY);
        });
    }

    const hero = document.querySelector('.hero-section');
    if (hero) observer.observe(hero);

    const testForm = document.getElementById('testimonyForm');
    if (testForm) {
        testForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { apiCall, showNotification } = window.app;
            const user = JSON.parse(localStorage.getItem('user') || 'null');

            const payload = {
                name: document.getElementById('testName').value,
                content: document.getElementById('testContent').value,
                rating: parseInt(document.querySelector('input[name="rating"]:checked')?.value || 5),
                avatar_url: user?.avatar_url || null,
                role: user?.is_google ? 'Verified Customer' : 'Pelanggan'
            };

            try {
                const result = await apiCall('/customer/testimony', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (result.success) {
                    showNotification('Terima kasih! Testimoni Anda sedang dimoderasi.', 'success');
                    hideTestimonyForm();
                }
            } catch (error) {
                console.error('Testimony submit error:', error);
            }
        });
    }
});
