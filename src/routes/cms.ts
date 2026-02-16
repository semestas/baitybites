import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';
import { AIService } from '../services/ai';
// import { InstagramService } from '../services/instagram';
import { uploadToCloudinary } from '../services/cloudinary';

export const cmsRoutes = (db: Sql, aiService: AIService) =>
    new Elysia({ prefix: '/cms' })
        .post('/ai/enhance', async ({ body }: { body: any }) => {
            const { content, context } = body;
            try {
                const enhanced = await aiService.enhanceContent(content, context);
                return { success: true, data: enhanced };
            } catch (error: any) {
                return { success: false, message: error.message };
            }
        }, {
            body: t.Object({
                content: t.String(),
                context: t.String()
            })
        })
        .get('/stats', async () => {
            const [stats] = await db`
                SELECT 
                    COUNT(*)::int as total_orders,
                    COUNT(*) FILTER (WHERE status = 'completed')::int as completed_orders,
                    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int as in_progress_orders,
                    COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'pending', 'confirmed')), 0)::int as total_revenue
                FROM orders
            `;

            const [highestSpend] = await db`
                SELECT c.name, SUM(o.total_amount)::int as value
                FROM customers c
                JOIN orders o ON c.id = o.customer_id
                WHERE o.status != 'cancelled'
                GROUP BY c.id, c.name
                ORDER BY value DESC
                LIMIT 1
            `;

            const [mostOrders] = await db`
                SELECT c.name, COUNT(o.id)::int as value
                FROM customers c
                JOIN orders o ON c.id = o.customer_id
                WHERE o.status != 'cancelled'
                GROUP BY c.id, c.name
                ORDER BY value DESC
                LIMIT 1
            `;

            const [mostRePurchases] = await db`
                SELECT c.name, COUNT(o.id)::int as value
                FROM customers c
                JOIN orders o ON c.id = o.customer_id
                WHERE o.status != 'cancelled'
                GROUP BY c.id, c.name
                HAVING COUNT(o.id) > 1
                ORDER BY value DESC
                LIMIT 1
            `;

            const [favoriteProduct] = await db`
                SELECT p.name, SUM(oi.quantity)::int as value
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                GROUP BY p.id, p.name
                ORDER BY value DESC
                LIMIT 1
            `;

            const flow = await db`
                SELECT status, COUNT(*)::int as count
                FROM orders
                GROUP BY status
            `;

            const flowData = flow.reduce((acc: any, curr: any) => {
                acc[curr.status] = curr.count;
                return acc;
            }, {});

            const recentOrders = await db`
                SELECT o.*, c.name as customer_name 
                FROM orders o 
                JOIN customers c ON o.customer_id = c.id 
                ORDER BY o.created_at DESC
                LIMIT 5
            `;

            return {
                success: true,
                data: {
                    stats,
                    top: {
                        highestSpend: highestSpend || { name: '-', value: 0 },
                        mostOrders: mostOrders || { name: '-', value: 0 },
                        mostRePurchases: mostRePurchases || { name: '-', value: 0 },
                        favoriteProduct: favoriteProduct || { name: '-', value: 0 }
                    },
                    flow: flowData,
                    recentOrders
                }
            };
        })
        // --- POS & Sales Reports ---
        .get('/reports/pos', async ({ query }) => {
            const days = parseInt(query.days as string) || 7;
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfRange = new Date(startOfToday.getTime() - ((days - 1) * 24 * 60 * 60 * 1000));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [revenueStats] = await db`
                SELECT 
                    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${startOfToday}), 0)::int as today_revenue,
                    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${startOfRange}), 0)::int as range_revenue,
                    COUNT(*) FILTER (WHERE created_at >= ${startOfToday})::int as today_orders,
                    COUNT(*) FILTER (WHERE created_at >= ${startOfRange})::int as range_orders
                FROM orders
                WHERE status NOT IN ('cancelled', 'pending')
                  AND created_at >= ${startOfRange}
            `;

            const topProducts = await db`
                SELECT p.name, SUM(oi.quantity)::int as total_qty, SUM(oi.subtotal)::int as total_sales
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status NOT IN ('cancelled', 'pending')
                  AND o.created_at >= ${startOfRange}
                GROUP BY p.id, p.name
                ORDER BY total_qty DESC
                LIMIT 5
            `;

            const salesTrend = await db`
                SELECT 
                    TO_CHAR(days.d, 'DD Mon') as day,
                    COALESCE(SUM(o.total_amount), 0)::int as revenue,
                    COALESCE(COUNT(o.id), 0)::int as orders
                FROM generate_series(
                    date_trunc('day', ${startOfRange}::timestamp), 
                    date_trunc('day', now()), 
                    '1 day'::interval
                ) as days(d)
                LEFT JOIN orders o ON date_trunc('day', o.created_at) = days.d 
                    AND o.status NOT IN ('cancelled', 'pending')
                GROUP BY days.d
                ORDER BY days.d ASC
            `;

            return { success: true, data: { summary: revenueStats, topProducts, trend: salesTrend, days } };
        })
        .get('/reports/payments', async ({ query }) => {
            const days = parseInt(query.days as string) || 7;
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfRange = new Date(startOfToday.getTime() - ((days - 1) * 24 * 60 * 60 * 1000));
            const data = await db`
                SELECT p.payment_method, SUM(p.amount)::int as total_sales, COUNT(*)::int as count
                FROM payments p
                WHERE created_at >= ${startOfRange}
                GROUP BY p.payment_method
                ORDER BY total_sales DESC
            `;
            return { success: true, data };
        })
        .get('/reports/items', async ({ query }) => {
            const days = parseInt(query.days as string) || 7;
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfRange = new Date(startOfToday.getTime() - ((days - 1) * 24 * 60 * 60 * 1000));
            const data = await db`
                SELECT p.name, p.category, SUM(oi.quantity)::int as total_qty, SUM(oi.subtotal)::int as total_sales
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status NOT IN ('cancelled', 'pending')
                  AND o.created_at >= ${startOfRange}
                GROUP BY p.id, p.name, p.category
                ORDER BY total_sales DESC
            `;
            return { success: true, data };
        })
        .get('/reports/categories', async ({ query }) => {
            const days = parseInt(query.days as string) || 7;
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfRange = new Date(startOfToday.getTime() - ((days - 1) * 24 * 60 * 60 * 1000));
            const data = await db`
                SELECT p.category, SUM(oi.quantity)::int as total_qty, SUM(oi.subtotal)::int as total_sales
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status NOT IN ('cancelled', 'pending')
                  AND o.created_at >= ${startOfRange}
                GROUP BY p.category
                ORDER BY total_sales DESC
            `;
            return { success: true, data };
        })
        .get('/production', async () => {
            const stats = await db`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'production')::int as in_production,
                    COUNT(*) FILTER (WHERE status = 'packaging')::int as wait_for_packing,
                    COUNT(*) FILTER (WHERE status = 'shipping')::int as ready_to_ship
                FROM orders
            `;

            const queue = await db`
                SELECT 
                    o.id,
                    o.order_number,
                    o.status,
                    o.total_amount,
                    o.notes,
                    o.created_at as order_created,
                    o.updated_at as last_update,
                    c.name as customer_name,
                    (SELECT start_date FROM production WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as prod_start,
                    (SELECT end_date FROM production WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as prod_end,
                    (SELECT packaging_date FROM packaging WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as pack_start,
                    (SELECT shipping_date FROM shipping WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as ship_start,
                    (
                        SELECT json_agg(json_build_object(
                            'product_name', p.name,
                            'quantity', oi.quantity,
                            'production_time', COALESCE(p.production_time, 10),
                            'packaging_time', COALESCE(p.packaging_time, 5)
                        ))
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = o.id
                    ) as items
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.status IN ('confirmed', 'production', 'packaging', 'shipping')
                ORDER BY o.updated_at ASC
            `;

            const processedQueue = queue.map((order: any) => {
                let totalProd = 0;
                let totalPack = 0;
                order.items?.forEach((item: any) => {
                    totalProd += (item.quantity * item.production_time);
                    totalPack += (item.quantity * item.packaging_time);
                });

                return {
                    ...order,
                    estimations: {
                        production_mins: totalProd,
                        packaging_mins: totalPack,
                        pickup_buffer_mins: 15,
                        total_mins: totalProd + totalPack + 15
                    }
                };
            });

            return {
                success: true,
                data: {
                    stats: stats[0],
                    queue: processedQueue
                }
            };
        })
        .get('/production/mobile', async () => {
            // Get Incoming Orders (Pending Verification)
            const incoming = await db`
                SELECT 
                    o.id, o.order_number, o.status, o.total_amount, o.created_at,
                    c.name as customer_name,
                    (
                        SELECT json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity, 'subtotal', oi.subtotal))
                        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id
                    ) as items
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.status IN ('pending', 'paid')
                ORDER BY o.created_at ASC
            `;

            // Get Active Production Queue (Same logic as main production)
            const queue = await db`
                SELECT 
                    o.id, o.order_number, o.status, o.total_amount, o.notes,
                    o.created_at as order_created, o.updated_at as last_update,
                    c.name as customer_name,
                    (SELECT start_date FROM production WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as prod_start,
                    (SELECT packaging_date FROM packaging WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1) as pack_start,
                    (
                        SELECT json_agg(json_build_object(
                            'product_name', p.name,
                            'quantity', oi.quantity,
                            'production_time', COALESCE(p.production_time, 10),
                            'packaging_time', COALESCE(p.packaging_time, 5)
                        ))
                        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id
                    ) as items
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.status IN ('confirmed', 'production', 'packaging')
                ORDER BY o.updated_at ASC
            `;

            const processEstimations = (list: any[]) => list.map((order: any) => {
                let totalProd = 0;
                let totalPack = 0;
                order.items?.forEach((item: any) => {
                    totalProd += (item.quantity * (item.production_time || 10));
                    totalPack += (item.quantity * (item.packaging_time || 5));
                });
                return {
                    ...order,
                    estimations: {
                        total_mins: totalProd + totalPack + 15
                    }
                };
            });

            return {
                success: true,
                data: {
                    incoming: processEstimations(incoming),
                    queue: processEstimations(queue)
                }
            };
        })
        // --- Gallery Management ---
        .get('/gallery', async () => {
            const items = await db`SELECT * FROM gallery ORDER BY display_order ASC`;
            return { success: true, data: items };
        })
        .post('/gallery', async ({ body }: { body: any }) => {
            const { title, description, display_order, image } = body;

            let imageUrl = '';
            if (image && image instanceof File) {
                imageUrl = await uploadToCloudinary(image, 'baitybites/gallery');
            } else if (typeof body.image_url === 'string') {
                imageUrl = body.image_url;
            }

            if (!imageUrl) throw new Error('Image is required');

            const [item] = await db`
                INSERT INTO gallery (image_url, title, description, display_order)
                VALUES (${imageUrl}, ${title || null}, ${description || null}, ${Number(display_order) || 0})
                RETURNING *
            `;
            return { success: true, data: item, message: 'Foto berhasil ditambahkan' };
        }, {
            body: t.Object({
                image: t.Optional(t.File()),
                image_url: t.Optional(t.String()),
                title: t.Optional(t.String()),
                description: t.Optional(t.String()),
                display_order: t.Optional(t.Numeric())
            })
        })
        .put('/gallery/:id', async ({ params, body }: { params: any, body: any }) => {
            const [item] = await db`
                UPDATE gallery 
                SET title = ${body.title || null}, 
                    description = ${body.description || null}, 
                    is_active = ${body.is_active}, 
                    display_order = ${body.display_order || 0} 
                WHERE id = ${params.id}
                RETURNING *
            `;
            return { success: true, data: item };
        }, {
            body: t.Object({
                title: t.Optional(t.String()),
                description: t.Optional(t.String()),
                is_active: t.Boolean(),
                display_order: t.Optional(t.Number())
            })
        })
        .delete('/gallery/:id', async ({ params }) => {
            await db`DELETE FROM gallery WHERE id = ${params.id}`;
            return { success: true, message: 'Item deleted' };
        })

        // --- Customer Management ---
        .get('/customers', async () => {
            const customers = await db`
                SELECT c.*, 
                       COUNT(o.id)::int as total_orders, 
                       MAX(o.order_date) as last_order
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `;
            const stats = await db`
                SELECT json_agg(json_build_object(
                    'total_orders', (SELECT COUNT(*) FROM orders),
                    'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed')
                )) as stats
            `;
            return { success: true, data: customers, stats: stats[0]?.stats || {} };
        })

        // --- Testimonials Moderation ---
        .get('/testimonials', async () => {
            const items = await db`SELECT * FROM testimonials ORDER BY created_at DESC`;
            return { success: true, data: items };
        })
        .put('/testimonials/:id/approve', async ({ params, body }: { params: any, body: any }) => {
            const [item] = await db`
                UPDATE testimonials 
                SET is_approved = ${body.is_approved} 
                WHERE id = ${params.id}
                RETURNING *
            `;
            return { success: true, data: item, message: body.is_approved ? 'Approved' : 'Unapproved' };
        }, {
            body: t.Object({
                is_approved: t.Boolean()
            })
        })
        .put('/testimonials/:id/reply', async ({ params, body }: { params: any, body: any }) => {
            const [item] = await db`
                UPDATE testimonials 
                SET reply = ${body.reply}, reply_at = CURRENT_TIMESTAMP 
                WHERE id = ${params.id}
                RETURNING *
            `;
            return { success: true, data: item, message: 'Balasan berhasil dikirim' };
        }, {
            body: t.Object({
                reply: t.String()
            })
        })

        .get('/customers/:id', async ({ params }) => {
            const [customer] = await db`
                SELECT c.*, 
                       COUNT(o.id)::int as total_orders, 
                       COALESCE(SUM(o.total_amount), 0) as total_spent,
                       MAX(o.order_date) as last_order
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                WHERE c.id = ${params.id}
                GROUP BY c.id
            `;

            if (!customer) return { success: false, message: 'Customer not found' };

            const orders = await db`
                SELECT o.* 
                FROM orders o 
                WHERE o.customer_id = ${params.id}
                ORDER BY o.created_at DESC
            `;

            return { success: true, data: { ...customer, orders } };
        })

        // --- Order & Process Management ---
        .get('/orders', async () => {
            const orders = await db`
                SELECT o.*, c.name as customer_name 
                FROM orders o 
                JOIN customers c ON o.customer_id = c.id 
                ORDER BY o.created_at DESC
            `;
            return { success: true, data: orders };
        })
        .put('/orders/:id/status', async ({ params, body }: { params: any, body: any }) => {
            const [order] = await db`
                UPDATE orders 
                SET status = ${body.status}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ${params.id}
                RETURNING *
            `;

            // Auto-create/update related tracking tables
            if (body.status === 'production') {
                await db`
                    INSERT INTO production (order_id, start_date, status)
                    VALUES (${params.id}, CURRENT_TIMESTAMP, 'in_progress')
                    ON CONFLICT DO NOTHING
                `;
            } else if (body.status === 'packaging') {
                // Mark production as completed
                await db`
                    UPDATE production 
                    SET end_date = CURRENT_TIMESTAMP, status = 'completed' 
                    WHERE order_id = ${params.id} AND status = 'in_progress'
                `;
                // Create packaging record
                await db`
                    INSERT INTO packaging (order_id, packaging_date, status)
                    VALUES (${params.id}, CURRENT_TIMESTAMP, 'in_progress')
                    ON CONFLICT DO NOTHING
                `;
            } else if (body.status === 'shipping') {
                // Mark packaging as completed (using existing packaging_date as start, maybe we just mark status)
                await db`
                    UPDATE packaging 
                    SET status = 'completed' 
                    WHERE order_id = ${params.id} AND status = 'in_progress'
                `;
                // Create shipping record
                await db`
                    INSERT INTO shipping (order_id, shipping_date, courier, status)
                    VALUES (${params.id}, CURRENT_TIMESTAMP, ${body.courier || 'Kurir Internal'}, 'pending')
                    ON CONFLICT DO NOTHING
                `;
            }

            return { success: true, data: order, message: `Status updated to ${body.status}` };
        }, {
            body: t.Object({
                status: t.String(),
                courier: t.Optional(t.String())
            })
        })

        // --- Product Management (Stock etc.) ---
        .get('/products', async () => {
            const products = await db`SELECT * FROM products ORDER BY id ASC`;
            return { success: true, data: products };
        })
        .post('/products', async ({ body }: { body: any }) => {
            const { name, description, category, price, unit, stock, image } = body;

            let imageUrl = null;
            if (image && image instanceof File) {
                imageUrl = await uploadToCloudinary(image, 'baitybites/products');
            }

            const [product] = await db`
                INSERT INTO products (name, description, category, price, unit, stock, image_url)
                VALUES (${name}, ${description || null}, ${category || 'General'}, ${Number(price)}, ${unit}, ${Number(stock)}, ${imageUrl})
                RETURNING *
            `;
            return { success: true, data: product, message: 'Produk berhasil ditambahkan' };
        }, {
            body: t.Object({
                name: t.String(),
                description: t.Optional(t.String()),
                category: t.Optional(t.String()),
                price: t.Numeric(),
                unit: t.String(),
                stock: t.Numeric(),
                image: t.Optional(t.File())
            })
        })
        .put('/products/:id', async ({ params, body }: { params: any, body: any }) => {
            const { name, description, category, price, unit, stock, image } = body;

            let imageUrl = null;
            if (image && image instanceof File) {
                imageUrl = await uploadToCloudinary(image, 'baitybites/products');
            }

            // Construct update query dynamically or use simple logic
            let product;
            if (imageUrl) {
                [product] = await db`
                    UPDATE products 
                    SET name = ${name}, 
                        description = ${description || null}, 
                        category = ${category || 'General'},
                        price = ${Number(price)}, 
                        unit = ${unit}, 
                        stock = ${Number(stock)},
                        image_url = ${imageUrl}
                    WHERE id = ${params.id}
                    RETURNING *
                `;
            } else {
                [product] = await db`
                    UPDATE products 
                    SET name = ${name}, 
                        description = ${description || null}, 
                        category = ${category || 'General'},
                        price = ${Number(price)}, 
                        unit = ${unit}, 
                        stock = ${Number(stock)}
                    WHERE id = ${params.id}
                    RETURNING *
                `;
            }

            return { success: true, data: product, message: 'Produk berhasil diperbarui' };
        }, {
            body: t.Object({
                name: t.String(),
                description: t.Optional(t.String()),
                category: t.Optional(t.String()),
                price: t.Numeric(),
                unit: t.String(),
                stock: t.Numeric(),
                image: t.Optional(t.File())
            })
        })
        .put('/products/:id/stock', async ({ params, body }: { params: any, body: any }) => {
            const [product] = await db`
                UPDATE products SET stock = ${body.stock} WHERE id = ${params.id} RETURNING *
            `;
            return { success: true, data: product };
        }, {
            body: t.Object({
                stock: t.Number()
            })
        })

        // Instagram Integration Routes - SUSPENDED
        .post('/instagram/sync', () => ({ success: false, message: 'Instagram service is currently suspended.' }))
        .get('/instagram/settings', () => ({ success: false, message: 'Instagram service is currently suspended.' }))
        .put('/instagram/token', () => ({ success: false, message: 'Instagram service is currently suspended.' }))
        .get('/instagram/widget', () => ({ success: false, message: 'Instagram service is currently suspended.' }))
        .put('/instagram/widget', () => ({ success: false, message: 'Instagram service is currently suspended.' }))
        // --- General Settings (Contact & Social) ---
        .get('/settings', async () => {
            const settingsList = await db`
                SELECT key, value FROM settings 
                WHERE key IN (
                    'contact_email', 'contact_phone', 'contact_whatsapp', 'contact_address', 
                    'social_instagram', 'social_facebook', 'social_tiktok',
                    'hero_greeting', 'hero_title', 'hero_description', 'hero_background_url', 'hero_button_text', 'hero_button_link'
                )
            `;

            const settings = settingsList.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});

            return { success: true, data: settings };
        })
        .put('/settings', async ({ body }: { body: any }) => {
            const keys = [
                'contact_email', 'contact_phone', 'contact_whatsapp', 'contact_address',
                'social_instagram', 'social_facebook', 'social_tiktok',
                'hero_greeting', 'hero_title', 'hero_description', 'hero_background_url', 'hero_button_text', 'hero_button_link'
            ];

            await db.begin(async (sql: any) => {
                for (const key of keys) {
                    if (body[key] !== undefined) {
                        await sql`
                            INSERT INTO settings (key, value) 
                            VALUES (${key}, ${body[key]})
                            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
                        `;
                    }
                }
            });

            return { success: true, message: 'Pengaturan berhasil disimpan' };
        }, {
            body: t.Object({
                contact_email: t.Optional(t.String()),
                contact_phone: t.Optional(t.String()),
                contact_whatsapp: t.Optional(t.String()),
                contact_address: t.Optional(t.String()),
                social_instagram: t.Optional(t.String()),
                social_facebook: t.Optional(t.String()),
                social_tiktok: t.Optional(t.String()),
                hero_greeting: t.Optional(t.String()),
                hero_title: t.Optional(t.String()),
                hero_description: t.Optional(t.String()),
                hero_background_url: t.Optional(t.String()),
                hero_button_text: t.Optional(t.String()),
                hero_button_link: t.Optional(t.String())
            })
        });
