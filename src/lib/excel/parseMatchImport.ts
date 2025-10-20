import ExcelJS from 'exceljs';
import { nanoid } from 'nanoid';
import { Player } from '../../types/domain';

export interface MatchImportResult {
  meta: { name?: string; dateTimeRaw?: string; location?: string };
  players: Array<{ id: string; name: string; status: 'attending' | 'declined' }>;
  debug: any;
}

// Norwegian status keywords
const STATUS_ATTENDING = /kommer/i; // "Kommer"
const STATUS_DECLINED = /kan\s+ikke\s+komme/i; // "Kan ikke komme"

export async function parseMatchImport(file: File): Promise<MatchImportResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const sheet = wb.getWorksheet('For import') || wb.worksheets[0];
  if (!sheet) return { meta: {}, players: [], debug: { error: 'No worksheet found' } };

  const metaName = sheet.getCell('A1').value?.toString().trim();
  const metaDate = sheet.getCell('A2').value?.toString().trim();
  const metaLocation = sheet.getCell('A3').value?.toString().trim();

  // Expect headers: A5 = Status, B5 = Navn; data starts row 6
  const headerStatus = sheet.getCell('A5').value?.toString().toLowerCase();
  const headerName = sheet.getCell('B5').value?.toString().toLowerCase();
  const debug: any = { headerStatus, headerName, rawStatuses: {}, unknownStatusCount: 0 };

  const players: MatchImportResult['players'] = [];
  for (let r = 6; r <= sheet.rowCount; r++) {
    const statusCell = sheet.getCell(r, 1).value; // A column
    const nameCell = sheet.getCell(r, 2).value;   // B column
    const rawName = nameCell?.toString().trim();
    const rawStatus = statusCell?.toString().trim();
    if (!rawName) continue; // ignore empty rows
    let status: 'attending' | 'declined';
    if (!rawStatus) {
      // Treat missing response as declined per new requirement.
      status = 'declined';
    } else if (STATUS_ATTENDING.test(rawStatus)) {
      status = 'attending';
    } else if (STATUS_DECLINED.test(rawStatus)) {
      status = 'declined';
    } else {
      // Unknown statuses also considered declined.
      status = 'declined';
      debug.unknownStatusCount++;
    }
    debug.rawStatuses[rawStatus || ''] = (debug.rawStatuses[rawStatus || ''] || 0) + 1;
    players.push({ id: nanoid(), name: rawName, status });
  }

  return { meta: { name: metaName, dateTimeRaw: metaDate, location: metaLocation }, players, debug };
}
