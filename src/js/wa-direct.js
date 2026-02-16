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
                        <div class="product-price">Rp ${Number(p.price).toLocaleString('id-ID')}</div>
                        <div class="counter">
                            <button class="btn-qty" onclick="window.updateQty(${p.id}, -1)">-</button>
                            <span class="qty-val">${qty}</span>
                            <button class="btn-qty" onclick="window.updateQty(${p.id}, 1)">+</button>
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

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease;
            ">
                <div style="
                    background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 16px 16px 0 0;
                    text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <h2 style="margin: 0; font-size: 1.5rem;">Pesanan Berhasil!</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 0.9rem;">Order #${orderNumber}</p>
                </div>

                <div style="padding: 20px;">
                    <div style="
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 15px;
                        margin-bottom: 20px;
                        font-family: monospace;
                        font-size: 0.85rem;
                        white-space: pre-wrap;
                        line-height: 1.6;
                        border: 1px solid #e0e0e0;
                    ">${summaryText}</div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="btnDownloadPDF" style="
                            background: #3498db;
                            color: white;
                            border: none;
                            padding: 15px;
                            border-radius: 10px;
                            font-weight: bold;
                            font-size: 1rem;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        ">
                            <span>📄</span> Download PDF
                        </button>

                        <button id="btnShareWA" style="
                            background: #25D366;
                            color: white;
                            border: none;
                            padding: 15px;
                            border-radius: 10px;
                            font-weight: bold;
                            font-size: 1rem;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        ">
                            <span>📱</span> Share ke WhatsApp
                        </button>

                        <button id="btnCloseModal" style="
                            background: #95a5a6;
                            color: white;
                            border: none;
                            padding: 12px;
                            border-radius: 10px;
                            font-weight: 600;
                            font-size: 0.9rem;
                            cursor: pointer;
                        ">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Download PDF functionality
        document.getElementById('btnDownloadPDF').addEventListener('click', () => {
            generateAndDownloadPDF(summaryText, orderNumber);
        });

        // Share to WhatsApp
        document.getElementById('btnShareWA').addEventListener('click', () => {
            const waText = encodeURIComponent(summaryText);
            const waUrl = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${waText}`;
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

    // Generate and Download PDF
    function generateAndDownloadPDF(text, orderNumber) {
        // Create a canvas to render text as PDF-like image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size (A4-ish proportions)
        canvas.width = 800;
        canvas.height = 1100;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.font = '16px monospace';

        const lines = text.split('\n');
        let y = 50;
        lines.forEach(line => {
            ctx.fillText(line, 50, y);
            y += 24;
        });

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Order-${orderNumber}.png`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Order summary downloaded!', 'success');
        });
    }
});
