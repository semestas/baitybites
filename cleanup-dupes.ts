import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function cleanupDupes(orderIds: number[]) {
    try {
        await sql.begin(async (tx) => {
            for (const orderId of orderIds) {
                // 1. Restore stock
                const items = await tx`SELECT product_id, quantity FROM order_items WHERE order_id = ${orderId}`;
                for (const item of items) {
                    await tx`UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.product_id}`;
                }

                // 2. Delete related records (manual cascade)
                await tx`DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ${orderId})`;
                await tx`DELETE FROM invoices WHERE order_id = ${orderId}`;
                await tx`DELETE FROM production WHERE order_id = ${orderId}`;
                await tx`DELETE FROM packaging WHERE order_id = ${orderId}`;
                await tx`DELETE FROM shipping WHERE order_id = ${orderId}`;
                await tx`DELETE FROM order_items WHERE order_id = ${orderId}`;

                // 3. Delete order
                await tx`DELETE FROM orders WHERE id = ${orderId}`;
                console.log(`Cleaned up order ID: ${orderId}`);
            }
        });
        console.log("Success: All duplicates removed and stock restored.");
    } catch (e) {
        console.error("Failed to cleanup:", e);
    } finally {
        await sql.end();
    }
}

// Order IDs for Wawan: 6, 7, 8, 9, 10, 11, 12, 13
cleanupDupes([6, 7, 8, 9, 10, 11, 12, 13]);
