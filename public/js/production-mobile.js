
(function () {
    let currentTab = 'incoming';
    let ordersCache = { incoming: [], queue: [] };
    let lastOrderCount = 0;

    // Audio Context for notifications
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playNotificationSound() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    }

    // Tracks orders that have already triggered an overdue notification
    const notifiedOverdueOrders = new Set();

    async function loadData() {
        try {
            const { apiCall } = window.app;
            const res = await apiCall('/cms/production/mobile');

            if (res.success) {
                const { incoming, queue } = res.data;
                ordersCache.incoming = incoming || [];
                ordersCache.queue = queue || [];

                updateCounts();
                renderCurrentTab();

                // Check for new orders
                const totalOrders = (incoming?.length || 0) + (queue?.length || 0);
                if (totalOrders > lastOrderCount && lastOrderCount !== 0) {
                    showToast('🔔 Pesanan Baru Masuk!');
                    playNotificationSound();
                }
                lastOrderCount = totalOrders;

                // Check for overdue production status
                const currentQueueIds = new Set();
                ordersCache.queue.forEach(order => {
                    currentQueueIds.add(order.id);

                    if (order.status === 'production') {
                        const start = new Date(order.prod_start);
                        const elapsed = Math.floor((new Date() - start) / 60000);
                        const target = order.estimations.total_mins;

                        if (elapsed >= target && !notifiedOverdueOrders.has(order.id)) {
                            showToast(`⚠️ Pesanan #${order.order_number} butuh perhatian!`);
                            playNotificationSound();
                            notifiedOverdueOrders.add(order.id);
                        }
                    }
                });

                // Cleanup notified set for removed/completed orders
                for (let id of notifiedOverdueOrders) {
                    if (!currentQueueIds.has(id)) notifiedOverdueOrders.delete(id);
                }

                // Update connection status
                document.getElementById('connectionStatus').style.background = '#10b981';
            }
        } catch (e) {
            console.error('Sync failed', e);
            document.getElementById('connectionStatus').style.background = '#ef4444';
        }
    }

    function updateCounts() {
        document.getElementById('count-incoming').textContent = ordersCache.incoming.length;
        document.getElementById('count-production').textContent = ordersCache.queue.length;
    }

    function renderIncoming() {
        const container = document.getElementById('app-content');
        if (ordersCache.incoming.length === 0) {
            container.innerHTML = emptyState('Tidak ada pesanan baru.');
            return;
        }

        container.innerHTML = `
            <div class="order-grid">
                ${ordersCache.incoming.map(order => `
                    <div class="order-card">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div class="font-bold text-lg text-white">#${order.order_number}</div>
                                <div class="text-sm text-gray-400">${order.customer_name}</div>
                            </div>
                            <span class="status-badge bg-gray-700 text-gray-300">${order.status}</span>
                        </div>
                        
                        <div class="border-t border-gray-700 my-2 pt-2 space-y-2">
                            ${order.items.map(item => `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-300 text-lg">${item.product_name}</span>
                                    <span class="font-bold text-orange-500 text-lg">x${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="flex justify-between items-center mt-3 text-xs text-gray-500">
                            <div>Total: ${window.app.formatCurrency(order.total_amount)}</div>
                            <div>${new Date(order.created_at).toLocaleTimeString()}</div>
                        </div>

                        <div style="flex:1"></div>

                        <button class="action-btn btn-confirm" onclick="confirmOrder(${order.id})">
                            <i data-lucide="check-circle"></i> PO CONFIRM
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        lucide.createIcons();
    }

    function renderProduction() {
        const container = document.getElementById('app-content');
        if (ordersCache.queue.length === 0) {
            container.innerHTML = emptyState('Dapur sedang santai.');
            return;
        }

        container.innerHTML = `
            <div class="order-grid">
                ${ordersCache.queue.map(order => {
            let actionBtn = '';
            let timeline = '';

            // Logic button & timeline based on status
            if (order.status === 'confirmed') {
                actionBtn = `<button class="action-btn btn-cook" onclick="updateStatus(${order.id}, 'production')"><i data-lucide="flame"></i> MULAI MASAK</button>`;
                timeline = `<span class="timer-badge">⏳ Menunggu Koki</span>`;
            } else if (order.status === 'production') {
                actionBtn = `<button class="action-btn btn-pack" onclick="updateStatus(${order.id}, 'packaging')"><i data-lucide="package"></i> SELESAI MASAK</button>`;
                const start = new Date(order.prod_start);
                const elapsed = Math.floor((new Date() - start) / 60000);
                timeline = `<span class="timer-badge text-orange-400">🔥 Masak: ${elapsed} mnt</span>`;
            } else if (order.status === 'packaging') {
                actionBtn = `<button class="action-btn bg-purple-600 text-white" onclick="updateStatus(${order.id}, 'shipping')"><i data-lucide="truck"></i> SIAP KIRIM</button>`;
                timeline = `<span class="timer-badge text-green-400">📦 Packing</span>`;
            }

            return `
                <div class="order-card priority">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="font-bold text-lg text-white">#${order.order_number}</div>
                            <div class="flex gap-2 mt-1">
                                ${timeline}
                                <span class="timer-badge">🎯 Est: ${order.estimations.total_mins}m</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-700 my-2 pt-2 space-y-1">
                        ${order.items.map(item => `
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-300 text-lg">${item.product_name}</span>
                                <span class="bg-gray-800 px-2 py-1 rounded text-white font-bold">x${item.quantity}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${order.notes ? `<div class="bg-red-900/30 text-red-200 p-2 text-sm rounded mt-2">📝 ${order.notes}</div>` : ''}

                    <div style="flex:1"></div>

                    ${actionBtn}
                </div>
                `;
        }).join('')}
            </div>
        `;
        lucide.createIcons();
    }

    function emptyState(msg) {
        return `
            <div class="flex flex-col items-center justify-center h-64 text-gray-600">
                <i data-lucide="coffee" size="48" class="mb-4 opacity-50"></i>
                <p>${msg}</p>
            </div>
        `;
    }

    window.switchTab = function (tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active'); // Warning: simplistic
        // Better active toggle
        const buttons = document.querySelectorAll('.tab-btn');
        if (tab === 'incoming') { buttons[0].classList.add('active'); buttons[1].classList.remove('active'); }
        else { buttons[0].classList.remove('active'); buttons[1].classList.add('active'); }

        renderCurrentTab();
    }

    function renderCurrentTab() {
        if (currentTab === 'incoming') renderIncoming();
        else renderProduction();
    }

    function showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }

    // Public Actions
    window.confirmOrder = async (id) => {
        if (!confirm('Verifikasi pembayaran & pesanan sudah benar?')) return;
        // Move directly to confirmed status
        await updateStatus(id, 'confirmed');
    };

    window.updateStatus = async (id, status) => {
        try {
            const { apiCall } = window.app;
            await apiCall(`/cms/orders/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            loadData(); // Refresh immediately
        } catch (e) {
            alert('Gagal update status');
        }
    };

    // Init
    loadData();
    setInterval(loadData, 5000); // Poll every 5s for near-realtime feel

})();
