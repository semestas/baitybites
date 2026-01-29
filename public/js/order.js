/**
 * Baitybites Order Page Logic
 * Refactored for production efficiency
 */

let products = [];
let quantities = {};

async function autoFillUser() {
    const { apiCall } = window.app;
    let userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (token && !userStr) {
        try {
            const result = await apiCall('/auth/me');
            if (result && result.success) {
                localStorage.setItem('user', JSON.stringify(result.data));
                userStr = JSON.stringify(result.data);
            }
        } catch (e) {
            console.error('Failed to fetch user during auto-fill');
        }
    }

    if (userStr) {
        try {
            const user = JSON.parse(userStr);

            // Block admins from placing orders
            if (user.role === 'admin') {
                showAdminWarning();
                return;
            }

            if (user.role === 'customer' || user.role === 'guest') {
                const nameEl = document.getElementById('name');
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const addressEl = document.getElementById('address');

                if (user.name) nameEl.value = user.name;
                if (user.email) emailEl.value = user.email;
                if (user.phone) phoneEl.value = user.phone;
                if (user.address) addressEl.value = user.address;

                // Only for customers who have completed their profiles
                if (user.role === 'customer' && user.name && user.phone && user.address) {
                    document.getElementById('customer-form-fields').style.display = 'none';
                    const preview = document.getElementById('customer-info-preview');
                    preview.style.display = 'block';

                    document.getElementById('preview-name').textContent = user.name;
                    document.getElementById('preview-phone').textContent = user.phone;
                    document.getElementById('preview-email').textContent = user.email || '-';
                    document.getElementById('preview-address').textContent = user.address;
                }

                if (user.email && user.role === 'customer' && (user.google_id || user.auth_provider === 'google')) {
                    emailEl.disabled = true;
                }

                // First-time notice logic
                if (user.role === 'customer' && (!user.phone || !user.address)) {
                    if (!document.getElementById('google-first-login-notice')) {
                        const notice = document.createElement('div');
                        notice.id = 'google-first-login-notice';
                        notice.className = 'info-box mb-4 animate-fade-in';
                        notice.style.cssText = `
                            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                            padding: 1.25rem;
                            border-radius: 1rem;
                            font-size: 0.9rem;
                            color: #0369a1;
                            border: 1px solid #bae6fd;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                        `;

                        notice.innerHTML = `
                            <div style="display: flex; gap: 1rem; align-items: start; text-align: left;">
                                <div style="font-size: 1.5rem; color: #0ea5e9;"><i data-lucide="sparkles"></i></div>
                                <div>
                                    <p style="margin: 0 0 0.5rem 0; font-weight: 700;">Halo ${user.name || 'Pelanggan'}, Terima kasih telah menjadi pelanggan setia Baitybites!</p>
                                    <p style="margin: 0;">Kami perhatikan ini adalah login pertama Anda melalui akun Google. Silakan <strong>lengkapi semua data diri</strong> pada form di bawah ini agar sistem kami dapat langsung <strong>mengaitkan data tersebut ke akun Google Anda</strong>. Selamat berbelanja!</p>
                                </div>
                            </div>
                        `;

                        const form = document.getElementById('orderForm');
                        form.parentNode.insertBefore(notice, form);
                    }
                    if (window.lucide) lucide.createIcons();
                }
            }
        } catch (e) {
            console.error('Failed to parse user for auto-fill');
        }
    }
}

function showAdminWarning() {
    const orderForm = document.getElementById('orderForm');
    const loyaltyNotice = document.getElementById('loyalty-notice');
    if (loyaltyNotice) loyaltyNotice.style.display = 'none';

    const warning = document.createElement('div');
    warning.className = 'animate-fade-in';
    warning.style.cssText = `
        background: #fff1f2;
        border: 2px solid #fda4af;
        border-radius: 1.5rem;
        padding: 3rem 2rem;
        text-align: center;
        color: #9f1239;
        margin: 2rem 0;
    `;
    warning.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem; color: #e11d48;"><i data-lucide="lock" size="64"></i></div>
        <h2 style="margin-bottom: 1rem; color: #9f1239;">Akses Administrator Dideteksi</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem;">
            Untuk menjaga integritas rekapitulasi data transaksi, akun <strong>Administrator</strong> tidak diperbolehkan membuat pesanan.<br>
            Pastikan data laporan 100% berasal dari transaksi pelanggan asli.
        </p>
        <div class="flex flex-col gap-3" style="max-width: 300px; margin: 0 auto;">
            <a href="/dashboard.html" class="btn btn-primary" style="width: 100%;">Kembali ke Dashboard</a>
            <button onclick="logout()" class="btn btn-outline" style="width: 100%; border-color: #fda4af; color: #9f1239;">Logout & Pesan sbg Pelanggan</button>
        </div>
    `;

    if (orderForm) {
        orderForm.parentNode.replaceChild(warning, orderForm);
        if (window.lucide) lucide.createIcons();
    }
}

function showOrderFormEdit() {
    document.getElementById('customer-form-fields').style.display = 'block';
    document.getElementById('customer-info-preview').style.display = 'none';
}

async function loadProducts() {
    const { apiCall, formatCurrency } = window.app;
    try {
        const result = await apiCall('/public/products');
        if (result.success) {
            products = result.data;
            const list = document.getElementById('productList');
            if (products.length === 0) {
                list.innerHTML = '<p class="text-center p-3 text-muted">Produk tidak tersedia.</p>';
                return;
            }

            list.innerHTML = products.map(p => `
                <div class="card flex justify-between items-center p-3" style="margin-bottom: 0.5rem; transition: none;">
                    <div>
                        <h6 style="margin: 0;">${p.name}</h6>
                        <p class="text-muted" style="margin:0; font-size: 0.85rem;">${p.description} - <strong>${formatCurrency(p.price)}</strong></p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="btn btn-outline btn-sm" onclick="changeQty(${p.id}, -1)">-</button>
                        <span id="qty-${p.id}" style="width: 20px; text-align: center; font-weight: 700;">0</span>
                        <button type="button" class="btn btn-outline btn-sm" onclick="changeQty(${p.id}, 1)">+</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Load products error:', error);
    }
}

function changeQty(id, delta) {
    const current = quantities[id] || 0;
    const newVal = Math.max(0, current + delta);
    quantities[id] = newVal;
    const qtyEl = document.getElementById('qty-' + id);
    if (qtyEl) qtyEl.textContent = newVal;
    updateTotal();
}

function updateTotal() {
    const { formatCurrency } = window.app;
    let total = 0;
    products.forEach(p => {
        total += (quantities[p.id] || 0) * p.price;
    });
    document.getElementById('totalText').textContent = formatCurrency(total);
}

async function loadRecentOrders() {
    const { apiCall, formatCurrency, getStatusBadgeClass, getStatusLabel } = window.app;
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) return;

    const section = document.getElementById('recentOrdersSection');
    const list = document.getElementById('recentOrdersList');
    section.style.display = 'block';

    try {
        const result = await apiCall('/customer/orders');
        if (result.success) {
            if (result.data.length === 0) {
                list.innerHTML = '<p class="text-center text-muted p-4">Belum ada pesanan.</p>';
                return;
            }

            list.innerHTML = result.data.slice(0, 5).map(o => `
                <div class="recent-orders-item">
                    <div class="order-main-info">
                        <div class="order-header-row">
                            <h4>${o.order_number}</h4>
                            <span class="badge ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span>
                        </div>
                        <div class="order-meta">
                            ${new Date(o.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • 
                            <strong>${formatCurrency(o.total_amount)}</strong>
                        </div>
                    </div>
                    <a href="/track.html?number=${o.invoice_number || o.order_number}" class="btn btn-outline btn-sm btn-track-action">Lacak</a>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Failed to load recent orders:', e);
        list.innerHTML = '<p class="text-center text-danger p-4">Gagal memuat data.</p>';
    }
}

// Global scope for onclick handlers
window.changeQty = changeQty;
window.showOrderFormEdit = showOrderFormEdit;
window.loadRecentOrders = loadRecentOrders;

document.addEventListener('DOMContentLoaded', async () => {
    await autoFillUser();

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const loyaltyNotice = document.getElementById('loyalty-notice');

    if (loyaltyNotice) {
        if (!token && !userStr) {
            loyaltyNotice.style.display = 'block';
        } else {
            loyaltyNotice.style.display = 'none';
        }
    }

    await loadProducts();
    await loadRecentOrders();

    if (window.app && window.app.initIcons) window.app.initIcons();

    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { apiCall, showNotification } = window.app;

            const items = products
                .filter(p => (quantities[p.id] || 0) > 0)
                .map(p => ({
                    product_id: Number(p.id),
                    quantity: Number(quantities[p.id]),
                    price: Number(p.price)
                }));

            if (items.length === 0) {
                showNotification('Tolong pilih minimal satu produk.', 'error');
                return;
            }

            const btnText = document.getElementById('btnText');
            const btnSpinner = document.getElementById('btnSpinner');
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';

            const payload = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                notes: document.getElementById('notes').value,
                items
            };

            try {
                const result = await apiCall('/public/order', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (result.success) {
                    document.getElementById('successOrderNumber').textContent = result.data.order_number;
                    document.getElementById('successInvoiceNumber').textContent = result.data.invoice_number;
                    document.getElementById('btnTrackLink').href = '/track.html?number=' + (result.data.invoice_number || result.data.order_number);

                    document.getElementById('btnCopy').onclick = () => {
                        navigator.clipboard.writeText(result.data.order_number);
                        showNotification('Nomor order berhasil dicopy!', 'success');
                    };

                    document.getElementById('successModal').style.display = 'flex';
                    loadRecentOrders();
                }
            } catch (error) {
                console.error('Order submission failed:', error);
            } finally {
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        });
    }
});
