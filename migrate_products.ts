import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
    try {
        // Add category column
        await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Risol'`;

        // Update data
        await sql`UPDATE products SET category = 'Kue Kering' WHERE name ILIKE '%kue%' OR name ILIKE '%kastengel%' OR name ILIKE '%salju%' OR name ILIKE '%lidah%' OR name ILIKE '%nastar%'`;
        await sql`UPDATE products SET category = 'Risol' WHERE name ILIKE '%risol%'`;

        // For demonstration, let's put one into "Kue Oven" if it makes sense, or just leave it.
        // Actually, let's make sure we have some categories as in the reference image.

        console.log('Migration successful');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
