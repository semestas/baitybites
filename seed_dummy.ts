import { initDatabase } from './src/db/schema';

const db = await initDatabase();

console.log('🌱 Seeding dummy data...');

try {
    // 1. Seed Customers
    const customers = [
        { name: 'Budi Santoso', email: 'budi@example.com', phone: '081234567890', address: 'Jl. Merdeka No. 1, Jakarta' },
        { name: 'Siti Aminah', email: 'siti@example.com', phone: '081987654321', address: 'Jl. Sudirman No. 45, Bandung' },
        { name: 'Rahmat Hidayat', email: 'rahmat@example.com', phone: '085678901234', address: 'Jl. Ahmad Yani No. 12, Surabaya' },
        { name: 'Dewi Lestari', email: 'dewi@example.com', phone: '081345678901', address: 'Jl. Diponegoro No. 8, Yogyakarta' },
        { name: 'Andi Wijaya', email: 'andi@example.com', phone: '081234567899', address: 'Jl. Gajah Mada No. 3, Semarang' }
    ];

    const customerIds: number[] = [];
    for (const c of customers) {
        // Correctly type the return and handle potential undefined result
        const existing = await db`SELECT id FROM customers WHERE email = ${c.email}`.then(res => res[0]);
        if (existing) {
            customerIds.push(existing.id);
            console.log(`Customer exists: ${c.name}`);
        } else {
            const newCustomer = await db`
                INSERT INTO customers (name, email, phone, address)
                VALUES (${c.name}, ${c.email}, ${c.phone}, ${c.address})
                RETURNING id
            `.then(res => res[0]);

            if (newCustomer) {
                customerIds.push(newCustomer.id);
                console.log(`Created customer: ${c.name}`);
            }
        }
    }

    // 2. Fetch Products for Order Items
    const products = await db`SELECT id, price FROM products LIMIT 5`;
    if (!products || products.length === 0) {
        console.error('No products found. Please seed products first.');
        process.exit(1);
    }

    // 3. Seed Orders, Order Items, and Productions
    const statuses = ['pending', 'confirmed', 'production', 'packaging', 'shipping', 'completed'];

    if (customerIds.length === 0) {
        console.error('No customers found. Seeding aborted.');
        process.exit(1);
    }

    for (let i = 0; i < 10; i++) {
        const customerId = customerIds[i % customerIds.length];
        const status = statuses[i % statuses.length];

        if (customerId === undefined || status === undefined) {
            console.error('Undefined customer or status, skipping...');
            continue;
        }

        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - i); // Past dates
        const orderNumber = `ORD-${Date.now()}-${i}`;

        // Create Order
        const order = await db`
            INSERT INTO orders (customer_id, order_number, order_date, total_amount, status)
            VALUES (${customerId}, ${orderNumber}, ${orderDate}, 0, ${status})
            RETURNING id
        `.then(res => res[0]);

        if (!order) {
            console.error('Failed to create order');
            continue;
        }

        // Create Order Items
        let totalAmount = 0;
        const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
        for (let j = 0; j < numItems; j++) {
            const product = products[Math.floor(Math.random() * products.length)];

            // Ensure product is valid
            if (!product || product.price === undefined) continue;

            const quantity = Math.floor(Math.random() * 5) + 1;
            const subtotal = Number(product.price) * quantity;

            await db`
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                VALUES (${order.id}, ${product.id}, ${quantity}, ${product.price}, ${subtotal})
            `;
            totalAmount += subtotal;
        }

        // Update Order Total
        await db`UPDATE orders SET total_amount = ${totalAmount} WHERE id = ${order.id}`;
        console.log(`Created order #${order.id} for customer #${customerId} with status ${status}`);

        // 4. Seed Status-Specific Tables
        if (['production', 'packaging', 'shipping', 'completed'].includes(status)) {
            await db`
                INSERT INTO production (order_id, start_date, status, notes)
                VALUES (${order.id}, ${orderDate}, ${status === 'production' ? 'in_progress' : 'completed'}, 'Started production')
            `;
        }

        if (['packaging', 'shipping', 'completed'].includes(status)) {
            const packDate = new Date(orderDate);
            packDate.setDate(packDate.getDate() + 1);
            const packStatus = status === 'packaging' ? 'in_progress' : 'completed';
            await db`
                INSERT INTO packaging (order_id, packaging_date, status, notes)
                VALUES (${order.id}, ${packDate}, ${packStatus}, 'Packaging started')
            `;
        }

        if (['shipping', 'completed'].includes(status)) {
            const shipDate = new Date(orderDate);
            shipDate.setDate(shipDate.getDate() + 2);
            const shipStatus = status === 'shipping' ? 'in_transit' : 'delivered';
            await db`
                INSERT INTO shipping (order_id, shipping_date, courier, status, notes)
                VALUES (${order.id}, ${shipDate}, 'JNE', ${shipStatus}, 'Shipped via JNE')
            `;
        }
    }

    console.log('✅ Dummy data seeded successfully!');
    process.exit(0);

} catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
}
