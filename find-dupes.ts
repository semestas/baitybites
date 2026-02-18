import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function findRecentWawan() {
    try {
        const orders = await sql`
            SELECT o.id, o.order_number, o.created_at, c.name as customer_name 
            FROM orders o 
            JOIN customers c ON o.customer_id = c.id 
            WHERE c.name ILIKE '%wawan%'
            AND o.created_at > NOW() - INTERVAL '2 hours'
            ORDER BY o.created_at DESC
        `;
        console.log(JSON.stringify(orders, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}

findRecentWawan();
