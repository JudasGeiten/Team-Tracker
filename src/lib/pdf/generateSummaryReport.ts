import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player } from '../../types/domain';

export function generateSummaryReport(players: Player[]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Attendance Summary', 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [['Name', 'Invited', 'Attended', 'Attended %', 'Excused %', 'Late %']],
    body: players.map(p => [
      p.name,
      p.invitedTotal ?? '',
      p.attendedTotal ?? '',
      p.attendedPct ?? '',
      p.excusedAbsentPct ?? '',
      p.latePct ?? ''
    ])
  });
  return doc;
}
