
(function () {
    let currentTab = 'incoming';
    let ordersCache = { incoming: [], queue: [] };
    let lastOrderCount = 0;
    let currentAlertTargetId = null;
    let currentAlertTargetTab = null;

    // Audio Context for notifications
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playNotificationSound() {
        if (audioCtx.state === 'suspended') return; // Don't play if blocked/muted

        const now = audioCtx.currentTime;

        // --- Note 1: Friendly Chime Start ---
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(660, now); // E5
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        // --- Note 2: Friendly Chime End ---
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.1); // A5
        gain2.gain.setValueAtTime(0, now + 0.1);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

        osc1.start(now);
        osc1.stop(now + 0.8);
        osc2.start(now + 0.1);
        osc2.stop(now + 1.0);
    }

    window.toggleAudio = function () {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                const icon = document.getElementById('soundIcon');
                icon.setAttribute('data-lucide', 'volume-2');
                icon.style.color = '#f97316';
                lucide.createIcons();
                playNotificationSound(); // Test sound
            });
        } else {
            // Since we can't truly "mute" a generated osc easily without more state,
            // we just play a test sound or show it's active.
            playNotificationSound();
        }
    }

    // Tracks orders that have already triggered an overdue notification
    const notifiedOverdueOrders = new Set();
    const notifiedNearOverdueOrders = new Set();

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
                const latestIncoming = incoming || [];
                const latestQueue = queue || [];
                const totalOrders = latestIncoming.length + latestQueue.length;

                if (totalOrders > lastOrderCount && lastOrderCount !== 0) {
                    const newOrder = latestIncoming[0] || latestQueue[0];
                    showToast(newOrder?.order_number, 'Pesanan Masuk', 'Perlu konfirmasi segera', `order-${newOrder?.id}`, 'incoming');
                }
                lastOrderCount = totalOrders;

                // Check for overdue/near-overdue production status
                const currentQueueIds = new Set();
                ordersCache.queue.forEach(order => {
                    currentQueueIds.add(order.id);

                    if (order.status === 'production') {
                        const start = new Date(order.prod_start);
                        const elapsed = Math.floor((new Date() - start) / 60000);
                        const target = order.estimations.total_mins;

                        // Case 1: Overdue
                        if (elapsed >= target && !notifiedOverdueOrders.has(order.id)) {
                            showToast(order.order_number, 'Waktu Selesai', 'Segera kemas pesanan ini!', `order-${order.id}`, 'production');
                            notifiedOverdueOrders.add(order.id);
                        }
                        // Case 2: Almost Done (1 minute remaining)
                        else if (elapsed === target - 1 && target > 1 && !notifiedNearOverdueOrders.has(order.id)) {
                            showToast(order.order_number, 'Hampir Selesai', 'Bersiap untuk mengepak', `order-${order.id}`, 'production');
                            notifiedNearOverdueOrders.add(order.id);
                        }
                    }
                });

                // Cleanup notified set for removed/completed orders
                for (let id of notifiedOverdueOrders) {
                    if (!currentQueueIds.has(id)) notifiedOverdueOrders.delete(id);
                }
                for (let id of notifiedNearOverdueOrders) {
                    if (!currentQueueIds.has(id)) notifiedNearOverdueOrders.delete(id);
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
                    <div class="order-card" id="order-${order.id}">
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
            let isOverdue = false;

            // Logic button & timeline based on status
            if (order.status === 'confirmed') {
                actionBtn = `<button class="action-btn btn-cook" onclick="updateStatus(${order.id}, 'production')"><i data-lucide="flame"></i> MULAI MASAK</button>`;
                timeline = `<span class="timer-badge">⏳ Menunggu Koki</span>`;
            } else if (order.status === 'production') {
                actionBtn = `<button class="action-btn btn-pack" onclick="updateStatus(${order.id}, 'packaging')"><i data-lucide="package"></i> SELESAI MASAK</button>`;
                const start = new Date(order.prod_start);
                const elapsed = Math.floor((new Date() - start) / 60000);
                const target = order.estimations.total_mins;
                isOverdue = elapsed >= target;
                timeline = `<span class="timer-badge ${isOverdue ? 'overdue-pulse text-red-500' : 'text-orange-400'}">🔥 Masak: ${elapsed} mnt</span>`;
            } else if (order.status === 'packaging') {
                actionBtn = `<button class="action-btn bg-purple-600 text-white" onclick="updateStatus(${order.id}, 'shipping')"><i data-lucide="truck"></i> SIAP KIRIM</button>`;
                timeline = `<span class="timer-badge text-green-400">📦 Packing</span>`;
            }

            return `
                <div class="order-card priority ${isOverdue ? 'overdue-border' : ''}" id="order-${order.id}">
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
        const buttons = document.querySelectorAll('.tab-btn');
        if (tab === 'incoming') {
            buttons[0].classList.add('active');
            buttons[1].classList.remove('active');
        } else {
            buttons[0].classList.remove('active');
            buttons[1].classList.add('active');
        }

        renderCurrentTab();
    }

    function renderCurrentTab() {
        if (currentTab === 'incoming') renderIncoming();
        else renderProduction();
    }


    window.hideAlert = function () {
        document.getElementById('alert-overlay').style.display = 'none';

        if (currentAlertTargetId) {
            // First, ensure we are on the correct tab
            if (currentAlertTargetTab && currentAlertTargetTab !== currentTab) {
                window.switchTab(currentAlertTargetTab);
            }

            // Small delay to allow list to render before scrolling
            setTimeout(() => {
                const target = document.getElementById(currentAlertTargetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('highlight-pulse');

                    // Strictly remove the highlight after 1 second
                    setTimeout(() => {
                        target.classList.remove('highlight-pulse');
                    }, 1000);
                }
                currentAlertTargetId = null;
                currentAlertTargetTab = null;
            }, currentAlertTargetTab === currentTab ? 0 : 100);
        }
    }

    function showToast(orderNum, statusState, description, targetId, targetTab) {
        const overlay = document.getElementById('alert-overlay');
        const orderEl = document.getElementById('alert-order-number');
        const stateEl = document.getElementById('alert-status-state');
        const descEl = document.getElementById('alert-description');
        const iconEl = document.getElementById('alert-icon');

        currentAlertTargetId = targetId;
        currentAlertTargetTab = targetTab;

        orderEl.textContent = orderNum ? `#${orderNum}` : '';
        stateEl.textContent = statusState;
        descEl.textContent = description;

        // Choose icon based on statusState
        if (statusState.toLowerCase().includes('selesai') || statusState.toLowerCase().includes('hampir')) {
            iconEl.textContent = '🔔';
        } else if (statusState.toLowerCase().includes('masuk')) {
            iconEl.textContent = '📦';
        } else {
            iconEl.textContent = '⚠️';
        }

        overlay.style.display = 'flex';
        playNotificationSound();
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
