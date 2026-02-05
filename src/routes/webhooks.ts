import { Elysia } from "elysia";
import { WhatsAppService } from "../services/whatsapp";
import type { Sql } from "../db/schema";

export const webhookRoutes = (db: Sql, waService: WhatsAppService) => new Elysia({ prefix: '/webhooks' })
    /**
     * WhatsApp webhook handler for WAHA
     * Receives messages and events from WhatsApp
     */
    .post('/whatsapp', async ({ body }: { body: any }) => {
        try {
            // console.log('[Webhook] WhatsApp event received:', JSON.stringify(body, null, 2));

            const event = body as any;

            // Handle different event types
            switch (event.event) {
                case 'message':
                    await handleIncomingMessage(db, waService, event);
                    break;

                case 'session.status':
                    handleSessionStatus(event);
                    break;

                case 'message.ack':
                    // Message acknowledgment (sent, delivered, read)
                    console.log('[Webhook] Message ACK:', event.payload.ack);
                    break;

                default:
                    console.log('[Webhook] Unknown event type:', event.event);
            }

            return { success: true };
        } catch (error) {
            console.error('[Webhook] Error processing WhatsApp event:', error);
            return { success: false, error: (error as Error).message };
        }
    })

    /**
     * Test webhook endpoint
     */
    .get('/whatsapp/test', () => {
        return {
            success: true,
            message: 'WhatsApp webhook endpoint is working',
            timestamp: new Date().toISOString()
        };
    });

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(db: Sql, waService: WhatsAppService, event: any) {
    try {
        const message = event.payload;
        const from = message.from.replace('@c.us', '');
        const text = message.body || '';
        const isFromMe = message.fromMe;

        // Ignore messages sent by us
        if (isFromMe) {
            // console.log('[Webhook] Ignoring message from self');
            return;
        }

        console.log(`[Webhook] Message from ${from}: ${text}`);

        // Find customer by phone number
        const customers = await db`
            SELECT id, name FROM customers 
            WHERE phone LIKE ${'%' + from + '%'} OR phone LIKE ${'%' + from.substring(2) + '%'}
        `;

        const customer = customers[0];
        const name = customer ? customer.name : 'Pelanggan';

        // Auto-reply for common keywords
        const lowerText = text.toLowerCase();

        // 0. Direct Order Check (Format: Nama: XXX, Pesanan: XXX)
        if (lowerText.includes('nama:') && lowerText.includes('pesanan:')) {
            await handleDirectWhatsAppOrder(db, waService, from, text, customer);
            return;
        }

        // 1. Check PO Open/Status
        if (lowerText.includes('po') || lowerText.includes('jadwal') || lowerText.includes('buka')) {
            await handlePOStatus(db, waService, from, name);
            return;
        }

        // 2. Check Available Products
        if (lowerText.includes('menu') || lowerText.includes('produk') || lowerText.includes('ready')) {
            await handleAvailableProducts(db, waService, from, name);
            return;
        }

        // 3. Track Order
        if (lowerText.includes('lacak') || lowerText.includes('status') || lowerText.includes('track')) {
            if (!customer) {
                await waService.sendText(from, "Maaf, nomor Anda belum terdaftar. Silakan pesan melalui website terlebih dahulu untuk mulai melacak.");
                return;
            }
            await handleTrackingRequest(db, waService, customer, from);
            return;
        }

        // 4. Order Flow
        if (lowerText.includes('order') || lowerText.includes('pesan') || lowerText.includes('beli')) {
            await handleOrderFlow(waService, from, name);
            return;
        }

        // 5. Help/Welcome
        if (lowerText.includes('help') || lowerText.includes('halo') || lowerText.includes('hi') || lowerText === 'bantuan') {
            await handleWelcomeFlow(waService, from, name);
            return;
        }

        // Default: Welcome message if not matched
        await handleWelcomeFlow(waService, from, name);

    } catch (error) {
        console.error('[Webhook] Error handling incoming message:', error);
    }
}

/**
 * Handle Welcome / Help Flow
 */
async function handleWelcomeFlow(waService: WhatsAppService, phone: string, name: string) {
    const reply = `
Halo ${name}! 👋 Selamat datang di *BaityBites*.

Ada yang bisa kami bantu? Gunakan kata kunci berikut:

📝 *MENU* : Lihat produk & harga
🕒 *PO* : Cek jadwal buka PO
📦 *LACAK* : Lacak pesanan Anda
🛍️ *ORDER* : Cara melakukan pemesanan

Atau kunjungi website kami:
https://baitybites.netlify.app

BaityBites - Salam Manis 💕
    `.trim();
    await waService.sendText(phone, reply);
}

/**
 * Handle PO Status
 */
async function handlePOStatus(db: Sql, waService: WhatsAppService, phone: string, name: string) {
    const settings = await db`SELECT value FROM settings WHERE key = 'po_status'`;
    const poStatus = settings[0]?.value || 'BaityBites selalu menerima pesanan setiap hari!';

    const reply = `
🕒 *Informasi PO BaityBites*

Halo ${name},
${poStatus}

Estimasi pengerjaan: 1-2 hari kerja.
Silakan cek menu untuk melihat apa yang sedang ready! 🍰
    `.trim();
    await waService.sendText(phone, reply);
}

/**
 * Handle Available Products
 */
async function handleAvailableProducts(db: Sql, waService: WhatsAppService, phone: string, name: string) {
    const products = await db`SELECT name, price, unit, stock FROM products WHERE stock > 0 LIMIT 10`;

    if (products.length === 0) {
        await waService.sendText(phone, `Maaf ${name}, saat ini semua produk kami sedang sold out. Pantau terus IG kami untuk restock ya!`);
        return;
    }

    let menuText = `🍰 *Menu Ready BaityBites*\n\nHalo ${name}, berikut produk yang tersedia saat ini:\n\n`;

    products.forEach((p: any, i: number) => {
        menuText += `${i + 1}. *${p.name}*\n   💰 Rp ${Number(p.price).toLocaleString('id-ID')}/${p.unit}\n   📦 Stok: ${p.stock}\n\n`;
    });

    menuText += "Ketik *ORDER* untuk cara pemesanan.";
    await waService.sendText(phone, menuText);
}

/**
 * Handle Order Flow instruction
 */
async function handleOrderFlow(waService: WhatsAppService, phone: string, name: string) {
    const reply = `
🛍️ *Cara Pemesanan BaityBites*

Halo ${name}, untuk memesan silakan pilih salah satu cara:

1. *Website (Otomatis)*:
   👉 https://baitybites.netlify.app/order.html

2. *Manual Via WhatsApp*:
   Kirim pesan dengan format:

Nama: [Nama Anda]
Alamat: [Alamat Lengkap]
Pesanan:
- [Nama Produk] [Jumlah]

Contoh:
Nama: Budi
Alamat: Jl. Melati No 123
Pesanan:
- Risol Mayo Original 2 box
- Nastar Special 1 toples
    `.trim();
    await waService.sendText(phone, reply);
}

/**
 * Handle Direct WhatsApp Order (Template Parser)
 */
async function handleDirectWhatsAppOrder(db: Sql, waService: WhatsAppService, phone: string, text: string, existingCustomer: any) {
    try {
        const nameMatch = text.match(/Nama\s*:\s*([^\n]+)/i);
        const addressMatch = text.match(/Alamat\s*:\s*([^\n]+)/i);
        const orderSection = text.split(/Pesanan\s*:\s*/i)[1];

        if (!nameMatch || !orderSection) {
            await waService.sendText(phone, "Format pesanan kurang lengkap. Mohon sertakan *Nama:* dan *Pesanan:* ya! Ketik *ORDER* untuk melihat formatnya.");
            return;
        }

        const customerName = nameMatch[1]?.trim() || 'Pelanggan';
        const customerAddress = addressMatch ? (addressMatch[1]?.trim() || '-') : '-';

        // 1. Get/Create Customer
        let customerId;
        if (existingCustomer) {
            customerId = existingCustomer.id;
        } else {
            const email = `${phone}@wa.baitybites.id`;
            const [newCustomer] = await db`
                INSERT INTO customers (name, email, phone, address)
                VALUES (${customerName}, ${email}, ${phone}, ${customerAddress})
                ON CONFLICT (email) DO UPDATE SET name = ${customerName}, address = ${customerAddress}
                RETURNING id
            `;
            if (!newCustomer) throw new Error('Gagal membuat data pelanggan');
            customerId = newCustomer.id;
        }

        // 2. Parse products
        const allProducts = await db`SELECT id, name, price, stock FROM products WHERE stock > 0`;
        const lines = orderSection.split('\n');
        const itemsToOrder: any[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            for (const p of allProducts) {
                if (trimmedLine.toLowerCase().includes(p.name.toLowerCase())) {
                    const qtyMatch = trimmedLine.match(/(\d+)/);
                    const quantity = qtyMatch ? parseInt(qtyMatch[1] || '1') : 1;
                    itemsToOrder.push({ product: p, quantity });
                    break;
                }
            }
        }

        if (itemsToOrder.length === 0) {
            await waService.sendText(phone, "Maaf, kami tidak menemukan nama produk yang cocok. Silakan cek *MENU* untuk daftar produk yang benar.");
            return;
        }

        // 3. Create Order
        const totalAmount = itemsToOrder.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0);
        const orderNumber = `WA-${new Date().getMonth() + 1}${Math.floor(Math.random() * 900) + 100}-${Date.now().toString().slice(-4)}`;

        await db.begin(async (sql: any) => {
            const [order] = await sql`
                INSERT INTO orders (customer_id, order_number, order_date, total_amount, status, notes)
                VALUES (${customerId}, ${orderNumber}, ${new Date()}, ${totalAmount}, 'pending', 'Manual WhatsApp Order')
                RETURNING id
            `;

            if (!order) throw new Error('Gagal membuat pesanan');

            for (const item of itemsToOrder) {
                await sql`
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                    VALUES (${order.id}, ${item.product.id}, ${item.quantity}, ${item.product.price}, ${Number(item.product.price) * item.quantity})
                `;
            }
        });

        // 4. Success Reply
        const reply = `
✅ *Pesanan Berhasil Dicatat!*

Halo ${customerName}, pesanan Anda telah masuk ke sistem kami.

📋 *Detail:*
ID: #${orderNumber}
Total: Rp ${totalAmount.toLocaleString('id-ID')}
Status: ⏳ Menunggu Konfirmasi Admin

Item:
${itemsToOrder.map(item => `- ${item.product.name} (${item.quantity}x)`).join('\n')}

Lacak: https://baitybites.netlify.app/track.html?order=${orderNumber}

*Mohon tunggu sebentar, admin kami akan segera menghubungi Anda untuk total ongkir & info pembayaran.*
`.trim();
        await waService.sendText(phone, reply);

    } catch (error) {
        console.error('[DirectOrder] Error:', error);
        await waService.sendText(phone, "Maaf, terjadi kesalahan saat memproses pesanan Anda. Mohon hubungi admin kami.");
    }
}

/**
 * Handle order tracking request
 */
async function handleTrackingRequest(db: Sql, waService: WhatsAppService, customer: any, phone: string) {
    try {
        const orders = await db`
            SELECT order_number, status, total_amount, created_at
            FROM orders 
            WHERE customer_id = ${customer.id} 
            ORDER BY created_at DESC 
            LIMIT 1
        `;

        const order = orders[0];

        if (!order) {
            // No orders found
            const reply = `
Halo ${customer.name}! 👋

Kami tidak menemukan pesanan atas nama Anda.

Silakan pesan melalui website kami:
https://baitybites.netlify.app/order.html

Terima kasih! 🍰
            `.trim();

            console.log('[Webhook] Auto-reply (no orders):', reply);
            await waService.sendText(phone, reply);
            return;
        }

        const statusLabels: Record<string, string> = {
            'pending': '⏳ Menunggu Konfirmasi',
            'confirmed': '✅ Dikonfirmasi',
            'production': '👨‍🍳 Dalam Produksi',
            'packaging': '📦 Pengemasan',
            'shipping': '🚚 Dalam Pengiriman',
            'completed': '🎉 Selesai',
            'cancelled': '❌ Dibatalkan'
        };

        const reply = `
📦 *Status Pesanan Anda*

Halo ${customer.name}!

📋 Order: ${order.order_number}
📍 Status: ${statusLabels[order.status] || order.status}
💵 Total: Rp ${Number(order.total_amount).toLocaleString('id-ID')}
📅 Tanggal: ${new Date(order.created_at).toLocaleDateString('id-ID')}

Lacak detail lengkap:
https://baitybites.netlify.app/track.html?order=${order.order_number}

BaityBites 🍰
        `.trim();

        console.log('[Webhook] Auto-reply (tracking):', reply);
        await waService.sendText(phone, reply);

    } catch (error) {
        console.error('[Webhook] Error handling tracking request:', error);
    }
}



/**
 * Handle session status changes
 */
function handleSessionStatus(event: any) {
    const status = event.payload.status;
    console.log(`[Webhook] WhatsApp session status changed: ${status}`);

    // Could send alert to admin if session disconnected
    if (status === 'FAILED' || status === 'STOPPED') {
        console.error('[Webhook] ⚠️ WhatsApp session is down! Please reconnect.');
    }
}
