# Authentication Flow Testing Guide

## Quick Test Scenarios

### Scenario 1: Admin Login Flow
**Steps:**
1. Open browser and navigate to `http://localhost:3000/login.html`
2. Enter admin credentials (username/password)
3. Click "Sign In"

**Expected Result:**
✅ Should redirect to `/dashboard.html`
✅ Dashboard should load with admin data
✅ Navigation should show "Logout" button

---

### Scenario 2: Admin Already Logged In
**Steps:**
1. Ensure admin is logged in (check localStorage for token and user)
2. Navigate to `http://localhost:3000/login.html`

**Expected Result:**
✅ Should immediately redirect to `/dashboard.html`
✅ Should NOT show login form

---

### Scenario 3: Admin Logout
**Steps:**
1. Ensure admin is logged in and on dashboard
2. Click "Logout" button in navigation

**Expected Result:**
✅ Should redirect to `/` (landing page)
✅ localStorage should be cleared (no token or user)
✅ Navigation should show "Login" button

---

### Scenario 4: Customer Login Flow
**Steps:**
1. Open browser and navigate to `http://localhost:3000/login.html`
2. Click "Masuk dengan Google" or "Lanjutkan sebagai Tamu"
3. Complete authentication

**Expected Result:**
✅ Should redirect to `/` (landing page)
✅ Navigation should show user name and "Logout" button
✅ Should NOT have access to dashboard

---

### Scenario 5: Customer Already Logged In
**Steps:**
1. Ensure customer is logged in (check localStorage)
2. Navigate to `http://localhost:3000/login.html`

**Expected Result:**
✅ Should immediately redirect to `/` (landing page)
✅ Should NOT show login form

---

### Scenario 6: Customer Logout
**Steps:**
1. Ensure customer is logged in
2. Click "Logout" button in navigation

**Expected Result:**
✅ Should redirect to `/` (landing page)
✅ localStorage should be cleared
✅ Navigation should show "Login" button instead of user info

---

### Scenario 7: Unauthorized Dashboard Access
**Steps:**
1. Ensure customer is logged in (NOT admin)
2. Navigate to `http://localhost:3000/dashboard.html`

**Expected Result:**
✅ Should immediately redirect to `/` (landing page)
✅ Should NOT show dashboard content

---

### Scenario 8: Unauthenticated Dashboard Access
**Steps:**
1. Clear localStorage (logout if needed)
2. Navigate to `http://localhost:3000/dashboard.html`

**Expected Result:**
✅ Should immediately redirect to `/login.html`
✅ Should NOT show dashboard content

---

## Browser Developer Tools Checks

### Check localStorage
```javascript
// Open browser console (F12)
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

### Expected User Object Structure
```javascript
// Admin user
{
  id: 1,
  username: "admin",
  name: "Admin User",
  role: "admin"
}

// Customer user
{
  id: 123,
  name: "Customer Name",
  email: "customer@example.com",
  role: "customer",
  avatar_url: "...",
  address: "...",
  phone: "..."
}

// Guest user
{
  name: "Guest User",
  role: "guest",
  id: 0
}
```

---

## Common Issues & Solutions

### Issue: Redirect loop
**Solution:** Clear localStorage and cookies, then try again
```javascript
localStorage.clear();
```

### Issue: User stays on login page after login
**Solution:** Check browser console for errors, verify API response includes user role

### Issue: Dashboard accessible by non-admin
**Solution:** Verify `dashboard.js` is loaded and `isAdmin()` function is working

---

## Files Modified
- ✅ `public/login.html` - Added login redirect logic
- ✅ `public/js/app.js` - Enhanced logout function
- ✅ `public/js/dashboard.js` - Added admin access control

## Implementation Date
January 22, 2026
