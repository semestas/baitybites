import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { join } from "path";
import { readFileSync } from "fs";
import { initDatabase } from "./src/db/schema";
import { jwtConfig } from "./src/utils/jwt";
import { authRoutes } from "./src/routes/auth";
import { publicRoutes } from "./src/routes/public";
import { cmsRoutes } from "./src/routes/cms";
import { customerRoutes } from "./src/routes/customer";
import { orderRoutes } from "./src/routes/orders";
import { googleAuthRoutes } from "./src/routes/google-auth";
// import { InstagramService } from "./src/services/instagram";
import { WhatsAppService } from "./src/services/whatsapp";
import { webhookRoutes } from "./src/routes/webhooks";
import { AIService } from "./src/services/ai";
import { EmailService } from "./src/services/email";

// Initialize database
const db = await initDatabase();
const PUBLIC_DIR = join(import.meta.dir, "public");

// Initialize services
const waService = new WhatsAppService(db);
// const igService = new InstagramService(db);
const aiService = new AIService();
const emailService = new EmailService(db);

// Create Elysia app
const app = new Elysia()
    .onError(({ code, error, set, path }) => {
        // Mute NOT_FOUND logs in terminal as they are usually noise (favicons, browser devtools, etc)
        if (code !== 'NOT_FOUND') {
            console.error(`Error [${code}] at ${path}:`, error);
        }

        // Return JSON for API routes
        if (path.startsWith('/api')) {
            if (code === 'VALIDATION') {
                set.status = 400;
            } else {
                set.status = code === 'NOT_FOUND' ? 404 : 500;
            }

            return {
                success: false,
                message: (error as any).message || 'Internal Server Error',
                code
            };
        }

        // Return HTML error page for other routes
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head><title>Error ${code}</title></head>
            <body>
                <h1>Error ${code}</h1>
                <p>${code === 'NOT_FOUND' ? 'Halaman tidak ditemukan' : ((error as any).message || 'Something went wrong')}</p>
                <a href="/">Kembali ke Beranda</a>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
            status: code === 'NOT_FOUND' ? 404 : 500
        });
    })
    // Explicitly handle favicon and chrome devtools noise
    .get("/favicon.ico", () => Bun.file(join(PUBLIC_DIR, "assets/favicon.png")))
    .get("/.well-known/*", () => new Response(null, { status: 404 }))
    .use(cors({
        origin: '*', // Using '*' instead of true avoids Vary: Origin which can interfere with caching
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    }))

    .use(jwtConfig)
    .decorate("db", db)
    .group("/api", (app) =>
        app.get("/test", () => "api ok")
            .use(customerRoutes(db))
            .use(authRoutes(db))
            .use(publicRoutes(db, emailService))
            .use(cmsRoutes(db, aiService))
            .use(orderRoutes(db))
            .use(googleAuthRoutes(db))
            .use(webhookRoutes(db, waService))
    )
    // Serve HTML files with proper headers
    .onBeforeHandle(() => { /* Hook for potential shared logic */ })
    .get("/", () => new Response(readFileSync(join(PUBLIC_DIR, "index.html"), "utf-8"), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
    }))
    // Standard pages loop
    .group("", app => {
        [
            "index", "login", "admin", "order", "track", "cms", "dashboard", "orders", "customers",
            "products", "production", "kitchen", "privacy", "tos", "profile", "docs"
        ].forEach(page => {
            app.get(`/${page}.html`, () => new Response(readFileSync(join(PUBLIC_DIR, `${page}.html`), "utf-8"), {
                headers: { "Content-Type": "text/html; charset=utf-8" }
            }));
            app.get(`/${page}`, ({ redirect }) => redirect(`/${page}.html`));
        });
        return app;
    })
    // Serve static assets manually (CSS, JS, images, etc.) - NOT HTML
    .get("/css/*", ({ params }) => {
        const filePath = join(PUBLIC_DIR, "css", (params as any)["*"]);
        return Bun.file(filePath);
    })
    .get("/js/*", ({ params }) => {
        const filePath = join(PUBLIC_DIR, "js", (params as any)["*"]);
        return Bun.file(filePath);
    })
    .get("/assets/*", ({ params }) => {
        const filePath = join(PUBLIC_DIR, "assets", (params as any)["*"]);
        return Bun.file(filePath);
    })
    .get("/uploads/*", ({ params }) => {
        const filePath = join(PUBLIC_DIR, "uploads", decodeURIComponent((params as any)["*"]));
        return Bun.file(filePath);
    })
    .get("/sw.js", () => Bun.file(join(PUBLIC_DIR, "sw.js")))
    .get("/manifest.json", () => Bun.file(join(PUBLIC_DIR, "manifest.json")))
    .get("/api/health", () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    }))
    // BaityBites v1.1.2 - All reports registered
    .listen(process.env.PORT || 9876);

// --- Background Job: Instagram Sync (Every 1 Hour) - SUSPENDED ---
/*
setInterval(async () => {
    console.log("[Job] Starting automatic Instagram sync...");
    const res = await igService.syncGallery();
    console.log("[Job] Instagram sync result:", res.message);
}, 1000 * 60 * 60); // 1 hour
*/

const port = app.server?.port || process.env.PORT || 9876;

// Server started successfully
console.log(`
🚀 Baitybites Order Management System
🌐 Server running at http://localhost:${port}
📊 Database: PostgreSQL (Neon)
🔧 Environment: ${process.env.NODE_ENV || 'development'}
📁 Public directory: ${PUBLIC_DIR}
`);

export type App = typeof app;