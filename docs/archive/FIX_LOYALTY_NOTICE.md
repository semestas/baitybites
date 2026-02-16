# Fix: Loyalty Notice Covered by Header

## Issue
The loyalty notice on `/order.html` was being covered by the fixed header menu, making it invisible or partially hidden to users.

![Issue Screenshot](C:/Users/guest1/.gemini/antigravity/brain/eda11b26-6bb5-425c-b6e3-386931230a5f/uploaded_media_1770185019398.png)

## Root Cause
The header is positioned as `position: fixed` with a height of approximately `calc(1.75 * var(--spacing-2xl))` (roughly 70-80px). The main content area had insufficient top padding (`4rem`), causing the loyalty notice to appear underneath the fixed header.

## Solution
Updated `src/scss/pages/_order.scss`:

```scss
// Before
.main-content.order-main-content {
    padding: 4rem 0 !important;
}

// After
.main-content.order-main-content {
    padding-top: 6rem !important; // Increased to prevent header overlap
    padding-bottom: 4rem !important;
}
```

## Changes Made
- **File**: `src/scss/pages/_order.scss`
- **Line**: 4-6
- **Change**: Increased top padding from `4rem` to `6rem`

## Result
✅ The loyalty notice now appears below the fixed header with proper spacing
✅ No content is hidden or covered
✅ Better visual hierarchy and user experience

## Testing
1. Navigate to http://localhost:3000/order.html
2. Verify the loyalty notice is fully visible below the header
3. Check on different screen sizes (desktop, tablet, mobile)

---

**Status**: ✅ Fixed
**Date**: 2026-02-04
**Auto-compiled**: Yes (SASS watch mode detected the change)
