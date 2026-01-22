
// Dashboard initialization and data loading
(function () {
  console.log('Dashboard script loaded with Lucide Icons integration');

  // Utility to get utilities safely
  const getUtils = () => window.app || {};

  // Load dashboard data
  async function loadDashboardData() {
    console.log('Attempting to load dashboard data...');
    try {
      const utils = getUtils();
      if (!utils.apiCall) {
        console.error('apiCall not found in window.app');
        return;
      }

      const result = await utils.apiCall('/cms/stats');
      console.log('Dashboard stats result:', result);

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
    console.log('Updating stats cards:', stats);

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

    // Update icons with Lucide
    const statIcons = document.querySelectorAll('.stat-card .stat-icon');
    const iconNames = ['package', 'check', 'settings', 'banknote'];

    statIcons.forEach((el, index) => {
      el.innerHTML = `<i data-lucide="${iconNames[index]}" style="width: 48px; height: 48px; opacity: 0.2;"></i>`;
    });
  }

  function updateOrderFlow(flowData) {
    console.log('Updating order flow status:', flowData);
    const flowContainer = document.getElementById('orderFlowStats');
    if (!flowContainer) return;

    const flowSteps = [
      { key: 'pending', label: 'Pending', icon: 'clock', color: '#f59e0b', ringColor: '#8bc34a' },
      { key: 'confirmed', label: 'Confirmed', icon: 'check', color: '#3b82f6', ringColor: '#3b82f6' },
      { key: 'paid', label: 'Paid', icon: 'credit-card', color: '#10b981', ringColor: '#10b981' },
      { key: 'production', label: 'Production', icon: 'factory', color: '#a855f7', ringColor: '#a855f7' },
      { key: 'packaging', label: 'Packaging', icon: 'package', color: '#f97316', ringColor: '#f97316' },
      { key: 'shipping', label: 'Shipping', icon: 'truck', color: '#2563eb', ringColor: '#2563eb' },
      { key: 'completed', label: 'Completed', icon: 'check-circle', color: '#059669', ringColor: '#059669' }
    ];

    flowContainer.innerHTML = flowSteps.map(step => `
      <div id="flow-${step.key}" class="stat-pill">
        <div class="stat-pill-icon-wrapper">
          <div class="stat-pill-ring" style="border-top-color: ${step.ringColor}"></div>
          <div class="flow-icon" style="z-index: 1; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="${step.icon}" class="stat-pill-icon"></i>
          </div>
        </div>
        <div class="stat-pill-info">
          <div class="stat-pill-label" style="color: ${step.color}">${step.label}</div>
          <div class="stat-pill-value" style="color: ${step.color}">${flowData[step.key] || 0}</div>
        </div>
      </div>
    `).join('');
  }

  function updateRecentOrders(orders) {
    console.log('Updating recent orders table:', orders);
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

    tableBody.innerHTML = orders.map(order => `
      <tr>
        <td><strong>${order.order_number}</strong></td>
        <td>${order.customer_name}</td>
        <td>${utils.formatDate ? utils.formatDate(order.order_date) : order.order_date}</td>
        <td><strong>${utils.formatCurrency ? utils.formatCurrency(order.total_amount) : ('Rp ' + order.total_amount)}</strong></td>
        <td>
          <span class="badge ${utils.getStatusBadgeClass ? utils.getStatusBadgeClass(order.status) : ''}">
            ${utils.getStatusLabel ? utils.getStatusLabel(order.status) : order.status}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="viewOrder(${order.id})">
            View
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Global exposure for event handlers
  window.viewOrder = function (orderId) {
    window.location.href = `/orders.html?id=${orderId}`;
  };

  // Initialize
  const init = () => {
    console.log('Initializing Dashboard Layout...');
    // Redirection is now handled by checkAuth() in app.js
    loadDashboardData();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Auto-refresh stats
  setInterval(loadDashboardData, 5000);
})();
