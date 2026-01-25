/**
 * Baitybites Tracking Page Logic
 */

let pollingInterval;

async function loadCustomerOrders() {
    const { apiCall, getStatusBadgeClass, getStatusLabel } = window.app;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'customer') return;

        const result = await apiCall('/customer/orders');
        if (result.success && result.data.length > 0) {
            const area = document.getElementById('customerOrdersArea');
            const list = document.getElementById('customerOrdersList');
            area.style.display = 'block';
            list.innerHTML = result.data.slice(0, 3).map(o => `
                <div class="card p-3 flex justify-between items-center" style="cursor: pointer; border-color: var(--neutral-200);" onclick="trackNumber('${o.invoice_number || o.order_number}')">
                    <div>
                        <h4 style="margin:0;">${o.order_number}</h4>
                        <span class="text-muted" style="font-size: 0.8rem;">${new Date(o.order_date).toLocaleDateString()}</span>
                    </div>
                    <span class="badge ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Failed to load customer orders:', e);
    }
}

async function trackNumber(number) {
    const { apiCall } = window.app;
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');

    // Reset UI
    resultArea.style.display = 'none';
    errorArea.style.display = 'none';
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    if (pollingInterval) clearInterval(pollingInterval);

    try {
        const result = await apiCall(`/public/track/${number}`);
        if (result.success) {
            updateUI(result.data);
            resultArea.style.display = 'block';
            resultArea.scrollIntoView({ behavior: 'smooth' });

            // Auto-refresh updates every 10 seconds
            pollingInterval = setInterval(async () => {
                try {
                    const update = await apiCall(`/public/track/${number}`);
                    if (update.success) updateUI(update.data);
                } catch (e) {
                    console.error('Background update failed', e);
                }
            }, 10000);
        }
    } catch (error) {
        errorArea.textContent = 'Data tidak ditemukan atau terjadi kesalahan';
        errorArea.style.display = 'block';
    } finally {
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
}

function updateUI(data) {
    const { getStatusLabel, getStatusBadgeClass } = window.app;

    document.getElementById('resOrderNumber').textContent = data.order_number;
    document.getElementById('resCustomerName').textContent = data.customer_name;
    document.getElementById('resDate').textContent = new Date(data.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('resInvoiceNumber').textContent = data.invoice_number || '-';

    const badge = document.getElementById('resBadge');
    badge.textContent = getStatusLabel(data.status);
    badge.className = 'badge ' + getStatusBadgeClass(data.status);

    // Update Timeline
    const steps = ['pending', 'paid', 'production', 'packaging', 'shipping', 'completed'];
    const currentStatus = data.status;

    // Map status to timeline index
    const statusMap = {
        'pending': 0,
        'confirmed': 0,
        'invoiced': 1,
        'paid': 1,
        'production': 2,
        'packaging': 3,
        'shipping': 4,
        'completed': 5
    };

    const currentIndex = statusMap[currentStatus] ?? -1;

    steps.forEach((step, index) => {
        const el = document.getElementById('step-' + step);
        el.classList.remove('active', 'completed');

        if (index < currentIndex) {
            el.classList.add('completed');
        } else if (index === currentIndex) {
            el.classList.add('active');
        }
    });

    // Shipping details
    const shippingText = document.getElementById('resShippingText');
    if (data.tracking_number) {
        shippingText.textContent = `Kurir: ${data.courier} (${data.tracking_number})`;
    } else {
        shippingText.textContent = 'Menunggu kurir';
    }
}

// Global scope for onclick
window.trackNumber = trackNumber;

document.addEventListener('DOMContentLoaded', () => {
    loadCustomerOrders();

    const trackForm = document.getElementById('trackForm');
    if (trackForm) {
        trackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const number = document.getElementById('trackNumber').value.trim();
            trackNumber(number);
        });
    }

    // Check URL for auto-track
    const params = new URLSearchParams(window.location.search);
    const number = params.get('number');
    if (number) {
        const input = document.getElementById('trackNumber');
        if (input) input.value = number;
        trackNumber(number);
    }
});
