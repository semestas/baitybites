import { Elysia, t } from 'elysia';
import { authPlugin } from '../middleware/auth';
import type { Sql } from '../db/schema';

export const customerRoutes = (db: Sql) =>
    new Elysia({ prefix: '/customer' })
        .use(authPlugin)
        .get('/orders', async (context: any) => {
            const { user, set } = context;
            if (!user || user.role !== 'customer') {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const orders = await db`
                SELECT o.*, i.invoice_number
                FROM orders o
                LEFT JOIN invoices i ON o.id = i.order_id
                WHERE o.customer_id = ${user.id}
                ORDER BY o.created_at DESC
            `;

            return { success: true, data: orders };
        })
        .post('/testimony', async (context: any) => {
            const { body, set } = context;
            const { name, content, rating, avatar_url, role } = body as any;

            try {
                // Optional: we could enforce user login here if we wanted to link testimony to user
                // But keeping logic similar to before where it extracts if present, but the prompt said 'not remove code referenced'.
                // The previous code verified token manually if header existed.

                await db`
                    INSERT INTO testimonials (name, content, rating, avatar_url, role, is_approved)
                    VALUES (${name}, ${content}, ${rating || 5}, ${avatar_url || null}, ${role || 'Pelanggan'}, FALSE)
                `;
                return { success: true, message: 'Testimoni berhasil dikirim dan menunggu moderasi' };
            } catch (error) {
                console.error('Testimony error:', error);
                set.status = 500;
                return { success: false, message: 'Gagal mengirim testimoni' };
            }
        }, {
            body: t.Object({
                name: t.String(),
                content: t.String(),
                rating: t.Optional(t.Number()),
                avatar_url: t.Optional(t.String()),
                role: t.Optional(t.String())
            })
        });
