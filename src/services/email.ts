import nodemailer from "nodemailer";
import puppeteer from 'puppeteer';
import type { Sql } from "../db/schema";

export class EmailService {
    private transporter: nodemailer.Transporter;
    private db: Sql;

    constructor(db: Sql) {
        this.db = db;
        // Host, Port, User, Pass should be in .env
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendPOInvoice(orderData: any) {
        const { order_number, invoice_number, total_amount, name, email, items, address } = orderData;

        if (!email) {
            console.error("[EmailService] No email provided for order", order_number);
            return false;
        }

        console.log(`[EmailService] START: Processing invoice for ${email} (Order: ${order_number})`);

        const formattedTotal = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(total_amount);

        // Load CSS styles
        let styles = '';
        try {
            const cssPath = "public/css/email.css";
            styles = await Bun.file(cssPath).text();
        } catch (e) {
            console.warn("[EmailService] Could not load email.css, falling back to basic styles.");
        }

        const itemsHtml = items.map((item: any) => {
            return `
            <tr>
                <td>
                    <div class="product-name">${item.product_name || 'Produk'}</div>
                    <div class="product-category">${item.category || ''}</div>
                </td>
                <td class="center">
                    ${item.quantity}
                </td>
                <td class="right">
                    ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price * item.quantity)}
                </td>
            </tr>
        `}).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://baitybites.netlify.app/assets/logo.png" alt="Baitybites" class="logo">
                    <h1>Purchase Order Invoice</h1>
                    <p>Nomor: ${invoice_number}</p>
                </div>

                <div class="welcome-section">
                    <h2>Halo, ${name}!</h2>
                    <p>Terima kasih telah berbelanja di Baitybites. Pesanan Anda telah kami terima dan sedang diproses.</p>
                </div>

                <div class="details-box">
                    <div class="grid">
                        <div>
                            <div class="label">Customer</div>
                            <div class="value">${name}</div>
                            <div class="sub-value">${email}</div>
                        </div>
                        <div>
                            <div class="label">Pengiriman</div>
                            <div class="value">${address}</div>
                        </div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th class="center">QTY</th>
                            <th class="right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="2">Grand Total</td>
                            <td class="highlight">${formattedTotal}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="track-section">
                    <p>Anda dapat melacak status pesanan Anda melalui tombol di bawah ini:</p>
                    <a href="https://baitybites.netlify.app/track.html?number=${invoice_number}" class="btn">Lacak Pesanan Saya</a>
                </div>

                <div class="footer">
                    <p>Baitybites Order Management System</p>
                    <div class="social-links">
                        <a href="https://instagram.com/baitybites">Instagram</a>
                        <a href="https://baitybites.netlify.app">Website</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Generate PDF
        let pdfBuffer: Buffer | null = null;
        try {
            console.log(`[EmailService] PDF: Launching browser...`);
            const browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
                protocolTimeout: 60000,
                timeout: 30000
            });
            const page = await browser.newPage();
            // Faster wait for background processing
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });

            console.log(`[EmailService] PDF: Rendering...`);
            const pdfUint8Array = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' }
            });
            pdfBuffer = Buffer.from(pdfUint8Array);
            await browser.close();
            console.log(`[EmailService] PDF: Success.`);
        } catch (error) {
            console.error("[EmailService] PDF: Failed (will send HTML only):", error);
        }

        try {
            const adminUser = process.env.SMTP_USER || "id.baitybites@gmail.com";
            const skipBcc = email.toLowerCase() === adminUser.toLowerCase();

            console.log(`[EmailService] SMTP: Sending mail to ${email}...`);
            await this.transporter.sendMail({
                from: `"Baitybites" <${adminUser}>`,
                to: email,
                bcc: skipBcc ? undefined : adminUser,
                subject: `Invoice Pesanan Baitybites - ${order_number}`,
                html: html,
                attachments: pdfBuffer ? [
                    {
                        filename: `Invoice-${invoice_number}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ] : []
            });
            console.log(`[EmailService] DONE: Email sent successfully for order ${order_number}`);
            return true;
        } catch (error: any) {
            console.error("[EmailService] SMTP: Failed to send email:", error);
            return false;
        }
    }

}
