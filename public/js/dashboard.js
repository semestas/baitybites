
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
      { key: 'pending', label: 'Pending', icon: 'clock', color: '#f59e0b' },
      { key: 'confirmed', label: 'Confirmed', icon: 'check', color: '#3b82f6' },
      { key: 'paid', label: 'Paid', icon: 'credit-card', color: '#10b981' },
      { key: 'production', label: 'In Production', icon: 'flame', color: '#a855f7' },
      { key: 'packaging', label: 'Wait for Packing', icon: 'package', color: '#f97316' },
      { key: 'shipping', label: 'Ready to Ship', icon: 'truck', color: '#2563eb' },
      { key: 'completed', label: 'Arrived', icon: 'check-circle', color: '#059669' }
    ];

    flowContainer.innerHTML = flowSteps.map(step => `
      <div id="flow-${step.key}" class="stat-card" style="border-left-color: ${step.color}">
        <div class="stat-content">
          <div class="stat-label">${step.label}</div>
          <div class="stat-value">${flowData[step.key] || 0}</div>
        </div>
        <div class="stat-icon">
          <i data-lucide="${step.icon}"></i>
        </div>
      </div>
    `).join('');
  }

  function updateRecentOrders(orders) {
    // console.log('Updating recent orders table:', orders);
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
