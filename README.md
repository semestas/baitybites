# BaityBites Order Management System

## 🚀 Deployment Configuration

### Netlify (Frontend Only)
Domain: https://baitybites.netlify.app

**Note**: Netlify hanya untuk static files. Backend API harus di-deploy terpisah.

### Backend Options
- Railway.app (Recommended)
- Render.com
- Fly.io

## Environment Variables Required

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
PORT=9876
FRONTEND_URL=https://baitybites.netlify.app
```

### Netlify (.env or netlify.toml)
```
VITE_API_URL=https://your-backend-url.railway.app/api
```

## Local Development
```bash
bun install
bun run dev
```

## Production Build
```bash
bun run build
```

## Database Setup
1. Create PostgreSQL database (Neon, Supabase, or Railway)
2. Run migrations: `bun run migrate`
3. Seed data: `bun run seed`

## Features
- 🛒 Order Management
- 👥 Customer Management
- 📦 Product Catalog
- 🏭 Production Tracking
- 📊 Dashboard Analytics
- 🔐 JWT Authentication

## Tech Stack
- **Runtime**: Bun
- **Backend**: ElysiaJS
- **Database**: PostgreSQL (Neon)
- **Frontend**: Vanilla JS + HTML + CSS
- **Deployment**: Netlify (Frontend) + Railway (Backend)
