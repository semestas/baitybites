document.addEventListener('DOMContentLoaded', async () => {
    let products = [];
    let cart = {}; // product_id -> quantity

    const productListEl = document.getElementById('productList');
    const cartReceiptEl = document.getElementById('cartReceipt');
    const labelSubtotal = document.getElementById('labelSubtotal');
    const labelGrandTotal = document.getElementById('labelGrandTotal');
    const discountValInput = document.getElementById('discountVal');
    const custNameInput = document.getElementById('custName');
    const custPhoneInput = document.getElementById('custPhone');
    const btnSubmit = document.getElementById('btnSubmitOrder');

    // Load Products
    try {
        const res = await apiCall('/public/products');
        if (res.success) {
            products = res.data;
            renderProducts();
        }
    } catch (e) {
        productListEl.innerHTML = '<p style="color: red; text-align:center;">Gagal memuat produk</p>';
    }

    function renderProducts() {
        productListEl.innerHTML = products.map(p => {
            const qty = cart[p.id] || 0;
            const sub = qty * p.price;
            const isSelected = qty > 0;
            return `
                <div class="product-card-wa ${isSelected ? 'selected' : ''}">
                    <div class="selected-badge"></div>
                    <img src="${p.image_url || '/assets/logo.png'}" class="product-thumb" alt="${p.name}">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="counter">
                            <div class="product-price">Rp ${Number(p.price).toLocaleString('id-ID')}</div>
                            <div class="counter-btns">
                                <button class="btn-qty" onclick="window.updateQty(${p.id}, -1)">-</button>
                                <span class="qty-val">${qty}</span>
                                <button class="btn-qty" onclick="window.updateQty(${p.id}, 1)">+</button>
                            </div>
                        </div>
                        <div class="subtotal-preview">Subtotal: Rp ${sub.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.updateQty = (pid, delta) => {
        const qty = (cart[pid] || 0) + delta;
        if (qty <= 0) {
            delete cart[pid];
        } else {
            cart[pid] = qty;
        }
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
                    discount,
                    items,
                    notes: 'Order via Direct WA App'
                })
            });

            if (res.success) {
                showNotification('Invoice PDF sent to id.baitybites@gmail.com', 'success');

                // Store order data for summary
                const orderData = {
                    orderNumber: res.data.order_number,
                    invoiceNumber: res.data.invoice_number,
                    customerName: name,
                    customerPhone: phone,
                    items: items,
                    discount: discount,
                    totalAmount: res.data.total_amount
                };

                // Clear form
                cart = {};
                custNameInput.value = '';
                custPhoneInput.value = '';
                discountValInput.value = '';
                updateUI();

                // Show order summary modal
                setTimeout(() => {
                    showOrderSummaryModal(orderData);
                }, 500);
            } else {
                showNotification(res.message, 'error');
            }
        } catch (e) {
            showNotification('Gagal memproses pesanan', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>⎙</span> Print & Send PDF Invoice';
        }
    });

    // Styling hack for Numpad support in discount
    discountValInput.addEventListener('focus', () => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    // Show Order Summary Modal
    function showOrderSummaryModal(orderData) {
        const { orderNumber, invoiceNumber, customerName, customerPhone, items, discount, totalAmount } = orderData;

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

🛒 ITEM PESANAN:
${itemsList}

💰 TOTAL:
Subtotal: Rp ${subtotal.toLocaleString('id-ID')}
Diskon: Rp ${discount.toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━
GRAND TOTAL: Rp ${totalAmount.toLocaleString('id-ID')}

Terima kasih atas pesanan Anda! 🙏
- BaityBites Team`;

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
                    <div class="wa-summary-box">${summaryText}</div>

                    <div class="wa-btn-group">
                        <button id="btnDownloadPDF" class="wa-btn btn-pdf">
                            <span>📄</span> Download PDF
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

        // Download PDF functionality
        document.getElementById('btnDownloadPDF').addEventListener('click', async () => {
            const btn = document.getElementById('btnDownloadPDF');
            const originalHtml = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = '🕒 Generating...';

                // Construct PDF URL
                const pdfUrl = `/api/wa-direct/invoice/${invoiceNumber}/pdf`;

                // Open in new tab or trigger download
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = `Invoice-${invoiceNumber}.pdf`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showNotification('Invoice PDF generating in new tab...', 'success');
            } catch (err) {
                console.error('PDF Download error:', err);
                showNotification('Gagal mengunduh PDF', 'error');
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }, 2000);
            }
        });

        // Share to WhatsApp
        document.getElementById('btnShareWA').addEventListener('click', () => {
            const waText = encodeURIComponent(summaryText);
            // Construct WA URL properly - if local use standard wa.me, if production also fine
            const waUrl = `https://wa.me/6281315582238?text=${waText}`; // Direct to admin if possible or just use existing
            window.open(waUrl, '_blank');
        });

        // Close modal
        document.getElementById('btnCloseModal').addEventListener('click', () => {
            modal.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
});
