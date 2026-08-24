import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { uploadImage } from '../google/drive.js';
import { appendRow } from '../google/sheets.js';
import { sendSSE } from '../webServer.js';
import { parseCaption } from '../parser.js';

const PROCESSED_PATH = './data/processed.json';
const TMP_DIR = './tmp';

function loadProcessed() {
  try {
    return JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveProcessed(ids) {
  fs.mkdirSync(path.dirname(PROCESSED_PATH), { recursive: true });
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify(ids, null, 2));
}

function markProcessing(messageId) {
  const ids = loadProcessed();
  if (!ids.includes(messageId)) {
    ids.push(messageId);
    saveProcessed(ids);
  }
}

function clearProcessed(messageId) {
  const ids = loadProcessed().filter((id) => id !== messageId);
  saveProcessed(ids);
}

export async function processMessage(auth, { sock, msg }) {
  const messageId = msg.key.id;

  if (loadProcessed().includes(messageId)) {
    return;
  }

  let content = msg.message;
  if (!content) return;

  if (content.ephemeralMessage) content = content.ephemeralMessage.message;
  if (content.viewOnceMessage) content = content.viewOnceMessage.message;
  if (content.viewOnceMessageV2) content = content.viewOnceMessageV2.message;

  const imageMessage = content?.imageMessage;
  if (!imageMessage) {
    sendSSE('log', { message: `ℹ️ Pesan bukan gambar (ID: ${messageId}). Skipped.` });
    return;
  }

  const rawCaption = imageMessage.caption?.trim() || '';

  // Parse caption → tanggal, deskripsi
  const { startDate, endDate, description } = parseCaption(rawCaption);

  markProcessing(messageId);
  sendSSE('log', { message: `📩 Memproses: "${rawCaption}" [${messageId}]` });
  if (startDate) sendSSE('log', { message: `📅 Tanggal: ${startDate}${endDate ? ' s.d. ' + endDate : ''}` });
  sendSSE('log', { message: `📝 Deskripsi: "${description}"` });

  let tmpPath = null;

  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const timestamp = Date.now();
    // Nama file dari deskripsi yang sudah di-parse (bersih dari tanggal)
    const safeName = description
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80)
      .trim();
    const fileName = `${safeName}_${timestamp}.jpg`;
    tmpPath = path.join(TMP_DIR, fileName);

    sendSSE('log', { message: `📥 Mengunduh gambar dari WhatsApp...` });

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: {
          info: () => {},
          error: (m) => console.error('Baileys media error:', m),
          warn: () => {},
          debug: () => {},
          trace: () => {},
          child: () => ({ info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, trace: () => {} }),
        },
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    fs.writeFileSync(tmpPath, buffer);

    sendSSE('log', { message: `☁️ Mengupload gambar ke Google Drive...` });
    const driveFile = await uploadImage(auth, tmpPath, fileName);
    sendSSE('log', { message: `✅ Upload Drive berhasil: <b><a href="${driveFile.webViewLink}" target="_blank">${driveFile.name}</a></b>` });

    sendSSE('log', { message: `📊 Memperbarui Google Sheets...` });
    await appendRow(auth, {
      startDate,
      endDate,
      description,
      imageName: fileName,
      fileUrl: driveFile.webViewLink,
    });
    sendSSE('log', { message: `✅ Sheets diperbarui!` });

    // React 👍 ke pesan sebagai tanda selesai diproses
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: '👍', key: msg.key },
    });
    sendSSE('log', { message: `👍 Reaksi dikirim ke pesan.` });

    fs.unlinkSync(tmpPath);
    clearProcessed(messageId);
    sendSSE('log', { message: `🗑️ File temporary dihapus.\n` });
  } catch (err) {
    sendSSE('log', { message: `❌ Error memproses ${messageId}: ${err.message}` });
    if (tmpPath && fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }
}
