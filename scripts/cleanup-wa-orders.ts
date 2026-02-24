
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(connectionString, {
    ssl: 'require',
});

async function cleanup() {
    try {
        console.log("Starting cleanup for 'WA Direct Order' transactions...");

        await sql.begin(async (tx: any) => {
            // 1. Find orders to reset
            const orders = await tx`
        SELECT id, order_number, notes 
        FROM orders 
        WHERE notes LIKE '%(WA Direct Order)%'
      `;

            if (orders.length === 0) {
                console.log("No WA Direct orders found. Nothing to do.");
                return;
            }

            const orderIds = orders.map((o: any) => o.id);
            console.log(`Found ${orders.length} orders to reset: ${orders.map((o: any) => o.order_number).join(", ")}`);

            // 2. Get items and restore stock
            const items = await tx`
        SELECT product_id, quantity 
        FROM order_items 
        WHERE order_id IN ${tx(orderIds)}
      `;

            console.log(`Restoring stock for ${items.length} order line items...`);
            for (const item of items) {
                await tx`
          UPDATE products 
          SET stock = stock + ${item.quantity} 
          WHERE id = ${item.product_id}
        `;
                console.log(`  Restored ${item.quantity} units for product ID ${item.product_id}`);
            }

            // 3. Find related invoices
            const invoices = await tx`
        SELECT id FROM invoices WHERE order_id IN ${tx(orderIds)}
      `;
            const invoiceIds = invoices.map((i: any) => i.id);

            // 4. Delete related records in reverse dependency order
            if (invoiceIds.length > 0) {
                console.log("Deleting payments...");
                await tx`DELETE FROM payments WHERE invoice_id IN ${tx(invoiceIds)}`;

                console.log("Deleting invoices...");
                await tx`DELETE FROM invoices WHERE id IN ${tx(invoiceIds)}`;
            }

            console.log("Deleting production, packaging, and shipping records...");
            await tx`DELETE FROM production WHERE order_id IN ${tx(orderIds)}`;
            await tx`DELETE FROM packaging WHERE order_id IN ${tx(orderIds)}`;
            await tx`DELETE FROM shipping WHERE order_id IN ${tx(orderIds)}`;

            console.log("Deleting order items...");
            await tx`DELETE FROM order_items WHERE order_id IN ${tx(orderIds)}`;

            console.log("Deleting orders...");
            await tx`DELETE FROM orders WHERE id IN ${tx(orderIds)}`;

            console.log("Cleanup completed successfully!");
        });

    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        await sql.end();
    }
}

cleanup();
