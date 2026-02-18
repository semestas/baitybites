import puppeteer from 'puppeteer-core';
import type { Sql } from "../db/schema";

export class EmailService {
    private static cachedStyles: string | null = null;
    private static browser: any = null;
    private static browserPromise: Promise<any> | null = null;
    private static activeTasks = new Set<string>();
    private db: Sql;

    // Brevo API implementation
    private readonly brevoApiKey: string | undefined;
    private readonly senderEmail: string;
    private readonly senderName: string;

    constructor(db: Sql) {
        this.db = db;
        this.brevoApiKey = process.env.BREVO_API_KEY;
        this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'id.baitybites@gmail.com';
        this.senderName = process.env.BREVO_SENDER_NAME || 'Baitybites (No-Reply)';

        if (!this.brevoApiKey) {
            console.warn('[EmailService] WARNING: BREVO_API_KEY is not set. Emails will NOT be sent.');
        } else {
            console.log(`[EmailService] Initialized via Brevo HTTP API. Sender: ${this.senderName} <${this.senderEmail}>`);
        }
    }

    /**
     * Send an email via Brevo REST API (HTTPS port 443).
     * Works on Render free tier and allows sending to any recipient with a free account.
     */
    private async sendViaBrevo(options: {
        to: string;
        subject: string;
        html: string;
        attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
    }): Promise<boolean> {
        if (!this.brevoApiKey) {
            console.error('[EmailService] Cannot send email: BREVO_API_KEY is missing.');
            return false;
        }

        const body: Record<string, any> = {
            sender: { name: this.senderName, email: this.senderEmail },
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
        };

        if (options.attachments && options.attachments.length > 0) {
            body.attachment = options.attachments.map(att => ({
                name: att.filename,
                content: att.content.toString('base64'),
            }));
        }

        // Brevo V3 API Endpoint
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': this.brevoApiKey,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Brevo API error ${response.status}: ${errorText}`);
        }

        const result = await response.json() as { messageId: string };
        console.log(`[EmailService] Email sent via Brevo. MessageID: ${result.messageId}`);
        return true;
    }

    async sendPOInvoice(orderData: any) {
        const { order_number, invoice_number, email, name } = orderData;

        if (!email) {
            console.error("[EmailService] ABORT: No recipient email provided for order", order_number);
            return false;
        }

        // Prevent duplicate concurrent tasks for the same invoice
        if (EmailService.activeTasks.has(invoice_number)) {
            console.log(`[EmailService] Task for ${invoice_number} is already in progress. Skipping duplicate.`);
            return true;
        }
        EmailService.activeTasks.add(invoice_number);

        console.log(`[EmailService] TASK START: Order ${order_number} for ${name} (${email})`);

        try {
            return await this.executeMailTask(orderData);
        } finally {
            EmailService.activeTasks.delete(invoice_number);
        }
    }

    private async executeMailTask(orderData: any) {
        const { order_number, invoice_number, email, name } = orderData;
        let html = "";
        let pdfBuffer = null;

        try {
            console.log(`[EmailService] -> Generating HTML stage...`);
            html = await this.generateInvoiceHtml(orderData);
            console.log(`[EmailService] -> HTML OK (length: ${html.length})`);
        } catch (e) {
            console.error("[EmailService] -> HTML Generation Failed:", e);
            html = `<h1>Invoice ${order_number}</h1><p>Gagal membuat tampilan invoice lengkap, namun pesanan Anda telah diterima.</p>`;
        }

        // 2. Generate PDF with Retry Logic (Reliability Mode)
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[EmailService] -> Generating PDF stage (Shared Mode, Attempt ${attempt}/${maxRetries})...`);

                // Allow up to 20 seconds for professional PDF rendering
                const pdfPromise = this.generatePdfBuffer(html);
                const timeoutDuration = 20000;
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("PDF Generation Timeout")), timeoutDuration));

                pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]) as Buffer;

                if (pdfBuffer && pdfBuffer.length > 0) {
                    console.log(`[EmailService] -> PDF OK (${pdfBuffer.length} bytes)`);
                    break; // Success! Exit retry loop
                } else {
                    throw new Error("Empty PDF Buffer");
                }
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.warn(`[EmailService] -> PDF Attempt ${attempt} failed: ${errorMsg}`);

                if (attempt === maxRetries) {
                    console.error("[EmailService] -> CRITICAL: All PDF generation attempts failed.");
                } else {
                    // Small delay before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // 3. Send Email via Brevo HTTP API (Works on Render, Free implementation without domain)
        const maxSendRetries = 3;
        for (let attempt = 1; attempt <= maxSendRetries; attempt++) {
            try {
                console.log(`[EmailService] -> Brevo: To: ${email} [Attempt ${attempt}/${maxSendRetries}]...`);

                await this.sendViaBrevo({
                    to: email,
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

                if (!pdfBuffer) {
                    console.warn("[EmailService] WARNING: Email sent WITHOUT PDF after all retry attempts.");
                }

                console.log(`[EmailService] DONE: Invoice email sent successfully to ${email}.`);
                return true;
            } catch (error: any) {
                console.error(`[EmailService] SEND ATTEMPT ${attempt} FAILED:`, error.message);

                if (attempt < maxSendRetries) {
                    // Exponential backoff: 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                } else {
                    console.error("[EmailService] CRITICAL: All send attempts failed.");
                    return false;
                }
            }
        }
        return false;
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
            <style>
                body { margin: 0; padding: 20px; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; }
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

    private async getBrowser() {
        if (EmailService.browser && EmailService.browser.isConnected()) {
            return EmailService.browser;
        }

        if (EmailService.browserPromise) {
            return EmailService.browserPromise;
        }

        console.log(`[EmailService] Launching shared browser instance (Atomic)...`);
        EmailService.browserPromise = puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ],
            timeout: 30000
        }).then((b: any) => {
            EmailService.browser = b;
            EmailService.browserPromise = null; // Clear promise once resolved
            return b;
        }).catch((err: any) => {
            console.error("[EmailService] Browser launch error:", err);
            EmailService.browserPromise = null;
            return null;
        });

        return EmailService.browserPromise;
    }

    async generatePdfBuffer(html: string) {
        const browser = await this.getBrowser();
        if (!browser) return null;
        let page: any = null;
        try {
            page = await browser.newPage();
            console.log(`[EmailService] PDF: Setting content (len: ${html.length})...`);
            await page.setContent(html, { waitUntil: 'load', timeout: 15000 });

            console.log(`[EmailService] PDF: Rendering...`);
            const pdfUint8Array = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '15px', right: '15px', bottom: '15px', left: '15px' }
            });

            const buffer = Buffer.from(pdfUint8Array);
            await page.close();
            console.log(`[EmailService] PDF: Success (${buffer.length} bytes).`);
            return buffer;
        } catch (error) {
            console.error("[EmailService] PDF: Failed:", error);
            if (page) await page.close().catch(() => { });
            return null;
        }
    }

    async generateScreenshotBuffer(html: string) {
        const browser = await this.getBrowser();
        if (!browser) return null;
        let page: any = null;
        try {
            page = await browser.newPage();
            await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
            await page.setContent(html, { waitUntil: 'load', timeout: 15000 });

            const element = await page.$('.summary-card');
            const buffer = element
                ? await element.screenshot({ type: 'png' })
                : await page.screenshot({ type: 'png', fullPage: true });

            await page.close();
            return Buffer.from(buffer);
        } catch (error) {
            console.error("[EmailService] Image: Failed:", error);
            if (page) await page.close().catch(() => { });
            return null;
        }
    }
}
