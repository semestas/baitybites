import postgres from "postgres";
import fs from "fs";
import path from "path";

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_oVXIAqks0cO6@ep-hidden-rice-ah924vab-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(connectionString);

async function downloadImage(url: string, filename: string) {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const dir = 'public/uploads/gallery';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return `/uploads/gallery/${filename}`;
}

async function seedGallery() {
    console.log("Seeding gallery with local images...");

    // Clean up existing gallery
    await sql`DELETE FROM gallery`;

    const galleryItems = [
        {
            url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=800',
            filename: 'risol-mayo.jpg',
            title: 'Risol Mayo Original',
            description: 'Kerenyahan di luar, kemewahan di dalam.',
            display_order: 1
        },
        {
            url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=800',
            filename: 'cookies.jpg',
            title: 'Cookies Premium',
            description: 'Lumer di mulut, manisnya pas.',
            display_order: 2
        },
        {
            url: 'https://images.unsplash.com/photo-1558961359-1d99283f08c2?auto=format&fit=crop&q=80&w=800',
            filename: 'nastar.jpg',
            title: 'Nastar Special',
            description: 'Selai nanas asli pilihan.',
            display_order: 3
        }
    ];

    for (const item of galleryItems) {
        try {
            const localPath = await downloadImage(item.url, item.filename);

            await sql`
                INSERT INTO gallery (image_url, title, description, display_order)
                VALUES (${localPath}, ${item.title}, ${item.description}, ${item.display_order})
            `;
            console.log(`✅ Added: ${item.title} -> ${localPath}`);
        } catch (err: any) {
            console.error(`❌ Failed ${item.title}: ${err.message}`);
            // Fallback to picsum if unsplash fails
            try {
                const fallbackUrl = `https://picsum.photos/seed/${item.filename}/800/600`;
                const localPath = await downloadImage(fallbackUrl, item.filename);
                await sql`
                    INSERT INTO gallery (image_url, title, description, display_order)
                    VALUES (${localPath}, ${item.title}, ${item.description}, ${item.display_order})
                `;
                console.log(`✅ Added (Fallback): ${item.title} -> ${localPath}`);
            } catch (fallbackErr) {
                console.error(`❌ Fallback failed too for ${item.title}`);
            }
        }
    }

    console.log("Gallery seeded successfully!");
    process.exit(0);
}

seedGallery().catch(err => {
    console.error(err);
    process.exit(1);
});
