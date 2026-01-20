
import { initDatabase } from './src/db/schema';

async function check() {
    const sql = await initDatabase();
    const users = await sql`SELECT * FROM users`;
    console.log('Users:', users);
    process.exit(0);
}

check();
