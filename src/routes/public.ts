import { Elysia, t } from 'elysia';
import { Database } from 'bun:sqlite';
import { generateOrderNumber, generateInvoiceNumber } from '../utils/helpers';

export const publicRoutes = (db: Database) =>
    new Elysia({ prefix: '/public' })
        .post('/order', async ({ body, set }) => {
            const { name, email, phone, address, items, notes } = body;

            try {
                db.run('BEGIN TRANSACTION');

                // 1. Create or Find Customer
                let customer: any = db.query('SELECT id FROM customers WHERE email = ?').get(email);
                if (!customer) {
                    const result = db.query('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?) RETURNING id').get(name, email, phone, address) as any;
                    customer = { id: result.id };
                } else {
                    db.run('UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?', [name, phone, address, customer.id]);
                }

                // 2. Create Order
                const orderNumber = generateOrderNumber();
                const totalAmount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);

                const orderResult = db.query(`
          INSERT INTO orders (customer_id, order_number, order_date, total_amount, status, notes)
          VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'pending', ?)
          RETURNING id
        `).get(customer.id, orderNumber, totalAmount, notes) as any;

                const orderId = orderResult.id;

                // 3. Add Items
                const insertItem = db.prepare(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `);

                for (const item of items) {
                    insertItem.run(orderId, item.product_id, item.quantity, item.price, item.price * item.quantity);
                }

                // 4. Generate Initial Invoice
                const invoiceNumber = generateInvoiceNumber();
                db.run(`
          INSERT INTO invoices (order_id, invoice_number, invoice_date, due_date, total_amount, status)
          VALUES (?, ?, CURRENT_TIMESTAMP, date('now', '+1 day'), ?, 'unpaid')
        `, [orderId, invoiceNumber, totalAmount]);

                db.run('COMMIT');

                return {
                    success: true,
                    message: 'Order berhasil dibuat',
                    data: {
                        order_number: orderNumber,
                        invoice_number: invoiceNumber,
                        total_amount: totalAmount
                    }
                };
            } catch (error) {
                db.run('ROLLBACK');
                console.error('Order error:', error);
                set.status = 500;
                return { success: false, message: 'Gagal membuat order' };
            }
        }, {
            body: t.Object({
                name: t.String(),
                email: t.String(),
                phone: t.String(),
                address: t.String(),
                notes: t.Optional(t.String()),
                items: t.Array(t.Object({
                    product_id: t.Number(),
                    quantity: t.Number(),
                    price: t.Number()
                }))
            })
        })
        .get('/track/:number', async ({ params, set }) => {
            const { number } = params;

            // Search by order number or invoice number
            const order: any = db.query(`
        SELECT 
          o.*, 
          c.name as customer_name,
          i.invoice_number,
          i.status as invoice_status,
          prod.status as production_status,
          pack.status as packaging_status,
          ship.status as shipping_status,
          ship.courier,
          ship.tracking_number
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN invoices i ON o.id = i.order_id
        LEFT JOIN production prod ON o.id = prod.order_id
        LEFT JOIN packaging pack ON o.id = pack.order_id
        LEFT JOIN shipping ship ON o.id = ship.order_id
        WHERE o.order_number = ? OR i.invoice_number = ?
        ORDER BY o.created_at DESC
        LIMIT 1
      `).get(number, number);

            if (!order) {
                set.status = 404;
                return { success: false, message: 'Pesanan tidak ditemukan' };
            }

            // Get items
            const items = db.query(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);

            return {
                success: true,
                data: {
                    ...order,
                    items
                }
            };
        })
        .get('/products', async () => {
            return {
                success: true,
                data: db.query('SELECT * FROM products WHERE stock > 0').all()
            };
        });
