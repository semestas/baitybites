
// Dashboard initialization and data loading
(function () {


  // Utility to get utilities safely
  const getUtils = () => window.app || {};

  // Load dashboard data
  async function loadDashboardData() {

    try {
      const utils = getUtils();
      if (!utils.apiCall) {
        console.error('apiCall not found in window.app');
        return;
      }

      const result = await utils.apiCall('/cms/stats');


      if (result && result.success) {
        const { stats, flow, recentOrders } = result.data;

        // Update main stats cards
        updateStats({
          totalOrders: stats.total_orders || 0,
          completedOrders: stats.completed_orders || 0,
          inProgressOrders: stats.in_progress_orders || 0,
          totalRevenue: stats.total_revenue || 0
        });

        // Update order status distribution cards
        updateOrderFlow(flow || {});

        // Update the table of latest orders
        updateRecentOrders(recentOrders || []);

        // Initialize Lucide icons
        if (window.lucide) {
          lucide.createIcons();
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  function updateStats(stats) {
    const utils = getUtils();

    const elements = {
      totalOrders: document.getElementById('totalOrders'),
      completedOrders: document.getElementById('completedOrders'),
      inProgressOrders: document.getElementById('inProgressOrders'),
      totalRevenue: document.getElementById('totalRevenue')
    };

    if (elements.totalOrders) elements.totalOrders.textContent = stats.totalOrders;
    if (elements.completedOrders) elements.completedOrders.textContent = stats.completedOrders;
    if (elements.inProgressOrders) elements.inProgressOrders.textContent = stats.inProgressOrders;
    if (elements.totalRevenue) {
      elements.totalRevenue.textContent = utils.formatCurrency ? utils.formatCurrency(stats.totalRevenue) : ('Rp ' + stats.totalRevenue);
    }
  }

  function updateOrderFlow(flowData) {
    const flowContainer = document.getElementById('orderFlowStats');
    if (!flowContainer) return;

    const flowSteps = [
      { key: 'pending', label: 'Menunggu', icon: 'clock', color: 'var(--status-pending)' },
      { key: 'confirmed', label: 'Dikonfirmasi', icon: 'check-circle-2', color: 'var(--status-confirmed)' },
      { key: 'paid', label: 'Dibayar', icon: 'banknote', color: 'var(--success)' },
      { key: 'production', label: 'Produksi', icon: 'flame', color: 'var(--status-production)' },
      { key: 'packaging', label: 'Packing', icon: 'package', color: 'var(--status-packaging)' },
      { key: 'shipping', label: 'Kirim', icon: 'truck', color: 'var(--status-shipping)' },
      { key: 'completed', label: 'Diterima', icon: 'flag', color: 'var(--status-completed)' }
    ];

    flowContainer.innerHTML = flowSteps.map(step => `
      <div id="flow-${step.key}" class="flow-step" style="border-bottom-color: ${step.color}">
        <span class="step-label">${step.label}</span>
        <span class="step-value">${flowData[step.key] || 0}</span>
      </div>
    `).join('');
  }

  function updateRecentOrders(orders) {
    const tableBody = document.getElementById('recentOrdersTable');
    if (!tableBody) return;

    const utils = getUtils();

    if (!orders || orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 2rem;">
            <div style="color: #9ca3af;">No recent orders</div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = orders.map(order => {
      const orderDate = new Date(order.order_date);
      const timeStr = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateStr = utils.formatDate ? utils.formatDate(order.order_date) : order.order_date;

      return `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${order.customer_name}</td>
                <td>
                    <div style="font-weight: 600;">${dateStr}</div>
                    <div class="text-xs text-muted">${timeStr}</div>
                </td>
                <td><strong>${utils.formatCurrency ? utils.formatCurrency(order.total_amount) : ('Rp ' + order.total_amount)}</strong></td>
                <td>
                    <span class="badge ${utils.getStatusBadgeClass ? utils.getStatusBadgeClass(order.status) : ''}">
                        ${utils.getStatusLabel ? utils.getStatusLabel(order.status) : order.status}
                    </span>
                </td>
                <td class="text-right">
                    <button class="btn btn-primary btn-sm" onclick="viewOrder(${order.id})">
                        Lihat
                    </button>
                </td>
            </tr>
        `;
    }).join('');
  }

  // Global exposure for event handlers
  window.viewOrder = function (orderId) {
    window.location.href = `/orders.html?id=${orderId}`;
  };

  // Initialize
  const init = () => {

    // Redirection is now handled by checkAuth() in app.js
    loadDashboardData();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Auto-refresh stats
  // setInterval(loadDashboardData, 30000); // 30s for production stability
})();
