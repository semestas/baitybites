import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function cleanupTestingOrders() {
    try {
        const orders = await sql`
            SELECT o.id, o.order_number, c.name 
            FROM orders o 
            JOIN customers c ON o.customer_id = c.id 
            WHERE c.name ILIKE '%testing%'
            ORDER BY o.created_at DESC
        `;

        console.log("Orders to delete:", orders);

        if (orders.length > 0) {
            await sql.begin(async (tx) => {
                for (const order of orders) {
                    const orderId = order.id;
                    // Restore stock
                    const items = await tx`SELECT product_id, quantity FROM order_items WHERE order_id = ${orderId}`;
                    for (const item of items) {
                        await tx`UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.product_id}`;
                    }
                    // Delete related
                    await tx`DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ${orderId})`;
                    await tx`DELETE FROM invoices WHERE order_id = ${orderId}`;
                    await tx`DELETE FROM production WHERE order_id = ${orderId}`;
                    await tx`DELETE FROM packaging WHERE order_id = ${orderId}`;
                    await tx`DELETE FROM shipping WHERE order_id = ${orderId}`;
                    await tx`DELETE FROM order_items WHERE order_id = ${orderId}`;
                    await tx`DELETE FROM orders WHERE id = ${orderId}`;
                    console.log(`Deleted order ${order.order_number}`);
                }
            });
            console.log("Cleanup complete.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}

cleanupTestingOrders();
