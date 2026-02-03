import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function checkProducts() {
    const products = await sql`SELECT id, name, description FROM products`;
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
}

checkProducts();
