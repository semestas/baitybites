# Dokumentasi Sistem Estimasi Produksi Baitybites

Dokumen ini menjelaskan logika bisnis dan teknis di balik sistem pelacakan produksi dan estimasi waktu yang diterapkan pada **Production Dashboard**.

![Production Dashboard Preview](https://github.com/user-attachments/assets/placeholder)

## 1. Alur Kerja Status Pesanan (Production Workflow)

Setiap pesanan melewati tahapan status berikut untuk memastikan pelacakan waktu yang akurat:

1.  **Pending**: Pesanan masuk dari pelanggan.
2.  **Confirmed**: Admin memverifikasi pembayaran/pesanan. Tombol `Mulai Produksi` muncul.
3.  **In Production (Sedang Dimasak)**:
    *   *Trigger*: Tombol `Mulai Produksi` ditekan.
    *   *System Action*: Mencatat `start_date` di tabel `production`.
    *   *Visual*: Ikon Api (Flame) aktif dengan jam mulai.
4.  **Wait for Packing (Menunggu Pengemasan)**:
    *   *Trigger*: Tombol `Selesai Masak` ditekan.
    *   *System Action*: Mencatat `end_date` produksi dan `packaging_date` di tabel `packaging`.
    *   *Visual*: Ikon Paket (Package) aktif dengan jam mulai.
5.  **Ready to Ship (Siap Kirim)**:
    *   *Trigger*: Tombol `Siap Kirim` ditekan.
    *   *System Action*: Mencatat `shipping_date` di tabel `shipping`.
    *   *Visual*: Pesanan pindah ke status pengiriman.
6.  **Completed**: Pesanan telah diambil kurir atau diterima pelanggan.

## 2. Rumus Estimasi Waktu (Estimation Logic)

Sistem secara otomatis menghitung estimasi waktu penyelesaian berdasarkan metadata produk dan jumlah pesanan.

### Formula Dasar
Total waktu dihitung dengan menjumlahkan tiga komponen utama:

$$ \text{Total Estimasi} = (\text{Waktu Produksi} \times \text{Qty}) + (\text{Waktu Packing} \times \text{Qty}) + \text{Buffer Pickup} $$

### Komponen Perhitungan
1.  **Waktu Produksi (Unit Production Time)**
    *   Diambil dari kolom `production_time` di tabel `products`.
    *   *Default*: 10 menit (jika tidak diatur).
    *   *Contoh*: Risol Mayo = 15 menit/porsi.

2.  **Waktu Packing (Unit Packaging Time)**
    *   Diambil dari kolom `packaging_time` di tabel `products`.
    *   *Default*: 5 menit (jika tidak diatur).
    *   *Contoh*: Risol Mayo = 5 menit/porsi.

3.  **Buffer Pickup (Waktu Tunggu Kurir)**
    *   Waktu tetap (fixed) untuk antisipasi kedatangan kurir.
    *   *Nilai*: **15 Menit** (Hardcoded).

### Contoh Kasus Laporan
Jika ada pesanan **3 porsi Risol Mayo**:
*   Produksi: $3 \times 15 \text{ menit} = 45 \text{ menit}$
*   Packing: $3 \times 5 \text{ menit} = 15 \text{ menit}$
*   Buffer: $15 \text{ menit}$
*   **Total Estimasi**: $45 + 15 + 15 = \mathbf{75 \text{ menit}}$

## 3. Indikator Target Waktu

Dashboard menampilkan **Target Jam Selesai** untuk membantu staf mengejar deadline.

*   **Logic**: `Target Time = Waktu Order Masuk + Total Estimasi Menit`
*   *Tampilan UI*: Label badge `TARGET: 11:04` di pojok kanan atas kotak estimasi.

## 4. Konfigurasi Database

Untuk mengubah standar waktu per produk, admin dapat melakukan update ke database langsung:

```sql
-- Contoh: Mengupdate waktu Risol menjadi 20 menit masak, 5 menit packing
UPDATE products 
SET production_time = 20, packaging_time = 5 
WHERE name LIKE '%Risol%';
```

## 5. Struktur Frontend & Ikon
Dashboard menggunakan **Lucide Icons** dengan kode warna untuk membedakan tahapan:

*   🛒 **Order Masuk** (Abu-abu): Waktu pesanan dibuat (`created_at`).
*   🔥 **Produksi** (Merah): Waktu mulai masak (`prod_start`).
*   📦 **Packing** (Oranye): Waktu mulai kemas (`pack_start`).

---
*Dokumen ini dibuat otomatis sebagai referensi logika bisnis sistem produksi Baitybites.*
