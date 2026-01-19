// Header component template
function createHeader(activePage = 'dashboard') {
    return `
    <header class="header">
      <div class="container">
        <div class="header-content">
          <a href="/" class="logo">
            <img src="/assets/logo.png" alt="BaityBites Logo" style="height: 50px; width: auto;">
          </a>
          <nav class="nav" id="mainNav">
            <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
            <a href="/orders.html" class="nav-link ${activePage === 'orders' ? 'active' : ''}">Orders</a>
            <a href="/customers.html" class="nav-link ${activePage === 'customers' ? 'active' : ''}">Customers</a>
            <a href="/products.html" class="nav-link ${activePage === 'products' ? 'active' : ''}">Products</a>
            <a href="/production.html" class="nav-link ${activePage === 'production' ? 'active' : ''}">Production</a>
            <button class="btn btn-primary btn-sm" onclick="window.app.logout()">Logout</button>
          </nav>
        </div>
      </div>
    </header>
  `;
}

// Footer component template
function createFooter() {
    return `
    <footer style="background: var(--neutral-900); color: white; padding: var(--spacing-xl) 0; text-align: center; margin-top: var(--spacing-2xl);">
      <div class="container">
        <p>&copy; 2026 BaityBites. All rights reserved.</p>
        <p class="text-muted" style="font-size: 0.875rem; margin-top: var(--spacing-sm); color: var(--neutral-400);">
          Order Management System v1.0
        </p>
      </div>
    </footer>
  `;
}

// Page wrapper template
function createPageWrapper(title, content, activePage = 'dashboard') {
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - BaityBites</title>
      <meta name="description" content="Sistem manajemen order untuk BaityBites - dari pemesanan hingga pengiriman">
      <link rel="stylesheet" href="/css/style.css">
    </head>
    <body>
      <div class="page-wrapper">
        ${createHeader(activePage)}
        <main class="main-content">
          <div class="container">
            ${content}
          </div>
        </main>
        ${createFooter()}
      </div>
      <script src="/js/app.js"></script>
    </body>
    </html>
  `;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.components = {
        createHeader,
        createFooter,
        createPageWrapper
    };
}
