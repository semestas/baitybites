import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';
import { generateInvoiceNumber } from '../utils/helpers';
import type { EmailService } from '../services/email';
import { WhatsAppService } from '../services/whatsapp';

export const waDirectRoutes = (db: Sql, emailService: EmailService, waService: WhatsAppService) =>
    new Elysia({ prefix: '/wa-direct' })
        .post('/order', async ({ body, set }) => {
            const { name, phone, items, discount = 0, notes = '' } = body as any;
            const placeholderEmail = `${phone}@wa.baitybites.id`;

            let orderResult: any = null;
            try {
                console.log("[WADirect] incoming order:", { name, phone, itemsCount: items?.length });
                orderResult = await db.begin(async (sql: any) => {
                    // 1. Create or Find Customer
                    let [customer] = await sql`SELECT id FROM customers WHERE phone = ${phone} OR email = ${placeholderEmail}`;

                    if (!customer) {
                        console.log("[WADirect] Creating new customer");
                        [customer] = await sql`
                            INSERT INTO customers (name, email, phone, address) 
                            VALUES (${name}, ${placeholderEmail}, ${phone}, '-') 
                            RETURNING id
                        `;
                    } else {
                        console.log("[WADirect] Updating existing customer:", customer.id);
                        await sql`
                            UPDATE customers 
                            SET name = ${name}
                            WHERE id = ${customer.id}
                        `;
                    }

                    // 2. Create Order
                    const orderNumber = `WA-DIR-${Date.now().toString().slice(-4)}`;
                    const safeDiscount = Number(discount) || 0;
                    const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.price) * Number(item.quantity)), 0);
                    const totalAmount = subtotal - safeDiscount;

                    const [order] = await sql`
                        INSERT INTO orders (customer_id, order_number, order_date, total_amount, status, notes)
                        VALUES (${customer.id}, ${orderNumber}, CURRENT_TIMESTAMP, ${totalAmount}, 'paid', ${notes + ' (WA Direct Order)'})
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
                            VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price}, ${Number(item.price) * Number(item.quantity)})
                        `;

                        // Decrement stock
                        await sql`
                            UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product_id}
                        `;
                    }

                    // 4. Generate Invoice
                    const invoiceNumber = generateInvoiceNumber();
                    await sql`
                        INSERT INTO invoices (order_id, invoice_number, invoice_date, due_date, total_amount, status)
                        VALUES (${order.id}, ${invoiceNumber}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ${totalAmount}, 'paid')
                    `;

                    return {
                        success: true,
                        orderNumber,
                        invoiceNumber,
                        totalAmount
                    };
                });
            } catch (error: any) {
                console.error('WA Direct DB Transaction error:', error);
                set.status = 400;
                return { success: false, message: error.message || 'Failed to process quick order in database' };
            }

            // --- Background Tasks (Outside the main try/catch to avoid 500 response) ---
            if (orderResult && orderResult.success) {
                console.log("[WADirect] Order success in DB, firing background tasks");

                // --- Fast Tasks (Inside the response cycle) ---
                console.log("[WADirect] Order success in DB, sending fast response");

                // 1. Respond immediately to stop client retries and duplication
                return {
                    success: true,
                    message: 'Order saved successfully.',
                    data: {
                        order_number: orderResult.orderNumber,
                        invoice_number: orderResult.invoiceNumber,
                        total_amount: orderResult.totalAmount
                    }
                };
            }

            set.status = 500;
            return { success: false, message: 'Unexpected error processing order' };
        }, {
            body: t.Object({
                name: t.String(),
                phone: t.String(),
                discount: t.Optional(t.Number()),
                notes: t.Optional(t.String()),
                items: t.Array(t.Object({
                    product_id: t.Number(),
                    product_name: t.String(),
                    quantity: t.Number(),
                    price: t.Number()
                }))
            })
        })
        .post('/process-tasks/:invoiceNumber', async ({ params, set }) => {
            const { invoiceNumber } = params;
            console.log(`[WADirect] Processing heavy tasks for: ${invoiceNumber}`);

            try {
                const [order] = await db`
                    SELECT o.*, c.name, c.phone, c.email as customer_email, i.invoice_number, i.total_amount
                    FROM invoices i
                    JOIN orders o ON i.order_id = o.id
                    JOIN customers c ON o.customer_id = c.id
                    WHERE i.invoice_number = ${invoiceNumber}
                    LIMIT 1
                `;

                if (!order) return { success: false, message: 'Invoice not found' };

                const items = await db`
                    SELECT oi.*, p.name as product_name
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ${order.id}
                `;

                // 1. Prepare Data
                const totalStr = new Intl.NumberFormat('id-ID').format(Number(order.total_amount));
                const adminEmail = process.env.SMTP_USER || 'id.baitybites@gmail.com';

                console.log(`[WADirect] Background: Start tasks for ${order.order_number}`);

                // 2. Parallel Tasks
                const emailTask = emailService.sendPOInvoice({
                    order_number: order.order_number,
                    invoice_number: order.invoice_number,
                    total_amount: order.total_amount,
                    name: order.name,
                    email: adminEmail,
                    address: '-',
                    items: items.map((i: any) => ({ ...i, subtotal: Number(i.unit_price) * Number(i.quantity) }))
                }).catch(e => console.error("[WADirect] Task Email ERROR:", e));

                const waTask = waService.sendText(process.env.ADMIN_PHONE || '', `🚀 NEW WA ORDER!\n\nOrder: ${order.order_number}\nCustomer: ${order.name}\nTotal: Rp ${totalStr}`)
                    .catch(e => console.error("[WADirect] Task WA ERROR:", e));

                // Await all for serverless safety
                await Promise.all([emailTask, waTask]);

                console.log(`[WADirect] Async tasks finished for ${order.order_number}`);
                return { success: true };
            } catch (error: any) {
                console.error("[WADirect] Global Tasks ERROR:", error);
                return { success: false, error: error.message };
            }
        })
        .get('/invoice/:invoiceNumber/pdf', async ({ params, set }) => {
            const { invoiceNumber } = params;

            try {
                // Fetch Invoice & Order Data
                const [order] = await db`
                    SELECT 
                        o.*, 
                        c.name as customer_name,
                        c.email as customer_email,
                        i.invoice_number,
                        i.total_amount
                    FROM invoices i
                    JOIN orders o ON i.order_id = o.id
                    JOIN customers c ON o.customer_id = c.id
                    WHERE i.invoice_number = ${invoiceNumber}
                    LIMIT 1
                `;

                if (!order) {
                    set.status = 404;
                    return { success: false, message: 'Invoice not found' };
                }

                // Get items
                const items = await db`
                    SELECT oi.*, p.name as product_name, p.category
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ${order.id}
                `;

                // Generate HTML & PDF
                const orderData = {
                    order_number: order.order_number,
                    invoice_number: order.invoice_number,
                    total_amount: order.total_amount,
                    name: order.customer_name,
                    email: order.customer_email,
                    address: order.address || '-',
                    items: items
                };

                const html = await emailService.generateInvoiceHtml(orderData);
                const pdfBuffer = await emailService.generatePdfBuffer(html);

                if (!pdfBuffer) {
                    set.status = 500;
                    return { success: false, message: 'Failed to generate PDF' };
                }

                set.headers['Content-Type'] = 'application/pdf';
                set.headers['Content-Disposition'] = `attachment; filename="Invoice-${invoiceNumber}.pdf"`;

                return pdfBuffer;
            } catch (error) {
                console.error('PDF Generation Error:', error);
                set.status = 500;
                return { success: false, message: 'Internal server error during PDF generation' };
            }
        })

