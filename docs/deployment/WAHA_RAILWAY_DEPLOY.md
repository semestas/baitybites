# 🚂 Deploy WAHA to Railway.app (FREE)
**For BaityBites + Netlify Testing**

## 🎯 Why Railway for WAHA?

- ✅ **FREE** - $5 credit/month (enough for WAHA)
- ✅ **No cold starts** - Always online
- ✅ **Permanent URL** - Doesn't change
- ✅ **Easy setup** - 5 minutes
- ✅ **Works with Netlify** - Perfect for testing

---

## 📋 Prerequisites

- Railway.app account (sign up at https://railway.app)
- GitHub account (for Railway login)
- Your BaityBites backend already on Render.com

---

## 🚀 Deployment Steps

### Step 1: Sign Up for Railway

1. Go to **https://railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub account
4. You'll get **$5 FREE credit** automatically

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from Docker Image"**
3. Enter Docker image: `devlikeapro/waha`
4. Click **"Deploy"**

Railway will start deploying WAHA immediately!

### Step 3: Configure Environment Variables

1. Click on your **WAHA service**
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add the following variables:

```bash
# Webhook URL (your Render.com backend)
WHATSAPP_HOOK_URL=https://baitybites-api.onrender.com/api/webhooks/whatsapp

# Events to send to webhook
WHATSAPP_HOOK_EVENTS=message,session.status
```

5. Click **"Add"** for each variable

### Step 4: Enable Public URL

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://waha-production-xxxx.up.railway.app`
5. **Copy this URL** - you'll need it!

### Step 5: Wait for Deployment

- Railway will build and deploy WAHA
- Wait 2-3 minutes for deployment to complete
- Status should show **"Active"** with green dot

### Step 6: Verify WAHA is Running

Open your Railway URL in browser:
```
https://waha-production-xxxx.up.railway.app
```

You should see **Swagger UI** with WAHA API documentation!

---

## 🔗 Connect to BaityBites Backend

### Step 7: Update Render.com Environment

1. Go to **Render.com Dashboard**
2. Select your **baitybites-api** service
3. Go to **"Environment"** tab
4. Add/update these variables:

```bash
# WAHA Configuration
WAHA_URL=https://waha-production-xxxx.up.railway.app
WAHA_SESSION=default
```

5. Click **"Save Changes"**
6. Render will **auto-redeploy** your backend

### Step 8: Connect WhatsApp Account

1. **Open Railway WAHA URL** in browser:
   ```
   https://waha-production-xxxx.up.railway.app
   ```

2. **Find "Sessions" section** in Swagger UI

3. **Start a new session:**
   - Click **POST /api/sessions/start**
   - Click **"Try it out"**
   - Use this body:
     ```json
     {
       "name": "default",
       "config": {
         "webhooks": [
           {
             "url": "https://baitybites-api.onrender.com/api/webhooks/whatsapp",
             "events": ["message", "session.status"]
           }
         ]
       }
     }
     ```
   - Click **"Execute"**

4. **Get QR Code:**
   - Click **GET /api/sessions/{session}/auth/qr**
   - Click **"Try it out"**
   - Enter session name: `default`
   - Click **"Execute"**
   - You'll see a QR code image

5. **Scan QR Code:**
   - Open **WhatsApp** on your phone
   - Go to **Settings** → **Linked Devices**
   - Tap **"Link a Device"**
   - Scan the QR code from Swagger UI

6. **Verify Connection:**
   - Click **GET /api/sessions/{session}**
   - Enter session: `default`
   - Click **"Execute"**
   - Status should be **"WORKING"** ✅

---

## ✅ Test the Integration

### Step 9: Test WhatsApp Notification

1. **Create a test order** on your Netlify frontend:
   ```
   https://baitybites.netlify.app/order.html
   ```

2. **Fill in order details** with a phone number

3. **Submit the order**

4. **Check WhatsApp** - You should receive:
   ```
   🎉 Pesanan Dikonfirmasi!
   
   Halo [Your Name],
   Terima kasih atas pesanan Anda!
   
   📋 Order ID: PO-01-XX
   💵 Total: Rp XXX,XXX
   ...
   ```

5. **If you receive the message** → ✅ SUCCESS!

---

## 📊 Monitor Your Setup

### Railway Dashboard

**Check WAHA Status:**
- Go to Railway dashboard
- View **Metrics** tab
- Monitor CPU, Memory, Network usage

**View Logs:**
- Click **"Deployments"** tab
- Click latest deployment
- View real-time logs

**Check Credit Usage:**
- Click your profile (top right)
- View **"Usage"**
- Monitor remaining credit

### Render.com Dashboard

**Check Backend Logs:**
- Go to Render dashboard
- Select **baitybites-api**
- Click **"Logs"** tab
- Look for `[WhatsApp]` messages

---

## 💰 Cost Breakdown (FREE Tier)

| Service | Plan | Cost | Usage |
|---------|------|------|-------|
| **Netlify** | Free | $0 | Frontend hosting |
| **Render.com** | Free | $0 | Backend API |
| **Railway** | Free | $0 | WAHA (uses $5 credit) |
| **Neon DB** | Free | $0 | PostgreSQL database |
| **TOTAL** | | **$0/month** | ✅ |

**Railway Credit Usage:**
- $5 credit/month (FREE)
- WAHA uses ~$2-3/month
- **Plenty of credit remaining!**

---

## 🔧 Troubleshooting

### Issue: Railway URL not accessible

**Solution:**
1. Check deployment status (should be "Active")
2. Verify domain is generated in Settings → Networking
3. Wait 2-3 minutes after deployment

### Issue: WhatsApp messages not sending

**Solution:**
1. Check WAHA session status (should be "WORKING")
2. Verify `WAHA_URL` in Render.com environment
3. Check Render.com logs for `[WhatsApp]` errors
4. Verify webhook URL is correct in WAHA session config

### Issue: QR code expired

**Solution:**
1. Delete session: `DELETE /api/sessions/default`
2. Start new session
3. Get new QR code
4. Scan within 60 seconds

### Issue: Session disconnected

**Solution:**
1. Check Railway logs for errors
2. Restart WAHA service in Railway
3. Reconnect WhatsApp (scan QR again)

---

## 🎯 Production Upgrade Path

When ready for production:

### Option 1: Keep Railway (Paid)
- Upgrade to Railway Pro: $5/month
- Remove credit limit
- Better support

### Option 2: Migrate to VPS
- DigitalOcean: $6/month
- Linode: $5/month
- Hetzner: €4/month
- Full control, no limits

### Option 3: Keep Free Tier
- Railway FREE tier is enough for small businesses
- Monitor credit usage monthly
- Upgrade only if needed

---

## 📈 Scaling Considerations

**Railway FREE tier is sufficient for:**
- ✅ Up to 100 orders/day
- ✅ Up to 500 WhatsApp messages/day
- ✅ Testing and development
- ✅ Small business operations

**Upgrade when you reach:**
- ⚠️ 500+ orders/day
- ⚠️ 2000+ messages/day
- ⚠️ Multiple WhatsApp sessions
- ⚠️ High-availability requirements

---

## ✅ Checklist

- [ ] Railway account created
- [ ] WAHA deployed to Railway
- [ ] Public domain generated
- [ ] Environment variables configured
- [ ] Render.com backend updated with WAHA_URL
- [ ] WhatsApp account connected (QR scanned)
- [ ] Session status = "WORKING"
- [ ] Test order created
- [ ] WhatsApp message received
- [ ] Webhook working (check logs)

---

## 🎉 Success!

If you've completed all steps, you now have:

✅ **FREE** WhatsApp integration  
✅ **Netlify** frontend (static hosting)  
✅ **Render.com** backend (API + logic)  
✅ **Railway** WAHA (WhatsApp API)  
✅ **Neon** database (PostgreSQL)  

**Total cost: $0/month** 🎊

Your customers will now receive automatic WhatsApp notifications for:
- Order confirmations
- Status updates
- Payment reminders
- And more!

---

## 📚 Next Steps

1. **Test thoroughly** with multiple orders
2. **Monitor Railway credit** usage
3. **Customize message templates** in `src/services/whatsapp.ts`
4. **Add more auto-replies** in `src/routes/webhooks.ts`
5. **Plan for production** upgrade when needed

---

## 🆘 Need Help?

- **Railway Docs:** https://docs.railway.app
- **WAHA Docs:** https://waha.devlike.pro
- **BaityBites Guide:** `WAHA_INTEGRATION.md`

---

*Railway deployment guide for BaityBites v1.6.0*  
*Last updated: 2026-01-31*
