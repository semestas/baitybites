export function generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}${day}-${random}`;
}

export function generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

export function getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
        'pending': 'badge-warning',
        'confirmed': 'badge-info',
        'invoiced': 'badge-primary',
        'paid': 'badge-success',
        'production': 'badge-purple',
        'packaging': 'badge-orange',
        'shipping': 'badge-blue',
        'completed': 'badge-success',
        'cancelled': 'badge-danger',
        'unpaid': 'badge-danger',
        'partial': 'badge-warning',
        'in_progress': 'badge-info',
        'in_transit': 'badge-info',
        'delivered': 'badge-success'
    };
    return statusMap[status] || 'badge-secondary';
}

export function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
        'pending': 'Menunggu',
        'confirmed': 'Dikonfirmasi',
        'invoiced': 'Diinvoice',
        'paid': 'Lunas',
        'production': 'Produksi',
        'packaging': 'Pengemasan',
        'shipping': 'Pengiriman',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan',
        'unpaid': 'Belum Bayar',
        'partial': 'Sebagian',
        'in_progress': 'Dalam Proses',
        'in_transit': 'Dalam Perjalanan',
        'delivered': 'Terkirim'
    };
    return statusMap[status] || status;
}
