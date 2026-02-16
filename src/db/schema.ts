import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}
const sql = postgres(connectionString, {
  ssl: 'require',      // Explicitly require SSL for Neon/Serverless DBs
  onnotice: () => { }, // Suppress NOTICE logs to keep production logs clean
  max: 5,              // Reduced max connections for stability on free/shared tiers
  idle_timeout: 20,    // Idle connection timeout in seconds
  connect_timeout: 30, // Connection timeout in seconds
  prepare: false       // Disable prepared statements for better compatibility with poolers/shards
});

export interface Customer {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  google_id?: string;
  auth_provider?: 'local' | 'google';
  avatar_url?: string;
  is_verified?: boolean;
  created_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  image_url?: string;
  created_at?: string;
}

export interface Order {
  id?: number;
  customer_id: number;
  order_number: string;
  order_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'invoiced' | 'paid' | 'production' | 'packaging' | 'shipping' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Invoice {
  id?: number;
  order_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  created_at?: string;
}

export interface Payment {
  id?: number;
  invoice_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at?: string;
}

export interface Production {
  id?: number;
  order_id: number;
  start_date: string;
  end_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at?: string;
}

export interface Packaging {
  id?: number;
  order_id: number;
  packaging_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  created_at?: string;
}

export interface Shipping {
  id?: number;
  order_id: number;
  shipping_date: string;
  courier: string;
  tracking_number?: string;
  status: 'pending' | 'in_transit' | 'delivered';
  delivery_date?: string;
  notes?: string;
  created_at?: string;
}

export interface User {
  id?: number;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'staff' | 'production' | 'shipping';
  created_at?: string;
}

export async function initDatabase() {
  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      google_id TEXT UNIQUE,
      auth_provider TEXT DEFAULT 'local',
      avatar_url TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Migration for existing customers table
  try {
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local'`;
    await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`;
  } catch (e) {
    console.error("Migration error on customers table:", e);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      price DECIMAL(10,2) NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      production_time INTEGER DEFAULT 10, -- minutes per unit/box
      packaging_time INTEGER DEFAULT 5,   -- minutes per unit/box
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Migration: Add image_url and time columns if they don't exist
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General'`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS production_time INTEGER DEFAULT 10`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_time INTEGER DEFAULT 5`;
  } catch (e) {
    console.error("Migration error on products table:", e);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      order_number TEXT UNIQUE NOT NULL,
      order_date TIMESTAMPTZ NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_date TIMESTAMPTZ NOT NULL,
      due_date TIMESTAMPTZ NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      payment_date TIMESTAMPTZ NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS production (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS packaging (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      packaging_date TIMESTAMPTZ NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS shipping (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      shipping_date TIMESTAMPTZ NOT NULL,
      courier TEXT NOT NULL,
      tracking_number TEXT,
      status TEXT DEFAULT 'pending',
      delivery_date TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      source TEXT DEFAULT 'local', -- 'local' or 'instagram'
      external_id TEXT,             -- Instagram Media ID
      engagement_score INTEGER DEFAULT 0, -- Likes + Comments for sorting
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await sql`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local'`;
    await sql`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS external_id TEXT`;
    await sql`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0`;
  } catch (e) {
    console.error("Migration error on gallery table:", e);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      avatar_url TEXT,
      content TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      is_approved BOOLEAN DEFAULT FALSE,
      reply TEXT,
      reply_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Migration for testimonials reply
  try {
    await sql`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reply TEXT`;
    await sql`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ`;
  } catch (e) {
    console.error("Migration error on testimonials table:", e);
  }

  // Insert default admin user (password: admin123)
  const adminExists = await sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`;
  if (adminExists.length === 0) {
    const hashedPassword = await Bun.password.hash("admin123");
    await sql`
      INSERT INTO users (username, password, name, role)
      VALUES ('admin', ${hashedPassword}, 'Administrator', 'admin')
    `;
  }

  // Seed products (Risol Mayo & Cookies)
  const seedProducts: { name: string; description: string; category: string; price: number; unit: string; stock: number }[] = [
    { name: 'Risol Mayo Original', description: 'Risol mayo dengan isian smoked beef, telur, dan mayonaise spesial', category: 'Risol', price: 35000, unit: 'box (5 pcs)', stock: 50 },
    { name: 'Risol Mayo Spicy', description: 'Risol mayo pedas dengan saus sambal racikan khusus', category: 'Risol', price: 38000, unit: 'box (5 pcs)', stock: 45 },
    { name: 'Risol Mayo Cheese', description: 'Risol mayo dengan extra keju mozzarella yang lumer', category: 'Risol', price: 40000, unit: 'box (5 pcs)', stock: 40 },
    { name: 'Nastar Special', description: 'Nastar dengan selai nanas pilihan', category: 'Kue Kering', price: 120000, unit: 'toples', stock: 30 },
    { name: 'Kastengel Original', description: 'Kastengel keju premium', category: 'Kue Kering', price: 140000, unit: 'toples', stock: 40 },
    { name: 'Putri Salju', description: 'Kue putri salju lembut', category: 'Kue Kering', price: 130000, unit: 'toples', stock: 35 },
    { name: 'Lidah Kucing', description: 'Lidah kucing renyah', category: 'Kue Kering', price: 110000, unit: 'toples', stock: 45 }
  ];

  for (const p of seedProducts) {
    const exists = await sql`SELECT id FROM products WHERE name = ${p.name} LIMIT 1`;
    if (exists.length === 0) {
      await sql`
        INSERT INTO products (name, description, category, price, unit, stock)
        VALUES (${p.name}, ${p.description}, ${p.category}, ${p.price}, ${p.unit}, ${p.stock})
      `;
      console.log(`Created product: ${p.name}`);
    }
  }

  console.log("✅ PostgreSQL Database initialized successfully");
  return sql;
}

export type Sql = typeof sql;
