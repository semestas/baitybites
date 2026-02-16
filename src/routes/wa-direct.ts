import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';
import { generateOrderNumber, generateInvoiceNumber } from '../utils/helpers';
import type { EmailService } from '../services/email';
import { WhatsAppService } from '../services/whatsapp';

export const waDirectRoutes = (db: Sql, emailService: EmailService, waService: WhatsAppService) =>
    new Elysia({ prefix: '/wa-direct' })
        .post('/order', async ({ body, set }) => {
            const { name, phone, items, discount = 0, notes = '' } = body as any;
            const adminEmail = 'id.baitybites@gmail.com';
            const placeholderEmail = `${phone}@wa.baitybites.id`;

            try {
                const result = await db.begin(async (sql: any) => {
                    // 1. Create or Find Customer
                    let [customer] = await sql`SELECT id FROM customers WHERE phone = ${phone} OR email = ${placeholderEmail}`;

                    if (!customer) {
                        [customer] = await sql`
                            INSERT INTO customers (name, email, phone, address) 
                            VALUES (${name}, ${placeholderEmail}, ${phone}, '-') 
                            RETURNING id
                        `;
                    } else {
                        await sql`
                            UPDATE customers 
                            SET name = ${name}
                            WHERE id = ${customer.id}
                        `;
                    }

                    // 2. Create Order
                    const [{ count: currentCount }] = await sql`SELECT count(*) as count FROM orders`;
                    const orderNumber = `WA-DIR-${Date.now().toString().slice(-4)}`;
                    const subtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
                    const totalAmount = subtotal - discount;

                    const [order] = await sql`
                        INSERT INTO orders (customer_id, order_number, order_date, total_amount, status, notes)
                        VALUES (${customer.id}, ${orderNumber}, CURRENT_TIMESTAMP, ${totalAmount}, 'paid', ${notes + ' (WA Direct Order)'})
                        RETURNING id
                    `;

                    // 3. Add Items
                    for (const item of items) {
                        await sql`
                            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                            VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price}, ${item.price * item.quantity})
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

                // --- Tasks ---

                // 5. Send PDF Invoice to Admin Email
                await emailService.sendPOInvoice({
                    order_number: result.orderNumber,
                    invoice_number: result.invoiceNumber,
                    total_amount: result.totalAmount,
                    name,
                    email: process.env.SMTP_USER || 'id.baitybites@gmail.com',
                    address: '-',
                    items: items.map((i: any) => ({ ...i, subtotal: i.price * i.quantity }))
                }).catch(e => console.error("[WADirect] Admin Email failed:", e));

                // 6. Notify Staff via WhatsApp
                waService.sendText(process.env.ADMIN_PHONE || '', `🚀 NEW HIGH-PRIORITY WA ORDER!\n\nOrder: ${result.orderNumber}\nCustomer: ${name}\nTotal: Rp ${result.totalAmount.toLocaleString('id-ID')}\n\nPlease check the system.`)
                    .catch(e => console.error("[WADirect] Background WA notify failed:", e));

                return {
                    success: true,
                    message: 'Quick order processed successfully. Invoice is being generated.',
                    data: {
                        order_number: result.orderNumber,
                        invoice_number: result.invoiceNumber,
                        total_amount: result.totalAmount
                    }
                };
            } catch (error) {
                console.error('WA Direct Order error:', error);
                set.status = 500;
                return { success: false, message: 'Failed to process quick order' };
            }
        }, {
            body: t.Object({
                name: t.String(),
                phone: t.String(),
                discount: t.Optional(t.Number()),
                notes: t.Optional(t.String()),
                items: t.Array(t.Object({
                    product_id: t.Number(),
                    product_name: t.String(), // Included for the email service preview
                    quantity: t.Number(),
                    price: t.Number()
                }))
            })
        });
