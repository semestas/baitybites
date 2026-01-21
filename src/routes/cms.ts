import { Elysia, t } from 'elysia';
import type { Sql } from '../db/schema';

export const cmsRoutes = (db: Sql) =>
    new Elysia({ prefix: '/cms' })
        .get('/stats', async () => {
            const [stats] = await db`
                SELECT 
                    COUNT(*)::int as total_orders,
                    COUNT(*) FILTER (WHERE status = 'completed')::int as completed_orders,
                    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int as in_progress_orders,
                    COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'pending', 'confirmed')), 0)::int as total_revenue
                FROM orders
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
                    flow: flowData,
                    recentOrders
                }
            };
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
        // --- Gallery Management ---
        .get('/gallery', async () => {
            const items = await db`SELECT * FROM gallery ORDER BY display_order ASC`;
            return { success: true, data: items };
        })
        .post('/gallery', async ({ body }: { body: any }) => {
            const [item] = await db`
                INSERT INTO gallery (image_url, title, description, display_order)
                VALUES (${body.image_url}, ${body.title || null}, ${body.description || null}, ${body.display_order || 0})
                RETURNING *
            `;
            return { success: true, data: item };
        }, {
            body: t.Object({
                image_url: t.String(),
                title: t.Optional(t.String()),
                description: t.Optional(t.String()),
                display_order: t.Optional(t.Number())
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
            return { success: true, data: customers };
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
            const { name, description, price, unit, stock, image } = body;

            let imageUrl = null;
            if (image && image instanceof File) {
                // Sanitize filename: remove spaces and special chars
                const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${Date.now()}-${safeName}`;
                const filePath = `public/uploads/products/${fileName}`;
                await Bun.write(filePath, image);
                imageUrl = `/uploads/products/${fileName}`;
            }

            const [product] = await db`
                INSERT INTO products (name, description, price, unit, stock, image_url)
                VALUES (${name}, ${description}, ${Number(price)}, ${unit}, ${Number(stock)}, ${imageUrl})
                RETURNING *
            `;
            return { success: true, data: product, message: 'Produk berhasil ditambahkan' };
        }, {
            body: t.Object({
                name: t.String(),
                description: t.String(),
                price: t.Numeric(),
                unit: t.String(),
                stock: t.Numeric(),
                image: t.Optional(t.File())
            })
        })
        .put('/products/:id', async ({ params, body }: { params: any, body: any }) => {
            const { name, description, price, unit, stock, image } = body;

            let imageUrl = null;
            if (image && image instanceof File) {
                const safeName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `${Date.now()}-${safeName}`;
                const filePath = `public/uploads/products/${fileName}`;
                await Bun.write(filePath, image);
                imageUrl = `/uploads/products/${fileName}`;
            }

            // Construct update query dynamically or use simple logic
            let product;
            if (imageUrl) {
                [product] = await db`
                    UPDATE products 
                    SET name = ${name}, 
                        description = ${description}, 
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
                        description = ${description}, 
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
                description: t.String(),
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
        });
