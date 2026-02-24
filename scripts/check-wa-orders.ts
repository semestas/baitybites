
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(connectionString, {
    ssl: 'require',
});

async function checkOrders() {
    try {
        console.log("Checking for 'WA Direct Order' transactions...");

        const orders = await sql`
      SELECT id, order_number, notes, total_amount, order_date
      FROM orders
      WHERE notes LIKE '%(WA Direct Order)%'
    `;

        console.log(`Found ${orders.length} orders:`);
        orders.forEach((order: any) => {
            console.log(`- ID: ${order.id}, Number: ${order.order_number}, Amount: ${order.total_amount}, Notes: ${order.notes}`);
        });

        if (orders.length > 0) {
            const orderIds = orders.map((o: any) => o.id);
            const items = await sql`
        SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN ${sql(orderIds)}
      `;

            console.log("\nItems to be restored:");
            items.forEach((item: any) => {
                console.log(`- Order ID ${item.order_id}: ${item.product_name} (x${item.quantity})`);
            });
        }

    } catch (error) {
        console.error("Error checking orders:", error);
    } finally {
        await sql.end();
    }
}

checkOrders();
