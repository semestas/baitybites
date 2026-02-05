import { initDatabase } from "./src/db/schema";

const sql = await initDatabase();
try {
    const users = await sql`SELECT * FROM users WHERE name LIKE '%Semesta%'`;
    console.log("Found Users:", JSON.stringify(users, null, 2));

    const customers = await sql`SELECT * FROM customers WHERE name LIKE '%Semesta%'`;
    console.log("Found Customers:", JSON.stringify(customers, null, 2));

} catch (e) {
    console.error("Error:", e);
} finally {
    process.exit(0);
}
