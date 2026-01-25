# Instagram Gallery Integration Guide

## Overview
Baitybites now supports **two methods** for Instagram gallery integration:

1. **Elfsight Widget** (Recommended - Easiest)
2. **Instagram Graph API** (Advanced - Automated)

---

## Method 1: Elfsight Widget (Recommended)

### Why Choose This?
- ✅ **No API token needed**
- ✅ **Setup in under 5 minutes**
- ✅ **Professional widget with built-in features**
- ✅ **Automatic updates from Instagram**
- ✅ **Free and paid plans available**

### Setup Steps:

1. **Get the Widget**
   - Visit [Elfsight Instagram Feed](https://elfsight.com/instagram-feed-instashow/)
   - Create a free or paid widget
   - Customize the appearance (grid layout, number of posts, etc.)
   - Copy the widget code provided

2. **Install in Baitybites**
   - Go to CMS → Instagram Settings
   - Find "Opsi 1: Elfsight Widget"
   - Paste the complete widget code (including `<script>` tags)
   - Click "Simpan Widget"

3. **Done!**
   - The widget will automatically appear on your homepage
   - It will update automatically when you post on Instagram
   - No further configuration needed

### Example Widget Code:
```html
<script src="https://static.elfsight.com/platform/platform.js" data-use-service-core defer></script>
<div class="elfsight-app-xxxxx-xxxxx"></div>
```

---

## Method 2: Instagram Graph API (Advanced)

### Why Choose This?
- ✅ **Full control over gallery layout**
- ✅ **Custom sorting (Recent + Popular)**
- ✅ **Stores images locally**
- ✅ **Automatic hourly sync**

### Setup Steps:

1. **Get Access Token**
   - Go to [Facebook for Developers](https://developers.facebook.com/apps/)
   - Create or select an app connected to Instagram Business
   - Use Graph API Explorer to generate a token with permissions:
     - `instagram_basic`
     - `pages_read_engagement`
   - Copy the Long-Lived Access Token

2. **Configure in Baitybites**
   - Go to CMS → Instagram Settings
   - Find "Opsi 2: API Integration"
   - Paste your access token
   - Click "Simpan Token"
   - Click "Sinkronkan Sekarang" to test

3. **Automatic Updates**
   - The system will automatically sync every 1 hour
   - Slides 1-3: Most recent posts
   - Slides 4-6: Most popular posts (by likes + comments)

---

## How It Works

### Priority System:
1. **Elfsight Widget** takes priority if configured
2. **Database Gallery** (API sync) is used as fallback
3. **Manual uploads** can coexist with Instagram content

### Display Logic:
- If Elfsight widget is saved → Display widget on homepage
- If no widget → Display database gallery (API sync or manual)
- CMS Gallery Management shows both sources with badges

---

## Recommendations

### For Most Users:
**Use Elfsight Widget** - It's the simplest and most reliable option.

### For Advanced Users:
**Use Graph API** if you need:
- Custom layout control
- Local image storage
- Specific sorting logic
- Integration with other systems

### Hybrid Approach:
You can switch between methods anytime:
- Save Elfsight widget → Homepage uses widget
- Remove widget → Homepage falls back to database gallery
- Both methods can be configured simultaneously

---

## Troubleshooting

### Elfsight Widget Not Showing:
1. Check if widget code includes both `<script>` and `<div>` tags
2. Verify widget code is saved in CMS
3. Clear browser cache and reload

### API Sync Not Working:
1. Verify access token is valid
2. Check Instagram account is Business/Creator account
3. Ensure app permissions are correct
4. Check server logs for sync errors

### Gallery Empty:
1. Check if either widget or API is configured
2. Verify Instagram account has posts
3. Check if manual uploads exist in CMS

---

## Support

For issues or questions:
- Check CMS → Instagram Settings for status indicators
- Review server logs for sync errors
- Verify Instagram account settings
- Contact support if problems persist
