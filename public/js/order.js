/**
 * Baitybites Order Page Logic
 * Refactored for production efficiency
 */

let products = [];
let quantities = {};

async function autoFillUser() {
    const { apiCall } = window.app;

    // 1. Initialize DOM elements immediately
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const addressEl = document.getElementById('address');
    const submitBtn = document.querySelector('button[type="submit"]');

    // 2. Default State: Disable Button immediately
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }

    // 3. Define Validation Logic (Global to this function scope)
    const isValidField = (val) => val && val.trim().length > 2 && val.trim() !== '-';

    const checkFormValidity = () => {
        if (!nameEl || !phoneEl || !addressEl || !submitBtn) return false;

        const isNameValid = isValidField(nameEl.value);
        const isPhoneValid = isValidField(phoneEl.value);
        const isAddressValid = isValidField(addressEl.value) && addressEl.value.trim().length > 5;

        const isValid = isNameValid && isPhoneValid && isAddressValid;

        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.5';
        submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';

        return isValid;
    };

    // 4. Attach Listeners immediately
    if (nameEl && phoneEl && addressEl) {
        [nameEl, phoneEl, addressEl].forEach(el => el.addEventListener('input', checkFormValidity));
    }

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
                // Elements already initialized in outer scope


                if (user.name && nameEl) nameEl.value = user.name;
                if (user.email && emailEl) emailEl.value = user.email;
                if (user.phone && phoneEl) phoneEl.value = user.phone;
                if (user.address && addressEl) addressEl.value = user.address;

                // Helper to check valid input (not empty, not just a dash)
                const isValidField = (val) => val && val.trim().length > 2 && val.trim() !== '-';

                // Validation function
                const checkFormValidity = () => {
                    const isNameValid = nameEl ? isValidField(nameEl.value) : false;
                    const isPhoneValid = phoneEl ? isValidField(phoneEl.value) : false;
                    // Address is critical, ensure it's substantial
                    const isAddressValid = addressEl ? (isValidField(addressEl.value) && addressEl.value.trim().length > 5) : false;

                    const isValid = isNameValid && isPhoneValid && isAddressValid;

                    if (submitBtn) {
                        submitBtn.disabled = !isValid;
                        submitBtn.style.opacity = isValid ? '1' : '0.5';
                        submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
                    }

                    return isValid;
                };

                // Add listeners
                // Listeners already attached in outer scope


                // Initial check
                const formValid = checkFormValidity();

                // Only show preview if ALL mandatory fields are strictly valid
                const userAddressValid = isValidField(user.address) && user.address.trim().length > 5;
                const userPhoneValid = isValidField(user.phone);
                const userNameValid = isValidField(user.name);

                if (user.role === 'customer' && userNameValid && userPhoneValid && userAddressValid) {
                    const formFields = document.getElementById('customer-form-fields');
                    const preview = document.getElementById('customer-info-preview');

                    if (formFields) formFields.style.display = 'none';
                    if (preview) {
                        preview.style.display = 'block';

                        const pName = document.getElementById('preview-name');
                        const pPhone = document.getElementById('preview-phone');
                        const pEmail = document.getElementById('preview-email');
                        const pAddress = document.getElementById('preview-address');

                        if (pName) pName.textContent = user.name;
                        if (pPhone) pPhone.textContent = user.phone;
                        if (pEmail) pEmail.textContent = user.email || '-';
                        if (pAddress) pAddress.textContent = user.address;
                    }

                    // Enable button if preview is shown (assumed valid)
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                        submitBtn.style.cursor = 'pointer';
                    }
                } else {
                    // Force form edit if incomplete or invalid (like just a dash)
                    const formFields = document.getElementById('customer-form-fields');
                    const preview = document.getElementById('customer-info-preview');

                    if (formFields) formFields.style.display = 'block';
                    if (preview) preview.style.display = 'none';

                    // Re-run check on the visual form elements
                    checkFormValidity();
                }

                if (user.email && user.role === 'customer' && (user.google_id || user.auth_provider === 'google') && emailEl) {
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
                        if (form) form.parentNode.insertBefore(notice, form);
                    }
                    if (window.lucide) lucide.createIcons();
                }
            }
        } catch (e) {
            console.error('Failed to parse user for auto-fill', e);
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
        <p style="font-size: 1.1rem; margin-bottom: 2rem;">
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

let currentCategory = 'Risol';

async function loadProducts() {
    const { apiCall } = window.app;
    try {
        const result = await apiCall('/public/products');
        if (result.success) {
            products = result.data;
            renderProducts();
        }
    } catch (error) {
        console.error('Load products error:', error);
    }
}

let localQuantities = {};

function renderProducts() {
    const { formatCurrency } = window.app;
    const list = document.getElementById('productList');

    if (products.length === 0) {
        list.innerHTML = '<p class="text-center p-3 text-muted">Produk tidak tersedia.</p>';
        return;
    }

    const filtered = products.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-center p-5 text-muted" style="grid-column: 1/-1">Belum ada produk di kategori ${currentCategory}.</p>`;
        return;
    }

    list.innerHTML = filtered.map(p => {
        // Sync local with cart if not set (or on first load)
        if (localQuantities[p.id] === undefined) {
            localQuantities[p.id] = quantities[p.id] || 0;
        }

        const currentQty = localQuantities[p.id];
        const inCart = (quantities[p.id] || 0) > 0;
        const isZero = currentQty === 0;

        return `
            <div class="product-card animate-fade-in">
                <div class="product-image-wrapper">
                    <img src="${p.image_url || '/assets/placeholder-product.png'}" alt="${p.name}" onerror="this.src='/assets/placeholder-product.png'">
                    ${inCart ? '<div class="product-badge"><i data-lucide="shopping-cart" size="14"></i></div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-desc">${p.description}</p>
                    
                    <div class="product-price-row">
                        <div class="price-wrapper">
                            <span class="price">${formatCurrency(p.price)}</span>
                            <span class="unit">/${p.unit || 'pak'}</span>
                        </div>
                    </div>

                    <div class="product-actions" id="actions-${p.id}">
                        <div class="qty-selector">
                            <button type="button" onclick="adjustQty(${p.id}, -1)">-</button>
                            <span class="qty-value" id="qty-${p.id}">${currentQty}</span>
                            <button type="button" onclick="adjustQty(${p.id}, 1)">+</button>
                        </div>
                        <button type="button" 
                                id="btn-add-${p.id}"
                                class="btn-add ${inCart ? 'added' : ''}" 
                                onclick="addToCart(${p.id})"
                                ${isZero ? 'disabled' : ''}
                                style="${isZero ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                            ${inCart ? 'Update Keranjang' : 'Tambahkan'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function filterProducts(category) {
    currentCategory = category;
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        if (tab.textContent === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    renderProducts();
}

// Adjusts the local visible quantity ONLY
function adjustQty(id, delta) {
    if (localQuantities[id] === undefined) localQuantities[id] = 0;

    // Prevent negative
    const newVal = Math.max(0, localQuantities[id] + delta);
    localQuantities[id] = newVal;

    // Update UI elements
    const qtyEl = document.getElementById(`qty-${id}`);
    const btnAdd = document.getElementById(`btn-add-${id}`);

    if (qtyEl) qtyEl.textContent = newVal;

    if (btnAdd) {
        if (newVal === 0) {
            btnAdd.disabled = true;
            btnAdd.style.opacity = '0.5';
            btnAdd.style.cursor = 'not-allowed';
            btnAdd.textContent = 'Tambahkan'; // Reset text if 0
            btnAdd.classList.remove('added');
        } else {
            btnAdd.disabled = false;
            btnAdd.style.opacity = '1';
            btnAdd.style.cursor = 'pointer';

            // Allow user to see they can update/add
            const inCart = (quantities[id] || 0) > 0;
            btnAdd.textContent = inCart ? 'Update Keranjang' : 'Tambahkan';
        }
    }
}

// Commits the local quantity to the actual cart
function addToCart(id) {
    const val = localQuantities[id];

    if (val === 0) return; // Should be handled by disabled state, but safety check

    quantities[id] = val;

    // Visual feedback
    const btnAdd = document.getElementById(`btn-add-${id}`);
    if (btnAdd) {
        const originalText = btnAdd.textContent;
        btnAdd.textContent = 'Berhasil!';
        btnAdd.classList.add('added');

        setTimeout(() => {
            btnAdd.textContent = 'Update Keranjang';
        }, 1000);
    }

    updateTotal();
}

function updateTotal() {
    const { formatCurrency } = window.app;
    let total = 0;
    let count = 0;

    products.forEach(p => {
        const qty = quantities[p.id] || 0;
        total += qty * p.price;
        count += qty;
    });

    // Update Sticky Bar
    const bar = document.getElementById('stickySummaryBar');
    const stickyTotal = document.getElementById('stickyTotal');
    const stickyCount = document.getElementById('stickyCount');

    if (count > 0) {
        bar.classList.add('visible');
        stickyTotal.textContent = formatCurrency(total);
        stickyCount.textContent = count + ' Items';
    } else {
        bar.classList.remove('visible');
    }

    // Update Summary Table (if visible)
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');
    if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
    if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
}

function proceedToConfirmation() {
    // Fill summary table
    const { formatCurrency } = window.app;
    const tbody = document.getElementById('summary-items');
    const selectedItems = products.filter(p => (quantities[p.id] || 0) > 0);

    tbody.innerHTML = selectedItems.map(p => `
        <div class="summary-table-row">
            <div class="summary-table-row-text">
                <strong>${p.name}</strong><br>
                <small class="text-muted">${formatCurrency(p.price)}</small>
            </div>
            <div class="summary-table-row-text">${quantities[p.id]}x</div>
            <div class="summary-table-row-text">${formatCurrency(quantities[p.id] * p.price)}</div>
        </div>
    `).join('');

    // Switch view
    document.getElementById('categoryTabs').style.display = 'none';
    document.getElementById('productList').style.display = 'none';
    document.getElementById('stickySummaryBar').classList.remove('visible');
    document.getElementById('order-confirmation-section').style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToProductList() {
    document.getElementById('categoryTabs').style.display = 'flex';
    document.getElementById('productList').style.display = 'grid';
    document.getElementById('order-confirmation-section').style.display = 'none';
    updateTotal(); // Re-show sticky bar if count > 0
}

function showAdminWarning() {
    const mainContainer = document.querySelector('.order-page-container');
    const loyaltyNotice = document.getElementById('loyalty-notice');
    if (loyaltyNotice) loyaltyNotice.style.display = 'none';

    mainContainer.innerHTML = `
        <div class="card animate-fade-in" style="margin: 2rem auto; max-width: 600px; padding: 4rem 2rem; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 2rem; color: #e11d48;"><i data-lucide="lock" size="64"></i></div>
            <h2 style="margin-bottom: 1.5rem; color: #9f1239;">Akses Administrator Dideteksi</h2>
            <p style="font-size: 1.1rem; margin-bottom: 3rem; line-height: 1.6; color: #9f1239;">
                Demi integritas data, akun <strong>Administrator</strong> dilarang membuat pesanan.<br>
                Gunakan akun pelanggan untuk transaksi asli.
            </p>
            <div class="flex flex-col gap-4" style="max-width: 320px; margin: 0 auto;">
                <a href="/dashboard.html" class="btn btn-primary" style="width: 100%;">Ke Dashboard</a>
                <button onclick="logout()" class="btn btn-outline" style="width: 100%;">Logout & Pesan Kembali</button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function showOrderFormEdit() {
    document.getElementById('customer-form-fields').style.display = 'block';
    document.getElementById('customer-info-preview').style.display = 'none';
}

async function loadRecentOrders() {
    const { apiCall, formatCurrency, getStatusBadgeClass, getStatusLabel } = window.app;
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) return;

    const section = document.getElementById('recentOrdersSection');
    const list = document.getElementById('recentOrdersList');

    // Recent orders should only show when in product list view
    if (document.getElementById('productList').style.display === 'none') {
        section.style.display = 'none';
        return;
    }

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
    }
}

function toggleRecentOrders() {
    const body = document.getElementById('recentOrdersBody');
    const chevron = document.getElementById('recentOrdersChevron');

    // We assume default is visible (display: block or empty)
    const isHidden = body.style.display === 'none';

    if (isHidden) {
        body.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
        body.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
}

// Global scope for onclick handlers
window.adjustQty = adjustQty;
window.addToCart = addToCart;
window.filterProducts = filterProducts;
window.proceedToConfirmation = proceedToConfirmation;
window.backToProductList = backToProductList;
window.showOrderFormEdit = showOrderFormEdit;
window.loadRecentOrders = loadRecentOrders;
window.toggleRecentOrders = toggleRecentOrders;

document.addEventListener('DOMContentLoaded', async () => {
    await autoFillUser();

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const loyaltyNotice = document.getElementById('loyalty-notice');

    if (loyaltyNotice) {
        loyaltyNotice.style.display = (!token && !userStr) ? 'block' : 'none';
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
                showNotification('Gagal membuat pesanan.', 'error');
            } finally {
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        });
    }
});
