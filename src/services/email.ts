import nodemailer from "nodemailer";
import puppeteer from 'puppeteer';
import type { Sql } from "../db/schema";

export class EmailService {
    private transporter: nodemailer.Transporter;
    private static cachedStyles: string | null = null;
    private db: Sql;

    constructor(db: Sql) {
        this.db = db;
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
        const { order_number, invoice_number, email } = orderData;

        if (!email) {
            console.error("[EmailService] No email provided for order", order_number);
            return false;
        }

        console.log(`[EmailService] Processing invoice for ${email} (Order: ${order_number})...`);

        try {
            const html = await this.generateInvoiceHtml(orderData);
            const pdfBuffer = await this.generatePdfBuffer(html);

            const adminUser = process.env.SMTP_USER || "id.baitybites@gmail.com";
            const skipBcc = email.toLowerCase() === adminUser.toLowerCase();

            console.log(`[EmailService] SMTP: Sending mail to ${email}...`);
            const info = await this.transporter.sendMail({
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
            console.log(`[EmailService] DONE: Email sent successfully. ID: ${info.messageId}`);
            return true;
        } catch (error: any) {
            console.error("[EmailService] Global Email Task Error:", error);
            return false;
        }
    }

    async generateSummaryCardHtml(orderData: any) {
        const { order_number, invoice_number, total_amount, name, phone, items, discount = 0 } = orderData;

        const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.price || item.unit_price) * Number(item.quantity)), 0);
        const formattedSubtotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(subtotal);
        const formattedDiscount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(discount);
        const formattedGrandTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total_amount);

        const itemsHtml = items.map((item: any) => `
            <div class="summary-item">
                <span class="item-name">${item.product_name} x${item.quantity}</span>
                <span class="item-price">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(item.price || item.unit_price) * Number(item.quantity))}</span>
            </div>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 20px; background: #f0f2f5; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; justify-content: center; }
                .summary-card { 
                    background: white; width: 400px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding: 30px; 
                    border: 1px solid #edf2f7; overflow: hidden; position: relative;
                }
                .header { text-align: left; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
                .title { font-size: 16px; font-weight: 800; color: #1a202c; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; }
                .meta { color: #4a5568; font-size: 14px; margin-bottom: 5px; font-weight: 500; }
                .meta b { color: #1a202c; }
                
                .section { margin: 20px 0; }
                .section-title { font-size: 12px; font-weight: 800; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px; display: flex; align-items: center; gap: 6px; }
                
                .summary-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #2d3748; line-height: 1.5; font-weight: 500; }
                .item-name { flex: 1; padding-right: 15px; }
                .item-price { font-weight: 700; color: #1a202c; }
                
                .divider { height: 1px; background: #f1f5f9; margin: 20px 0; border: none; }
                .thick-divider { height: 2px; background: #1a202c; margin: 15px 0; border: none; }
                
                .total-section { margin-top: 20px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500; }
                .grand-total-row { display: flex; justify-content: space-between; margin-top: 5px; }
                .grand-total-label { font-size: 16px; font-weight: 800; color: #1a202c; }
                .grand-total-value { font-size: 18px; font-weight: 800; color: #f59638; }
                
                .footer { margin-top: 40px; text-align: left; color: #718096; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
                .footer b { color: #f59638; }
                .icon { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; background: #fff7ed; border-radius: 6px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="summary-card">
                <div class="header">
                    <div class="title">📋 RINGKASAN PESANAN</div>
                    <div class="meta">Order: <b>${order_number}</b></div>
                    <div class="meta">Invoice: <b>${invoice_number}</b></div>
                </div>

                <div class="section">
                    <div class="section-title">👤 PELANGGAN</div>
                    <div class="summary-item">
                        <span>Nama: <b>${name}</b></span>
                    </div>
                    <div class="summary-item">
                        <span>WhatsApp: <b>${phone}</b></span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">🛒 ITEM PESANAN</div>
                    ${itemsHtml}
                </div>

                <div class="divider"></div>

                <div class="total-section">
                    <div class="section-title">💰 TOTAL PEMBAYARAN</div>
                    <div class="total-row">
                        <span>Subtotal</span>
                        <span>${formattedSubtotal}</span>
                    </div>
                    <div class="total-row">
                        <span>Diskon</span>
                        <span>${formattedDiscount}</span>
                    </div>
                    <div class="thick-divider"></div>
                    <div class="grand-total-row">
                        <span class="grand-total-label">GRAND TOTAL</span>
                        <span class="grand-total-value">${formattedGrandTotal}</span>
                    </div>
                </div>

                <div class="footer">
                    Terima kasih atas pesanan Anda! 🙏 <br><b>BaityBites Team</b>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async generateInvoiceHtml(orderData: any) {
        const { invoice_number, total_amount, name, email, items, address } = orderData;

        const formattedTotal = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(total_amount);

        // Load CSS styles (Cached)
        let styles = '';
        if (EmailService.cachedStyles) {
            styles = EmailService.cachedStyles;
        } else {
            try {
                const cssPath = "public/css/email.css";
                styles = await Bun.file(cssPath).text();
                EmailService.cachedStyles = styles;
            } catch {
                console.warn("[EmailService] Could not load email.css, falling back to basic styles.");
            }
        }

        const itemsHtml = items.map((item: any) => `
            <tr>
                <td>
                    <div class="product-name">${item.product_name || 'Produk'}</div>
                    <div class="product-category">${item.category || ''}</div>
                </td>
                <td class="center">
                    ${item.quantity}
                </td>
                <td class="right">
                    ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.subtotal || (Number(item.price || item.unit_price || 0) * item.quantity))}
                </td>
            </tr>
        `).join('');

        return `
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
    }

    async generatePdfBuffer(html: string) {
        let browser: any = null;
        try {
            console.log(`[EmailService] PDF: Launching fresh browser...`);
            browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
                timeout: 60000 // Increased timeout to 60s
            });
            const page = await browser.newPage();

            console.log(`[EmailService] PDF: Setting content (len: ${html.length})...`);
            // Wait until network is idle to ensure images/fonts are loaded for the PDF
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });

            console.log(`[EmailService] PDF: Rendering...`);
            const pdfUint8Array = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '15px', right: '15px', bottom: '15px', left: '15px' }
            });

            const buffer = Buffer.from(pdfUint8Array);
            await browser.close();
            console.log(`[EmailService] PDF: Success (${buffer.length} bytes).`);
            return buffer;
        } catch (error) {
            console.error("[EmailService] PDF: Failed:", error);
            if (browser) await browser.close().catch(() => { });
            return null;
        }
    }

    async generateScreenshotBuffer(html: string) {
        let browser: any = null;
        try {
            console.log(`[EmailService] Image: Launching browser...`);
            browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
                timeout: 30000
            });
            const page = await browser.newPage();

            // Set a mobile-friendly viewport for the summary card
            await page.setViewport({ width: 450, height: 800, deviceScaleFactor: 2 });
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });

            console.log(`[EmailService] Image: Capturing screenshot...`);
            // Capture only the summary-card element if it exists, otherwise full page
            const element = await page.$('.summary-card');
            const buffer = await (element ? element.screenshot({ type: 'png' }) : page.screenshot({ type: 'png', fullPage: true }));

            await browser.close();
            console.log(`[EmailService] Image: Success (${(buffer as Buffer).length} bytes).`);
            return buffer as Buffer;
        } catch (error) {
            console.error("[EmailService] Image: Failed:", error);
            if (browser) await browser.close().catch(() => { });
            return null;
        }
    }
}
