# 📱 WAHA WhatsApp Integration Guide
**BaityBites Order Management System**  
**Integration Type:** WhatsApp HTTP API (WAHA)  
**Version:** WAHA Core (Free) / WAHA Plus (Donation)

---

## 🎯 Why WAHA?

**WAHA (WhatsApp HTTP API)** is perfect for BaityBites because:
- ✅ **Self-hosted** - Full control, no vendor lock-in
- ✅ **Free tier available** - WAHA Core is completely free
- ✅ **Easy setup** - Docker-based, runs anywhere
- ✅ **REST API** - Simple HTTP requests
- ✅ **No official API fees** - Unlike WhatsApp Business API
- ✅ **Multiple sessions** - Manage multiple WhatsApp numbers
- ✅ **Rich media** - Send images, documents, PDFs
- ✅ **Webhooks** - Receive messages and events

---

## 📋 Use Cases for BaityBites

### 1. **Order Notifications** 📦
- New order confirmation
- Order status updates (Confirmed → Production → Shipping → Delivered)
- Payment reminders
- Delivery tracking links

### 2. **Customer Communication** 💬
- Welcome messages for new customers
- Order receipt with invoice PDF
- Custom messages from admin
- Promotional offers

### 3. **Admin Alerts** 🔔
- New order notifications to admin
- Low stock alerts
- Payment received confirmations
- Customer inquiries

### 4. **Automated Workflows** 🤖
- Auto-reply to common questions
- Order tracking via WhatsApp
- Payment confirmation requests
- Feedback collection after delivery

---

## 🚀 Installation Options

### Option 1: Docker on VPS (Recommended)
**Best for:** Production deployment  
**Cost:** $5-10/month (VPS)  
**Platforms:** DigitalOcean, Linode, Vultr, Hetzner

### Option 2: Docker on Render.com
**Best for:** Same server as backend  
**Cost:** Free tier available  
**Note:** May have cold starts

### Option 3: Railway.app
**Best for:** Easy deployment  
**Cost:** $5/month credit  
**Note:** Auto-scaling, good uptime

### Option 4: Local Development
**Best for:** Testing only  
**Cost:** Free  
**Note:** Not accessible from internet

---

## 📦 Quick Start - Docker Installation

### Prerequisites
- Docker installed
- Server with public IP (for production)
- WhatsApp account (personal or business)

### Step 1: Pull WAHA Docker Image

**WAHA Core (Free):**
```bash
docker pull devlikeapro/waha
```

**WAHA Plus (Donation version with extra features):**
```bash
docker login -u devlikeapro -p YOUR_PASSWORD
docker pull devlikeapro/waha-plus
```

### Step 2: Run WAHA Container

**Basic Setup:**
```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -v waha_data:/app/.sessions \
  --restart unless-stopped \
  devlikeapro/waha
```

**With Environment Variables:**
```bash
docker run -d \
  --name waha \
  -p 3000:3000 \
  -e WHATSAPP_HOOK_URL=https://baitybites-api.onrender.com/api/webhooks/whatsapp \
  -e WHATSAPP_HOOK_EVENTS=message,session.status \
  -v waha_data:/app/.sessions \
  --restart unless-stopped \
  devlikeapro/waha
```

### Step 3: Access WAHA Dashboard

Open your browser and navigate to:
```
http://localhost:3000/
```

Or for production:
```
http://YOUR_SERVER_IP:3000/
```

You'll see the **Swagger UI** with all available API endpoints.

---

## 🔗 Connect WhatsApp Account

### Step 1: Start a Session

**API Endpoint:** `POST /api/sessions/start`

**Request:**
```bash
curl -X POST http://localhost:3000/api/sessions/start \
  -H "Content-Type: application/json" \
  -d '{
    "name": "default",
    "config": {
      "webhooks": [
        {
          "url": "https://baitybites-api.onrender.com/api/webhooks/whatsapp",
          "events": ["message", "session.status"]
        }
      ]
    }
  }'
```

### Step 2: Get QR Code

**API Endpoint:** `GET /api/sessions/default/auth/qr`

**Request:**
```bash
curl http://localhost:3000/api/sessions/default/auth/qr
```

**Response:** Returns QR code image (PNG)

### Step 3: Scan QR Code

1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code from the API response

### Step 4: Verify Session Status

**API Endpoint:** `GET /api/sessions/default`

**Request:**
```bash
curl http://localhost:3000/api/sessions/default
```

**Response:**
```json
{
  "name": "default",
  "status": "WORKING",
  "config": {...}
}
```

Status should be **"WORKING"** when connected.

---

## 💻 BaityBites Integration

### 1. Create WhatsApp Service

Create `src/services/whatsapp.ts`:

```typescript
import { Database } from "bun:sqlite";

interface WhatsAppMessage {
    chatId: string;
    text: string;
    session?: string;
}

interface WhatsAppMediaMessage extends WhatsAppMessage {
    mediaUrl: string;
    caption?: string;
}

export class WhatsAppService {
    private db: Database;
    private wahaUrl: string;
    private wahaSession: string;

    constructor(db: Database) {
        this.db = db;
        this.wahaUrl = process.env.WAHA_URL || 'http://localhost:3000';
        this.wahaSession = process.env.WAHA_SESSION || 'default';
    }

    /**
     * Format phone number to WhatsApp chat ID
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
        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: this.wahaSession,
                    chatId,
                    text
                })
            });

            if (!response.ok) {
                throw new Error(`WAHA API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('WhatsApp send error:', error);
            throw error;
        }
    }

    /**
     * Send image with caption
     */
    async sendImage(phone: string, imageUrl: string, caption?: string): Promise<any> {
        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendImage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            console.error('WhatsApp send image error:', error);
            throw error;
        }
    }

    /**
     * Send document (PDF, etc.)
     */
    async sendDocument(phone: string, documentUrl: string, filename: string): Promise<any> {
        try {
            const chatId = this.formatChatId(phone);
            const response = await fetch(`${this.wahaUrl}/api/sendFile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            console.error('WhatsApp send document error:', error);
            throw error;
        }
    }

    /**
     * Send order confirmation message
     */
    async sendOrderConfirmation(orderId: string): Promise<void> {
        try {
            const order = this.db.query(`
                SELECT o.*, c.name as customer_name, c.phone, c.address
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ?
            `).get(orderId) as any;

            if (!order || !order.phone) {
                throw new Error('Order or customer phone not found');
            }

            const message = `
🎉 *Pesanan Dikonfirmasi!*

Halo ${order.customer_name},

Terima kasih atas pesanan Anda!

📋 *Detail Pesanan:*
• Order ID: ${order.order_number}
• Total: Rp ${order.total_amount.toLocaleString('id-ID')}
• Status: ${order.status}

📦 Pesanan Anda sedang diproses dan akan segera dikirim.

Lacak pesanan Anda di:
https://baitybites.netlify.app/track.html?order=${order.order_number}

Terima kasih telah memesan di BaityBites! 🍰
            `.trim();

            await this.sendText(order.phone, message);
            console.log(`Order confirmation sent to ${order.phone}`);
        } catch (error) {
            console.error('Failed to send order confirmation:', error);
        }
    }

    /**
     * Send order status update
     */
    async sendStatusUpdate(orderId: string, newStatus: string): Promise<void> {
        try {
            const order = this.db.query(`
                SELECT o.*, c.name as customer_name, c.phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ?
            `).get(orderId) as any;

            if (!order || !order.phone) return;

            const statusMessages: Record<string, string> = {
                'confirmed': '✅ Pesanan Anda telah dikonfirmasi!',
                'production': '👨‍🍳 Pesanan Anda sedang dalam proses produksi',
                'packaging': '📦 Pesanan Anda sedang dikemas',
                'shipping': '🚚 Pesanan Anda sedang dalam pengiriman',
                'completed': '🎉 Pesanan Anda telah selesai! Terima kasih!'
            };

            const statusEmoji: Record<string, string> = {
                'confirmed': '✅',
                'production': '👨‍🍳',
                'packaging': '📦',
                'shipping': '🚚',
                'completed': '🎉'
            };

            const message = `
${statusEmoji[newStatus] || '📋'} *Update Status Pesanan*

Halo ${order.customer_name},

${statusMessages[newStatus] || 'Status pesanan Anda telah diperbarui'}

📋 Order: ${order.order_number}
📍 Status: ${newStatus.toUpperCase()}

Lacak pesanan: https://baitybites.netlify.app/track.html?order=${order.order_number}

BaityBites 🍰
            `.trim();

            await this.sendText(order.phone, message);
            console.log(`Status update sent to ${order.phone}`);
        } catch (error) {
            console.error('Failed to send status update:', error);
        }
    }

    /**
     * Send payment reminder
     */
    async sendPaymentReminder(orderId: string): Promise<void> {
        try {
            const order = this.db.query(`
                SELECT o.*, c.name as customer_name, c.phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = ?
            `).get(orderId) as any;

            if (!order || !order.phone) return;

            const message = `
💰 *Reminder Pembayaran*

Halo ${order.customer_name},

Pesanan Anda menunggu pembayaran:

📋 Order: ${order.order_number}
💵 Total: Rp ${order.total_amount.toLocaleString('id-ID')}

Silakan lakukan pembayaran untuk melanjutkan proses pesanan Anda.

Detail: https://baitybites.netlify.app/track.html?order=${order.order_number}

Terima kasih! 🙏
            `.trim();

            await this.sendText(order.phone, message);
        } catch (error) {
            console.error('Failed to send payment reminder:', error);
        }
    }

    /**
     * Check WAHA session status
     */
    async checkStatus(): Promise<any> {
        try {
            const response = await fetch(`${this.wahaUrl}/api/sessions/${this.wahaSession}`);
            if (!response.ok) {
                throw new Error('WAHA session not found');
            }
            return await response.json();
        } catch (error) {
            console.error('WAHA status check failed:', error);
            return { status: 'OFFLINE', error: error.message };
        }
    }
}
```

### 2. Add Webhook Handler

Create `src/routes/webhooks.ts`:

```typescript
import { Elysia } from "elysia";
import { Database } from "bun:sqlite";

export const webhookRoutes = (db: Database) => new Elysia({ prefix: '/webhooks' })
    .post('/whatsapp', async ({ body }) => {
        try {
            console.log('WhatsApp webhook received:', body);

            // Handle different event types
            const event = body as any;

            switch (event.event) {
                case 'message':
                    // Handle incoming message
                    await handleIncomingMessage(db, event);
                    break;

                case 'session.status':
                    // Handle session status change
                    console.log('Session status:', event.payload.status);
                    break;

                default:
                    console.log('Unknown webhook event:', event.event);
            }

            return { success: true };
        } catch (error) {
            console.error('Webhook error:', error);
            return { success: false, error: error.message };
        }
    });

async function handleIncomingMessage(db: Database, event: any) {
    const message = event.payload;
    const from = message.from.replace('@c.us', '');
    const text = message.body;

    console.log(`Message from ${from}: ${text}`);

    // Auto-reply for order tracking
    if (text.toLowerCase().includes('lacak') || text.toLowerCase().includes('track')) {
        // Find customer's latest order
        const customer = db.query('SELECT id FROM customers WHERE phone LIKE ?').get(`%${from}%`) as any;
        
        if (customer) {
            const order = db.query(`
                SELECT order_number, status 
                FROM orders 
                WHERE customer_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `).get(customer.id) as any;

            if (order) {
                // Send tracking info (implement WhatsApp reply logic)
                console.log(`Auto-reply: Order ${order.order_number} status: ${order.status}`);
            }
        }
    }
}
```

### 3. Update Main Server

Update `index.ts`:

```typescript
import { webhookRoutes } from "./src/routes/webhooks";
import { WhatsAppService } from "./src/services/whatsapp";

// ... existing imports ...

const db = await initDatabase();
const waService = new WhatsAppService(db);

const app = new Elysia()
    // ... existing config ...
    .decorate("db", db)
    .decorate("whatsapp", waService)
    .group("/api", (app) =>
        app.get("/test", () => "api ok")
            .use(webhookRoutes(db))
            // ... other routes ...
    );
```

### 4. Trigger WhatsApp Notifications

Update `src/routes/orders.ts` to send WhatsApp notifications:

```typescript
// In order creation endpoint
.post('/orders', async ({ body, whatsapp }) => {
    // ... create order logic ...
    
    // Send WhatsApp confirmation
    try {
        await whatsapp.sendOrderConfirmation(newOrder.id);
    } catch (error) {
        console.error('WhatsApp notification failed:', error);
        // Don't fail the order creation if WhatsApp fails
    }
    
    return { success: true, order: newOrder };
})

// In order status update endpoint
.patch('/orders/:id/status', async ({ params, body, whatsapp }) => {
    // ... update status logic ...
    
    // Send WhatsApp status update
    try {
        await whatsapp.sendStatusUpdate(params.id, body.status);
    } catch (error) {
        console.error('WhatsApp notification failed:', error);
    }
    
    return { success: true };
})
```

---

## 🔧 Environment Variables

Add to `.env`:

```bash
# WAHA Configuration
WAHA_URL=http://localhost:3000
WAHA_SESSION=default

# Production
# WAHA_URL=http://YOUR_WAHA_SERVER:3000
# WAHA_SESSION=baitybites
```

Add to `.env.example`:

```bash
# WAHA WhatsApp API (Optional)
# WAHA_URL=http://localhost:3000
# WAHA_SESSION=default
```

---

## 🚀 Deployment Options

### Option 1: Separate VPS for WAHA

**Recommended for production**

1. **Setup VPS** (DigitalOcean, Linode, etc.)
2. **Install Docker**
3. **Run WAHA container** (see Docker commands above)
4. **Configure firewall** to allow port 3000
5. **Update BaityBites env:** `WAHA_URL=http://YOUR_VPS_IP:3000`

### Option 2: Docker Compose (Same Server)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    ports:
      - "3000:3000"
    volumes:
      - waha_data:/app/.sessions
    environment:
      - WHATSAPP_HOOK_URL=http://baitybites:9876/api/webhooks/whatsapp
    restart: unless-stopped

  baitybites:
    build: .
    container_name: baitybites
    ports:
      - "9876:9876"
    environment:
      - WAHA_URL=http://waha:3000
      - WAHA_SESSION=default
    depends_on:
      - waha
    restart: unless-stopped

volumes:
  waha_data:
```

Run with:
```bash
docker-compose up -d
```

### Option 3: Railway.app Deployment

1. **Create new Railway project**
2. **Add Docker service** with WAHA image
3. **Set environment variables**
4. **Get public URL** from Railway
5. **Update BaityBites:** `WAHA_URL=https://waha-xxx.railway.app`

---

## 📊 Testing

### Test WAHA Connection

```bash
# Check session status
curl http://localhost:3000/api/sessions/default

# Send test message
curl -X POST http://localhost:3000/api/sendText \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "chatId": "6281234567890@c.us",
    "text": "Test message from BaityBites!"
  }'
```

### Test BaityBites Integration

```typescript
// In your code
const waService = new WhatsAppService(db);

// Test status check
const status = await waService.checkStatus();
console.log('WAHA Status:', status);

// Test send message
await waService.sendText('+6281234567890', 'Hello from BaityBites!');
```

---

## 💡 Best Practices

### 1. **Error Handling**
- Always wrap WhatsApp calls in try-catch
- Don't fail order creation if WhatsApp fails
- Log all WhatsApp errors for debugging

### 2. **Rate Limiting**
- WhatsApp may ban accounts for spam
- Limit messages to 1 per customer per hour
- Avoid sending to same number repeatedly

### 3. **Message Templates**
- Use consistent message formats
- Include order number and tracking link
- Keep messages concise and clear

### 4. **Session Management**
- Monitor session status regularly
- Auto-reconnect if session drops
- Have backup notification method (email)

### 5. **Security**
- Protect WAHA endpoint with firewall
- Use HTTPS for webhooks
- Validate webhook signatures (if available)

---

## 🔍 Troubleshooting

### Issue: QR Code Not Appearing
**Solution:** Check WAHA logs, restart container

### Issue: Session Status "FAILED"
**Solution:** Delete session and start new one

### Issue: Messages Not Sending
**Solution:** 
1. Check WAHA session status
2. Verify phone number format
3. Check WAHA logs for errors

### Issue: Webhooks Not Received
**Solution:**
1. Verify webhook URL is publicly accessible
2. Check firewall settings
3. Test webhook with curl

---

## 📈 Monitoring

### Health Check Endpoint

Add to `index.ts`:

```typescript
.get('/api/whatsapp/status', async ({ whatsapp }) => {
    const status = await whatsapp.checkStatus();
    return {
        success: true,
        waha: status,
        configured: !!process.env.WAHA_URL
    };
})
```

### Dashboard Widget

Add WhatsApp status to admin dashboard showing:
- ✅ Connected / ❌ Disconnected
- Last message sent
- Messages sent today
- Session uptime

---

## 💰 Cost Comparison

| Solution | Setup Cost | Monthly Cost | Features |
|----------|-----------|--------------|----------|
| **WAHA (Self-hosted)** | $0 | $5-10 (VPS) | Unlimited messages, Full control |
| **WhatsApp Business API** | $0 | $0.005-0.02/msg | Official, Reliable, Expensive at scale |
| **Twilio WhatsApp** | $0 | $0.005/msg | Easy setup, Pay per message |
| **MessageBird** | $0 | $0.01/msg | Good API, Medium cost |

**Recommendation:** WAHA for BaityBites (cost-effective, unlimited messages)

---

## 🎯 Next Steps

1. ✅ **Read this guide** completely
2. 🐳 **Install Docker** on your server
3. 🚀 **Deploy WAHA** container
4. 📱 **Connect WhatsApp** account
5. 💻 **Implement service** in BaityBites
6. 🧪 **Test integration** thoroughly
7. 📊 **Monitor performance** in production

---

## 📚 Resources

- **WAHA GitHub:** https://github.com/devlikeapro/waha
- **WAHA Documentation:** https://waha.devlike.pro/
- **Docker Installation:** https://docs.docker.com/get-docker/
- **WhatsApp Business Policy:** https://www.whatsapp.com/legal/business-policy

---

*Integration guide created for BaityBites v1.6.0*  
*Last updated: 2026-01-31*
