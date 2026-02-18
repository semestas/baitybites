/**
 * Cleanup Script: Delete all test orders by Wawan (tester) and restore product stock.
 * 
 * Usage:
 *   bun run scripts/cleanup-tester.ts          <- dry run (preview only)
 *   bun run scripts/cleanup-tester.ts --delete  <- actually delete
 */

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = postgres(connectionString, { ssl: 'require', prepare: false });

const DRY_RUN = !process.argv.includes('--delete');

async function main() {
    console.log(`\n🔍 Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : '⚠️  LIVE DELETE'}\n`);

    // 1. Find all orders by Wawan (by name or phone pattern)
    const testOrders = await sql`
        SELECT 
            o.id        AS order_id,
            o.order_number,
            o.status,
            o.total_amount,
            o.created_at,
            c.name      AS customer_name,
            c.email     AS customer_email,
            c.phone     AS customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE 
            LOWER(c.name) LIKE '%wawan%'
            OR LOWER(c.email) LIKE '%wawan%'
            OR c.email LIKE '%@baitybites.id'
        ORDER BY o.created_at DESC
    `;

    if (testOrders.length === 0) {
        console.log("✅ No test orders found. Nothing to clean up.");
        await sql.end();
        return;
    }

    console.log(`📋 Found ${testOrders.length} test order(s) to delete:\n`);
    console.log("ORDER NUMBER       | STATUS    | AMOUNT      | CUSTOMER              | DATE");
    console.log("-------------------|-----------|-------------|------------------------|--------------------");
    for (const o of testOrders) {
        const date = new Date(o.created_at).toLocaleString('id-ID');
        const amount = `Rp ${Number(o.total_amount).toLocaleString('id-ID')}`;
        console.log(`${o.order_number.padEnd(18)} | ${o.status.padEnd(9)} | ${amount.padEnd(11)} | ${o.customer_name.padEnd(22)} | ${date}`);
    }

    // 2. Show items + stock that will be restored
    const orderIds = testOrders.map((o: any) => o.order_id);
    const items = await sql`
        SELECT 
            oi.order_id,
            oi.product_id,
            oi.quantity,
            p.name AS product_name,
            p.stock AS current_stock
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ANY(${orderIds}::int[])
        ORDER BY p.name
    `;

    console.log(`\n📦 Stock to be restored:\n`);
    console.log("PRODUCT                        | QTY  | CURRENT STOCK | AFTER RESTORE");
    console.log("-------------------------------|------|---------------|---------------");
    for (const item of items) {
        const after = Number(item.current_stock) + Number(item.quantity);
        console.log(`${item.product_name.padEnd(30)} | ${String(item.quantity).padEnd(4)} | ${String(item.current_stock).padEnd(13)} | ${after}`);
    }

    // 3. Find related customers (WA-DIR creates placeholder customers)
    const testCustomers = await sql`
        SELECT id, name, email, phone
        FROM customers
        WHERE 
            LOWER(name) LIKE '%wawan%'
            OR LOWER(email) LIKE '%wawan%'
            OR email LIKE '%@baitybites.id'
    `;
    console.log(`\n👤 Customer records to be deleted: ${testCustomers.length}`);
    for (const c of testCustomers) {
        console.log(`   - [${c.id}] ${c.name} | ${c.email} | ${c.phone || '-'}`);
    }

    if (DRY_RUN) {
        console.log(`\n⚠️  DRY RUN complete. No changes made.`);
        console.log(`   To actually delete, run:\n`);
        console.log(`   bun run scripts/cleanup-tester.ts --delete\n`);
        await sql.end();
        return;
    }

    // 4. LIVE DELETE — wrapped in a transaction
    console.log(`\n🗑️  Starting deletion...\n`);
    await sql.begin(async (tx: any) => {
        // Restore stock first
        for (const item of items) {
            await tx`
                UPDATE products 
                SET stock = stock + ${item.quantity} 
                WHERE id = ${item.product_id}
            `;
            console.log(`   ✅ Restored ${item.quantity}x "${item.product_name}" (stock +${item.quantity})`);
        }

        // Delete payments → invoices → order_items → production/packaging/shipping → orders
        await tx`DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ANY(${orderIds}::int[]))`;
        await tx`DELETE FROM invoices WHERE order_id = ANY(${orderIds}::int[])`;
        await tx`DELETE FROM production WHERE order_id = ANY(${orderIds}::int[])`;
        await tx`DELETE FROM packaging WHERE order_id = ANY(${orderIds}::int[])`;
        await tx`DELETE FROM shipping WHERE order_id = ANY(${orderIds}::int[])`;
        await tx`DELETE FROM order_items WHERE order_id = ANY(${orderIds}::int[])`;
        await tx`DELETE FROM orders WHERE id = ANY(${orderIds}::int[])`;
        console.log(`   ✅ Deleted ${testOrders.length} orders and all related records`);

        // Delete placeholder customers (only those with no remaining orders)
        const customerIds = testCustomers.map((c: any) => c.id);
        await tx`DELETE FROM customers WHERE id = ANY(${customerIds}::int[])`;
        console.log(`   ✅ Deleted ${testCustomers.length} test customer record(s)`);
    });

    console.log(`\n🎉 Cleanup complete! Database is ready for production.\n`);
    await sql.end();
}

main().catch(err => {
    console.error("❌ Script failed:", err);
    process.exit(1);
});
