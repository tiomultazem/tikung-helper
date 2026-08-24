import { google } from 'googleapis';

/**
 * Kolom target:
 *   A  = startDate
 *   B  = endDate (atau kosong)
 *   C-E = kosong
 *   F  = description
 *   G-H = kosong
 *   I  = Drive link
 */
export async function appendRow(auth, { startDate, endDate, description, imageName, fileUrl }) {
  const sheets = google.sheets({ version: 'v4', auth });

  const row = [
    startDate   || '',   // A
    endDate     || '',   // B
    '',                  // C
    '',                  // D
    '',                  // E
    description || '',   // F
    '',                  // G
    '',                  // H
    fileUrl     || '',   // I
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${process.env.SHEET_NAME}!A:I`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}
