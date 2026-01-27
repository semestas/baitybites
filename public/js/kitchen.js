
(function () {
    let currentTab = 'incoming';
    let ordersCache = { incoming: [], queue: [] };
    let lastOrderCount = 0;
    let currentAlertTargetId = null;
    let currentAlertTargetTab = null;
    let currentSort = 'newest';

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
                icon.classList.add('sound-active');
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
                const connStatus = document.getElementById('connectionStatus');
                connStatus.classList.remove('connection-offline');
                connStatus.classList.add('connection-online');
            }
        } catch (e) {
            console.error('Sync failed', e);
            const connStatus = document.getElementById('connectionStatus');
            connStatus.classList.remove('connection-online');
            connStatus.classList.add('connection-offline');
        }
    }

    function updateCounts() {
        document.getElementById('count-incoming').textContent = ordersCache.incoming.length;
        document.getElementById('count-production').textContent = ordersCache.queue.length;
    }

    function renderIncoming(data) {
        const container = document.getElementById('app-content');
        if (data.length === 0) {
            container.innerHTML = emptyState('Tidak ada pesanan baru.');
            return;
        }

        container.innerHTML = `
            <div class="order-grid">
                ${data.map(order => `
                    <div class="order-card" data-status="${order.status}" id="order-${order.id}">
                        <div class="order-header">
                            <div>
                                <div class="order-number">#${order.order_number}</div>
                                <div class="order-customer">${order.customer_name}</div>
                            </div>
                            <span class="status-badge ${order.status}">Pending</span>
                        </div>
                        
                        <div class="order-items-divider">
                            ${(() => {
                const firstItem = order.items[0];
                const remainingCount = order.items.length - 1;
                return `
                                    <div class="order-item-row">
                                        <span class="order-item-name">${firstItem.product_name}</span>
                                        <span class="order-item-price">Rp ${(firstItem.subtotal || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                    ${remainingCount > 0 ? `<div class="order-items-others">+ ${remainingCount} other${remainingCount > 1 ? 's' : ''}</div>` : ''}
                                `;
            })()}
                        </div>

                        <div class="order-footer">
                            <div>${window.app.formatCurrency(order.total_amount)}</div>
                            <div>${new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        <div class="flex-spacer"></div>

                        <button class="action-btn btn-confirm" onclick="confirmOrder(${order.id})">
                            <i data-lucide="check-circle"></i> Set Confirmed
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        lucide.createIcons();
    }

    function renderProduction(data) {
        const container = document.getElementById('app-content');
        if (data.length === 0) {
            container.innerHTML = emptyState('Dapur sedang santai.');
            return;
        }

        container.innerHTML = `
            <div class="order-grid">
                ${data.map(order => {
            let actionBtn = '';
            let timeline = '';
            let isOverdue = false;

            // Logic button & timeline based on status
            if (order.status === 'confirmed') {
                actionBtn = `<button class="action-btn btn-cook" onclick="updateStatus(${order.id}, 'production')"><i data-lucide="flame"></i> MULAI MASAK</button>`;
                timeline = `<span class="status-wait"><i data-lucide="clock" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Menunggu</span>`;
            } else if (order.status === 'production') {
                actionBtn = `<button class="action-btn btn-pack" onclick="updateStatus(${order.id}, 'packaging')"><i data-lucide="package"></i> SELESAI MASAK</button>`;
                const start = new Date(order.prod_start);
                const elapsed = Math.floor((new Date() - start) / 60000);
                const target = order.estimations.total_mins;
                isOverdue = elapsed >= target;
                timeline = `<span class="${isOverdue ? 'status-overdue' : 'status-cooking'}"><i data-lucide="flame" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Masak: ${elapsed} mnt</span>`;
            } else if (order.status === 'packaging') {
                actionBtn = `<button class="action-btn btn-ship" onclick="updateStatus(${order.id}, 'shipping')"><i data-lucide="truck"></i> SIAP KIRIM</button>`;
                timeline = `<span class="status-packing"><i data-lucide="package" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Packing</span>`;
            }

            return `
                <div class="order-card ${isOverdue ? 'overdue-border' : ''}" data-status="${order.status}" id="order-${order.id}">
                    <div class="order-header-wrap">
                        <div class="order-num-fill">
                            #${order.order_number}
                        </div>                            
                        <div class="status-badge ${order.status} status-badge-fit">
                            ${order.status === 'confirmed' ? 'Ready' : order.status === 'production' ? 'Cooking' : 'Packing'}
                        </div>
                        <div class="time-keeper-row" >
                            <div class="time-status-row">
                                ${timeline.replace('class="', `class="time-status-truncate `)}
                            </div>
                            <div class="timer-badge-secondary">
                                <i data-lucide="target" style="width:12px;height:12px;vertical-align:text-bottom;"></i> Est: ${order.estimations.total_mins}m
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-items-divider">
                        ${(() => {
                    const firstItem = order.items[0];
                    const remainingCount = order.items.length - 1;
                    return `
                                <div class="order-item-row">
                                    <span class="order-item-name">${firstItem.product_name}</span>
                                    <span class="order-item-qty">×${firstItem.quantity}</span>
                                </div>
                                ${remainingCount > 0 ? `<div class="order-items-others">+ ${remainingCount} other${remainingCount > 1 ? 's' : ''}</div>` : ''}
                            `;
                })()}
                    </div>
                    
                    ${order.notes ? `<div class="order-notes-box"><i data-lucide="info" style="width:14px;height:14px;vertical-align:text-bottom;"></i> ${order.notes}</div>` : ''}

                    <div class="flex-spacer"></div>

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
            <div class="empty-state-container">
                <i data-lucide="coffee" size="48"></i>
                <p>${msg}</p>
            </div>
        `;
    }

    window.switchTab = function (tab) {
        currentTab = tab;
        const buttons = document.querySelectorAll('.tab-btn');
        const optUrgent = document.getElementById('opt-urgent');

        if (tab === 'incoming') {
            buttons[0].classList.add('active');
            buttons[1].classList.remove('active');
            optUrgent.classList.add('hidden');
            if (currentSort === 'urgent') {
                currentSort = 'newest';
                document.getElementById('selectedValue').textContent = 'Terbaru';
                document.querySelectorAll('.dropdown-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.value === 'newest');
                });
            }
        } else {
            buttons[0].classList.remove('active');
            buttons[1].classList.add('active');
            optUrgent.classList.remove('hidden');
        }

        renderCurrentTab();
    }


    function getSortedData() {
        let data = currentTab === 'incoming' ? [...ordersCache.incoming] : [...ordersCache.queue];

        data.sort((a, b) => {
            if (currentSort === 'newest') {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            if (currentSort === 'oldest') {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            if (currentSort === 'items') {
                const countA = a.items.reduce((sum, i) => sum + i.quantity, 0);
                const countB = b.items.reduce((sum, i) => sum + i.quantity, 0);
                return countB - countA;
            }
            if (currentSort === 'urgent' && currentTab === 'production') {
                // Production target urgency
                const startA = new Date(a.prod_start);
                const elapsedA = Math.floor((new Date() - startA) / 60000);
                const urgentA = a.estimations.total_mins - elapsedA;

                const startB = new Date(b.prod_start);
                const elapsedB = Math.floor((new Date() - startB) / 60000);
                const urgentB = b.estimations.total_mins - elapsedB;

                return urgentA - urgentB; // Lower (or negative) value means more urgent
            }
            return 0;
        });

        return data;
    }

    function renderCurrentTab() {
        const sortedData = getSortedData();
        if (currentTab === 'incoming') renderIncoming(sortedData);
        else renderProduction(sortedData);
    }


    window.hideAlert = function () {
        document.getElementById('alert-overlay').classList.remove('active');

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
        let iconName = 'bell';
        if (statusState.toLowerCase().includes('selesai') || statusState.toLowerCase().includes('hampir')) {
            iconName = 'bell';
        } else if (statusState.toLowerCase().includes('masuk')) {
            iconName = 'package';
        } else {
            iconName = 'alert-triangle';
        }
        iconEl.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons();

        overlay.classList.add('active');
        playNotificationSound();
    }

    // Public Actions
    window.confirmOrder = async (id) => {
        const order = ordersCache.incoming.find(o => o.id === id);
        if (!confirm(`Verifikasi pembayaran & pesanan #${order?.order_number || id} sudah benar?`)) return;
        await updateStatus(id, 'confirmed');
    };

    window.updateStatus = async (id, status) => {
        const order = [...ordersCache.incoming, ...ordersCache.queue].find(o => o.id === id);
        try {
            const { apiCall, showNotification, getStatusLabel } = window.app;
            await apiCall(`/cms/orders/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });

            showNotification(`Melanjutkan Pesanan #${order?.order_number || id} ke proses ${getStatusLabel(status)}`, 'success');

            loadData(); // Refresh immediately
        } catch (e) {
            alert('Gagal update status');
        }
    };

    // Custom Dropdown Logic
    (function initDropdown() {
        const dropdown = document.getElementById('sortDropdown');
        const trigger = document.getElementById('dropdownTrigger');
        const items = document.querySelectorAll('.dropdown-item');
        const selectedValueText = document.getElementById('selectedValue');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        items.forEach(item => {
            item.addEventListener('click', () => {
                const val = item.dataset.value;
                const text = item.querySelector('span').textContent;

                currentSort = val;
                selectedValueText.textContent = text;

                // Update active state
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                dropdown.classList.remove('open');
                renderCurrentTab();
            });
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        // Initialize icons for the static dropdown
        if (window.lucide) {
            lucide.createIcons();
        }
    })();

    // Init
    loadData();
    setInterval(loadData, 5000); // Poll every 5s for near-realtime feel

})();
