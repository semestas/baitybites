# Cloudinary Integration Guide

## Overview
BaityBites now uses **Cloudinary** as the cloud-based image storage solution, replacing local file system storage. All product images, gallery photos, and user avatars are now uploaded to and served from Cloudinary's CDN.

## Configuration

### Environment Variable
Add this to your `.env` file:
```env
CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@YOUR_CLOUD_NAME
```

The Cloudinary SDK automatically reads this environment variable for authentication.

### Folder Structure on Cloudinary
Images are organized into the following folders:
- `baitybites/products` - Product images
- `baitybites/gallery` - Gallery/Instagram photos
- `baitybites/avatars` - User profile avatars

## Implementation Details

### Service Layer (`src/services/cloudinary.ts`)
```typescript
import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = async (file: File, folder: string): Promise<string>
```

**Features:**
- Accepts standard `File` objects from form uploads
- Returns the secure HTTPS URL of the uploaded image
- Automatic format optimization and CDN delivery
- Organized folder structure for easy management

### Updated Routes

#### 1. Product Management (`src/routes/cms.ts`)
- **POST `/api/cms/products`** - Upload product image during creation
- **PUT `/api/cms/products/:id`** - Update product image

#### 2. Gallery Management (`src/routes/cms.ts`)
- **POST `/api/cms/gallery`** - Upload gallery photos

#### 3. Customer Profile (`src/routes/customer.ts`)
- **PUT `/api/customer/profile`** - Upload user avatar

## Benefits

### 1. **Performance**
- ✅ Global CDN delivery (faster load times worldwide)
- ✅ Automatic image optimization
- ✅ Responsive image delivery

### 2. **Scalability**
- ✅ No local storage limitations
- ✅ Handles unlimited uploads
- ✅ Automatic backups

### 3. **Deployment**
- ✅ Works seamlessly on serverless platforms (Netlify, Render, Railway)
- ✅ No need to manage `/uploads` directory
- ✅ Stateless backend (no persistent file storage needed)

### 4. **Management**
- ✅ Web-based dashboard at [cloudinary.com](https://cloudinary.com)
- ✅ Easy to browse, search, and manage images
- ✅ Built-in transformations and filters

## Migration Notes

### Before (Local Storage)
```typescript
// Old approach - saved to public/uploads/
const filePath = `public/uploads/products/${fileName}`;
await Bun.write(filePath, image);
imageUrl = `/uploads/products/${fileName}`;
```

### After (Cloudinary)
```typescript
// New approach - uploaded to Cloudinary CDN
imageUrl = await uploadToCloudinary(image, 'baitybites/products');
// Returns: https://res.cloudinary.com/dofkkqk3y/image/upload/v1234567890/baitybites/products/abc123.jpg
```

## Testing

### 1. Upload a Product Image
1. Go to `/products.html` (admin panel)
2. Click "Add Product"
3. Fill in details and upload an image
4. Verify the image URL starts with `https://res.cloudinary.com/`

### 2. Upload Gallery Photo
1. Go to `/cms.html` → Gallery section
2. Click "Tambah Foto"
3. Upload an image
4. Check the gallery preview

### 3. Update Profile Avatar
1. Go to `/profile.html` (customer)
2. Edit profile and upload avatar
3. Verify avatar displays correctly

## Cloudinary Dashboard

Access your Cloudinary dashboard at:
**https://console.cloudinary.com/console/c-YOUR_CLOUD_NAME**

### Key Features:
- **Media Library**: Browse all uploaded images
- **Transformations**: Apply filters, resize, crop
- **Analytics**: View bandwidth and storage usage
- **Settings**: Manage upload presets and security

## Troubleshooting

### Issue: Upload fails with authentication error
**Solution**: Verify `CLOUDINARY_URL` is correctly set in `.env`

### Issue: Images not displaying
**Solution**: Check browser console for CORS errors. Cloudinary URLs should work without CORS configuration.

### Issue: Slow uploads
**Solution**: Cloudinary automatically optimizes. Large files may take longer on first upload.

## Advanced Features (Optional)

### Image Transformations
You can apply transformations to Cloudinary URLs. By default, the service now automatically resizes images to a maximum width of 1000px while maintaining the original aspect ratio (using `c_limit`).

```typescript
// Original
https://res.cloudinary.com/dofkkqk3y/image/upload/v1234567890/baitybites/products/abc123.jpg

// Resized (Automatic via Service)
https://res.cloudinary.com/dofkkqk3y/image/upload/w_1000,c_limit,q_auto,f_auto/v1234567890/baitybites/products/abc123.jpg

// Manual specialized transformations
// Thumbnail (Force Square)
https://res.cloudinary.com/dofkkqk3y/image/upload/w_200,h_200,c_fill/v1234567890/baitybites/products/abc123.jpg
```

### Automatic Format Conversion
Add `f_auto` to serve optimal format (WebP for modern browsers):
```
https://res.cloudinary.com/dofkkqk3y/image/upload/f_auto/v1234567890/baitybites/products/abc123.jpg
```

## Next Steps

1. ✅ Cloudinary integration complete
2. 🔄 Test all upload endpoints
3. 📊 Monitor usage in Cloudinary dashboard
4. 🚀 Deploy to production (Render/Netlify)

## Support

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Node.js SDK**: https://cloudinary.com/documentation/node_integration
- **Support**: https://support.cloudinary.com

---

**Status**: ✅ Active and Production-Ready
**Last Updated**: 2026-02-04
