import { Elysia } from "elysia";

export const orderRoutes = (db: any) =>
    new Elysia({ prefix: "/orders" })
        .get("/", async () => {
            try {
                // Fetch orders with customer details and items
                const orders = await db`
                    SELECT 
                        o.id,
                        o.order_number,
                        o.order_date,
                        o.total_amount,
                        o.status,
                        c.name as customer_name,
                        c.email as customer_email,
                        (
                            SELECT json_agg(json_build_object(
                                'product_name', p.name, 
                                'quantity', oi.quantity
                            ))
                            FROM order_items oi
                            JOIN products p ON oi.product_id = p.id
                            WHERE oi.order_id = o.id
                        ) as items
                    FROM orders o
                    JOIN customers c ON o.customer_id = c.id
                    ORDER BY o.order_date DESC
                `;

                return {
                    success: true,
                    data: orders
                };
            } catch (error) {
                console.error("Error fetching orders:", error);
                return {
                    success: false,
                    message: "Failed to fetch orders"
                };
            }
        });
