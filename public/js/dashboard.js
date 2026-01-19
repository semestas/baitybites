// Dashboard specific functionality
const { apiCall, formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } = window.app;

// Load dashboard data
async function loadDashboardData() {
  try {
    // For now, we'll use mock data since we haven't created the API endpoints yet
    // This will be replaced with actual API calls

    const mockStats = {
      totalOrders: 24,
      completedOrders: 18,
      inProgressOrders: 6,
      totalRevenue: 3600000
    };

    const mockOrderFlow = {
      pending: 2,
      confirmed: 1,
      invoiced: 1,
      paid: 2,
      production: 3,
      packaging: 2,
      shipping: 1,
      completed: 18
    };

    const mockRecentOrders = [
      {
        id: 1,
        order_number: 'PO-20260119-0001',
        customer_name: 'Ibu Siti Aminah',
        order_date: '2026-01-19',
        total_amount: 450000,
        status: 'production'
      },
      {
        id: 2,
        order_number: 'PO-20260118-0002',
        customer_name: 'Bapak Ahmad Rizki',
        order_date: '2026-01-18',
        total_amount: 300000,
        status: 'packaging'
      },
      {
        id: 3,
        order_number: 'PO-20260117-0003',
        customer_name: 'Ibu Dewi Lestari',
        order_date: '2026-01-17',
        total_amount: 520000,
        status: 'shipping'
      },
      {
        id: 4,
        order_number: 'PO-20260116-0004',
        customer_name: 'Bapak Hendra Wijaya',
        order_date: '2026-01-16',
        total_amount: 380000,
        status: 'completed'
      },
      {
        id: 5,
        order_number: 'PO-20260115-0005',
        customer_name: 'Ibu Ratna Sari',
        order_date: '2026-01-15',
        total_amount: 420000,
        status: 'completed'
      }
    ];

    // Update stats
    updateStats(mockStats);

    // Update order flow
    updateOrderFlow(mockOrderFlow);

    // Update recent orders table
    updateRecentOrders(mockRecentOrders);

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

function updateStats(stats) {
  document.getElementById('totalOrders').textContent = stats.totalOrders;
  document.getElementById('completedOrders').textContent = stats.completedOrders;
  document.getElementById('inProgressOrders').textContent = stats.inProgressOrders;
  document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
}

function updateOrderFlow(flowData) {
  const flowContainer = document.getElementById('orderFlowStats');

  const flowSteps = [
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'confirmed', label: 'Confirmed', icon: '✓' },
    { key: 'paid', label: 'Paid', icon: '💳' },
    { key: 'production', label: 'Production', icon: '🏭' },
    { key: 'packaging', label: 'Packaging', icon: '📦' },
    { key: 'shipping', label: 'Shipping', icon: '🚚' },
    { key: 'completed', label: 'Completed', icon: '✅' }
  ];

  flowContainer.innerHTML = flowSteps.map(step => `
    <div style="text-align: center; padding: var(--spacing-lg); background: var(--neutral-50); border-radius: var(--radius-lg); transition: all 0.3s;">
      <div style="font-size: 2.5rem; margin-bottom: var(--spacing-sm);">${step.icon}</div>
      <div style="font-size: 0.875rem; color: var(--neutral-600); margin-bottom: var(--spacing-xs);">${step.label}</div>
      <div style="font-size: 1.75rem; font-weight: 700; color: var(--primary-600);">${flowData[step.key] || 0}</div>
    </div>
  `).join('');
}

function updateRecentOrders(orders) {
  const tableBody = document.getElementById('recentOrdersTable');

  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: var(--spacing-xl);">
          <div style="color: var(--neutral-500);">No recent orders</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.order_number}</strong></td>
      <td>${order.customer_name}</td>
      <td>${formatDate(order.order_date)}</td>
      <td><strong>${formatCurrency(order.total_amount)}</strong></td>
      <td>
        <span class="badge ${getStatusBadgeClass(order.status)}">
          ${getStatusLabel(order.status)}
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

function viewOrder(orderId) {
  window.location.href = `/orders.html?id=${orderId}`;
}

// Check if user is admin
function isAdmin() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return false;

  try {
    const user = JSON.parse(userStr);
    return user.role === 'admin';
  } catch (e) {
    return false;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Hide Recent Orders section if not admin
  if (!isAdmin()) {
    const recentOrdersCard = document.querySelector('.card.animate-fade-in:has(#recentOrdersTable)');
    if (recentOrdersCard) {
      recentOrdersCard.style.display = 'none';
    }
  }

  loadDashboardData();

  // Refresh data every 30 seconds
  setInterval(loadDashboardData, 30000);
});
