# 📱 WAHA WhatsApp - Quick Reference

## 🚀 Quick Start (Windows)

```powershell
# Run setup script
.\setup-waha.ps1

# Or manual Docker command
docker run -d --name waha -p 3000:3000 -v waha_data:/app/.sessions devlikeapro/waha
```

## 🔧 Configuration

Add to `.env`:
```bash
WAHA_URL=http://localhost:3000
WAHA_SESSION=default
```

## 📡 API Endpoints

### Start Session
```bash
POST http://localhost:3000/api/sessions/start
{
  "name": "default"
}
```

### Get QR Code
```
GET http://localhost:3000/api/sessions/default/auth/qr
```

### Send Message
```bash
POST http://localhost:3000/api/sendText
{
  "session": "default",
  "chatId": "6281234567890@c.us",
  "text": "Hello!"
}
```

### Check Status
```
GET http://localhost:3000/api/sessions/default
```

## 💻 BaityBites Integration

### Automatic Notifications

**Order Confirmation:**
- Triggered when order is created
- Sends order details and tracking link

**Status Updates:**
- Triggered when order status changes
- Sends status-specific messages

**Payment Reminders:**
- Can be triggered manually or scheduled
- Reminds customers to complete payment

### Usage in Code

```typescript
import { WhatsAppService } from "./src/services/whatsapp";

const waService = new WhatsAppService(db);

// Send order confirmation
await waService.sendOrderConfirmation(orderId);

// Send status update
await waService.sendStatusUpdate(orderId, 'shipping');

// Send payment reminder
await waService.sendPaymentReminder(orderId);

// Check WAHA status
const status = await waService.checkStatus();
```

## 🔍 Troubleshooting

### Check WAHA Logs
```bash
docker logs -f waha
```

### Restart WAHA
```bash
docker restart waha
```

### Stop WAHA
```bash
docker stop waha
```

### Remove WAHA
```bash
docker stop waha
docker rm waha
```

## 📊 Phone Number Format

**Input:** `+62 812-3456-7890` or `081234567890`  
**Output:** `6281234567890@c.us`

The service automatically formats phone numbers.

## 🌐 Production Deployment

### Option 1: Separate VPS
1. Deploy WAHA on VPS (DigitalOcean, Linode, etc.)
2. Update `.env`: `WAHA_URL=http://YOUR_VPS_IP:3000`
3. Configure firewall to allow port 3000

### Option 2: Railway.app
1. Create new Railway service
2. Deploy WAHA Docker image
3. Get public URL
4. Update `.env`: `WAHA_URL=https://waha-xxx.railway.app`

### Option 3: Same Server (Docker Compose)
See `WAHA_INTEGRATION.md` for `docker-compose.yml` example

## ⚠️ Important Notes

1. **WhatsApp Account:** Use a dedicated WhatsApp number, not your personal one
2. **Rate Limiting:** Don't spam messages (risk of ban)
3. **Session Management:** Monitor session status regularly
4. **Backup:** Keep QR code session data backed up
5. **Testing:** Test thoroughly before production use

## 📚 Resources

- **Full Guide:** `WAHA_INTEGRATION.md`
- **WAHA Docs:** https://waha.devlike.pro/
- **GitHub:** https://github.com/devlikeapro/waha
- **Swagger UI:** http://localhost:3000/

## ✅ Checklist

- [ ] Docker installed
- [ ] WAHA container running
- [ ] WhatsApp account connected (QR scanned)
- [ ] Session status = "WORKING"
- [ ] `.env` configured with WAHA_URL
- [ ] Test message sent successfully
- [ ] Webhook endpoint accessible
- [ ] Integration tested with BaityBites

---

*Quick Reference for BaityBites v1.6.0*
