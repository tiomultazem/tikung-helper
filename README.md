# Buktidukung Helper

WhatsApp Worker lokal: auto upload gambar ke **Google Drive** dan append pesan ke **Google Sheets**.

## Cara Kerja

```
WhatsApp Group
    │ (gambar + caption)
    ▼
Baileys (Node.js)
    ├── Upload gambar → Google Drive (milikmu)
    └── Append caption → Google Sheets (milikmu)
```

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd buktidukung-helper
npm install
```

### 2. Jalankan Setup Wizard

```bash
node setup.js
```

Wizard akan memandu kamu langkah demi langkah: mulai dari membuat Google OAuth credentials, memasukkan Drive Folder ID, Spreadsheet ID, hingga Group ID WhatsApp. Tinggal copas sesuai instruksi yang muncul.

### 3. Jalankan

```bash
node index.js
```

**Pas pertama kali:**
1. Browser akan terbuka otomatis → login Google → izinkan akses Drive & Sheets
2. Scan QR Code WhatsApp yang muncul di terminal

**Selanjutnya:** session tersimpan, langsung terhubung tanpa langkah tambahan.

## Struktur Spreadsheet

| A (Timestamp) | B (Pesan/Caption) | C (Nama File) | D (Link Google Drive) |
|---|---|---|---|
| 16/8/2026, 10.30 | Dokumentasi rumah 123 | img-2026-08-16T02-30-00-000Z.jpg | https://drive.google.com/file/d/... |

## Catatan

- Token Google disimpan di `auth/token.json` (diabaikan Git, hanya di PC kamu)
- Session WhatsApp disimpan di `auth/baileys/` (diabaikan Git, hanya di PC kamu)
- Gambar diunduh sementara ke `tmp/` lalu **otomatis dihapus** setelah upload selesai
