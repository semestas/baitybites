import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';
import { generateOrderNumber, generateInvoiceNumber } from '../utils/helpers';
import { authPlugin } from '../middleware/auth';
import type { EmailService } from '../services/email';

export const publicRoutes = (db: Sql, emailService: EmailService) =>
    new Elysia({ prefix: '/public' })
        .use(authPlugin)
        .post('/order', async ({ body, set, user }) => {
            // Block admins from placing orders
            if (user && user.role === 'admin') {
                set.status = 403;
                return {
                    success: false,
                    message: 'Administrator tidak diperbolehkan membuat pesanan. Silakan gunakan akun pelanggan untuk transaksi asli.'
                };
            }

            const { name, email, phone, address, items, notes = null } = body as any;

            try {
                return await db.begin(async (sql: any) => {
                    // 1. Create or Find Customer
                    let [customer] = await sql`SELECT id FROM customers WHERE email = ${email}`;

                    if (!customer) {
                        [customer] = await sql`
                            INSERT INTO customers (name, email, phone, address) 
                            VALUES (${name}, ${email}, ${phone}, ${address}) 
                            RETURNING id
                        `;
                    } else {
                        await sql`
                            UPDATE customers 
                            SET name = ${name}, phone = ${phone}, address = ${address} 
                            WHERE id = ${customer.id}
                        `;
                    }

                    // 2. Create Order
                    const [{ count: currentCount }] = await sql`SELECT count(*) as count FROM orders`;
                    const orderNumber = generateOrderNumber(Number(currentCount) + 1);
                    const totalAmount = items.reduce((acc: number, item: any) => acc + (Number(item.price) * Number(item.quantity)), 0);

                    const [order] = await sql`
                        INSERT INTO orders (customer_id, order_number, order_date, total_amount, status, notes)
                        VALUES (${customer.id}, ${orderNumber}, CURRENT_TIMESTAMP, ${totalAmount}, 'pending', ${notes})
                        RETURNING id
                    `;

                    // 3. Add Items & Decrement Stock
                    for (const item of items) {
                        // Validate stock availability
                        const [product] = await sql`SELECT id, name, stock FROM products WHERE id = ${item.product_id} FOR UPDATE`;
                        if (!product) {
                            throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan`);
                        }
                        if (product.stock < item.quantity) {
                            throw new Error(`Stok tidak cukup untuk produk "${product.name}". Stok tersedia: ${product.stock}, diminta: ${item.quantity}`);
                        }

                        await sql`
                            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                            VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price}, ${item.price * item.quantity})
                        `;

                        // Decrement stock
                        await sql`
                            UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product_id}
                        `;
                    }

                    // 4. Generate Initial Invoice
                    const invoiceNumber = generateInvoiceNumber();
                    await sql`
                        INSERT INTO invoices (order_id, invoice_number, invoice_date, due_date, total_amount, status)
                        VALUES (${order.id}, ${invoiceNumber}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', ${totalAmount}, 'unpaid')
                    `;

                    // 5. Send Email in Background (Enrich with names first)
                    const productIds = items.map((i: any) => i.product_id);
                    const productsList = await sql`SELECT id, name FROM products WHERE id = ANY(${productIds})`;
                    const enrichedItems = items.map((item: any) => ({
                        ...item,
                        product_name: productsList.find((p: any) => p.id === item.product_id)?.name || 'Produk'
                    }));

                    // Respond immediately. Heavy tasks will be handled by the client-side background trigger or separately.
                    console.log(`[OrderRoute] Order ${orderNumber} saved to DB. Responding fast.`);

                    return {
                        success: true,
                        message: 'Order berhasil dibuat',
                        data: {
                            order_number: orderNumber,
                            invoice_number: invoiceNumber,
                            total_amount: totalAmount
                        }
                    };
                });
            } catch (error: any) {
                console.error('Order error:', error);
                set.status = 400;
                return { success: false, message: error.message || 'Gagal membuat order' };
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
        .get('/track/:number', async ({ params, set }: { params: any, set: any }) => {
            const { number } = params;

            // Search by order number or invoice number
            const [order] = await db`
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
                WHERE o.order_number = ${number} OR i.invoice_number = ${number}
                ORDER BY o.created_at DESC
                LIMIT 1
            `;

            if (!order) {
                set.status = 404;
                return { success: false, message: 'Pesanan tidak ditemukan' };
            }

            // Get items
            const items = await db`
                SELECT oi.*, p.name as product_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ${order.id}
            `;

            return {
                success: true,
                data: {
                    ...order,
                    items
                }
            };
        })
        .post('/process-tasks/:invoiceNumber', async ({ params, set }) => {
            const { invoiceNumber } = params;
            console.log(`[PublicOrder] Processing heavy tasks for: ${invoiceNumber}`);

            try {
                // Fetch Data for Tasks
                const [order] = await db`
                    SELECT o.*, c.name, c.email as customer_email, i.invoice_number, i.total_amount
                    FROM invoices i
                    JOIN orders o ON i.order_id = o.id
                    JOIN customers c ON o.customer_id = c.id
                    WHERE i.invoice_number = ${invoiceNumber}
                    LIMIT 1
                `;

                if (!order) return { success: false, message: 'Order not found' };

                const items = await db`
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ${order.id}
                `;

                // 1. Email Notify (Customer + Admin)
                const recipientEmail = order.customer_email || process.env.SMTP_USER || 'id.baitybites@gmail.com';

                await emailService.sendPOInvoice({
                    order_number: order.order_number,
                    invoice_number: order.invoice_number,
                    total_amount: order.total_amount,
                    name: order.name,
                    email: recipientEmail,
                    address: order.address || '-',
                    items: items.map((i: any) => ({ ...i, subtotal: Number(i.unit_price) * Number(i.quantity) }))
                });

                console.log(`[PublicOrder] Async tasks finished for ${order.order_number}`);
                return { success: true };
            } catch (error: any) {
                console.error("[PublicOrder] Tasks ERROR:", error);
                return { success: false, error: error.message };
            }
        })
        .get('/products', async () => {
            const products = await db`SELECT * FROM products WHERE stock > 0`;
            return {
                success: true,
                data: products
            };
        })
        .get('/gallery', async () => {
            const gallery = await db`SELECT * FROM gallery WHERE is_active = TRUE ORDER BY display_order ASC`;
            return { success: true, data: gallery };
        })
        .get('/testimonials', async () => {
            const testimonials = await db`SELECT * FROM testimonials WHERE is_approved = TRUE ORDER BY created_at DESC`;
            return { success: true, data: testimonials };
        })
        .get('/instagram-widget', async () => {
            const [widget] = await db`SELECT value FROM settings WHERE key = 'elfsight_widget' LIMIT 1`;
            return {
                success: true,
                data: widget ? widget.value : null
            };
        })
        .get('/settings', async () => {
            const settingsList = await db`
                SELECT key, value FROM settings 
                WHERE key IN (
                    'contact_email', 'contact_phone', 'contact_whatsapp', 'contact_address', 
                    'social_instagram', 'social_facebook', 'social_tiktok',
                    'hero_greeting', 'hero_title', 'hero_description', 'hero_background_url', 'hero_button_text', 'hero_button_link'
                )
            `;
            const settings = settingsList.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            return { success: true, data: settings };
        });
