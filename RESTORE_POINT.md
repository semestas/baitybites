# Restore Point - Version 1.5.0

**Date:** 24 January 2026
**Description:** System restored to stable legacy architecture with optimized assets.

## State Snapshot
- **Core Architecture:** HTML files served directly from `public/` via Elysia static handling.
- **Styling:** Unified variables and styling in `src/scss` compiling to `public/css/main.css`.
- **Frontend Logic:** Vanilla JS in `public/js/`.
- **Views:** Removed complex server-side partial rendering (legacy `src/views` folder cleanup).

## Key Files
- `index.ts`: Updated to serve static HTML.
- `public/*.html`: Contains full HTML structure (no handlebars/partials).
- `public/css/style.css`: Legacy styles.
- `public/css/main.css`: Compiled SASS styles.

## Restoration Instructions
To revert to this state in the future:
1. Checkout tag/commit associated with v1.5.0.
2. Run `bun install`.
3. Run `bun run dev`.
