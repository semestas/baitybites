# 🍪 BaityBites - Order Management System

Sistem manajemen order lengkap untuk BaityBites, dari pemesanan pelanggan hingga pengiriman produk.

## 📋 Fitur Utama

### Workflow Lengkap
```
Customer Order → PO Recording → Invoice & Payment → Production → Packaging → Shipping → Completed
```

### Modul Sistem
- **Dashboard** - Overview statistik dan recent orders
- **Customer Management** - Kelola data pelanggan
- **Product Management** - Kelola produk dan stok
- **Order Management** - Pencatatan dan tracking order
- **Invoice & Payment** - Pengelolaan invoice dan pembayaran
- **Production** - Monitor proses produksi
- **Packaging** - Tracking pengemasan
- **Shipping** - Manajemen pengiriman

## 🛠️ Tech Stack

- **Runtime**: Bun (Fast JavaScript runtime)
- **Backend Framework**: Elysia (High-performance web framework)
- **Database**: SQLite (via Bun:sqlite)
- **Frontend**: HTML5 + Vanilla CSS + JavaScript
- **Authentication**: JWT
- **Styling**: Custom Design System with Premium UI

## 🚀 Quick Start

### Prerequisites
- Bun installed (v1.3.6 or higher)
- Windows/Linux/macOS

### Installation

1. **Clone atau navigate ke project directory**
```bash
cd c:\Users\guest1\Documents\__BAITYBITES__\baitybites
```

2. **Install dependencies**
```bash
bun install
```

3. **Run development server**
```bash
bun run dev
```

4. **Access the application**
```
http://localhost:3000
```

### Default Login
- **Username**: `admin`
- **Password**: `admin123`

## 📁 Project Structure

```
baitybites/
├── src/
│   ├── db/
│   │   └── schema.ts          # Database schema & initialization
│   ├── routes/                # API routes (to be implemented)
│   ├── middleware/            # Authentication & validation
│   └── utils/
│       └── helpers.ts         # Utility functions
├── public/
│   ├── css/
│   │   └── style.css          # Premium design system
│   ├── js/
│   │   ├── app.js             # Core utilities
│   │   └── dashboard.js       # Dashboard logic
│   ├── index.html             # Dashboard page
│   └── assets/                # Images, icons, etc.
├── index.ts                   # Main server file
├── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
- **Primary**: Orange gradient (#f59638 → #ec6817)
- **Secondary**: Green gradient (#4caf50 → #2e7d32)
- **Neutral**: Gray scale for text and backgrounds
- **Status Colors**: Success, Warning, Error, Info

### Typography
- **Primary Font**: Inter (body text)
- **Display Font**: Outfit (headings)

### Components
- Cards with hover effects
- Animated buttons with ripple effect
- Premium badges for status
- Responsive tables
- Modal dialogs
- Form inputs with focus states

## 📊 Database Schema

### Tables
- **customers** - Customer information
- **products** - Product catalog
- **orders** - Order records
- **order_items** - Order line items
- **invoices** - Invoice records
- **payments** - Payment transactions
- **production** - Production tracking
- **packaging** - Packaging status
- **shipping** - Shipping information
- **users** - System users

## 🔐 Authentication

The system uses JWT (JSON Web Tokens) for authentication:
- Token stored in localStorage
- Auto-redirect to login if not authenticated
- Role-based access control (admin, staff, production, shipping)

## 📝 Scripts

```bash
# Development with hot reload
bun run dev

# Production start
bun run start

# Build for production
bun run build
```

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Project setup
- [x] Database schema
- [x] Premium UI design system
- [x] Dashboard layout
- [ ] Authentication system
- [ ] API endpoints

### Phase 2: Order Management
- [ ] Customer CRUD
- [ ] Product CRUD
- [ ] Order creation & tracking
- [ ] Invoice generation
- [ ] Payment recording

### Phase 3: Production & Fulfillment
- [ ] Production workflow
- [ ] Packaging tracking
- [ ] Shipping management
- [ ] Status updates

### Phase 4: Advanced Features
- [ ] PDF invoice generation
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Analytics & reports
- [ ] Export data (Excel/CSV)

## 🤝 Contributing

This is a private project for BaityBites internal use.

## 📄 License

Proprietary - BaityBites © 2026

## 📞 Support

For support, contact the development team.

---

**Built with ❤️ using Bun and Elysia**
