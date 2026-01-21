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

// API call wrapper
async function apiCall(endpoint, options = {}) {
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
            headers
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Check authentication
function checkAuth() {
    const publicPages = ['/', '/index.html', '/login.html', '/order.html', '/track.html', '/privacy.html', '/tos.html', '/index', '/login', '/order', '/track', '/privacy', '/tos'];
    const currentPath = window.location.pathname;
    const normalizedPath = currentPath.replace(/\/$/, '') || '/';

    const isPublicPage = publicPages.some(page =>
        currentPath === page ||
        currentPath.endsWith(page) ||
        normalizedPath === page ||
        normalizedPath + '.html' === page
    );

    const token = localStorage.getItem('token');
    if (!token && !isPublicPage) {
        window.location.href = '/login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    checkAuth();

    // Initialize Header for public pages
    initPublicHeader();

    // Check version
    checkVersion();

    // Update active nav link (for static navs)
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath ||
            (currentPath === '/' && link.getAttribute('href') === '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
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
            vTag.innerHTML = `Client: v1.1.0 | Server: ${data.version || 'unknown'}`;
            footer.appendChild(vTag);
        });
    } catch (e) {
        console.warn('Could not fetch version');
    }
}

// Header initialization for public pages
function initPublicHeader() {
    const publicPages = ['/', '/index.html', '/order.html', '/track.html', '/privacy.html', '/tos.html', '/index', '/order', '/track', '/privacy', '/tos'];
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
    initPublicHeader
};
