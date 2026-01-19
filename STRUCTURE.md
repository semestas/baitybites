# 📁 BaityBites Project Structure

## Directory Layout

```
baitybites/
│
├── 📄 index.ts                    # Main server entry point
├── 📄 package.json                # Project dependencies & scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 bun.lock                    # Dependency lock file
├── 📄 README.md                   # Project documentation
├── 📄 .gitignore                  # Git ignore rules
├── 📄 .env.example                # Environment variables template
├── 📄 baitybites.db               # SQLite database (auto-generated)
│
├── 📂 src/                        # Source code
│   ├── 📂 db/
│   │   └── schema.ts              # Database schema & initialization
│   │
│   ├── 📂 routes/                 # API route handlers (to be implemented)
│   │   ├── auth.ts                # Authentication routes
│   │   ├── customers.ts           # Customer CRUD
│   │   ├── products.ts            # Product CRUD
│   │   ├── orders.ts              # Order management
│   │   ├── invoices.ts            # Invoice & payment
│   │   ├── production.ts          # Production tracking
│   │   └── shipping.ts            # Shipping management
│   │
│   ├── 📂 middleware/             # Middleware functions
│   │   ├── auth.ts                # JWT authentication
│   │   └── validation.ts          # Request validation
│   │
│   └── 📂 utils/
│       └── helpers.ts             # Utility functions
│
├── 📂 public/                     # Static files (served by Elysia)
│   ├── 📄 index.html              # Dashboard page
│   │
│   ├── 📂 css/
│   │   └── style.css              # Premium design system
│   │
│   ├── 📂 js/
│   │   ├── app.js                 # Core utilities & API wrapper
│   │   └── dashboard.js           # Dashboard functionality
│   │
│   └── 📂 assets/                 # Images, icons, fonts
│       └── (to be added)
│
└── 📂 node_modules/               # Dependencies (auto-generated)
```

## File Descriptions

### Root Files

- **index.ts**: Main server file with Elysia setup, middleware, and route registration
- **package.json**: NPM package configuration with scripts and dependencies
- **tsconfig.json**: TypeScript compiler configuration
- **README.md**: Project documentation and setup guide
- **.gitignore**: Files and directories to exclude from Git
- **.env.example**: Template for environment variables
- **baitybites.db**: SQLite database (created on first run)

### Source Code (`src/`)

#### Database (`src/db/`)
- **schema.ts**: 
  - Database table definitions
  - TypeScript interfaces for all entities
  - Database initialization function
  - Sample data seeding

#### Routes (`src/routes/`) - To Be Implemented
- **auth.ts**: Login, logout, token refresh
- **customers.ts**: Customer CRUD operations
- **products.ts**: Product management
- **orders.ts**: Order creation and tracking
- **invoices.ts**: Invoice generation and payment recording
- **production.ts**: Production workflow management
- **shipping.ts**: Shipping and delivery tracking

#### Middleware (`src/middleware/`) - To Be Implemented
- **auth.ts**: JWT verification and user authentication
- **validation.ts**: Request body validation

#### Utils (`src/utils/`)
- **helpers.ts**: 
  - Order/invoice number generation
  - Currency and date formatting
  - Status badge utilities

### Frontend (`public/`)

#### HTML Pages
- **index.html**: Dashboard with stats and recent orders
- **orders.html**: Order management (to be created)
- **customers.html**: Customer management (to be created)
- **products.html**: Product catalog (to be created)
- **production.html**: Production tracking (to be created)
- **login.html**: Login page (to be created)

#### Stylesheets (`public/css/`)
- **style.css**: 
  - Design system with CSS variables
  - Component styles (cards, buttons, forms, tables)
  - Responsive grid system
  - Animations and transitions
  - Premium color palette

#### JavaScript (`public/js/`)
- **app.js**: 
  - API call wrapper
  - Formatting utilities
  - Authentication helpers
  - Notification system
  
- **dashboard.js**: 
  - Dashboard data loading
  - Stats visualization
  - Recent orders table
  - Order flow tracking

## Technology Stack

### Backend
- **Bun**: JavaScript runtime (faster than Node.js)
- **Elysia**: Web framework (high performance)
- **SQLite**: Embedded database
- **JWT**: Authentication tokens

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with variables
- **Vanilla JavaScript**: No framework overhead
- **Google Fonts**: Inter & Outfit typography

## Data Flow

```
Client (Browser)
    ↓
Static Files (HTML/CSS/JS)
    ↓
API Calls (fetch)
    ↓
Elysia Server (index.ts)
    ↓
Route Handlers (src/routes/)
    ↓
Database (SQLite via Bun)
    ↓
Response (JSON)
    ↓
Client Update (DOM manipulation)
```

## Order Workflow

```
1. Customer Order
   └─> Create order record
   └─> Add order items
   
2. PO Recording
   └─> Generate order number
   └─> Set status: confirmed
   
3. Invoice & Payment
   └─> Generate invoice
   └─> Record payments
   └─> Update status: paid
   
4. Production
   └─> Start production
   └─> Track progress
   └─> Update status: production
   
5. Packaging
   └─> Package products
   └─> Update status: packaging
   
6. Shipping
   └─> Assign courier
   └─> Generate tracking number
   └─> Update status: shipping
   
7. Completed
   └─> Confirm delivery
   └─> Update status: completed
```

## Next Steps

1. ✅ Project setup
2. ✅ Database schema
3. ✅ Design system
4. ✅ Dashboard UI
5. ⏳ Authentication system
6. ⏳ API endpoints
7. ⏳ Order management
8. ⏳ Production workflow
9. ⏳ Shipping tracking
10. ⏳ Reports & analytics
