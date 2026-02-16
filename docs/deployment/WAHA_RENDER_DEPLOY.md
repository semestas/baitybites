# 🚀 Deploy WAHA to Render.com (Same Platform)
**For BaityBites - Keep Everything Together**

## 🎯 Why Deploy WAHA on Render.com?

Since your backend is **already on Render.com**, deploying WAHA there too gives you:

- ✅ **Everything in one place** - Same dashboard, same account
- ✅ **FREE** - Render.com free tier includes multiple services
- ✅ **Easy management** - One platform to monitor
- ✅ **Internal networking** - Services can talk to each other faster
- ✅ **No new accounts** - Use your existing Render.com account

---

## 📋 Prerequisites

- ✅ Render.com account (you already have this!)
- ✅ BaityBites backend already deployed on Render.com
- ✅ 5 minutes of your time

---

## 🚀 Deployment Steps

### Step 1: Go to Render.com Dashboard

1. Open **https://dashboard.render.com**
2. You should see your existing **baitybites-api** service
3. Click **"New +"** button (top right)
4. Select **"Web Service"**

### Step 2: Configure WAHA Service

1. **Select "Deploy an existing image from a registry"**

2. **Fill in the details:**
   ```
   Image URL: devlikeapro/waha
   ```

3. **Service Details:**
   - **Name:** `waha-whatsapp`
   - **Region:** Same as your backend (e.g., Oregon)
   - **Instance Type:** Free

4. **Advanced Settings:**
   - **Auto-Deploy:** Yes
   - **Health Check Path:** `/api/health` (optional)

### Step 3: Configure Environment Variables

In the **Environment Variables** section, add:

```bash
# Webhook URL - Your backend service
WHATSAPP_HOOK_URL=https://baitybites-api.onrender.com/api/webhooks/whatsapp

# Events to send to webhook
WHATSAPP_HOOK_EVENTS=message,session.status
```

**Important:** Replace `baitybites-api.onrender.com` with your actual backend URL if different.

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying WAHA
3. Wait 2-3 minutes for deployment to complete
4. Status should show **"Live"** with green indicator

### Step 5: Get Your WAHA URL

Once deployed, you'll see your WAHA URL:
```
https://waha-whatsapp.onrender.com
```

**Copy this URL** - you'll need it in the next step!

---

## 🔗 Connect WAHA to Your Backend

### Step 6: Update Backend Environment Variables

1. Go back to **Render.com Dashboard**
2. Click on your **baitybites-api** service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add these variables:

```bash
# WAHA Configuration
WAHA_URL=https://waha-whatsapp.onrender.com
WAHA_SESSION=default
```

6. Click **"Save Changes"**
7. Your backend will **auto-redeploy** (wait 1-2 minutes)

---

## 📱 Connect WhatsApp Account

### Step 7: Access WAHA Swagger UI

1. Open your WAHA URL in browser:
   ```
   https://waha-whatsapp.onrender.com
   ```

2. You should see **Swagger UI** with WAHA API documentation

**Note:** If you see "Service Unavailable", wait 30 seconds. Render free tier has cold starts on first access.

### Step 8: Start WhatsApp Session

1. **In Swagger UI, find "Sessions" section**

2. **Click on `POST /api/sessions/start`**

3. **Click "Try it out"**

4. **Use this request body:**
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

5. **Click "Execute"**

6. **You should see response:**
   ```json
   {
     "name": "default",
     "status": "STARTING",
     ...
   }
   ```

### Step 9: Get QR Code

1. **Find `GET /api/sessions/{session}/auth/qr`**

2. **Click "Try it out"**

3. **Enter session name:** `default`

4. **Click "Execute"**

5. **You'll see a QR code image** in the response

### Step 10: Scan QR Code with WhatsApp

1. **Open WhatsApp on your phone**

2. **Go to Settings → Linked Devices**

3. **Tap "Link a Device"**

4. **Scan the QR code** from Swagger UI

5. **Wait for connection** (5-10 seconds)

### Step 11: Verify Connection

1. **In Swagger UI, find `GET /api/sessions/{session}`**

2. **Click "Try it out"**

3. **Enter session:** `default`

4. **Click "Execute"**

5. **Check the response:**
   ```json
   {
     "name": "default",
     "status": "WORKING",  ← Should be "WORKING"
     ...
   }
   ```

✅ **If status is "WORKING", you're connected!**

---

## ✅ Test the Integration

### Step 12: Create Test Order

1. **Visit your Netlify frontend:**
   ```
   https://baitybites.netlify.app/order.html
   ```

2. **Fill in order form** with:
   - Your name
   - **Your phone number** (with WhatsApp)
   - Product details
   - Address

3. **Submit the order**

4. **Check your WhatsApp** - You should receive:
   ```
   🎉 Pesanan Dikonfirmasi!
   
   Halo [Your Name],
   Terima kasih atas pesanan Anda!
   
   📋 Order ID: PO-01-XX
   💵 Total: Rp XXX,XXX
   📦 Status: Dikonfirmasi
   
   Lacak pesanan Anda di:
   https://baitybites.netlify.app/track.html?order=...
   
   Terima kasih telah memesan di BaityBites! 🍰
   ```

### Step 13: Test Auto-Reply

1. **Send a WhatsApp message** to your connected number:
   ```
   lacak
   ```

2. **You should receive auto-reply** with your order status

✅ **If you receive messages, integration is working!**

---

## 📊 Monitor Your Services

### View Logs

**WAHA Logs:**
1. Go to Render.com Dashboard
2. Click **waha-whatsapp** service
3. Click **"Logs"** tab
4. View real-time WAHA logs

**Backend Logs:**
1. Click **baitybites-api** service
2. Click **"Logs"** tab
3. Look for `[WhatsApp]` messages

### Check Service Status

Both services should show:
- ✅ **Status:** Live (green)
- ✅ **Last Deploy:** Recent timestamp
- ✅ **Health:** Healthy

---

## ⚠️ Important: Render.com Free Tier Limitations

### Cold Starts

**Issue:** Render free tier services sleep after **15 minutes of inactivity**

**Impact on WAHA:**
- ⚠️ WhatsApp session may disconnect when WAHA sleeps
- ⚠️ Need to reconnect (scan QR again) after wake-up
- ⚠️ First message after sleep takes 15-30 seconds

**Solutions:**

#### Option 1: Keep WAHA Awake (Recommended for Testing)

Create a cron job to ping WAHA every 10 minutes:

**Using cron-job.org (FREE):**
1. Go to https://cron-job.org
2. Sign up (free)
3. Create new cron job:
   - **URL:** `https://waha-whatsapp.onrender.com/api/health`
   - **Interval:** Every 10 minutes
   - **Method:** GET

This keeps WAHA awake 24/7!

#### Option 2: Accept Cold Starts (For Light Testing)

- Just reconnect WhatsApp when needed
- Good for occasional testing
- Not suitable for production

#### Option 3: Upgrade to Paid Plan

- Render.com Starter: $7/month
- No cold starts
- Always online
- Better for production

---

## 🔧 Troubleshooting

### Issue: "Service Unavailable" when accessing WAHA

**Cause:** Cold start (service was sleeping)

**Solution:**
1. Wait 30 seconds
2. Refresh page
3. Service should wake up

### Issue: WhatsApp session shows "FAILED"

**Cause:** Session disconnected (possibly due to cold start)

**Solution:**
1. Delete session: `DELETE /api/sessions/default`
2. Start new session: `POST /api/sessions/start`
3. Get new QR code: `GET /api/sessions/default/auth/qr`
4. Scan QR code again

### Issue: Messages not sending

**Cause:** WAHA service sleeping or session disconnected

**Solution:**
1. Check WAHA service status (should be "Live")
2. Check session status: `GET /api/sessions/default`
3. If status is not "WORKING", reconnect WhatsApp
4. Check backend logs for errors

### Issue: Webhook not working

**Cause:** Incorrect webhook URL or backend sleeping

**Solution:**
1. Verify webhook URL in session config
2. Test webhook endpoint: `GET https://baitybites-api.onrender.com/api/webhooks/whatsapp/test`
3. Check both WAHA and backend logs

---

## 💰 Cost Comparison

### Option 1: Both on Render.com (Current Setup)

| Service | Plan | Cost |
|---------|------|------|
| Backend | Free | $0 |
| WAHA | Free | $0 |
| **TOTAL** | | **$0/month** |

**Pros:**
- ✅ Everything in one place
- ✅ Easy management
- ✅ No new accounts

**Cons:**
- ⚠️ Cold starts (15 min inactivity)
- ⚠️ WhatsApp may disconnect

### Option 2: WAHA on Railway, Backend on Render

| Service | Plan | Cost |
|---------|------|------|
| Backend (Render) | Free | $0 |
| WAHA (Railway) | Free ($5 credit) | $0 |
| **TOTAL** | | **$0/month** |

**Pros:**
- ✅ No cold starts for WAHA
- ✅ WhatsApp stays connected
- ✅ Better reliability

**Cons:**
- ⚠️ Two platforms to manage
- ⚠️ Need Railway account

### Recommendation

**For Testing:** Use Render.com for both (simpler)  
**For Production:** Use Railway for WAHA (more reliable)

---

## 🎯 Your Current Architecture

```
┌─────────────────────────────────────────────┐
│  Netlify (Frontend)                          │
│  https://baitybites.netlify.app             │
└──────────────┬──────────────────────────────┘
               │ API Proxy
               ▼
┌─────────────────────────────────────────────┐
│  Render.com (Backend)                        │
│  https://baitybites-api.onrender.com        │
│  ├─> Handles orders, auth, etc.             │
│  └─> Sends WhatsApp via WAHA                │
└──────┬──────────────────┬───────────────────┘
       │                  │
       │ SQL              │ HTTP
       ▼                  ▼
┌──────────────┐   ┌─────────────────────────┐
│  Neon DB     │   │  Render.com (WAHA)      │
│  (FREE)      │   │  https://waha-whatsapp  │
│              │   │         .onrender.com   │
└──────────────┘   │  └─> WhatsApp API       │
                   └──────────┬──────────────┘
                              │
                              ▼
                   ┌─────────────────────────┐
                   │  WhatsApp Servers       │
                   │  └─> Customer's Phone   │
                   └─────────────────────────┘
```

**Everything on Render.com except Netlify and Neon!**

---

## ✅ Checklist

- [ ] WAHA service created on Render.com
- [ ] Environment variables configured
- [ ] WAHA URL copied
- [ ] Backend updated with WAHA_URL
- [ ] WhatsApp session started
- [ ] QR code scanned
- [ ] Session status = "WORKING"
- [ ] Test order created
- [ ] WhatsApp message received
- [ ] Auto-reply tested
- [ ] Cron job set up (optional, for keeping awake)

---

## 🚀 Next Steps

### Immediate
1. ✅ **Test thoroughly** with multiple orders
2. ✅ **Monitor logs** for any errors
3. ✅ **Set up cron job** to keep WAHA awake

### Short-term
1. ✅ **Customize message templates** in `src/services/whatsapp.ts`
2. ✅ **Add more auto-replies** in `src/routes/webhooks.ts`
3. ✅ **Monitor Render.com usage**

### Long-term
1. ✅ **Consider Railway** for WAHA (no cold starts)
2. ✅ **Or upgrade Render.com** to paid plan ($7/mo)
3. ✅ **Use dedicated WhatsApp Business number**

---

## 🎉 Success!

You now have:
- ✅ **WAHA deployed** on Render.com
- ✅ **Connected to your backend** (same platform)
- ✅ **WhatsApp integrated** with BaityBites
- ✅ **Automatic notifications** working
- ✅ **Auto-reply system** active
- ✅ **100% FREE** setup

**Total cost: $0/month** 🎊

Your customers will now receive automatic WhatsApp notifications for orders, status updates, and more!

---

## 📚 Related Guides

- **`WAHA_INTEGRATION.md`** - Complete integration guide
- **`WAHA_RAILWAY_DEPLOY.md`** - Alternative: Deploy to Railway
- **`WAHA_NETLIFY_ARCHITECTURE.md`** - Architecture overview
- **`WAHA_QUICKSTART.md`** - Quick reference

---

*Render.com deployment guide for BaityBites v1.6.0*  
*Last updated: 2026-01-31*
