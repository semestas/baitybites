import { initDatabase } from './src/db/schema';

async function migrate() {
    console.log("Running migration...");
    const sql = await initDatabase();

    try {
        await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`;
        await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
        await sql`ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL`;
        await sql`ALTER TABLE customers ALTER COLUMN address DROP NOT NULL`;
        console.log("✅ Mutation successful");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrate();
