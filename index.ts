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

// Initialize database
const db = await initDatabase();
const PUBLIC_DIR = join(import.meta.dir, "public");

// Create Elysia app
const app = new Elysia()
    .onError(({ code, error, set, path }) => {
        // Mute NOT_FOUND logs in terminal as they are usually noise (favicons, browser devtools, etc)
        if (code !== 'NOT_FOUND') {
            console.error(`Error [${code}] at ${path}:`, error);
        }

        // Return JSON for API routes
        if (path.startsWith('/api')) {
            set.status = code === 'NOT_FOUND' ? 404 : 500;
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
        origin: true, // Allow all origins in production (or specify your Netlify domain)
        credentials: true
    }))

    .use(jwtConfig)
    .decorate("db", db)
    .group("/api", (app) =>
        app.get("/test", () => "api ok")
            .use(customerRoutes(db))
            .use(authRoutes(db))
            .use(publicRoutes(db))
            .use(cmsRoutes(db))
            .use(orderRoutes(db))
            .use(googleAuthRoutes(db))
    )
    // Serve HTML files as raw text/html to prevent Bun from resolving assets
    .get("/", () => {
        const html = readFileSync(join(PUBLIC_DIR, "index.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/login.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "login.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/order.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "order.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/track.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "track.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/cms.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "cms.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/dashboard.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "dashboard.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/orders.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "orders.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/customers.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "customers.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/products.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "products.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/production.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "production.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/privacy.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "privacy.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    .get("/tos.html", () => {
        const html = readFileSync(join(PUBLIC_DIR, "tos.html"), "utf-8");
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    })
    // Redirect clean URLs to .html files
    .get("/login", ({ redirect }) => redirect("/login.html"))
    .get("/cms", ({ redirect }) => redirect("/cms.html"))
    .get("/dashboard", ({ redirect }) => redirect("/dashboard.html"))
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
    .get("/api/health", () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    }))
    .listen(process.env.PORT || 9876);

const port = app.server?.port || process.env.PORT || 9876;

console.log(`
🚀 BaityBites Order Management System
🌐 Server running at http://localhost:${port}
📊 Database: PostgreSQL (Neon)
👤 Default Admin: admin / admin123
🔧 Environment: ${process.env.NODE_ENV || 'development'}
📁 Public directory: ${PUBLIC_DIR}
`);

export type App = typeof app;