import { Elysia, t } from 'elysia';
import { authPlugin } from '../middleware/auth';
import type { Sql } from '../db/schema';
import { uploadToCloudinary } from '../services/cloudinary';

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
        })
        .put('/profile', async (context: any) => {
            const { body, user, set } = context;
            if (!user || user.role !== 'customer') {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const { name, phone, address, avatar } = body as any;

            try {
                let avatarUrl = undefined;
                if (avatar && avatar instanceof File) {
                    avatarUrl = await uploadToCloudinary(avatar, 'baitybites/avatars');
                }

                let customer;
                if (avatarUrl) {
                    [customer] = await db`
                        UPDATE customers 
                        SET name = ${name}, phone = ${phone}, address = ${address}, avatar_url = ${avatarUrl}
                        WHERE id = ${user.id}
                        RETURNING *
                    `;
                } else {
                    [customer] = await db`
                        UPDATE customers 
                        SET name = ${name}, phone = ${phone}, address = ${address}
                        WHERE id = ${user.id}
                        RETURNING *
                    `;
                }

                if (!customer) {
                    set.status = 404;
                    return { success: false, message: 'Customer not found' };
                }

                return {
                    success: true,
                    message: 'Profil berhasil diperbarui',
                    data: customer
                };
            } catch (error: any) {
                console.error('Profile update error:', error);
                set.status = 500;
                return { success: false, message: 'Gagal memperbarui profil: ' + error.message };
            }
        }, {
            body: t.Object({
                name: t.String(),
                phone: t.String(),
                address: t.String(),
                avatar: t.Optional(t.File())
            })
        });
