import { useState } from 'react';
import { Box, Button, Typography, Paper, Stack, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';
import { parseImport } from '../lib/excel/parseImport';
import { usePlayersStore } from '../state/usePlayersStore';
import AttendanceChart from '../components/stats/AttendanceChart';

export default function DashboardPage() {
  const { players, events, attendance, importDebug, loadImport } = usePlayersStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const res = await parseImport(file);
      loadImport(res);
      console.log('Import debug', res.debug);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const blankColors = importDebug?.blankColorSamples ? Object.entries(importDebug.blankColorSamples) : [];

  return (
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Import Excel</Typography>
        <Button variant="contained" component="label" disabled={loading}>
          {loading ? 'Importing...' : 'Select file'}
          <input hidden type="file" accept='.xlsx,.xls' onChange={onFile} />
        </Button>
        {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}
        {players.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2">Players: {players.length} | Events: {events.length} | Attendance records: {attendance.length}</Typography>
          </Box>
        )}
      </Paper>

      {blankColors.length > 0 && (
        <Paper sx={{ p:2 }}>
          <Typography variant="subtitle1">Blank cell color samples (for distinguishing invited absent vs not invited)</Typography>
          <List dense>
            {blankColors.map(([argb, count]) => (
              <ListItem key={argb}>
                <ListItemText primary={`${argb}`} secondary={`count: ${count}`} />
                {argb !== 'NONE' && <Box sx={{ width:24, height:24, bgcolor: `#${argb.slice(-6)}`, border: '1px solid #ccc', ml:2 }} />}
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my:2 }} />
          <Typography variant="body2">Next: Tell us which ARGB corresponds to invited-but-absent (red). We will update parser to classify.</Typography>
        </Paper>
      )}

      {players.length > 0 && (
        <Paper sx={{ p:2 }}>
          <Typography variant="h6">Quick Preview (first 5 players)</Typography>
          <List dense>
            {players.slice(0,5).map(p => (
              <ListItem key={p.id}>
                <ListItemText primary={p.name} secondary={`Invited: ${p.invitedTotal ?? '-'} | Attended: ${p.attendedTotal ?? '-'}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {players.length > 0 && (
        <AttendanceChart />
      )}
    </Stack>
  );
}
