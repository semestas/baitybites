// Global API configuration
// const API_BASE = window.location.origin + '/api';
const API_BASE = window.location.origin + '/api';

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(dateString));
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
            signal: options.signal || AbortSignal.timeout(30000) // 30s timeout
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }

            // Handle 504 Gateway Timeout (cold start)
            if (response.status === 504 && retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount];
                const waitSeconds = delay / 1000;

                console.log(`Server is waking up... Retry ${retryCount + 1}/${MAX_RETRIES} in ${waitSeconds}s`);
                showNotification(
                    `Server sedang memuat... Mencoba lagi dalam ${waitSeconds} detik (${retryCount + 1}/${MAX_RETRIES})`,
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
        if (error.name === 'TimeoutError' || error.message.includes('504')) {
            if (retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAYS[retryCount];
                const waitSeconds = delay / 1000;

                console.log(`Connection timeout. Retry ${retryCount + 1}/${MAX_RETRIES} in ${waitSeconds}s`);
                showNotification(
                    `Koneksi timeout. Mencoba lagi dalam ${waitSeconds} detik...`,
                    'info'
                );

                await new Promise(resolve => setTimeout(resolve, delay));
                return apiCall(endpoint, options, retryCount + 1);
            }
        }

        console.error('API call failed:', error);
        showNotification('Error: ' + error.message, 'error');
        throw error;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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

// Check authentication
function checkAuth() {
    const publicPages = ['/', '/index.html', '/login.html', '/order.html', '/track.html', '/profile.html', '/privacy.html', '/tos.html', '/index', '/login', '/order', '/track', '/profile', '/privacy', '/tos'];
    const adminPages = ['/dashboard', '/dashboard.html', '/orders.html', '/customers.html', '/products.html', '/production.html', '/cms.html'];

    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    const isPublicPage = publicPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        normalizedPath + '.html' === page
    );

    const isAdminPage = adminPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        normalizedPath + '.html' === page
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        <span>${handle}</span>
                    </a>`;
                }

                // Facebook
                if (s.social_facebook) {
                    html += `<a href="${s.social_facebook}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; opacity: 0.8; transition: opacity 0.3s; margin-left: 1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </a>`;
                }

                // TikTok
                if (s.social_tiktok) {
                    html += `<a href="${s.social_tiktok}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; opacity: 0.8; transition: opacity 0.3s; margin-left: 1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                    </a>`;
                }

                if (html) socialContainer.innerHTML = html;
            }

            // Update Contact Info
            const contactContainer = document.getElementById('footer-contact');
            if (contactContainer) {
                let html = '';
                if (s.contact_email) html += `<div style="margin-bottom: 0.5rem;">📧 ${s.contact_email}</div>`;
                if (s.contact_phone) html += `<div style="margin-bottom: 0.5rem;">📞 ${s.contact_phone}</div>`;
                if (s.contact_address) html += `<div>📍 ${s.contact_address}</div>`;

                if (html) contactContainer.innerHTML = html;
            }
        }
    } catch (e) {
        console.warn('Failed to load footer settings');
    }
}

// Global init for pages
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initPublicHeader();
    loadFooterSettings(); // <--- Added here
    checkVersion();

    // ... rest of init code
});

// Check and display deployment version
async function checkVersion() {
    try {
        const response = await fetch(`${API_BASE}/auth/version`);
        const data = await response.json();
        const footers = document.querySelectorAll('footer .container, .footer-text');
        footers.forEach(footer => {
            const vTag = document.createElement('div');
            vTag.style.fontSize = '0.7rem';
            vTag.style.opacity = '0.5';
            vTag.style.marginTop = '1rem';
            vTag.innerHTML = `Client: v1.2.0 | Server: ${data.version || 'unknown'}`;
            footer.appendChild(vTag);
        });
    } catch (e) {
        console.warn('Could not fetch version');
    }
}

// Header initialization for public pages
function initPublicHeader() {
    const publicPages = ['/', '/index.html', '/order.html', '/track.html', '/profile.html', '/privacy.html', '/tos.html', '/index', '/order', '/track', '/profile', '/privacy', '/tos'];
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    const isPublicPage = publicPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        normalizedPath + '.html' === page
    );

    if (!isPublicPage) return;

    const nav = document.getElementById('mainNav');
    if (!nav) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (user) {
        // Logged in
        nav.innerHTML = `
            <a href="/" class="nav-link ${window.location.pathname.endsWith('index.html') || window.location.pathname === '/' ? 'active' : ''}">Beranda</a>
            <a href="/order.html" class="nav-link ${window.location.pathname.endsWith('order.html') ? 'active' : ''}">Pesan</a>
            <a href="/track.html" class="nav-link ${window.location.pathname.endsWith('track.html') ? 'active' : ''}">Lacak</a>
            <a href="/profile.html" class="nav-link ${window.location.pathname.endsWith('profile.html') ? 'active' : ''}">Profil</a>
            <div class="user-menu" style="display: flex; align-items: center; gap: 1rem; margin-left: var(--spacing-md); padding-left: var(--spacing-md); border-left: 1px solid rgba(255,255,255,0.2);">
                <span style="font-size: 0.9rem; font-weight: 500;">Halo, ${user.name.split(' ')[0]}</span>
                <button onclick="logout()" class="btn btn-outline btn-sm" style="color: white; border-color: white;">Logout</button>
            </div>
        `;
    } else {
        // Not logged in
        nav.innerHTML = `
            <a href="/" class="nav-link ${window.location.pathname.endsWith('index.html') || window.location.pathname === '/' ? 'active' : ''}">Beranda</a>
            <a href="/order.html" class="nav-link ${window.location.pathname.endsWith('order.html') ? 'active' : ''}">Pesan</a>
            <a href="/track.html" class="nav-link ${window.location.pathname.endsWith('track.html') ? 'active' : ''}">Lacak</a>
            <a href="/login.html" class="btn btn-primary btn-sm" style="margin-left: var(--spacing-md); height: 35px;">Login</a>
        `;
    }

    // Handle scroll for transparent header
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const header = document.querySelector('.header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.style.background = 'var(--gradient-dark)';
                    header.style.boxShadow = 'var(--shadow-lg)';
                } else {
                    header.style.background = 'rgba(0,0,0,0.3)';
                    header.style.boxShadow = 'none';
                }
            });
        }
    }
}

// Run authentication check on all pages
window.addEventListener('load', checkAuth);

// Export for use in other modules
window.app = {
    apiCall,
    formatCurrency,
    formatDate,
    formatDateTime,
    getStatusBadgeClass,
    getStatusLabel,
    showNotification,
    logout,
    checkAuth,
    isAdmin,
    getUser,
    ROLES,
    initPublicHeader
};
