
(function () {

    const getUtils = () => window.app || {};

    async function loadProductionData() {
        try {
            const utils = getUtils();
            const result = await utils.apiCall('/cms/production');

            if (result && result.success) {
                updateStats(result.data.stats);
                updateQueue(result.data.queue);

                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('Failed to load production data:', error);
        }
    }

    function updateStats(stats) {
        const statValues = document.querySelectorAll('.stat-card .stat-value');
        if (statValues.length >= 3) {
            statValues[0].textContent = stats.in_production || 0;
            statValues[1].textContent = stats.wait_for_packing || 0;
            statValues[2].textContent = stats.ready_to_ship || 0;
        }
    }

    function formatTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    function calculateTargetTime(startTimeStr, totalMins) {
        if (!startTimeStr) return null;
        const date = new Date(startTimeStr);
        date.setMinutes(date.getMinutes() + totalMins);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    function updateQueue(queue) {
        const tableBody = document.getElementById('productionTableBody');
        if (!tableBody) return;

        if (!queue || queue.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted" style="padding: 3rem;">
                        <i data-lucide="inbox" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>Belum ada antrean produksi saat ini.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const highlightOrder = urlParams.get('highlight');

        tableBody.innerHTML = queue.map(order => {
            const isHighlighted = highlightOrder && highlightOrder === order.order_number;

            const itemsHtml = order.items ? order.items.map(item =>
                `<div class="item-row">
                    <span class="item-name">${item.product_name}</span>
                    <span class="item-qty">x${item.quantity}</span>
                 </div>`
            ).join('') : '-';

            const est = order.estimations;
            const startTime = order.prod_start || order.order_created;
            const targetSelesai = calculateTargetTime(startTime, est.total_mins);

            const timelineHtml = `
                <div class="timeline-compact">
                    <div class="time-item" title="Waktu Order Masuk">
                        <i data-lucide="shopping-cart"></i> ${formatTime(order.order_created)}
                    </div>
                    ${order.prod_start ? `
                        <div class="time-item" title="Mulai Produksi">
                            <i data-lucide="flame" style="color: #ef4444;"></i> ${formatTime(order.prod_start)}
                        </div>
                    ` : ''}
                    ${order.pack_start ? `
                        <div class="time-item" title="Mulai Packing">
                            <i data-lucide="package" style="color: #f59e0b;"></i> ${formatTime(order.pack_start)}
                        </div>
                    ` : ''}
                </div>
            `;

            const estHtml = `
                <div class="est-box">
                    <div class="flex justify-between items-center mb-1">
                        <span class="est-total"><strong>${est.total_mins} menit</strong></span>
                        <span class="badge badge-primary" style="font-size: 0.7rem;">Target: ${targetSelesai}</span>
                    </div>
                    <div class="est-breakdown" style="font-size: 0.7rem; color: #6b7280;">
                        ${est.production_mins}m Prod + ${est.packaging_mins}m Pack + 15m Pickup
                    </div>
                </div>
            `;

            let actionButton = '';
            if (order.status === 'confirmed') {
                actionButton = `<button class="btn btn-info btn-sm" onclick="updateStatus(${order.id}, 'production')">Mulai Produksi</button>`;
            } else if (order.status === 'production') {
                actionButton = `<button class="btn btn-warning btn-sm" onclick="updateStatus(${order.id}, 'packaging')">Selesai Masak</button>`;
            } else if (order.status === 'packaging') {
                actionButton = `<button class="btn btn-success btn-sm" onclick="updateStatus(${order.id}, 'shipping')">Siap Kirim</button>`;
            } else if (order.status === 'shipping') {
                actionButton = `<button class="btn btn-primary btn-sm" onclick="updateStatus(${order.id}, 'completed')">Selesai Kirim</button>`;
            }

            return `
                <tr class="${isHighlighted ? 'highlight-pulse' : ''}" id="order-row-${order.order_number}">
                    <td><strong>${order.order_number}</strong></td>
                    <td><div class="items-list">${itemsHtml}</div></td>
                    <td class="text-center">${order.items ? order.items.reduce((acc, curr) => acc + curr.quantity, 0) : 0}</td>
                    <td><span class="badge ${getStatusBadgeClass(order.status)}">${getStatusLabel(order.status)}</span></td>
                    <td>
                        <div class="flex flex-col gap-1">
                            ${estHtml}
                            ${timelineHtml}
                        </div>
                    </td>
                    <td>${actionButton}</td>
                </tr>
            `;
        }).join('');

        // Handle scrolling to highlight
        if (highlightOrder) {
            setTimeout(() => {
                const row = document.getElementById(`order-row-${highlightOrder}`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'confirmed': return 'badge-primary';
            case 'production': return 'badge-info';
            case 'packaging': return 'badge-warning';
            case 'shipping': return 'badge-success';
            default: return 'badge-secondary';
        }
    }

    function getStatusLabel(status) {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'production': return 'In Production';
            case 'packaging': return 'Wait for Packing';
            case 'shipping': return 'Ready to Ship';
            default: return status;
        }
    }

    window.updateStatus = async function (orderId, newStatus) {
        if (!confirm(`Ubah status ke ${newStatus}?`)) return;

        try {
            const utils = getUtils();
            const result = await utils.apiCall(`/cms/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (result && result.success) {
                loadProductionData();
                window.app.showNotification('Status berhasil diperbarui', 'success');
            } else {
                window.app.showNotification('Gagal update status', 'error');
            }
        } catch (error) {
            console.error('Update status error:', error);
            window.app.showNotification('Terjadi kesalahan saat memperbarui status', 'error');
        }
    };

    // Auto refresh
    loadProductionData();
    setInterval(loadProductionData, 20000);
})();
