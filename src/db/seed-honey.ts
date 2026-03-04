import postgres from 'postgres';
// @ts-ignore
import packageJson from "../../package.json";

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/baitybites');

async function seedHoney() {
    console.log("🐝 Seeding Honey Products for Golden Revival...");
    try {
        const honeyProducts = [
            {
                name: "Madu Acacia Premium 500g",
                description: "Madu murni dari bunga akasia hutan tropis. Rasa manis lembut dengan aroma floral yang menenangkan.",
                price: 155000,
                unit: "botol",
                stock: 25,
                category: "Pure Honey",
                brand: "honey",
                image_url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400"
            },
            {
                name: "Madu Multiflora Golden 350g",
                description: "Kombinasi nektar berbagai bunga pilihan. Kaya akan vitamin dan mineral untuk stamina harian.",
                price: 85000,
                unit: "botol",
                stock: 50,
                category: "Multiflora",
                brand: "honey",
                image_url: "https://images.unsplash.com/photo-1558583055-d7ac00b1adca?auto=format&fit=crop&q=80&w=400"
            },
            {
                name: "Raw Wild Forest Honey 650g",
                description: "Madu mentah dari lebah liar hutan pedalaman. Tanpa proses pemanasan untuk menjaga nutrisi maksimal.",
                price: 210000,
                unit: "botol",
                stock: 15,
                category: "Wild Forest",
                brand: "honey",
                image_url: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&q=80&w=400"
            }
        ];

        for (const p of honeyProducts) {
            const existing = await sql`SELECT id FROM products WHERE name = ${p.name} LIMIT 1`;
            if (existing.length > 0) {
                await sql`
                    UPDATE products 
                    SET description = ${p.description}, price = ${p.price}, unit = ${p.unit}, 
                        stock = ${p.stock}, category = ${p.category}, brand = ${p.brand}, image_url = ${p.image_url}
                    WHERE id = ${existing[0]?.id}
                `;
                console.log(`  ✓ Updated: ${p.name}`);
            } else {
                await sql`
                    INSERT INTO products (name, description, price, unit, stock, category, brand, image_url)
                    VALUES (${p.name}, ${p.description}, ${p.price}, ${p.unit}, ${p.stock}, ${p.category}, ${p.brand}, ${p.image_url})
                `;
                console.log(`  ✓ Inserted: ${p.name}`);
            }
        }

        console.log("✅ Honey seeding complete.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seedHoney();
