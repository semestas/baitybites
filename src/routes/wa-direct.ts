import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';
import { generateInvoiceNumber } from '../utils/helpers';
import type { EmailService } from '../services/email';

/**
 * Resilient Background Tasks for WA Direct
 * Fires Email and WA notifications without blocking the main response
 */
async function runWADirectBackgroundTasks(invoiceNumber: string, db: Sql, emailService: EmailService) {
    console.log(`[WADirect] Triggering tasks for: ${invoiceNumber}`);
    try {
        // Fetch Data for Tasks
        const [order] = await db`
            SELECT o.*, c.name, c.phone, c.email as customer_email, i.invoice_number, i.total_amount
            FROM invoices i
            JOIN orders o ON i.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            WHERE i.invoice_number = ${invoiceNumber}
            LIMIT 1
        `;

        if (!order) {
            console.error(`[WADirect] Task ABORT: Invoice ${invoiceNumber} not found.`);
            return;
        }

        const items = await db`
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ${order.id}
        `;

        // 1. Prepare Data
        const _totalStr = new Intl.NumberFormat('id-ID').format(Number(order.total_amount));
        const adminEmail = (process.env.SMTP_USER && process.env.SMTP_USER.includes('@'))
            ? process.env.SMTP_USER
            : 'id.baitybites@gmail.com';

        console.log(`[WADirect] Task: Preparing Email to ${adminEmail} for ${order.order_number}`);

        // 2. Resilient Execution
        await emailService.sendPOInvoice({
            order_number: order.order_number,
            invoice_number: order.invoice_number,
            total_amount: order.total_amount,
            name: order.name,
            email: adminEmail,
            address: '-',
            items: items.map((i: any) => ({ ...i, subtotal: Number(i.unit_price) * Number(i.quantity) }))
        }).catch(e => console.error("[WADirect] Task: Email failed", e));

        console.log(`[WADirect] Task: All background tasks finished for ${order.order_number}`);
    } catch (error: any) {
        console.error("[WADirect] Global Task ERROR:", error);
    }
}

export const waDirectRoutes = (db: Sql, emailService: EmailService) =>
    new Elysia({ prefix: '/wa-direct' })
        .post('/order', async ({ body, set }) => {
            const { name, phone, items, discount = 0, notes = '' } = body as any;
            const placeholderEmail = `${phone}@baitybites.id`;

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

            // --- Unified Resilient Trigger ---
            if (orderResult && orderResult.success) {
                // Return fast response to client
                const fastResponse = {
                    success: true,
                    message: 'Order saved successfully.',
                    data: {
                        order_number: orderResult.orderNumber,
                        invoice_number: orderResult.invoiceNumber,
                        total_amount: orderResult.totalAmount
                    }
                };

                // Trigger tasks in "detach" mode (background)
                // We DON'T await this, so the response is sent immediately
                runWADirectBackgroundTasks(orderResult.invoiceNumber, db, emailService)
                    .catch(e => console.error("[WADirect] Detached task trigger failure:", e));

                return fastResponse;
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
                    _name: order.customer_name, // Prefixed with '_' as it's not directly used in generateInvoiceHtml
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
        });
