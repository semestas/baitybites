import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function updateData() {
    try {
        // Categories and Images Update
        await sql`UPDATE products SET category = 'Risol', image_url = '/uploads/products/1769682045867-risol.jpg' WHERE name ILIKE '%risol%'`;
        await sql`UPDATE products SET category = 'Kue Kering', image_url = '/uploads/products/kue_kering_premium.png' WHERE name ILIKE '%kue%' OR name ILIKE '%kastengel%' OR name ILIKE '%salju%' OR name ILIKE '%lidah%' OR name ILIKE '%nastar%'`;

        // Add a dummy Kue Oven product
        const [kueOvenExists] = await sql`SELECT id FROM products WHERE category = 'Kue Oven' LIMIT 1`;
        if (!kueOvenExists) {
            await sql`INSERT INTO products (name, description, category, price, unit, stock, image_url) VALUES 
                ('Bolu Panggang Special', 'Bolu panggang lembut dengan aroma butter yang kuat dan topping keju.', 'Kue Oven', 75000, 'loyang', 10, '/uploads/products/kue_kering_premium.png')`;
        }

        console.log('Database updated successfully');
        process.exit(0);
    } catch (e) {
        console.error('Update failed:', e);
        process.exit(1);
    }
}

updateData();
