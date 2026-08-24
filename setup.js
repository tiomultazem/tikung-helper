import readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function line(char = '─', len = 55) {
  console.log(char.repeat(len));
}

async function main() {
  console.log('\n');
  line('═');
  console.log('  🛠️   Buktidukung Helper — Setup Wizard');
  line('═');
  console.log('  Jawab setiap pertanyaan, lalu tekan Enter.');
  console.log('  Hasilnya akan disimpan ke file .env\n');

  // ── Google OAuth ──────────────────────────────────────────
  line();
  console.log('  LANGKAH 1 — Google OAuth Credentials\n');
  console.log('  1. Buka: https://console.cloud.google.com/');
  console.log('  2. Buat Project baru (atau pilih yang ada)');
  console.log('  3. Pergi ke: APIs & Services → Library');
  console.log('     → Aktifkan "Google Drive API"');
  console.log('     → Aktifkan "Google Sheets API"');
  console.log('  4. Pergi ke: APIs & Services → Credentials');
  console.log('     → "+ Create Credentials" → "OAuth client ID"');
  console.log('     → Application type: Desktop app');
  console.log('     → Salin Client ID dan Client Secret\n');

  const clientId = await ask('  Client ID');
  const clientSecret = await ask('  Client Secret');

  // ── Google Drive ──────────────────────────────────────────
  console.log('');
  line();
  console.log('  LANGKAH 2 — Google Drive Folder\n');
  console.log('  1. Buka Google Drive');
  console.log('  2. Buat atau buka folder tujuan upload gambar');
  console.log('  3. Salin ID dari URL:');
  console.log('     drive.google.com/drive/folders/[ ID INI ]\n');

  const driveFolderId = await ask('  Drive Folder ID');

  // ── Google Sheets ─────────────────────────────────────────
  console.log('');
  line();
  console.log('  LANGKAH 3 — Google Sheets\n');
  console.log('  1. Buat atau buka Google Spreadsheet tujuan');
  console.log('  2. Pastikan sudah ada tab/sheet bernama "Data"');
  console.log('     (atau sesuai nama yang kamu pilih)');
  console.log('  3. Salin ID dari URL:');
  console.log('     docs.google.com/spreadsheets/d/[ ID INI ]/edit\n');

  const spreadsheetId = await ask('  Spreadsheet ID');
  const sheetName = await ask('  Nama Sheet/Tab', 'Data');

  // ── WhatsApp Group ────────────────────────────────────────
  console.log('');
  line();
  console.log('  LANGKAH 4 — WhatsApp Group ID\n');
  console.log('  Cara mendapatkan Group ID:');
  console.log('  1. Lewati langkah ini dulu (kosongkan)');
  console.log('  2. Jalankan: node index.js');
  console.log('  3. Scan QR → kirim pesan sembarang ke grup target');
  console.log('  4. Lihat log terminal → salin ID grup');
  console.log('  5. Jalankan setup lagi atau edit .env manual\n');

  const targetGroupId = await ask('  Target Group ID (boleh kosong dulu)', '');

  // ── Tulis .env ────────────────────────────────────────────
  console.log('');
  line();

  const envContent = `# Google OAuth Credentials
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}

# Google Drive
DRIVE_FOLDER_ID=${driveFolderId}

# Google Sheets
SPREADSHEET_ID=${spreadsheetId}
SHEET_NAME=${sheetName}

# WhatsApp
TARGET_GROUP_ID=${targetGroupId}
`;

  fs.writeFileSync('.env', envContent);

  console.log('\n  ✅ File .env berhasil dibuat!\n');
  console.log('  Selanjutnya:\n');
  console.log('    node index.js\n');
  line('═');
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
