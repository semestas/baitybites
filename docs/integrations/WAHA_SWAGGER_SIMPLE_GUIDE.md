# 🎯 Simple Guide: How to Start WhatsApp Session in Swagger UI

## 📋 What You're Doing

You're telling WAHA to:
1. **Start a WhatsApp session** (so you can connect your phone)
2. **Set up webhooks** (so WAHA can send messages to your backend)

---

## 🖼️ Visual Step-by-Step

### Step 1: Find POST /api/sessions/start

In Swagger UI, look for the **green POST button** that says:
```
POST /api/sessions/start
```

Click on it to expand.

### Step 2: Click "Try it out"

You'll see a button that says **"Try it out"** - click it.

This makes the fields editable.

### Step 3: Scroll Down to "Request body"

You'll see sections in this order:
1. **Parameters** (with "session" field)
2. **Servers** (dropdown - ignore this)
3. **Request body** ← THIS IS WHERE YOU PASTE!

### Step 4: Clear the Text Box

In the **Request body** section, there's a big text box.

It might have some example JSON already. **Delete everything** in that box.

### Step 5: Paste This JSON

Copy and paste **exactly this**:

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

### Step 6: Click "Execute"

At the bottom, click the big blue **"Execute"** button.

### Step 7: Check Response

Scroll down to see the **Response**. You should see:

```json
{
  "name": "default",
  "status": "STARTING",
  ...
}
```

✅ **Success!** Your session is starting!

---

## 🤔 What Does That JSON Mean?

Let me break it down in simple terms:

```json
{
  "name": "default",           ← Name of your WhatsApp session
  
  "config": {                  ← Configuration settings
    "webhooks": [              ← Where to send notifications
      {
        "url": "https://baitybites-api.onrender.com/api/webhooks/whatsapp",
        ↑ Your backend URL - WAHA will send messages here
        
        "events": ["message", "session.status"]
        ↑ What events to send: new messages and session changes
      }
    ]
  }
}
```

**In plain English:**
> "Hey WAHA, create a session called 'default' and whenever you receive a WhatsApp message or the session status changes, send that information to my backend at https://baitybites-api.onrender.com/api/webhooks/whatsapp"

---

## 🎯 Simplified Instructions

### If you're still confused, follow this:

1. **Open** your WAHA URL in browser
2. **Find** the green POST button: `/api/sessions/start`
3. **Click** "Try it out"
4. **Scroll down** until you see a big text box
5. **Delete** everything in that text box
6. **Copy** the JSON from the guide
7. **Paste** it into the text box
8. **Click** the blue "Execute" button
9. **Done!** ✅

---

## 📸 What You Should See

### Before Pasting:
```
┌─────────────────────────────────────┐
│ Request body                         │
├─────────────────────────────────────┤
│                                      │
│  {                                   │
│    "name": "string",                 │
│    "config": {}                      │
│  }                                   │
│                                      │
└─────────────────────────────────────┘
```

### After Pasting:
```
┌─────────────────────────────────────┐
│ Request body                         │
├─────────────────────────────────────┤
│                                      │
│  {                                   │
│    "name": "default",                │
│    "config": {                       │
│      "webhooks": [                   │
│        {                             │
│          "url": "https://...",       │
│          "events": ["message", ...]  │
│        }                             │
│      ]                               │
│    }                                 │
│  }                                   │
│                                      │
└─────────────────────────────────────┘
```

---

## ❓ Common Questions

### Q: Why do I need to paste this?
**A:** This tells WAHA:
- What to name your session ("default")
- Where to send notifications (your backend URL)
- What notifications to send (messages and status changes)

### Q: Can I change the JSON?
**A:** You can change:
- ✅ `"name"` - but keep it as "default" for simplicity
- ❌ Don't change the URL (unless your backend URL is different)
- ❌ Don't change the events

### Q: What if I make a mistake?
**A:** No problem! Just:
1. Delete what you pasted
2. Paste again
3. Click Execute again

### Q: What happens after I click Execute?
**A:** WAHA will:
1. Create a WhatsApp session
2. Generate a QR code
3. Wait for you to scan it with your phone

---

## 🎬 Next Steps After This

After you successfully execute this:

1. **Get QR Code** - Use `GET /api/sessions/default/auth/qr`
2. **Scan QR Code** - With your WhatsApp app
3. **Verify Connection** - Use `GET /api/sessions/default`
4. **Test** - Send a test message!

---

## 🆘 Still Confused?

### Try This Analogy:

Think of it like **ordering food online**:

1. **The form** (Swagger UI) = The restaurant's order form
2. **The JSON** = Your order details (what you want)
3. **Execute button** = Submit order button
4. **Response** = Order confirmation

You're just filling out a form with specific details!

---

## ✅ Quick Checklist

- [ ] Opened WAHA URL in browser
- [ ] Found POST /api/sessions/start
- [ ] Clicked "Try it out"
- [ ] Found the Request body text box
- [ ] Deleted existing content
- [ ] Pasted the JSON code
- [ ] Clicked "Execute"
- [ ] Saw response with "status": "STARTING"

---

*Simple guide for starting WAHA session - BaityBites v1.6.0*
