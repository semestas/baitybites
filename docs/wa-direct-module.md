# WhatsApp Direct Quick Order Module

## Overview
The **WA Direct Module** is a mobile-first ordering interface designed for staff and owners to quickly process customer orders received via WhatsApp. It provides a streamlined, touch-optimized experience for entering orders directly into the system without navigating through the full admin dashboard.

## Features
- ✅ **Mobile-Optimized UI**: Designed specifically for smartphone/tablet use
- ✅ **No Login Required**: Public access for quick entry
- ✅ **Visual Product Selection**: Clear indicators for selected items with quantity controls
- ✅ **Live Cart Preview**: Real-time subtotal and grand total calculations
- ✅ **Discount Support**: Apply nominal discounts on the fly
- ✅ **Instant Order Processing**: Orders are saved immediately to the database
- ✅ **Automated PDF Invoice**: Generated and emailed to admin automatically
- ✅ **Offline Support**: Cached for use when internet is unstable

## Access

### URL
```
https://your-domain.com/wa-direct.html
```

For local development:
```
http://localhost:3000/wa-direct.html
```

### Mobile Bookmark
For fastest access, add this page to your mobile home screen:
1. Open the URL in your mobile browser
2. Tap the **Share** button (iOS) or **Menu** (Android)
3. Select **"Add to Home Screen"**
4. The icon will appear like a native app

## How to Use

### Step 1: Enter Customer Information
1. **Customer Name**: Enter the customer's name as provided via WhatsApp
2. **WhatsApp Number**: Enter their phone number (minimum 10 digits)
   - Example: `081234567890`
   - The system will create or update the customer record automatically

### Step 2: Select Products
1. Scroll through the product list
2. Tap the **+** button to add items
3. Tap the **-** button to reduce quantity
4. Selected products will show:
   - Green border highlight
   - Green checkmark badge
   - Live subtotal preview

### Step 3: Review Cart
The floating cart footer shows:
- **Individual items** with quantities
- **Subtotal** (before discount)
- **Discount field** (optional)
- **Grand Total** (final amount)

### Step 4: Apply Discount (Optional)
1. Tap the **"Nominal Diskon"** field
2. Enter the discount amount in Rupiah
3. The Grand Total updates automatically

### Step 5: Submit Order
1. Tap the **"Print & Send PDF Invoice"** button
2. If any required fields are missing, they will be highlighted in red
3. Once valid, the order is processed:
   - ✅ Order saved to database with status `paid`
   - ✅ Invoice number generated
   - ✅ PDF invoice emailed to `id.baitybites@gmail.com`
4. Success message appears with order details
5. Form clears automatically for the next order

## Order Details

### Order Number Format
```
WA-DIR-XXXX
```
Where `XXXX` is a timestamp-based unique identifier.

### Order Status
All WA Direct orders are automatically marked as:
- **Status**: `paid`
- **Notes**: `Order via Direct WA App (WA Direct Order)`

### Customer Record
- If the phone number exists, the customer name is updated
- If new, a customer record is created with:
  - Email: `{phone}@wa.baitybites.id` (placeholder)
  - Address: `-` (placeholder)

## Technical Details

### API Endpoint
```
POST /api/wa-direct/order
```

### Request Body
```json
{
  "name": "Customer Name",
  "phone": "081234567890",
  "discount": 0,
  "notes": "Order via Direct WA App",
  "items": [
    {
      "product_id": 1,
      "product_name": "Risol Mayo Original",
      "quantity": 2,
      "price": 35000
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "message": "Quick order processed successfully. Invoice is being generated.",
  "data": {
    "order_number": "WA-DIR-1234",
    "invoice_number": "INV-2026-001",
    "total_amount": 70000
  }
}
```

1. **PDF Invoice Generation**: Uses Puppeteer to render HTML invoice as PDF
2. **Email Delivery**: Sends invoice to admin email with PDF attachment

This ensures the UI responds instantly while heavy operations complete in the background.

## Validation Rules

### Required Fields
- ✅ **Customer Name**: Must not be empty
- ✅ **WhatsApp Number**: Minimum 10 digits
- ✅ **Cart Items**: At least one product must be selected

### Visual Feedback
- **Missing fields**: Highlighted with red border
- **Error notification**: Toast message appears at top of screen
- **Auto-scroll**: Page scrolls to top to show error fields

## Troubleshooting

### "Data Kurang" Error
**Cause**: Missing or invalid customer information  
**Solution**: Ensure both name and phone number (min 10 digits) are filled

### "Gagal memuat produk" Error
**Cause**: Database connection issue  
**Solution**: Check internet connection and try refreshing the page

### "Processing Forever"
**Cause**: Network timeout or server overload  
**Solution**: This has been fixed by moving PDF generation to background. If it persists, check server logs.

### Invoice Not Received
**Cause**: Email service delay or configuration issue  
**Solution**: 
- Check spam folder
- Verify `SMTP_*` environment variables are set correctly
- Check server logs for email errors

## Best Practices

### For Staff
1. **Keep the page bookmarked** on your mobile home screen
2. **Double-check phone numbers** before submitting
3. **Use the discount field** for negotiated prices
4. **Wait for success message** before starting a new order

### For Administrators
1. **Monitor email inbox** for incoming invoices
2. **Check WhatsApp** for high-priority order notifications
3. **Review orders** in the main dashboard regularly
4. **Ensure ADMIN_PHONE** environment variable is set for notifications

## Environment Variables

Required for full functionality:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=id.baitybites@gmail.com
SMTP_PASS=your_app_password
```

## Mobile Compatibility

### Tested Devices
- ✅ iPhone (iOS 14+)
- ✅ Android (Chrome, Samsung Internet)
- ✅ iPad / Tablets

### Screen Size Restrictions
- **Mobile Only**: The module is intentionally restricted to mobile viewports
- **Desktop Warning**: If accessed on desktop (>768px width), a warning message is displayed
- **Recommended**: Use on devices with screen width ≤ 768px

## Performance

### Load Time
- **First Load**: ~1-2 seconds (including product fetch)
- **Cached Load**: <500ms (via Service Worker)

### Order Processing
- **Database Save**: <1 second
- **User Feedback**: Instant (background tasks don't block)
- **PDF Generation**: 3-5 seconds (background)
- **Email Delivery**: 2-4 seconds (background)

## Security

### Public Access
- ✅ No authentication required (by design)
- ✅ Rate limiting recommended for production
- ✅ HTTPS required for production deployment

### Data Validation
- ✅ Server-side validation on all inputs
- ✅ Type checking for product prices and quantities
- ✅ SQL injection protection via parameterized queries

## Future Enhancements

Potential improvements for future versions:
- [ ] Order history view for staff
- [ ] Customer search/autocomplete
- [ ] Product image upload from mobile
- [ ] Voice input for customer names
- [ ] Barcode scanning for product selection
- [ ] Multi-language support (English/Indonesian toggle)

## Support

For technical issues or questions:
- **Email**: id.baitybites@gmail.com
- **Documentation**: `/docs.html`
- **System Logs**: Check server console for detailed error messages

---

**Version**: 1.6.4  
**Last Updated**: February 16, 2026  
**Module Status**: ✅ Production Ready
