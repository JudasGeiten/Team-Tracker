import { Player, Event, AttendanceRecord } from '../../types/domain';
import { nanoid } from 'nanoid';
import ExcelJS from 'exceljs';

interface ImportResult { players: Player[]; events: Event[]; attendance: AttendanceRecord[]; debug: any }

// Configure color(s) that indicate an invited but absent player (fill color of blank cell)
// Input given: #FF420E -> Excel ARGB likely FFFF420E
const ABSENT_COLOR_HEX = 'FF420E'.toUpperCase();
const ABSENT_COLOR_ARGB = 'FFFF420E';

// Attempt to distinguish invited absent vs not invited using fill color.
// We will log encountered blank cell colors so user can map them later.
export async function parseImport(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const sheet = wb.worksheets[0];
  if (!sheet) return { players: [], events: [], attendance: [], debug: {} };

  const headerRow = sheet.getRow(1);
  const labelRow = sheet.getRow(2);

  const headerValues = (headerRow.values ?? []) as any[];
  const nameCol = headerValues.findIndex(v => typeof v === 'string' && v.toUpperCase().includes('NAVN'));
  if (nameCol === -1) return { players: [], events: [], attendance: [], debug: { error: 'NAVN column not found' } };

  const fixedStatsCols = 6; // NAVN + 5 stat columns after
  const events: Event[] = [];

  // Build events list
  for (let col = nameCol + fixedStatsCols; col <= headerRow.cellCount; col++) {
    const label = labelRow.getCell(col).value as string | undefined;
    if (!label) continue;
    const lower = label.toLowerCase();
    let type: 'training' | 'match';
    let needsTypeConfirmation = false;
    if (/trening/.test(lower)) {
      type = 'training';
    } else if (/(kamp|match|game)/.test(lower)) {
      type = 'match';
    } else {
      // Default to match but require confirmation from user
      type = 'match';
      needsTypeConfirmation = true;
    }
    const parsedDate = extractDate(label);
    events.push({ id: nanoid(), name: label, type, index: col, date: parsedDate || undefined, needsTypeConfirmation });
  }

  const players: Player[] = [];
  const attendance: AttendanceRecord[] = [];
  const blankColorSamples: Record<string, number> = {};

  for (let r = 3; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const nameCell = row.getCell(nameCol);
    const name = nameCell.value?.toString().trim();
    if (!name) continue;
    // New rule: ignore any player whose name starts with '*'
    if (name.startsWith('*')) continue;

    const player: Player = {
      id: nanoid(),
      name,
      invitedTotal: num(row.getCell(nameCol + 1).value),
      attendedTotal: num(row.getCell(nameCol + 2).value),
      attendedPct: num(row.getCell(nameCol + 3).value),
      excusedAbsentPct: num(row.getCell(nameCol + 4).value),
      latePct: num(row.getCell(nameCol + 5).value)
    };
    players.push(player);

    events.forEach(ev => {
      const cell = row.getCell(ev.index);
      const raw = cell.value;
      if (raw === 1 || raw === '1') {
        attendance.push({ playerId: player.id, eventId: ev.id, status: 'attended' });
        return;
      }
      if (raw === null || raw === undefined || raw === '') {
        const fill = (cell.fill as any)?.fgColor?.argb || (cell.fill as any)?.bgColor?.argb || 'NONE';
        const norm = fill.toString().toUpperCase();
        if (!blankColorSamples[norm]) blankColorSamples[norm] = 0;
        blankColorSamples[norm]++;
        if (norm === ABSENT_COLOR_ARGB || norm.endsWith(ABSENT_COLOR_HEX)) {
          attendance.push({ playerId: player.id, eventId: ev.id, status: 'absent' });
        } else {
          // not invited -> we currently do not store explicit record; could add status if needed
        }
      }
    });
  }

  // Recompute invited / attended if not present or to ensure consistency
  const attendanceByPlayer = attendance.reduce<Record<string, { invited: number; attended: number }>>((acc, rec) => {
    if (!acc[rec.playerId]) acc[rec.playerId] = { invited: 0, attended: 0 };
    if (rec.status === 'attended' || rec.status === 'absent') acc[rec.playerId].invited++;
    if (rec.status === 'attended') acc[rec.playerId].attended++;
    return acc;
  }, {});

  const eventById = Object.fromEntries(events.map(e => [e.id, e]));
  // compute matches/trainings attended only
  const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
  attendance.forEach(a => {
    if (a.status !== 'attended') return;
    const ev = eventById[a.eventId];
    if (!ev) return;
    if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
    if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++;
    else attendedByPlayer[a.playerId].trainingAtt++;
  });

  players.forEach(p => {
    const agg = attendanceByPlayer[p.id];
    if (agg) {
      p.invitedTotal = agg.invited;
      p.attendedTotal = agg.attended;
      p.attendedPct = agg.invited ? +((agg.attended / agg.invited) * 100).toFixed(1) : 0;
    }
    const att = attendedByPlayer[p.id];
    p.matchesAttended = att?.matchAtt || 0;
    p.trainingsAttended = att?.trainingAtt || 0;
  });

  return { players, events, attendance, debug: { blankColorSamples, absentColor: ABSENT_COLOR_ARGB } };
}

function num(v: any): number | undefined {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// Try to extract a date from the label (supports formats like DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
function extractDate(label: string): string | null {
  const patterns = [
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})[.](\d{1,2})[.](\d{2,4})/,   // DD.MM.YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/     // DD/MM/YYYY
  ];
  for (const p of patterns) {
    const m = label.match(p);
    if (m) {
      let year: number, month: number, day: number;
      if (p === patterns[0]) { year = +m[1]; month = +m[2]; day = +m[3]; }
      else { day = +m[1]; month = +m[2]; year = +m[3]; if (year < 100) year += 2000; }
      const iso = new Date(Date.UTC(year, month - 1, day)).toISOString();
      return iso;
    }
  }
  return null;
}
