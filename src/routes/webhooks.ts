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
            console.log('[Webhook] WhatsApp event received:', JSON.stringify(body, null, 2));

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
            console.log('[Webhook] Ignoring message from self');
            return;
        }

        console.log(`[Webhook] Message from ${from}: ${text}`);

        // Find customer by phone number
        const customers = await db`
            SELECT id, name FROM customers 
            WHERE phone LIKE ${'%' + from + '%'} OR phone LIKE ${'%' + from.substring(2) + '%'}
        `;

        const customer = customers[0];

        if (!customer) {
            console.log('[Webhook] Customer not found for phone:', from);
            // Could send auto-reply: "Nomor tidak terdaftar. Silakan pesan melalui website kami."
            return;
        }

        // Auto-reply for common keywords
        const lowerText = text.toLowerCase();

        // Order tracking request
        if (lowerText.includes('lacak') || lowerText.includes('track') || lowerText.includes('status')) {
            await handleTrackingRequest(db, waService, customer, from);
            return;
        }

        // Help request
        if (lowerText.includes('help') || lowerText.includes('bantuan')) {
            await handleHelpRequest(waService, from);
            return;
        }

        // Menu request
        if (lowerText.includes('menu') || lowerText.includes('produk')) {
            await handleMenuRequest(waService, from);
            return;
        }

        // Default: Log message for admin review
        console.log(`[Webhook] Unhandled message from ${customer.name}: ${text}`);

    } catch (error) {
        console.error('[Webhook] Error handling incoming message:', error);
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
 * Handle help request
 */
async function handleHelpRequest(waService: WhatsAppService, phone: string) {
    const reply = `
🤖 *BaityBites - Bantuan*

Kirim pesan dengan kata kunci:

📦 *LACAK* - Cek status pesanan
🍰 *MENU* - Lihat produk kami
📞 *KONTAK* - Hubungi admin

Or kunjungi website kami:
https://baitybites.netlify.app

Terima kasih! 💕
    `.trim();

    console.log('[Webhook] Auto-reply (help):', reply);
    await waService.sendText(phone, reply);
}

/**
 * Handle menu request
 */
async function handleMenuRequest(waService: WhatsAppService, phone: string) {
    const reply = `
🍰 *Menu BaityBites*

Lihat semua produk kami di:
https://baitybites.netlify.app

📱 Pesan langsung:
https://baitybites.netlify.app/order.html

Kami menyediakan berbagai kue dan makanan lezat untuk acara spesial Anda!

BaityBites - Salam Manis 💕
    `.trim();

    console.log('[Webhook] Auto-reply (menu):', reply);
    await waService.sendText(phone, reply);
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
