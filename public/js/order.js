/**
 * BaityBites Order Page Logic
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
                                <div style="font-size: 1.5rem;">✨</div>
                                <div>
                                    <p style="margin: 0 0 0.5rem 0; font-weight: 700;">Halo ${user.name || 'Pelanggan'}, Terima kasih telah menjadi pelanggan setia BaityBites!</p>
                                    <p style="margin: 0;">Kami perhatikan ini adalah login pertama Anda melalui akun Google. Silakan <strong>lengkapi semua data diri</strong> pada form di bawah ini agar sistem kami dapat langsung <strong>mengaitkan data tersebut ke akun Google Anda</strong>. Selamat berbelanja!</p>
                                </div>
                            </div>
                        `;

                        const form = document.getElementById('orderForm');
                        form.parentNode.insertBefore(notice, form);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to parse user for auto-fill');
        }
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
                        <h4 style="margin: 0;">${p.name}</h4>
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
                <div class="card p-3 flex justify-between items-center" style="border-color: var(--neutral-200); margin-bottom: 0.5rem; transition: none;">
                    <div>
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem;">
                            <h4 style="margin: 0;">${o.order_number}</h4>
                            <span class="badge ${getStatusBadgeClass(o.status)}" style="font-size: 0.7rem;">${getStatusLabel(o.status)}</span>
                        </div>
                        <div class="text-muted" style="font-size: 0.8rem;">
                            ${new Date(o.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • 
                            <strong>${formatCurrency(o.total_amount)}</strong>
                        </div>
                    </div>
                    <a href="/track.html?number=${o.invoice_number || o.order_number}" class="btn btn-outline btn-sm">Lacak</a>
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
    const loyaltyNotice = document.getElementById('loyalty-notice');
    if (!token && loyaltyNotice) loyaltyNotice.style.display = 'block';

    await loadProducts();
    await loadRecentOrders();

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
