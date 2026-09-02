document.addEventListener('DOMContentLoaded', async () => {
    let products = [];
    let cart = {}; // product_id -> quantity
    let selectedCategory = 'all';
    let searchQuery = '';
    let selectedProductId = null;
    let highlightedSuggestion = -1;
    const savedCustomersKey = 'baitybites-wa-customers';

    const productListEl = document.getElementById('productList');
    const categoryFiltersEl = document.getElementById('categoryFilters');
    const productSearchInput = document.getElementById('productSearch');
    const productSuggestionsEl = document.getElementById('productSuggestions');
    const cartReceiptEl = document.getElementById('cartReceipt');
    const labelSubtotal = document.getElementById('labelSubtotal');
    const labelGrandTotal = document.getElementById('labelGrandTotal');
    const discountValInput = document.getElementById('discountVal');
    const custNameInput = document.getElementById('custName');
    const custPhoneInput = document.getElementById('custPhone');
    const custAddressInput = document.getElementById('custAddress');
    const savedCustomerPhonesEl = document.getElementById('savedCustomerPhones');
    const btnSubmit = document.getElementById('btnSubmitOrder');

    function normalizePhone(phone) {
        return phone.replace(/\D/g, '');
    }

    function getSavedCustomers() {
        try {
            return JSON.parse(localStorage.getItem(savedCustomersKey) || '{}');
        } catch (error) {
            return {};
        }
    }

    function renderSavedCustomerPhones() {
        if (!savedCustomerPhonesEl) return;

        savedCustomerPhonesEl.innerHTML = '';
        Object.values(getSavedCustomers()).forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.phone;
            option.label = `${customer.name} - ${customer.phone}`;
            savedCustomerPhonesEl.appendChild(option);
        });
    }

    function prefillSavedCustomer() {
        const customer = getSavedCustomers()[normalizePhone(custPhoneInput.value)];
        if (!customer) return;

        custPhoneInput.value = customer.phone;
        custNameInput.value = customer.name;
        custAddressInput.value = customer.address || '';
        custNameInput.classList.remove('input-error');
    }

    function rememberCustomer(customer) {
        const phone = normalizePhone(customer.phone);
        if (!phone) return;

        const customers = getSavedCustomers();
        customers[phone] = { name: customer.name, phone: customer.phone, address: customer.address || '' };
        try {
            localStorage.setItem(savedCustomersKey, JSON.stringify(customers));
            renderSavedCustomerPhones();
        } catch (error) {
            console.warn('[WADirect] Unable to save customer locally', error);
        }
    }

    renderSavedCustomerPhones();
    custPhoneInput.addEventListener('change', prefillSavedCustomer);
    custPhoneInput.addEventListener('blur', prefillSavedCustomer);

    // Load Products
    try {
        const res = await apiCall('/public/products');
        if (res.success) {
            products = res.data;
            renderCategoryFilters();
            renderProducts();
            renderProductSuggestions();
        }
    } catch (e) {
        productListEl.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat produk</p>';
    }

    function renderCategoryFilters() {
        if (!categoryFiltersEl) return;

        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        if (!categories.length) {
            categoryFiltersEl.innerHTML = '';
            return;
        }

        const filters = ['all', ...categories];
        categoryFiltersEl.innerHTML = filters.map(cat => {
            const label = cat === 'all' ? 'Semua' : cat;
            const active = selectedCategory === cat ? 'active' : '';
            return `<button type="button" class="wa-filter-chip ${active}" data-category="${cat}" aria-pressed="${selectedCategory === cat}">${label}</button>`;
        }).join('');

        categoryFiltersEl.querySelectorAll('.wa-filter-chip').forEach(button => {
            button.addEventListener('click', () => {
                selectedCategory = button.dataset.category;
                selectedProductId = null;
                searchQuery = '';
                productSearchInput.value = '';
                renderCategoryFilters();
                renderProductSuggestions();
                renderProducts();
            });
        });
    }

    function renderProducts() {
        let visibleProducts = products;
        if (selectedCategory !== 'all') {
            visibleProducts = products.filter(p => p.category === selectedCategory);
        }

        if (selectedProductId !== null) {
            visibleProducts = visibleProducts.filter(p => p.id == selectedProductId);
        }

        if (searchQuery.trim() && selectedProductId === null) {
            const term = searchQuery.trim().toLowerCase();
            visibleProducts = visibleProducts.filter(p =>
                p.name.toLowerCase().includes(term) ||
                (p.category && p.category.toLowerCase().includes(term))
            );
        }

        if (!visibleProducts.length) {
            productListEl.innerHTML = `
                <div class="wa-empty-state">
                    <p>Produk yang Anda cari belum tersedia.</p>
                    <small>Coba kata kunci lain atau pilih kategori lain.</small>
                </div>
            `;
            return;
        }

        productListEl.innerHTML = visibleProducts.map(p => {
            const qty = cart[p.id] || 0;
            const sub = qty * p.price;
            const isSelected = qty > 0;
            const remainingStock = Math.max(0, p.stock - qty);
            const stockLow = remainingStock > 0 && remainingStock <= 5;
            const stockOut = remainingStock === 0;
            return `
                <div class="product-card-wa ${isSelected ? 'selected' : ''}">
                    <div class="selected-badge"></div>
                    <div class="product-name">${p.name} ${p.category === 'Risol' ? '<span title="Produk Frozen" style="color: #0891b2; font-weight: 400; margin-left: 4px;">❄</span>' : ''}</div>
                    <img src="${p.image_url || '/assets/logo.png'}" class="product-thumb" alt="${p.name}">
                    <div class="product-info">
                        <div class="counter">
                            <div class="product-price-stock">
                                <div class="product-price">Rp ${Number(p.price).toLocaleString('id-ID')}</div>
                                <div class="wa-stock-badge ${stockLow ? 'stock-low' : ''} ${stockOut ? 'stock-out' : ''}" id="wa-stock-${p.id}">
                                    Stok: <strong>${remainingStock}</strong> ${p.unit}
                                </div>
                            </div>
                            <div class="counter-btns">
                                <button class="btn-qty" onclick="window.updateQty(${p.id}, -1)">-</button>
                                <span class="qty-val" id="wa-qty-${p.id}">${qty}</span>
                                <button class="btn-qty" onclick="window.updateQty(${p.id}, 1)" ${stockOut ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>+</button>
                            </div>
                        </div>
                        <div class="subtotal-preview">Subtotal: Rp ${sub.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderProductSuggestions() {
        if (!productSuggestionsEl) return;

        const term = searchQuery.trim().toLowerCase();
        const matches = products
            .filter(product => selectedCategory === 'all' || product.category === selectedCategory)
            .filter(product => !term || product.name.toLowerCase().includes(term) || (product.category && product.category.toLowerCase().includes(term)))
            .slice(0, 8);

        if (!term || !matches.length || document.activeElement !== productSearchInput) {
            productSuggestionsEl.innerHTML = '';
            productSuggestionsEl.classList.remove('is-open');
            return;
        }

        productSuggestionsEl.innerHTML = matches.map((product, index) => `
            <button type="button" class="wa-product-suggestion ${index === highlightedSuggestion ? 'is-highlighted' : ''}" data-product-id="${product.id}" role="option" aria-selected="${index === highlightedSuggestion}">
                <span class="wa-suggestion-name">${product.name}</span>
                <span class="wa-suggestion-meta">${product.category || 'Produk'} · Rp ${Number(product.price).toLocaleString('id-ID')}</span>
            </button>
        `).join('');
        productSuggestionsEl.classList.add('is-open');

        productSuggestionsEl.querySelectorAll('.wa-product-suggestion').forEach(button => {
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', () => selectProduct(button.dataset.productId));
        });
    }

    function selectProduct(productId) {
        const product = products.find(item => item.id == productId);
        if (!product) return;

        selectedProductId = product.id;
        searchQuery = product.name;
        productSearchInput.value = product.name;
        highlightedSuggestion = -1;
        productSuggestionsEl.innerHTML = '';
        productSuggestionsEl.classList.remove('is-open');
        renderProducts();
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', event => {
            searchQuery = event.target.value;
            selectedProductId = null;
            highlightedSuggestion = -1;
            renderProductSuggestions();
            renderProducts();
        });

        productSearchInput.addEventListener('focus', renderProductSuggestions);
        productSearchInput.addEventListener('keydown', event => {
            const suggestions = productSuggestionsEl.querySelectorAll('.wa-product-suggestion');
            if (!suggestions.length) return;

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                highlightedSuggestion = (highlightedSuggestion + 1) % suggestions.length;
                renderProductSuggestions();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                highlightedSuggestion = (highlightedSuggestion - 1 + suggestions.length) % suggestions.length;
                renderProductSuggestions();
            } else if (event.key === 'Enter' && highlightedSuggestion >= 0) {
                event.preventDefault();
                selectProduct(suggestions[highlightedSuggestion].dataset.productId);
            } else if (event.key === 'Escape') {
                productSuggestionsEl.classList.remove('is-open');
            }
        });

        productSearchInput.addEventListener('blur', () => {
            window.setTimeout(() => productSuggestionsEl.classList.remove('is-open'), 120);
        });
    }

    window.updateQty = (pid, delta) => {
        const product = products.find(p => p.id == pid);
        const maxStock = product ? Number(product.stock) : Infinity;
        const current = cart[pid] || 0;
        const newQty = Math.min(maxStock, Math.max(0, current + delta));

        if (newQty <= 0) {
            delete cart[pid];
        } else {
            cart[pid] = newQty;
        }

        // Live-update stock badge and qty without full re-render
        const committedQty = cart[pid] || 0;
        const remainingStock = Math.max(0, maxStock - committedQty);
        const stockBadge = document.getElementById(`wa-stock-${pid}`);
        const qtyEl = document.getElementById(`wa-qty-${pid}`);
        if (stockBadge) {
            stockBadge.innerHTML = `Stok: <strong>${remainingStock} ${product.unit}</strong>`;
            stockBadge.classList.toggle('stock-low', remainingStock > 0 && remainingStock <= 5);
            stockBadge.classList.toggle('stock-out', remainingStock === 0);
        }
        if (qtyEl) qtyEl.textContent = committedQty;

        updateUI();
    };

    function updateUI() {
        renderProducts();
        renderReceipt();
        validateForm();
    }

    function renderReceipt() {
        const cartItems = Object.entries(cart).map(([pid, qty]) => {
            const p = products.find(prod => prod.id == pid);
            return { ...p, quantity: qty };
        });

        if (cartItems.length === 0) {
            cartReceiptEl.innerHTML = '<p style="text-align: center; color: #999; font-size: 0.8rem;">Keranjang kosong</p>';
            labelSubtotal.textContent = 'Rp 0';
            labelGrandTotal.textContent = 'Rp 0';
            return;
        }

        cartReceiptEl.innerHTML = cartItems.map(item => `
            <div class="receipt-item">
                <span>${item.name} x${item.quantity}</span>
                <span>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
            </div>
        `).join('');

        const subtotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const discount = Number(discountValInput.value) || 0;
        const grand = subtotal - discount;

        labelSubtotal.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
        labelGrandTotal.textContent = `Rp ${grand.toLocaleString('id-ID')}`;
    }

    function validateForm() {
        const hasCart = Object.keys(cart).length > 0;
        // Don't disable the button if cart is present, so user can click and see validation errors
        btnSubmit.disabled = !hasCart;

        // Remove error classes while typing
        if (custNameInput.value.trim().length > 0) custNameInput.classList.remove('input-error');
        if (custPhoneInput.value.trim().length >= 10) custPhoneInput.classList.remove('input-error');
    }

    [custNameInput, custPhoneInput, discountValInput].forEach(el => {
        el.addEventListener('input', () => {
            updateUI();
        });
    });

    // Submit Order
    btnSubmit.addEventListener('click', async () => {
        const name = custNameInput.value.trim();
        const phone = custPhoneInput.value.trim();
        const address = custAddressInput.value.trim();
        const discount = Number(discountValInput.value) || 0;

        // Visual Validation
        let hasError = false;
        if (!name) {
            custNameInput.classList.add('input-error');
            hasError = true;
        }
        if (phone.length < 10) {
            custPhoneInput.classList.add('input-error');
            hasError = true;
        }

        if (hasError) {
            showNotification('Lengkapi Nama & WA (min 10 digit)', 'error');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const items = Object.entries(cart).map(([pid, qty]) => {
            const p = products.find(prod => prod.id == pid);
            return {
                product_id: parseInt(pid),
                product_name: p.name,
                quantity: qty,
                price: Number(p.price)
            };
        });

        try {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '⚡ Processing...';

            const res = await apiCall('/wa-direct/order', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    phone,
                    address,
                    discount,
                    items,
                    notes: 'Order via Direct WA App'
                })
            });

            if (res.success) {
                // Store order data for summary
                const orderData = {
                    orderNumber: res.data.order_number,
                    invoiceNumber: res.data.invoice_number,
                    customerName: name,
                    customerPhone: phone,
                    customerAddress: address,
                    paymentStatus: 'pending',
                    items: items,
                    discount: discount,
                    totalAmount: res.data.total_amount
                };

                rememberCustomer({ name, phone, address });

                // Clear form
                cart = {};
                custNameInput.value = '';
                custPhoneInput.value = '';
                custAddressInput.value = '';
                discountValInput.value = '';
                updateUI();

                // Show order summary modal immediately
                showOrderSummaryModal(orderData);

                // Form clears automatically for next order
                // Triggered automatically by backend now

            } else {
                showNotification(res.message, 'error');
            }
        } catch (e) {
            showNotification('Gagal memproses pesanan', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>📱</span> Kirim ke WhatsApp';
        }
    });

    // Styling hack for Numpad support in discount
    discountValInput.addEventListener('focus', () => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    // Show Order Summary Modal
    function showOrderSummaryModal(orderData) {
        const { orderNumber, invoiceNumber, customerName, customerPhone, customerAddress, paymentStatus, items, discount, totalAmount } = orderData;

        const paymentLabel = paymentStatus === 'paid' ? 'Lunas' : paymentStatus === 'partial' ? 'DP / Sebagian' : 'Belum bayar';

        // Generate order summary text
        const itemsList = items.map(item =>
            `${item.product_name} x${item.quantity} = Rp ${(item.price * item.quantity).toLocaleString('id-ID')}`
        ).join('\n');

        const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

        const summaryText = `📋 RINGKASAN PESANAN

Order: ${orderNumber}
Invoice: ${invoiceNumber}

👤 Pelanggan: ${customerName}
📱 WhatsApp: ${customerPhone}
📍 Alamat: ${customerAddress || '-'}
💳 Status Bayar: ${paymentLabel}

🛒 ITEM PESANAN:
${itemsList}

💰 TOTAL:
Subtotal: Rp ${subtotal.toLocaleString('id-ID')}
Diskon: Rp ${discount.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━
GRAND TOTAL: Rp ${totalAmount.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━
💰 Pembayaran: 
Siti Nurbaity | BCA-7145060133

Terima kasih atas pesanan Anda! 🙏
- Baitybites Team`;

        // Create modal using classes defined in wa-direct.scss
        const modal = document.createElement('div');
        modal.className = 'wa-modal-backdrop';

        modal.innerHTML = `
            <div class="wa-modal-content">
                <div class="wa-modal-header">
                    <div class="wa-success-icon">✅</div>
                    <h2>Pesanan Berhasil!</h2>
                    <p>Order #${orderNumber}</p>
                </div>

                <div class="wa-modal-body">
                    <div class="wa-summary-box" id="captureTarget">${summaryText}</div>

                    <div class="wa-btn-group">
                        <button id="btnDownloadSummary" class="wa-btn btn-pdf">
                            <span>🖼️</span> Screenshot Invoice
                        </button>

                        <button id="btnShareWA" class="wa-btn btn-whatsapp">
                            <span>📱</span> Share ke WhatsApp
                        </button>

                        <button id="btnCloseModal" class="wa-btn btn-close">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Download Summary PNG (Client-Side)
        document.getElementById('btnDownloadSummary').addEventListener('click', async () => {
            const btn = document.getElementById('btnDownloadSummary');
            const target = document.getElementById('captureTarget');
            const originalHtml = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = '🕒 Generating...';

                const canvas = await html2canvas(target, {
                    scale: 3,
                    backgroundColor: '#f8f9fa',
                    logging: false,
                    useCORS: true
                });

                const link = document.createElement('a');
                link.download = `BAITYBITES-${orderNumber}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

                showNotification('Gambar berhasil diunduh!', 'success');
            } catch (err) {
                console.error('PNG error:', err);
                showNotification('Gagal membuat gambar', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });

        // Share to WhatsApp (Client-Side Image)
        document.getElementById('btnShareWA').addEventListener('click', async () => {
            const btn = document.getElementById('btnShareWA');
            const target = document.getElementById('captureTarget');
            const originalHtml = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = '🕒 Preparing...';

                const canvas = await html2canvas(target, { scale: 3, backgroundColor: '#f8f9fa' });
                const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                const file = new File([blob], `Order-Summary-${orderNumber}.png`, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Order Summary Baitybites',
                        text: `Halo ${customerName}, berikut ringkasan pesanan Anda.`
                    });
                } else {
                    const waText = encodeURIComponent(summaryText);
                    window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${waText}`, '_blank');
                }
            } catch (err) {
                console.error('Share error:', err);
                const waText = encodeURIComponent(summaryText);
                window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${waText}`, '_blank');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });

        // Close modal
        document.getElementById('btnCloseModal').addEventListener('click', () => {
            modal.remove();
        });

        // Modal can only be closed by the close button
        /*
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        */
    }
});
