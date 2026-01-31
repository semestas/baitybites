export function generateOrderNumber(count: number): string {
    const date = new Date();
    const month = date.getMonth() + 1;
    // Random two digits from unix timestamp
    const unixRandom = String(Date.now() % 100).padStart(2, '0');
    const xxx = `${month}${unixRandom}`;
    const sequence = count;

    return `PO-${xxx}-${sequence}`;
}

export function generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
}


