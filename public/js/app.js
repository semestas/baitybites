// Global API configuration
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
    const publicPages = ['/', '/index.html', '/login.html', '/order.html', '/track.html'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPages.some(page => currentPath === page || currentPath.endsWith(page));

    const token = localStorage.getItem('token');
    if (!token && !isPublicPage) {
        window.location.href = '/login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check auth on protected pages
    if (!window.location.pathname.includes('login.html')) {
        checkAuth();
    }

    // Update active nav link
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
    checkAuth
};
