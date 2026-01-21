---
description: Setup Google OAuth Authentication
---

# Google OAuth Authentication Setup untuk BaityBites

Workflow ini menjelaskan langkah-langkah untuk mengimplementasikan Google OAuth authentication agar pelanggan dapat mendaftar dan login menggunakan akun Google.

## Prerequisites
- Google Cloud Console account
- Domain atau localhost untuk testing
- Bun runtime sudah terinstall

## Langkah 1: Setup Google Cloud Console

### 1.1 Buat Project di Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Klik "Select a project" → "New Project"
3. Nama project: `Baitybites OMS`
4. Klik "Create"

### 1.2 Enable Google+ API
1. Di sidebar, pilih "APIs & Services" → "Library"
2. Cari "Google+ API" atau "Google Identity"
3. Klik "Enable"

### 1.3 Configure OAuth Consent Screen
1. Di sidebar, pilih "APIs & Services" → "OAuth consent screen"
2. Pilih "External" (untuk testing) atau "Internal" (jika punya Google Workspace)
3. Isi informasi aplikasi:
   - App name: `Baitybites Order Management`
   - User support email: [email Anda]
   - Developer contact: [email Anda]
4. Klik "Save and Continue"
5. Scopes: Tambahkan scope berikut:
   - `userinfo.email`
   - `userinfo.profile`
6. Klik "Save and Continue"
7. Test users (untuk mode External): Tambahkan email untuk testing
8. Klik "Save and Continue"

### 1.4 Create OAuth 2.0 Credentials
1. Di sidebar, pilih "APIs & Services" → "Credentials"
2. Klik "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: `Baitybites Web Client`
5. Authorized JavaScript origins:
   - `http://localhost:9876`
   - `http://localhost:3000` (jika ada)
6. Authorized redirect URIs:
   - `http://localhost:9876/api/auth/google/callback`
   - `http://localhost:9876/login.html` (untuk frontend)
7. Klik "Create"
8. **SIMPAN** Client ID dan Client Secret yang muncul

### 1.5 Update .env File
Tambahkan credentials ke file `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:9876/api/auth/google/callback
```

## Langkah 2: Install Dependencies

```bash
bun add @elysiajs/oauth2
```

## Langkah 3: Update Database Schema

Tambahkan kolom untuk menyimpan Google user data di tabel `customers`:
```sql
ALTER TABLE customers 
ADD COLUMN google_id VARCHAR(255) UNIQUE,
ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local',
ADD COLUMN avatar_url TEXT,
ADD COLUMN is_verified BOOLEAN DEFAULT false;
```

## Langkah 4: Create Google OAuth Route

Buat file baru: `src/routes/google-auth.ts`

File ini akan berisi:
- Route untuk initiate Google OAuth flow
- Route untuk handle callback dari Google
- Logic untuk create/update customer berdasarkan Google profile

## Langkah 5: Update Frontend Login Page

Tambahkan tombol "Sign in with Google" di `public/login.html`:
- Tombol dengan Google branding
- JavaScript untuk handle OAuth flow
- Redirect logic setelah login sukses

## Langkah 6: Testing Flow

1. Buka `http://localhost:9876/login.html`
2. Klik tombol "Sign in with Google"
3. Pilih akun Google
4. Authorize aplikasi
5. Verify redirect kembali ke aplikasi dengan user logged in

## Langkah 7: Security Considerations

- [ ] Validate state parameter untuk prevent CSRF
- [ ] Store tokens securely (httpOnly cookies)
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting untuk OAuth endpoints
- [ ] Validate redirect URIs

## Langkah 8: Production Deployment

Untuk production:
1. Update OAuth consent screen ke "Published"
2. Tambahkan production domain ke Authorized origins & redirect URIs
3. Update environment variables dengan production URLs
4. Enable HTTPS (required untuk production OAuth)

## Troubleshooting

### Error: redirect_uri_mismatch
- Pastikan redirect URI di Google Console sama persis dengan yang di code
- Cek trailing slash (/) di URL

### Error: invalid_client
- Verify Client ID dan Client Secret di .env
- Pastikan credentials tidak expired

### User tidak ter-create di database
- Check database connection
- Verify SQL query syntax
- Check console logs untuk error details

## Next Steps

Setelah Google OAuth berhasil:
1. Implement logout functionality
2. Add profile page untuk customer
3. Link Google account dengan existing email-based accounts
4. Add option untuk disconnect Google account
5. Implement "Login with Google" di order tracking page
