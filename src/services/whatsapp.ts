import type { Sql } from "../db/schema";

export class WhatsAppService {
    private db: Sql;
    private wahaUrl: string;
    private wahaSession: string;
    private apiKey: string;
    private enabled: boolean;

    constructor(db: Sql) {
        this.db = db;
        this.wahaUrl = process.env.WAHA_URL || 'http://localhost:3000';
        this.wahaSession = process.env.WAHA_SESSION || 'default';
        this.apiKey = process.env.WAHA_API_KEY || '';
        this.enabled = !!process.env.WAHA_URL;
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['X-Api-Key'] = this.apiKey;
        }
        return headers;
    }

    /**
     * Format phone number
     * Example: +6281234567890 → 6281234567890@c.us
     */
    private formatChatId(phone: string): string {
        const cleaned = phone.replace(/[^0-9]/g, '');
        return `${cleaned}@c.us`;
    }

    /**
     * Send text message via WAHA
     */
    async sendText(phone: string, text: string): Promise<any> {
        if (!this.enabled) {
            console.log('[WhatsApp] Service disabled, skipping message');
            return { success: false, reason: 'disabled' };
        }

        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    session: this.wahaSession,
                    chatId,
                    text
                })
            });

            if (!response.ok) {
                throw new Error(`WAHA API error: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`[WhatsApp] Message sent to ${phone}`);
            return result;
        } catch (error) {
            console.error('[WhatsApp] Send error:', error);
            throw error;
        }
    }

    /**
     * Send image with caption
     */
    async sendImage(phone: string, imageUrl: string, caption?: string): Promise<any> {
        if (!this.enabled) {
            console.log('[WhatsApp] Service disabled, skipping image');
            return { success: false, reason: 'disabled' };
        }

        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendImage`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    session: this.wahaSession,
                    chatId,
                    file: {
                        url: imageUrl
                    },
                    caption: caption || ''
                })
            });

            if (!response.ok) {
                throw new Error(`WAHA API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[WhatsApp] Send image error:', error);
            throw error;
        }
    }

    /**
     * Send document (PDF, etc.)
     */
    async sendDocument(phone: string, documentUrl: string, filename: string): Promise<any> {
        if (!this.enabled) {
            console.log('[WhatsApp] Service disabled, skipping document');
            return { success: false, reason: 'disabled' };
        }

        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendFile`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    session: this.wahaSession,
                    chatId,
                    file: {
                        url: documentUrl,
                        filename
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`WAHA API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[WhatsApp] Send document error:', error);
            throw error;
        }
    }

    /**
     * Send order confirmation message
     */
    async sendOrderConfirmation(orderId: string): Promise<void> {
        if (!this.enabled) return;

        try {
            const orders = await this.db`
                SELECT o.*, c.name as customer_name, c.phone, c.address
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ${orderId}
            `;

            const order = orders[0];

            if (!order || !order.phone) {
                console.log('[WhatsApp] Order or customer phone not found');
                return;
            }

            const message = `
🎉 *Pesanan Dikonfirmasi!*

Halo ${order.customer_name},

Terima kasih atas pesanan Anda!

📋 *Detail Pesanan:*
• Order ID: ${order.order_number}
• Total: Rp ${Number(order.total_amount).toLocaleString('id-ID')}
• Status: ${this.getStatusLabel(order.status)}

📦 Pesanan Anda sedang diproses dan akan segera dikirim.

Lacak pesanan Anda di:
https://baitybites.netlify.app/track.html?order=${order.order_number}

Terima kasih telah memesan di BaityBites! 🍰
            `.trim();

            await this.sendText(order.phone, message);
            console.log(`[WhatsApp] Order confirmation sent to ${order.phone}`);
        } catch (error) {
            console.error('[WhatsApp] Failed to send order confirmation:', error);
        }
    }

    /**
     * Send order status update
     */
    async sendStatusUpdate(orderId: string, newStatus: string): Promise<void> {
        if (!this.enabled) return;

        try {
            const orders = await this.db`
                SELECT o.*, c.name as customer_name, c.phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ${orderId}
            `;

            const order = orders[0];

            if (!order || !order.phone) {
                console.log('[WhatsApp] Order or customer phone not found');
                return;
            }

            const statusMessages: Record<string, string> = {
                'pending': '⏳ Pesanan Anda menunggu konfirmasi',
                'confirmed': '✅ Pesanan Anda telah dikonfirmasi!',
                'production': '👨‍🍳 Pesanan Anda sedang dalam proses produksi',
                'packaging': '📦 Pesanan Anda sedang dikemas',
                'shipping': '🚚 Pesanan Anda sedang dalam pengiriman',
                'completed': '🎉 Pesanan Anda telah selesai! Terima kasih!',
                'cancelled': '❌ Pesanan Anda telah dibatalkan'
            };

            const statusEmoji: Record<string, string> = {
                'pending': '⏳',
                'confirmed': '✅',
                'production': '👨‍🍳',
                'packaging': '📦',
                'shipping': '🚚',
                'completed': '🎉',
                'cancelled': '❌'
            };

            const message = `
${statusEmoji[newStatus] || '📋'} *Update Status Pesanan*

Halo ${order.customer_name},

${statusMessages[newStatus] || 'Status pesanan Anda telah diperbarui'}

📋 Order: ${order.order_number}
📍 Status: ${this.getStatusLabel(newStatus)}

Lacak pesanan: https://baitybites.netlify.app/track.html?order=${order.order_number}

BaityBites 🍰
            `.trim();

            await this.sendText(order.phone, message);
            console.log(`[WhatsApp] Status update sent to ${order.phone}`);
        } catch (error) {
            console.error('[WhatsApp] Failed to send status update:', error);
        }
    }

    /**
     * Send payment reminder
     */
    async sendPaymentReminder(orderId: string): Promise<void> {
        if (!this.enabled) return;

        try {
            const orders = await this.db`
                SELECT o.*, c.name as customer_name, c.phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ${orderId}
            `;

            const order = orders[0];

            if (!order || !order.phone) return;

            const message = `
💰 *Reminder Pembayaran*

Halo ${order.customer_name},

Pesanan Anda menunggu pembayaran:

📋 Order: ${order.order_number}
💵 Total: Rp ${Number(order.total_amount).toLocaleString('id-ID')}

Silakan lakukan pembayaran untuk melanjutkan proses pesanan Anda.

Detail: https://baitybites.netlify.app/track.html?order=${order.order_number}

Terima kasih! 🙏
            `.trim();

            await this.sendText(order.phone, message);
            console.log(`[WhatsApp] Payment reminder sent to ${order.phone}`);
        } catch (error) {
            console.error('[WhatsApp] Failed to send payment reminder:', error);
        }
    }

    /**
     * Send welcome message to new customer
     */
    async sendWelcomeMessage(customerId: string): Promise<void> {
        if (!this.enabled) return;

        try {
            const customers = await this.db`
                SELECT * FROM customers WHERE id = ${customerId}
            `;

            const customer = customers[0];

            if (!customer || !customer.phone) return;

            const message = `
👋 *Selamat Datang di BaityBites!*

Halo ${customer.name},

Terima kasih telah bergabung dengan BaityBites! 🍰

Kami siap melayani pesanan kue dan makanan lezat Anda.

🌐 Website: https://baitybites.netlify.app
📱 WhatsApp: Simpan nomor ini untuk update pesanan

Jangan ragu untuk menghubungi kami jika ada pertanyaan!

Salam manis,
Tim BaityBites 💕
            `.trim();

            await this.sendText(customer.phone, message);
            console.log(`[WhatsApp] Welcome message sent to ${customer.phone}`);
        } catch (error) {
            console.error('[WhatsApp] Failed to send welcome message:', error);
        }
    }

    /**
     * Check WAHA session status
     */
    async checkStatus(): Promise<any> {
        if (!this.enabled) {
            return {
                status: 'DISABLED',
                message: 'WAHA service not configured',
                enabled: false
            };
        }

        try {
            const response = await fetch(`${this.wahaUrl}/api/sessions/${this.wahaSession}`);
            if (!response.ok) {
                throw new Error('WAHA session not found');
            }
            const data = await response.json();
            return Object.assign({}, data, { enabled: true });
        } catch (error) {
            console.error('[WhatsApp] Status check failed:', error);
            return {
                status: 'OFFLINE',
                error: (error as Error).message,
                enabled: true
            };
        }
    }

    /**
     * Get human-readable status label
     */
    private getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'pending': 'Menunggu',
            'confirmed': 'Dikonfirmasi',
            'production': 'Produksi',
            'packaging': 'Pengemasan',
            'shipping': 'Pengiriman',
            'completed': 'Selesai',
            'cancelled': 'Dibatalkan'
        };
        return labels[status] || status;
    }

    /**
     * Check if service is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}
