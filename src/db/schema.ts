import { Database } from "bun:sqlite";

export interface Customer {
    id?: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    created_at?: string;
}

export interface Product {
    id?: number;
    name: string;
    description: string;
    price: number;
    unit: string;
    stock: number;
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

export function initDatabase(): Database {
    const db = new Database("baitybites.db");

    // Create tables
    db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      order_number TEXT UNIQUE NOT NULL,
      order_date DATETIME NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_date DATETIME NOT NULL,
      due_date DATETIME NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      payment_date DATETIME NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS production (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS packaging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      packaging_date DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS shipping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      shipping_date DATETIME NOT NULL,
      courier TEXT NOT NULL,
      tracking_number TEXT,
      status TEXT DEFAULT 'pending',
      delivery_date DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Insert default admin user (password: admin123)
    const hashedPassword = Bun.password.hashSync("admin123");
    db.run(`
    INSERT OR IGNORE INTO users (username, password, name, role)
    VALUES ('admin', ?, 'Administrator', 'admin')
  `, [hashedPassword]);

    // Insert sample products
    db.run(`
    INSERT OR IGNORE INTO products (id, name, description, price, unit, stock)
    VALUES 
      (1, 'Kue Kering Premium', 'Kue kering premium dengan berbagai varian rasa', 150000, 'toples', 50),
      (2, 'Nastar Special', 'Nastar dengan selai nanas pilihan', 120000, 'toples', 30),
      (3, 'Kastengel Original', 'Kastengel keju premium', 140000, 'toples', 40),
      (4, 'Putri Salju', 'Kue putri salju lembut', 130000, 'toples', 35),
      (5, 'Lidah Kucing', 'Lidah kucing renyah', 110000, 'toples', 45)
  `);

    console.log("✅ Database initialized successfully");
    return db;
}
