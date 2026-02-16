// Global API configuration
const API_BASE = '/api';

// --- Production Protection: Silence console.log in non-local environments ---
(function silenceLogs() {
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
    if (!isLocal) {
        const noop = () => { };
        // Keep error and warn for troubleshooting, but silence log and debug
        console.log = noop;
        console.debug = noop;
        console.info = noop;
        // console.warn = noop; // Keep warnings for now

        // Optional: Protect sensitive objects
        window.console.clear();
        console.log("%cBaitybites Production Mode Active", "color: #f59638; font-size: 20px; font-weight: bold;");
        console.log("Logs are silenced for security.");
    }
})();

// Register/Unregister Service Worker for PWA - Only for Management Tools (Kitchen & Dashboard)
if ('serviceWorker' in navigator) {
    const isStation = window.location.pathname.includes('kitchen') || window.location.pathname.includes('dashboard');
    if (isStation) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .catch(err => console.error('SW failed', err));
        });
    } else {
        // Clean up SW on public pages to hide the install icon
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister().then(() => {
                    console.log('SW Unregistered');
                    // Force refresh if SW was controlling page
                    if (navigator.serviceWorker.controller) {
                        // Optional: window.location.reload(); 
                        // But reloading might be jarring. Just unregistering prevents future fetches from being intercepted by *this* SW effectively on next page load.
                    }
                });
            }
        });
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(dateString));
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Hari ini';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return formatDate(dateStr);
}

function formatDateTime(dateString) {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

function getStatusBadgeClass(status) {
    const statusMap = {
        'pending': 'badge-warning',
        'confirmed': 'badge-info',
        'invoiced': 'badge-primary',
        'paid': 'badge-success',
        'production': 'badge-purple',
        'packaging': 'badge-orange',
        'shipping': 'badge-blue',
        'completed': 'badge-success',
        'cancelled': 'badge-danger',
        'unpaid': 'badge-danger',
        'partial': 'badge-warning',
        'in_progress': 'badge-info',
        'in_transit': 'badge-info',
        'delivered': 'badge-success'
    };
    return statusMap[status] || 'badge-secondary';
}

function getStatusLabel(status) {
    const statusMap = {
        'pending': 'Menunggu',
        'confirmed': 'Dikonfirmasi',
        'invoiced': 'Diinvoice',
        'paid': 'Lunas',
        'production': 'Produksi',
        'packaging': 'Pengemasan',
        'shipping': 'Pengiriman',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan',
        'unpaid': 'Belum Bayar',
        'partial': 'Sebagian',
        'in_progress': 'Dalam Proses',
        'in_transit': 'Dalam Perjalanan',
        'delivered': 'Terkirim'
    };
    return statusMap[status] || status;
}

// UI Helpers
function getAvatarGradient(name) {
    const gradients = [
        'linear-gradient(135deg, #f59638, #ec6817)',
        'linear-gradient(135deg, #4caf50, #2e7d32)',
        'linear-gradient(135deg, #2196f3, #1976d2)',
        'linear-gradient(135deg, #9c27b0, #7b1fa2)',
        'linear-gradient(135deg, #e91e63, #c2185b)'
    ];
    const charCode = (name || '').charCodeAt(0) || 0;
    return gradients[charCode % gradients.length];
}

function renderRatingStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i data-lucide="star" class="${i <= rating ? 'filled' : ''}" style="width:18px;height:18px;fill:${i <= rating ? '#ffc107' : 'none'};color:${i <= rating ? '#ffc107' : '#d1d5db'}"></i>`;
    }
    return stars;
}

function handleImageError(img) {
    const name = img.getAttribute('alt') || 'User';
    const initials = name.charAt(0).toUpperCase();
    const gradient = getAvatarGradient(name);

    const div = document.createElement('div');
    div.className = 'letter-avatar';

    // Base styles
    // Remove fixed width/height/flex to allow CSS classes or inline styles to control size
    const baseStyle = `
        background: ${gradient};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        border-radius: 50%;
    `;

    // Apply base styles first
    div.style.cssText = baseStyle;

    // Append original image's inline styles (allows overriding width/height if set inline)
    if (img.style.cssText) {
        div.style.cssText += img.style.cssText;
    }

    div.textContent = initials;

    // Retain classes and ID from original img
    if (img.id) {
        div.id = img.id;
    }
    if (img.className) {
        div.className += ' ' + img.className;
    }

    img.replaceWith(div);
}

// API call wrapper with retry logic for cold starts
async function apiCall(endpoint, options = {}, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [5000, 10000, 15000]; // 5s, 10s, 15s

    try {
        const token = localStorage.getItem('token');
        const isFormData = options.body instanceof FormData;

        const headers = {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            signal: options.signal || AbortSignal.timeout(60000) // 60s timeout
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - clear token
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Only redirect to login if we are NOT on a public page
                if (!isPublicPath()) {
                    window.location.href = '/login.html';
                }
                return;
            }

            // Handle 504 Gateway Timeout or 503 Service Unavailable (cold start)
            if ((response.status === 504 || response.status === 503) && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount];
                const waitSeconds = delay / 1000;

                console.log(`Server waking up or busy (Status ${response.status}). Retry ${retryCount + 1}/${MAX_RETRIES} in ${waitSeconds}s`);
                showNotification(
                    `Server sedang bersiap... Mencoba lagi dalam ${waitSeconds} detik (${retryCount + 1}/${MAX_RETRIES})`,
                    'info'
                );

                await new Promise(resolve => setTimeout(resolve, delay));
                return apiCall(endpoint, options, retryCount + 1);
            }

            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `HTTP error! status: ${response.status}` };
            }

            const errorMsg = errorData.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        // Handle network errors and timeouts
        if (error.name === 'TimeoutError') {
            console.error('API call timed out:', endpoint);
            throw new Error('Koneksi lambat atau terputus. Silakan coba lagi nanti.');
        }

        console.error('API call failed:', error);
        throw error;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Inject keyframes if not already present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes toastFadeIn {
                from { opacity: 0; transform: translate(-50%, -20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
            @keyframes toastFadeOut {
                from { opacity: 1; transform: translate(-50%, 0); }
                to { opacity: 0; transform: translate(-50%, -20px); }
            }
        `;
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: toastFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 90%;
    width: max-content;
    text-align: center;
    font-weight: 600;
  `;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    notification.innerHTML = `<i data-lucide="${iconName}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 10px;"></i> <span>${message}</span>`;

    document.body.appendChild(notification);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        notification.style.animation = 'toastFadeOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Logout function
function logout() {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect all users (including admins) to landing page
    window.location.href = '/';
}

// Role constants
const ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    GUEST: 'guest'
};

// Role check helpers
function isAdmin() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
        const user = JSON.parse(userStr);
        return user.role === ROLES.ADMIN;
    } catch (e) {
        return false;
    }
}

function getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

// Internal helper for public path detection
function isPublicPath() {
    const publicPages = ['/', '/index.html', '/login.html', '/admin.html', '/order.html', '/track.html', '/profile.html', '/privacy.html', '/tos.html', '/wa-direct.html', '/index', '/login', '/admin', '/order', '/track', '/profile', '/privacy', '/tos', '/wa-direct'];
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    return publicPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        (normalizedPath + '.html') === page
    );
}

// Check authentication
function checkAuth() {
    const adminPages = ['/dashboard', '/dashboard.html', '/orders.html', '/customers.html', '/products.html', '/production.html', '/cms.html', '/kitchen', '/kitchen.html'];
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    const isPublicPage = isPublicPath();
    const isAdminPage = adminPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        (normalizedPath + '.html') === page
    );

    const token = localStorage.getItem('token');
    const user = getUser();

    // 1. Not logged in -> Redirect to login if not public
    if (!token && !isPublicPage) {
        window.location.href = '/login.html';
        return;
    }

    // 2. Logged in but trying to access admin page without being admin
    if (token && isAdminPage && user?.role !== ROLES.ADMIN) {
        window.location.href = '/';
        return;
    }
}

// Load Footer Settings (Socials & Contact)
async function loadFooterSettings() {
    try {
        // Don't run on CMS or Dashboard if they don't have the footer structure
        if (window.location.pathname.includes('cms.html') || window.location.pathname.includes('dashboard.html')) return;

        const result = await apiCall('/public/settings');
        if (result.success && result.data) {
            const s = result.data;

            // Update Social Links
            const socialContainer = document.getElementById('footer-socials');
            if (socialContainer) {
                let html = '';

                // Instagram
                if (s.social_instagram) {
                    const handle = s.social_instagram.includes('instagram.com/') ? '@' + s.social_instagram.split('instagram.com/')[1].replace(/\/$/, '') : 'Instagram';
                    html += `<a href="${s.social_instagram}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; opacity: 0.8; transition: opacity 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <i data-lucide="instagram" style="width: 20px; height: 20px;"></i>
                        <span>${handle}</span>
                    </a>`;
                }

                // Facebook
                if (s.social_facebook) {
                    html += `<a href="${s.social_facebook}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; opacity: 0.8; transition: opacity 0.3s; margin-left: 1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <i data-lucide="facebook" style="width: 20px; height: 20px;"></i>
                    </a>`;
                }

                // TikTok
                if (s.social_tiktok) {
                    html += `<a href="${s.social_tiktok}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; opacity: 0.8; transition: opacity 0.3s; margin-left: 1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <i data-lucide="music" style="width: 20px; height: 20px;"></i>
                    </a>`;
                }

                if (html) {
                    socialContainer.innerHTML = html;
                    if (window.lucide) lucide.createIcons();
                }
            }

            // Update Contact Info
            const contactContainer = document.getElementById('footer-contact');
            if (contactContainer) {
                let html = '';
                if (s.contact_email) html += `<div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><i data-lucide="mail" style="width: 16px; height: 16px;"></i> ${s.contact_email}</div>`;
                if (s.contact_phone) html += `<div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><i data-lucide="phone" style="width: 16px; height: 16px;"></i> ${s.contact_phone}</div>`;
                if (s.contact_whatsapp) {
                    const waLink = `https://wa.me/${s.contact_whatsapp.replace(/[^0-9]/g, '')}`;
                    html += `<div style="margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; transition: color 0.3s;" onmouseover="this.style.color='var(--success)'" onmouseout="this.style.color='inherit'">
                            <i data-lucide="message-circle" style="width: 16px; height: 16px;"></i> WhatsApp: ${s.contact_whatsapp}
                        </a>
                    </div>`;
                }
                if (s.contact_address) html += `<div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><i data-lucide="map-pin" style="width: 16px; height: 16px;"></i> ${s.contact_address}</div>`;

                if (html) {
                    contactContainer.innerHTML = html;
                    if (window.lucide) lucide.createIcons();
                }
            }
        }
    } catch (e) {
        // Silently fail footer settings
    }
}

// Global init for pages
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initGlobalHeader();
    loadFooterSettings();
    checkVersion();
    if (window.lucide) lucide.createIcons();
});

// Check and display deployment version
async function checkVersion() {
    try {
        const response = await fetch(`${API_BASE}/auth/version`);
        const data = await response.json();
        const versionElement = document.getElementById('footer-version');
        if (versionElement) {
            versionElement.innerHTML = `Build: v1.6.6 | API: ${data.version || 'unknown'}`;
            versionElement.style.fontSize = '0.7rem';
            versionElement.style.opacity = '0.5';
            versionElement.style.marginTop = '0.5rem';
        } else {
            // Fallback for pages without the specific ID
            const footers = document.querySelectorAll('footer .container');
            footers.forEach(footer => {
                if (!footer.querySelector('.footer-version-tag')) {
                    const vTag = document.createElement('div');
                    vTag.className = 'footer-version-tag';
                    vTag.style.fontSize = '0.7rem';
                    vTag.style.opacity = '0.5';
                    vTag.style.marginTop = '1rem';
                    vTag.innerHTML = `Build: v1.6.6 | API: ${data.version || 'unknown'}`;
                    footer.appendChild(vTag);
                }
            });
        }
    } catch (e) {
        // Silently fail version check
    }
}

// Header initialization for all pages
function initGlobalHeader() {
    const adminPages = ['/dashboard', '/dashboard.html', '/orders.html', '/customers.html', '/products.html', '/production.html', '/cms.html', '/kitchen', '/kitchen.html'];
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    const isAdminPage = adminPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        (normalizedPath + '.html') === page
    );

    const headerContent = document.querySelector('.header-content');
    const nav = document.getElementById('mainNav');
    if (!nav || !headerContent) return;

    // Add Toggle Button if not exists
    if (!document.getElementById('mobileNavToggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'mobileNavToggle';
        toggleBtn.className = 'nav-toggle';
        toggleBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        toggleBtn.onclick = toggleNav;
        headerContent.appendChild(toggleBtn);
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (isAdminPage) {
        // Handle Admin Navigation
        const isDash = normalizedPath.includes('dashboard');
        const isOrders = normalizedPath.includes('orders');
        const isCust = normalizedPath.includes('customers');
        const isProd = normalizedPath.includes('products');
        const isWork = normalizedPath.includes('production');
        const isKitchen = normalizedPath.includes('kitchen');
        const isDocs = normalizedPath.includes('docs');
        const isCMS = normalizedPath.includes('cms');

        nav.innerHTML = `
            <a href="/dashboard.html" class="nav-link ${isDash ? 'active' : ''}">Dashboard</a>
            <a href="/orders.html" class="nav-link ${isOrders ? 'active' : ''}">Orders</a>
            <a href="/customers.html" class="nav-link ${isCust ? 'active' : ''}">Customers</a>
            <a href="/products.html" class="nav-link ${isProd ? 'active' : ''}">Products</a>
            <a href="/production.html" class="nav-link ${isWork ? 'active' : ''}">Production</a>
            <a href="/kitchen.html" class="nav-link ${isKitchen ? 'active' : ''}">Kitchen</a>
            <a href="/cms.html" class="nav-link ${isCMS ? 'active' : ''}">CMS</a>
            <a href="/docs.html" class="nav-link ${isDocs ? 'active' : ''}">Docs</a>
            <button onclick="logout()" class="btn btn-primary btn-md">Logout</button>
        `;
    } else {
        // Handle Public Navigation
        const isHome = normalizedPath === '/' || normalizedPath.endsWith('index') || normalizedPath.endsWith('index.html');
        const isOrder = normalizedPath.includes('order.html') || normalizedPath.endsWith('/order');
        const isTrack = normalizedPath.includes('track');
        const isProfile = normalizedPath.includes('profile');

        if (user) {
            // Logged in
            const isAdmin = user.role === 'admin';
            nav.innerHTML = `
                <a href="/" class="nav-link ${isHome ? 'active' : ''}">Beranda</a>
                ${isAdmin ? '<a href="/dashboard.html" class="nav-link">Dashboard</a>' : `<a href="/order.html" class="nav-link ${isOrder ? 'active' : ''}">Pesan</a>`}
                <a href="/track.html" class="nav-link ${isTrack ? 'active' : ''}">Lacak</a>
                ${isAdmin ? '' : `<a href="/profile.html" class="nav-link ${isProfile ? 'active' : ''}">Profil</a>`}
                <div class="user-menu" style="display: flex; align-items: center; gap: 1rem; margin-left: var(--spacing-md); padding-left: var(--spacing-md); border-left: 1px solid rgba(255,255,255,0.2);">
                    <span style="font-size: 0.9rem; font-weight: 500;">Halo, ${user.name.split(' ')[0]}</span>
                    <button onclick="logout()" class="btn btn-outline btn-md" style="color: white; border-color: white;">Logout</button>
                </div>
            `;
        } else {
            // Not logged in
            nav.innerHTML = `
                <a href="/" class="nav-link ${isHome ? 'active' : ''}">Beranda</a>
                <a href="/order.html" class="nav-link ${isOrder ? 'active' : ''}">Pesan</a>
                <a href="/track.html" class="nav-link ${isTrack ? 'active' : ''}">Lacak</a>
                <a href="/login.html" class="btn btn-primary btn-md" style="margin-left: var(--spacing-md); height: 35px;">Login</a>
            `;
        }
    }

    // Close menu when link is clicked
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeNav();
        });
    });

    // Handle scroll for transparent header
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const header = document.querySelector('.header');
        if (header) {
            header.classList.add('is-transparent');
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.remove('is-transparent');
                } else {
                    header.classList.add('is-transparent');
                }
            });
        }
    }

    // Auto-close menu if resized to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 991) closeNav();
    });

    // Hide all Order buttons/links for Admin
    if (user && user.role === 'admin') {
        const orderSelectors = [
            'a[href*="order.html"]',
            'a[href="/order"]',
            '.cta-button[href*="order"]',
            '.btn[href*="order"]'
        ];

        const orderElements = document.querySelectorAll(orderSelectors.join(','));
        orderElements.forEach(el => {
            el.style.display = 'none';
        });

        // Specifically for the hero section button group, adjust layout if empty
        const btnGroup = document.querySelector('.button-group');
        if (btnGroup && btnGroup.children.length === 0) {
            btnGroup.style.display = 'none';
        }
    }
}

// Responsive Tables: Add data-label to all cells based on header text
function prepareResponsiveTables() {
    document.querySelectorAll('.table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        if (headers.length === 0) return;

        table.querySelectorAll('tbody tr').forEach(row => {
            row.querySelectorAll('td').forEach((cell, index) => {
                if (headers[index] && !cell.getAttribute('data-label')) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });
    });
}

// Watch for DOM changes to prepare new tables
const tableObserver = new MutationObserver(() => {
    prepareResponsiveTables();
});

document.addEventListener('DOMContentLoaded', () => {
    prepareResponsiveTables();
    tableObserver.observe(document.body, { childList: true, subtree: true });
});

function toggleNav() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('mobileNavToggle');

    // Create overlay if not exists
    let overlay = document.getElementById('navOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'navOverlay';
        overlay.className = 'nav-overlay';
        overlay.onclick = closeNav;
        document.body.appendChild(overlay);
    }

    if (nav) {
        const isActive = nav.classList.toggle('active');
        if (toggle) toggle.classList.toggle('active');
        overlay.classList.toggle('active');

        // Toggle icon between hamburger and close
        if (isActive) {
            toggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        } else {
            toggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        }
    }
}

function closeNav() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('mobileNavToggle');
    const overlay = document.getElementById('navOverlay');

    if (nav) nav.classList.remove('active');
    if (toggle) {
        toggle.classList.remove('active');
        toggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    }
    if (overlay) overlay.classList.remove('active');
}

// Export for use in other modules
window.app = {
    apiCall,
    formatCurrency,
    formatDate,
    formatRelativeDate,
    formatDateTime,
    getStatusBadgeClass,
    getStatusLabel,
    showNotification,
    logout,
    checkAuth,
    isAdmin,
    getUser,
    ROLES,
    initGlobalHeader,
    getAvatarGradient,
    renderRatingStars,
    handleImageError,
    initIcons: () => { if (window.lucide) lucide.createIcons(); },
    formatText: (text) => {
        if (!text) return '';
        // Convert tabs to 4 spaces for consistent indents
        let formatted = text.replace(/\t/g, '    ');
        // Simple Markdown-like formatting
        // Bold: **text**
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic: *text*
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return formatted;
    },
    enhanceWithAI: async (fieldId, context, inputSelector = null) => {
        const input = inputSelector ? document.querySelector(inputSelector) : document.getElementById(fieldId);
        const btn = document.getElementById(`btn-ai-${fieldId}`);
        if (!input || !btn) return;

        const originalText = input.value.trim();

        if (!originalText) {
            window.app.showNotification('Silakan ketik sesuatu dulu sebelum minta bantuan AI.', 'info');
            return;
        }

        try {
            btn.disabled = true;
            btn.classList.add('loading');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;animation:spin 1s linear infinite;"></i> Memproses...';
            if (window.lucide) lucide.createIcons();

            const response = await window.app.apiCall('/cms/ai/enhance', {
                method: 'POST',
                body: JSON.stringify({ content: originalText, context: context })
            });

            if (response.success && response.data) {
                input.value = response.data;
                window.app.showNotification('Konten berhasil ditingkatkan oleh AI!', 'success');
            } else {
                throw new Error(response.message || 'Gagal terhubung ke AI');
            }
        } catch (error) {
            console.error(error);
            window.app.showNotification(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = '<i data-lucide="sparkles" style="width:14px;height:14px;"></i> AI Magic';
            if (window.lucide) lucide.createIcons();
        }
    }
};

// Global image error handler
document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        handleImageError(e.target);
    }
}, true);
