/**
 * Baitybites Order Page Logic
 * Refactored for production efficiency
 */

let products = [];
let quantities = {};
let localQuantities = {};
let currentCategory = 'Risol';

// Helper to check valid input (not empty, not just a dash)
const isValidField = (val) => val && val.trim().length > 2 && val.trim() !== '-';

// Load initial quantities from localStorage
const savedCart = localStorage.getItem('baitybites_cart');
if (savedCart) {
    try {
        quantities = JSON.parse(savedCart);
        localQuantities = { ...quantities }; // Init local staging with saved quantities
    } catch (e) {
        console.error('Failed to parse saved cart');
        quantities = {};
    }
}

function saveCart() {
    localStorage.setItem('baitybites_cart', JSON.stringify(quantities));
    checkResumeCart();
}

function clearCart() {
    quantities = {};
    localQuantities = {};
    saveCart();
    updateTotal();
    renderProducts();
}

function clearCartConfirm() {
    if (confirm('Apakah Anda yakin ingin menghapus semua item di keranjang?')) {
        clearCart();
    }
}

function checkResumeCart() {
    const warning = document.getElementById('resume-cart-warning');
    const totalItems = Object.values(quantities).reduce((a, b) => a + Number(b), 0);
    const productList = document.getElementById('productList');

    // Only show if we are in product list view
    const isListView = productList && !productList.classList.contains('hidden') && productList.style.display !== 'none';

    if (totalItems > 0 && warning && isListView) {
        warning.classList.remove('hidden');
        warning.style.display = 'block';
    } else if (warning) {
        warning.classList.add('hidden');
        warning.style.display = 'none';
    }
}

function checkFormValidity() {
    const nameEl = document.getElementById('name');
    const phoneEl = document.getElementById('phone');
    const addressEl = document.getElementById('address');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (!nameEl || !phoneEl || !addressEl || !submitBtn) return false;

    const isNameValid = isValidField(nameEl.value);
    const isPhoneValid = isValidField(phoneEl.value);
    const isAddressValid = isValidField(addressEl.value) && addressEl.value.trim().length > 5;

    const isValid = isNameValid && isPhoneValid && isAddressValid;

    submitBtn.disabled = !isValid;
    submitBtn.style.opacity = isValid ? '1' : '0.5';
    submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';

    return isValid;
}

async function updateAuthUI() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const loyaltyNotice = document.getElementById('loyalty-notice');
    const quickLoginPrompt = document.getElementById('quick-login-prompt');

    const isLoggedIn = !!(token && userStr);

    if (isLoggedIn) {
        if (loyaltyNotice) {
            loyaltyNotice.classList.add('hidden');
            loyaltyNotice.style.display = 'none';
        }
        if (quickLoginPrompt) {
            quickLoginPrompt.classList.add('hidden');
            quickLoginPrompt.style.display = 'none';
        }
    } else {
        if (loyaltyNotice) {
            loyaltyNotice.classList.remove('hidden');
            loyaltyNotice.style.display = 'block';
        }
        if (quickLoginPrompt) {
            quickLoginPrompt.classList.remove('hidden');
            quickLoginPrompt.style.display = 'flex';
        }
    }
}

async function autoFillUser() {
    const { apiCall } = window.app;
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    // First update the visibility of Google buttons based on login status
    await updateAuthUI();

    if (userStr && token) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'customer') {
                const nameEl = document.getElementById('name');
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const addressEl = document.getElementById('address');

                if (nameEl) nameEl.value = user.name || '';
                if (emailEl) emailEl.value = user.email || '';
                if (phoneEl) phoneEl.value = user.phone || '';
                if (addressEl) addressEl.value = user.address || '';

                const formFields = document.getElementById('customer-form-fields');
                const preview = document.getElementById('customer-info-preview');

                if (formFields && preview) {
                    if (user.name && user.phone && user.address) {
                        formFields.classList.add('hidden');
                        formFields.style.display = 'none';
                        preview.classList.remove('hidden');
                        preview.style.display = 'block';
                        document.getElementById('preview-name').textContent = user.name;
                        document.getElementById('preview-phone').textContent = user.phone;
                        document.getElementById('preview-address').textContent = user.address;
                    }
                }
            } else if (user.role === 'admin') {
                const container = document.querySelector('.order-page-container');
                if (container) {
                    container.innerHTML = `
                        <div class="card text-center p-6 animate-fade-in" style="margin: 4rem auto; max-width: 600px; border: 2px solid #fda4af; background: #fff1f2;">
                            <div style="font-size: 4rem; margin-bottom: 2rem; color: #e11d48;"><i data-lucide="lock"></i></div>
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
            }
        } catch (e) {
            console.error('Auto-fill error:', e);
        }
    }
}

function showOrderFormEdit() {
    const formFields = document.getElementById('customer-form-fields');
    const preview = document.getElementById('customer-info-preview');
    if (formFields) {
        formFields.classList.remove('hidden');
        formFields.style.display = 'block';
    }
    if (preview) {
        preview.classList.add('hidden');
        preview.style.display = 'none';
    }
}

async function loadProducts() {
    const { apiCall } = window.app;
    products = []; // Reset
    try {
        const result = await apiCall('/public/products');
        if (result.success && Array.isArray(result.data)) {
            products = result.data;
        } else {
            console.warn("API returned success false or invalid data", result);
        }
    } catch (error) {
        console.error('Load products error:', error);
    }

    // Always attempt to render, even if empty, to clear spinners

    // Extract unique categories
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean).sort();

    // Render category tabs dynamically
    const categoryTabsContainer = document.getElementById('categoryTabs');
    if (categoryTabsContainer) {
        if (categories.length > 0) {
            // Determine initial category
            if (!categories.includes(currentCategory)) {
                currentCategory = categories[0];
            }

            categoryTabsContainer.innerHTML = categories.map(cat => `
                <div class="category-tab ${cat === currentCategory ? 'active' : ''}" 
                     onclick="filterProducts('${cat}')">
                    ${cat}
                </div>
            `).join('');
        } else {
            categoryTabsContainer.innerHTML = '<div class="text-muted text-sm text-center w-full">Kategori tidak tersedia</div>';
        }
    }

    renderProducts();
    updateTotal();
    checkResumeCart();
}

function renderProducts() {
    const { formatCurrency } = window.app;
    const list = document.getElementById('productList');

    if (!list) return;

    if (products.length === 0) {
        list.innerHTML = '<p class="text-center p-3 text-muted">Produk tidak tersedia.</p>';
        return;
    }

    const filtered = products.filter(p => p.category === currentCategory);

    list.innerHTML = filtered.map(p => {
        const currentQty = localQuantities[p.id] || 0;
        const inCartQty = quantities[p.id] || 0;
        const hasChanged = currentQty !== inCartQty;
        const inCart = inCartQty > 0;
        // Remaining stock = total stock minus what's already committed to cart
        const remainingStock = Math.max(0, p.stock - inCartQty);
        const stockLow = remainingStock > 0 && remainingStock <= 5;
        const stockOut = remainingStock === 0;

        let btnLabel = 'Order';
        let btnClass = 'btn-add-cart';
        if (currentQty === 0) {
            // Disabled state
        } else if (hasChanged) {
            btnLabel = inCart ? 'Update Keranjang' : 'Tambahkan';
            btnClass += ' animate-dizzy';
        } else if (inCart) {
            btnLabel = 'Dalam Keranjang';
            btnClass += ' added';
        }

        return `
            <div class="product-card animate-fade-in">
                <div class="product-image">
                    <img src="${p.image_url || '/assets/placeholder-product.png'}" alt="${p.name}">
                    <div class="product-badge">
                        ${p.category}
                        ${p.category === 'Risol' ? '<span class="frozen-indicator" title="Produk Frozen"><i data-lucide="snowflake"></i></span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-desc" data-content="${p.description}">${p.description}</p>
                    <div class="product-price-row">
                        <div class="product-price">
                            <span class="price">${formatCurrency(p.price)}</span>
                            <span class="unit">/${p.unit}</span>
                        </div>
                        <div class="current-stock ${stockLow ? 'stock-low' : ''} ${stockOut ? 'stock-out' : ''}" id="stock-display-${p.id}">
                            <span class="stock-label">Stok:</span>
                            <span class="stock-value" id="stock-${p.id}">${remainingStock}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <div class="qty-control">
                            <button type="button" class="btn-qty" onclick="adjustQty(${p.id}, -1)">
                                <i data-lucide="minus" class="wh-16"></i>
                            </button>
                            <span class="qty-value" id="qty-${p.id}">${currentQty}</span>
                            <button type="button" class="btn-qty" onclick="adjustQty(${p.id}, 1)">
                                <i data-lucide="plus" class="wh-16"></i>
                            </button>
                        </div>
                        <button type="button" id="btn-add-${p.id}" 
                            class="${btnClass}"
                            ${currentQty === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}
                            onclick="addToCart(${p.id})">${btnLabel}</button>
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

function adjustQty(id, delta) {
    if (localQuantities[id] === undefined) localQuantities[id] = 0;

    // Find the product to enforce stock limit
    const product = products.find(p => p.id == id);
    const maxStock = product ? Number(product.stock) : Infinity;
    const inCartQty = quantities[id] || 0;
    // Max selectable = remaining stock not yet committed to cart
    const maxSelectable = Math.max(0, maxStock - inCartQty);

    const newVal = Math.min(maxSelectable, Math.max(0, localQuantities[id] + delta));
    localQuantities[id] = newVal;

    const qtyEl = document.getElementById(`qty-${id}`);
    const btnAdd = document.getElementById(`btn-add-${id}`);

    if (qtyEl) qtyEl.textContent = newVal;

    // Update the live stock display: remaining = maxStock - inCartQty - newVal (pending)
    const stockEl = document.getElementById(`stock-${id}`);
    const stockDisplay = document.getElementById(`stock-display-${id}`);
    if (stockEl && stockDisplay) {
        const displayStock = Math.max(0, maxStock - inCartQty - newVal);
        stockEl.textContent = displayStock;
        stockDisplay.classList.toggle('stock-low', displayStock > 0 && displayStock <= 5);
        stockDisplay.classList.toggle('stock-out', displayStock === 0);
    }

    if (btnAdd) {
        if (newVal === 0) {
            btnAdd.disabled = true;
            btnAdd.style.opacity = '0.5';
            btnAdd.style.cursor = 'not-allowed';
            btnAdd.textContent = 'Tambahkan';
            btnAdd.classList.remove('added', 'pulse-once', 'animate-dizzy');
        } else {
            btnAdd.disabled = false;
            btnAdd.style.opacity = '1';
            btnAdd.style.cursor = 'pointer';

            const hasChanged = newVal !== inCartQty;

            if (hasChanged) {
                btnAdd.classList.add('animate-dizzy');
                btnAdd.textContent = inCartQty > 0 ? 'Update Keranjang' : 'Tambahkan';

                // Pulse feedback
                btnAdd.classList.remove('pulse-once');
                void btnAdd.offsetWidth;
                btnAdd.classList.add('pulse-once');
            } else {
                btnAdd.classList.remove('animate-dizzy');
                btnAdd.textContent = inCartQty > 0 ? 'Dalam Keranjang' : 'Tambahkan';
            }

            if (inCartQty > 0 && !hasChanged) {
                btnAdd.classList.add('added');
            } else {
                btnAdd.classList.remove('added');
            }
        }
    }
}

function addToCart(id) {
    const val = localQuantities[id];
    if (val === 0) return;
    quantities[id] = val;
    saveCart();

    // After committing to cart, reset pending qty and refresh stock display
    localQuantities[id] = 0;
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.textContent = 0;

    const product = products.find(p => p.id == id);
    const maxStock = product ? Number(product.stock) : 0;
    const committedQty = quantities[id] || 0;
    const remainingStock = Math.max(0, maxStock - committedQty);

    const stockEl = document.getElementById(`stock-${id}`);
    const stockDisplay = document.getElementById(`stock-display-${id}`);
    if (stockEl && stockDisplay) {
        stockEl.textContent = remainingStock;
        stockDisplay.classList.toggle('stock-low', remainingStock > 0 && remainingStock <= 5);
        stockDisplay.classList.toggle('stock-out', remainingStock === 0);
    }

    const btnAdd = document.getElementById(`btn-add-${id}`);
    if (btnAdd) {
        btnAdd.disabled = true;
        btnAdd.style.opacity = '0.5';
        btnAdd.style.cursor = 'not-allowed';
        btnAdd.textContent = 'Berhasil!';
        btnAdd.classList.add('added');
        btnAdd.classList.remove('animate-dizzy', 'pulse-once');
        setTimeout(() => {
            // Re-enable if there's still remaining stock
            if (remainingStock > 0) {
                btnAdd.disabled = false;
                btnAdd.style.opacity = '1';
                btnAdd.style.cursor = 'pointer';
            }
            btnAdd.textContent = 'Dalam Keranjang';
        }, 1200);
    }
    updateTotal();
}

function updateTotal() {
    let total = 0;
    let count = 0;
    const { formatCurrency } = window.app;

    Object.keys(quantities).forEach(id => {
        const p = products.find(x => x.id == id);
        if (p) {
            total += p.price * quantities[id];
            count += quantities[id];
        }
    });

    const bar = document.getElementById('stickySummaryBar');
    const stickyTotal = document.getElementById('stickyTotal');
    const stickyCount = document.getElementById('stickyCount');

    if (bar) {
        if (count > 0) {
            bar.classList.add('visible');
            if (stickyTotal) stickyTotal.textContent = formatCurrency(total);
            if (stickyCount) stickyCount.textContent = count + ' Items';
        } else {
            bar.classList.remove('visible');
        }
    }

    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');
    if (summarySubtotal) summarySubtotal.textContent = formatCurrency(total);
    if (summaryTotal) summaryTotal.textContent = formatCurrency(total);
}

function proceedToConfirmation() {
    const { formatCurrency } = window.app;
    const tbody = document.getElementById('summary-items');
    const selectedItems = products.filter(p => (quantities[p.id] || 0) > 0);

    if (tbody) {
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
    }

    const bar = document.getElementById('stickySummaryBar');
    const confirmSection = document.getElementById('order-confirmation-section');
    const warning = document.getElementById('resume-cart-warning');

    if (bar) bar.classList.remove('visible');
    if (warning) warning.classList.add('hidden');

    if (confirmSection) {
        confirmSection.classList.remove('hidden');
        confirmSection.classList.add('active');
        confirmSection.style.display = 'flex'; // Modal overlay uses flex
        document.body.style.overflow = 'hidden'; // Lock scroll
    }
}

function backToProductList() {
    const confirmSection = document.getElementById('order-confirmation-section');
    if (confirmSection) {
        confirmSection.classList.remove('active');
        confirmSection.classList.add('hidden');
        confirmSection.style.display = 'none';
        document.body.style.overflow = ''; // Unlock scroll
    }
    updateTotal();
    checkResumeCart();
}

async function loadRecentOrders(btn = null) {
    const { apiCall, formatCurrency, getStatusBadgeClass, getStatusLabel } = window.app;
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) return;

    const section = document.getElementById('recentOrdersSection');
    const list = document.getElementById('recentOrdersList');
    const productList = document.getElementById('productList');

    if (!section || !list || !productList) return;

    // Recent orders should only show when in product list view
    if (productList.classList.contains('hidden') || productList.style.display === 'none') {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    section.style.display = 'block';

    const icon = btn ? btn.querySelector('i[data-lucide="refresh-cw"]') : null;
    if (icon) icon.classList.add('animate-spin');
    if (btn) btn.disabled = true;

    try {
        const result = await apiCall('/customer/orders');
        if (result.success) {
            if (result.data.length === 0) {
                list.innerHTML = '<p class="text-center text-muted p-4">Belum ada pesanan.</p>';
                return;
            }

            list.innerHTML = result.data.slice(0, 5).map(o => {
                const isOrderPending = ['pending', 'confirmed', 'paid', 'production', 'packaging', 'shipping'].includes(o.status);
                return `
                <div class="recent-orders-item ${isOrderPending ? 'is-pending' : ''}">
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
            `;
            }).join('');
        }
    } catch (e) {
        console.error('Failed to load recent orders:', e);
    } finally {
        if (icon) icon.classList.remove('animate-spin');
        if (btn) btn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
}

function toggleRecentOrders() {
    const body = document.getElementById('recentOrdersBody');
    const chevron = document.getElementById('recentOrdersChevron');
    if (!body) return;

    const isHidden = body.classList.contains('hidden') || body.style.display === 'none';

    if (isHidden) {
        body.classList.remove('hidden');
        body.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
        body.classList.add('hidden');
        body.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
}

// Global scope
window.adjustQty = adjustQty;
window.addToCart = addToCart;
window.filterProducts = filterProducts;
window.proceedToConfirmation = proceedToConfirmation;
window.backToProductList = backToProductList;
window.showOrderFormEdit = showOrderFormEdit;
window.loadRecentOrders = loadRecentOrders;
window.toggleRecentOrders = toggleRecentOrders;
window.clearCartConfirm = clearCartConfirm;
window.loginWithGoogle = loginWithGoogle;

async function loginWithGoogle() {
    // Save current path to redirect back after login
    localStorage.setItem('login_redirect', window.location.pathname + window.location.search);
    window.location.href = '/api/auth/google/login';
}

document.addEventListener('DOMContentLoaded', async () => {
    await autoFillUser();

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
            if (btnText) btnText.classList.add('hidden');
            if (btnSpinner) btnSpinner.classList.remove('hidden');

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
                    const confirmSection = document.getElementById('order-confirmation-section');
                    if (confirmSection) {
                        confirmSection.classList.remove('active');
                        confirmSection.classList.add('hidden');
                        confirmSection.style.display = 'none';
                    }
                    document.body.style.overflow = ''; // Unlock scroll

                    document.getElementById('successOrderNumber').textContent = result.data.order_number;
                    document.getElementById('successInvoiceNumber').textContent = result.data.invoice_number;
                    document.getElementById('btnTrackLink').href = '/track.html?number=' + (result.data.invoice_number || result.data.order_number);

                    // Setup inline copy buttons
                    const copyOrderBtn = document.getElementById('copyOrderBtn');
                    const copyInvoiceBtn = document.getElementById('copyInvoiceBtn');

                    if (copyOrderBtn) {
                        copyOrderBtn.onclick = () => {
                            navigator.clipboard.writeText(result.data.order_number);
                            showNotification('Nomor order berhasil dicopy!', 'success');

                            const origText = copyOrderBtn.innerHTML;
                            copyOrderBtn.innerHTML = '<i data-lucide="check" size="14"></i><span>Tersalin</span>';
                            if (window.lucide) lucide.createIcons();
                            setTimeout(() => {
                                copyOrderBtn.innerHTML = origText;
                                if (window.lucide) lucide.createIcons();
                            }, 2000);
                        };
                    }

                    if (copyInvoiceBtn) {
                        copyInvoiceBtn.onclick = () => {
                            navigator.clipboard.writeText(result.data.invoice_number);
                            showNotification('Nomor invoice berhasil dicopy!', 'success');

                            const origText = copyInvoiceBtn.innerHTML;
                            copyInvoiceBtn.innerHTML = '<i data-lucide="check" size="14"></i><span>Tersalin</span>';
                            if (window.lucide) lucide.createIcons();
                            setTimeout(() => {
                                copyInvoiceBtn.innerHTML = origText;
                                if (window.lucide) lucide.createIcons();
                            }, 2000);
                        };
                    }

                    document.getElementById('successModal').classList.remove('hidden');
                    document.getElementById('successModal').classList.add('active');
                    document.getElementById('successModal').style.display = 'flex';

                    // Background tasks (Email/PDF) are handled automatically by the server

                    // Reset form and cart
                    document.getElementById('orderForm').reset();
                    clearCart();

                    loadRecentOrders();
                } else {
                    // Show specific server error (e.g. insufficient stock)
                    showNotification(result.message || 'Gagal membuat pesanan.', 'error');
                }
            } catch (error) {
                console.error('Order submission failed:', error);
                showNotification('Gagal membuat pesanan. Silakan coba lagi.', 'error');
            } finally {
                if (btnText) btnText.classList.remove('hidden');
                if (btnSpinner) btnSpinner.classList.add('hidden');
            }
        });
    }
});

// Re-sync cart on page modification (e.g. back button navigation/BFCache)
window.addEventListener('pageshow', (event) => {
    // Reload quantities from localStorage to prevent stale state from BFCache
    const savedCart = localStorage.getItem('baitybites_cart');
    if (savedCart) {
        try {
            quantities = JSON.parse(savedCart);
            localQuantities = { ...quantities };
        } catch (e) {
            console.error('Failed to parse saved cart on pageshow', e);
            quantities = {};
            localQuantities = {};
        }
    } else {
        quantities = {};
        localQuantities = {};
    }

    // Re-render to reflect the correct state
    renderProducts();
    updateTotal();
    checkResumeCart();
});
