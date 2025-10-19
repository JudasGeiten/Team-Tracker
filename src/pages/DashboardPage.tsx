import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper, Stack, List, ListItem, ListItemText, Alert } from '@mui/material';
import { parseImport } from '../lib/excel/parseImport';
import { usePlayersStore } from '../state/usePlayersStore';

export default function DashboardPage() {
  const { players, events, attendance, importDebug, loadImport, updateEventType, discardEvent } = usePlayersStore();
  const { t } = useTranslation();
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
        <Typography variant="h6" gutterBottom>{t('dashboard.importTitle')}</Typography>
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>{t('dashboard.instructionsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              <li>{t('dashboard.instructions.step1')}</li>
              <li>{t('dashboard.instructions.step2')}</li>
              <li>{t('dashboard.instructions.step3')}</li>
              <li>{t('dashboard.instructions.step4')}</li>
              <li>{t('dashboard.instructions.step5')}</li>
              <li>{t('dashboard.instructions.step6')}</li>
            </ul>
          </Typography>
        </Box>
        <Button variant="contained" component="label" disabled={loading}>
          {loading ? 'Importerer…' : 'Velg fil'}
          <input hidden type="file" accept='.xlsx,.xls' onChange={onFile} />
        </Button>
        {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}

        {players.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>{t('dashboard.summaryTitle')}</Typography>
            <Stack direction="row" spacing={4} flexWrap="wrap" alignItems="flex-start">
              {[
                { label: t('dashboard.players'), value: players.length },
                { label: t('dashboard.events'), value: events.length },
                { label: t('dashboard.matches'), value: events.filter(e=>e.type==='match').length },
                { label: t('dashboard.trainings'), value: events.filter(e=>e.type==='training').length },
                { label: t('dashboard.firstEventDate'), value: firstEventDate || '—' },
                { label: t('dashboard.lastEventDate'), value: lastEventDate || '—' }
              ].map(item => (
                <Box key={item.label} sx={{ minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{item.value}</Typography>
                </Box>
              ))}
            </Stack>
            {events.some(e=>e.needsTypeConfirmation) && (
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>{t('dashboard.confirmTypes')}</Typography>
                <List dense>
                  {events.filter(e=>e.needsTypeConfirmation).map(e => (
                    <ListItem key={e.id}
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant={e.type==='training' ? 'contained':'outlined'} onClick={()=>updateEventType(e.id,'training')}>{t('dashboard.training')}</Button>
                          <Button size="small" variant={e.type==='match' ? 'contained':'outlined'} onClick={()=>updateEventType(e.id,'match')}>{t('dashboard.match')}</Button>
                          <Button size="small" color="error" variant='outlined' onClick={()=>discardEvent(e.id)}>{t('dashboard.discard')}</Button>
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
