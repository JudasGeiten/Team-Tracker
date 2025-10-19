import { useState, useMemo } from 'react';
import { Box, Button, Typography, Paper, Stack, List, ListItem, ListItemText, Alert } from '@mui/material';
import { parseImport } from '../lib/excel/parseImport';
import { usePlayersStore } from '../state/usePlayersStore';

export default function DashboardPage() {
  const { players, events, attendance, importDebug, loadImport, updateEventType, discardEvent } = usePlayersStore();
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

  const firstEventDate = useMemo(() => {
    if (!events.length) return '';
    const dated = events.filter(e => e.date).sort((a,b)=> (a.date! < b.date! ? -1 : 1));
    if (!dated.length) return '';
    return dated[0].date!.split('T')[0];
  }, [events]);
  const lastEventDate = useMemo(() => {
    if (!events.length) return '';
    const dated = events.filter(e => e.date).sort((a,b)=> (a.date! < b.date! ? -1 : 1));
    if (!dated.length) return '';
    return dated[dated.length-1].date!.split('T')[0];
  }, [events]);

  return (
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Import from spond</Typography>
        <Button variant="contained" component="label" disabled={loading}>
          {loading ? 'Importing...' : 'Select file'}
          <input hidden type="file" accept='.xlsx,.xls' onChange={onFile} />
        </Button>
        {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}

        {players.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>Import Summary</Typography>
            <Stack direction="row" spacing={4} flexWrap="wrap" alignItems="flex-start">
              {[
                { label: 'Players', value: players.length },
                { label: 'Events', value: events.length },
                { label: 'Matches', value: events.filter(e=>e.type==='match').length },
                { label: 'Trainings', value: events.filter(e=>e.type==='training').length },
                { label: 'First Event Date', value: firstEventDate || '—' },
                { label: 'Most Recent Event Date', value: lastEventDate || '—' }
              ].map(item => (
                <Box key={item.label} sx={{ minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{item.value}</Typography>
                </Box>
              ))}
            </Stack>
            {events.some(e=>e.needsTypeConfirmation) && (
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>Confirm event types</Typography>
                <List dense>
                  {events.filter(e=>e.needsTypeConfirmation).map(e => (
                    <ListItem key={e.id}
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant={e.type==='training' ? 'contained':'outlined'} onClick={()=>updateEventType(e.id,'training')}>Training</Button>
                          <Button size="small" variant={e.type==='match' ? 'contained':'outlined'} onClick={()=>updateEventType(e.id,'match')}>Match</Button>
                          <Button size="small" color="error" variant='outlined' onClick={()=>discardEvent(e.id)}>Discard</Button>
                        </Stack>
                      }
                    >
                      <ListItemText primary={e.name} secondary={e.date ? e.date.split('T')[0] : 'No date'} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
