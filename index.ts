import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { initDatabase } from "./src/db/schema";
import { authRoutes } from "./src/routes/auth";
import { publicRoutes } from "./src/routes/public";

// Initialize database
const db = initDatabase();

// Create Elysia app
const app = new Elysia()
    .use(cors())
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET || "baitybites-secret-key-2026",
        })
    )
    .decorate("db", db)
    .group("/api", (app) => app.use(authRoutes(db)).use(publicRoutes(db)))
    .get("/", () => Bun.file("public/index.html"))
    .get("/test-login", () => "Test Success")
    .get("/login.html", () => "Login Test")
    .get("/order.html", () => Bun.file("public/order.html"))
    .get("/track.html", () => Bun.file("public/track.html"))
    .get("/orders.html", () => Bun.file("public/orders.html"))
    .get("/customers.html", () => Bun.file("public/customers.html"))
    .get("/products.html", () => Bun.file("public/products.html"))
    .get("/production.html", () => Bun.file("public/production.html"))
    .get("/dashboard", () => Bun.file("public/dashboard.html"))
    .use(staticPlugin({ assets: "public", prefix: "" }))
    .get("/api/health", () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
    }))
    .listen(3000);

console.log(`
🚀 BaityBites Order Management System
🌐 Server running at http://localhost:${app.server?.port}
📊 Database: baitybites.db
👤 Default Admin: admin / admin123
`);

export type App = typeof app;