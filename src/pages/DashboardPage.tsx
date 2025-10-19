import { useState, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper, Stack, List, ListItem, ListItemText, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, Chip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { parseImport } from '../lib/excel/parseImport';
import { usePlayersStore } from '../state/usePlayersStore';

export default function DashboardPage() {
  const { players, events, attendance, importDebug, loadImport, applyImportClarification, pendingImportEvents, discardedEvents, reclassifyEvent, discardEventById, restoreDiscardedEvent } = usePlayersStore() as any;
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [candidateTeams, setCandidateTeams] = useState<string[]>([]);
  const [selectedMatchTeams, setSelectedMatchTeams] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [discardIds, setDiscardIds] = useState<Set<string>>(new Set()); // manual discards during clarification
  const [dragTarget, setDragTarget] = useState<string | null>(null); // 'training' | 'match' | 'discard'

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const res = await parseImport(file);
      loadImport(res);
      console.log('Import debug', res.debug);
      // Build candidate team tokens and counts from events containing dash variants ( - , – , — ) excluding training events.
      const tokenCounts: Record<string, number> = {};
      const dashRegex = /\s*[\-–—]\s*/; // match any dash with optional surrounding spaces
      res.events.forEach(ev => {
        if (/trening/i.test(ev.name)) return; // skip trainings
        if (dashRegex.test(ev.name)) {
          const sides = ev.name.split(dashRegex).map(s => s.trim()).filter(Boolean);
          // Typically two sides: home and away team
          sides.forEach(side => {
            const norm = side.replace(/\*/g,'').trim();
            if (!norm) return;
            tokenCounts[norm] = (tokenCounts[norm] || 0) + 1;
          });
        }
      });
  let finalTokens = Object.keys(tokenCounts);
  // Alphabetical sort (locale-aware, case-insensitive) using Norwegian locale fallback to default
  finalTokens.sort((a,b)=> a.localeCompare(b, 'nb', { sensitivity: 'base' }));
  setCandidateTeams(finalTokens);
      setTeamCounts(tokenCounts);
      setSelectedMatchTeams([]);
      setDiscardIds(new Set());
      setClarifyOpen(true);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const firstEventDate = useMemo(() => {
    if (!events.length) return '';
    const dated = events.filter((e: any) => e.date).sort((a: any,b: any)=> (a.date! < b.date! ? -1 : 1));
    if (!dated.length) return '';
    return dated[0].date!.split('T')[0];
  }, [events]);
  const lastEventDate = useMemo(() => {
    if (!events.length) return '';
    const dated = events.filter((e: any) => e.date).sort((a: any,b: any)=> (a.date! < b.date! ? -1 : 1));
    if (!dated.length) return '';
    return dated[dated.length-1].date!.split('T')[0];
  }, [events]);

  return (
    <>
    <style>{`.fade-item {animation: fadeSlide 0.25s ease-in;}
@keyframes fadeSlide {from {opacity:0; transform:translateY(-4px);} to {opacity:1; transform:translateY(0);} }`}</style>
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

  {players.length > 0 && !pendingImportEvents && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>{t('dashboard.summaryTitle')}</Typography>
            <Stack direction="row" spacing={isMobile ? 2 : 4} flexWrap="wrap" alignItems="flex-start">
              {[
                { label: t('dashboard.players'), value: players.length },
                { label: t('dashboard.events'), value: events.length },
                { label: t('dashboard.matches'), value: events.filter((e: any)=>e.type==='match').length },
                { label: t('dashboard.trainings'), value: events.filter((e: any)=>e.type==='training').length },
                { label: t('dashboard.firstEventDate'), value: firstEventDate || '—' },
                { label: t('dashboard.lastEventDate'), value: lastEventDate || '—' }
              ].map(item => (
                <Box key={item.label} sx={{ minWidth: isMobile ? 100 : 140, flex: isMobile ? '1 1 45%' : '0 0 auto' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{item.value}</Typography>
                </Box>
              ))}
            </Stack>
            {/* Three columns after clarification */}
            <Stack direction={{ xs:'column', md:'row' }} spacing={2} mt={2} alignItems="stretch">
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>{t('dashboard.columns.trainings')}</Typography>
                <Paper variant="outlined" sx={{ p:1, maxHeight:480, overflow:'auto', transition:'border-color 0.15s, background-color 0.15s', borderColor: dragTarget==='training' ? 'primary.main' : undefined, backgroundColor: dragTarget==='training' ? 'action.hover' : undefined }}
                  onDragOver={(e)=> e.preventDefault()}
                  onDrop={(e)=> {
                    const id = e.dataTransfer.getData('text/event-id');
                    if (id) reclassifyEvent(id,'training');
                    setDragTarget(null);
                  }}
                  onDragEnter={()=> setDragTarget('training')}
                  onDragLeave={(e)=> { if (e.currentTarget === e.target) setDragTarget(null); }}
                >
                  <List dense>
                    {events.filter((e: any)=>e.type==='training').map((ev: any) => (
                      <ListItem key={ev.id} draggable className="fade-item" onDragStart={(e)=>{
                        e.dataTransfer.setData('text/event-id', ev.id);
                      }} secondaryAction={<DragIndicatorIcon fontSize="small" sx={{ cursor:'grab', color:'text.disabled' }} />}> 
                        <ListItemText primary={ev.name} secondary={ev.date? ev.date.split('T')[0] : ''} />
                      </ListItem>
                    ))}
                    {events.filter((e: any)=>e.type==='training').length === 0 && <ListItem><ListItemText primary="—" /></ListItem>}
                  </List>
                </Paper>
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>{t('dashboard.columns.matches')}</Typography>
                <Paper variant="outlined" sx={{ p:1, maxHeight:480, overflow:'auto', transition:'border-color 0.15s, background-color 0.15s', borderColor: dragTarget==='match' ? 'primary.main' : undefined, backgroundColor: dragTarget==='match' ? 'action.hover' : undefined }}
                  onDragOver={(e)=> e.preventDefault()}
                  onDrop={(e)=> {
                    const id = e.dataTransfer.getData('text/event-id');
                    if (id) reclassifyEvent(id,'match');
                    setDragTarget(null);
                  }}
                  onDragEnter={()=> setDragTarget('match')}
                  onDragLeave={(e)=> { if (e.currentTarget === e.target) setDragTarget(null); }}
                >
                  <List dense>
                    {events.filter((e: any)=>e.type==='match').map((ev: any) => (
                      <ListItem key={ev.id} draggable className="fade-item" onDragStart={(e)=>{
                        e.dataTransfer.setData('text/event-id', ev.id);
                      }} secondaryAction={<DragIndicatorIcon fontSize="small" sx={{ cursor:'grab', color:'text.disabled' }} />}> 
                        <ListItemText primary={ev.name} secondary={ev.date? ev.date.split('T')[0] : ''} />
                      </ListItem>
                    ))}
                    {events.filter((e: any)=>e.type==='match').length === 0 && <ListItem><ListItemText primary="—" /></ListItem>}
                  </List>
                </Paper>
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle2" gutterBottom>{t('dashboard.columns.discarded')}</Typography>
                <Paper variant="outlined" sx={{ p:1, maxHeight:480, overflow:'auto', borderColor: dragTarget==='discard' ? 'error.main' : 'error.main', transition:'border-color 0.15s, background-color 0.15s', backgroundColor: dragTarget==='discard' ? 'error.lighter' : undefined }}
                  onDragOver={(e)=> e.preventDefault()}
                  onDrop={(e)=> {
                    const id = e.dataTransfer.getData('text/event-id');
                    if (id) discardEventById(id);
                    setDragTarget(null);
                  }}
                  onDragEnter={()=> setDragTarget('discard')}
                  onDragLeave={(e)=> { if (e.currentTarget === e.target) setDragTarget(null); }}
                >
                  <List dense>
                    {(discardedEvents || []).map((ev: any) => (
                      <ListItem key={ev.id} draggable className="fade-item" onDragStart={(e)=>{
                        e.dataTransfer.setData('text/event-id', ev.id);
                      }} onDoubleClick={()=> restoreDiscardedEvent(ev.id,'training')} secondaryAction={<DragIndicatorIcon fontSize="small" sx={{ cursor:'grab', color:'text.disabled' }} />}> 
                        <ListItemText primary={ev.name} secondary={ev.date? ev.date.split('T')[0] : ''} />
                      </ListItem>
                    ))}
                    {(discardedEvents || []).length === 0 && <ListItem><ListItemText primary="—" /></ListItem>}
                  </List>
                </Paper>
              </Box>
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
    {/* Clarification Modal */}
    <Dialog open={clarifyOpen} fullWidth maxWidth="md" onClose={()=>setClarifyOpen(false)}>
      <DialogTitle>{t('dashboard.clarifyModal.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>{t('dashboard.clarifyModal.intro')}</Typography>
        <Typography variant="subtitle2" gutterBottom>{t('dashboard.clarifyModal.detectedTeams')}</Typography>
        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" alignItems="center">
          <Button size="small" variant="outlined" disabled={!candidateTeams.length} onClick={()=> setSelectedMatchTeams(candidateTeams)}>Velg alle</Button>
          <Button size="small" variant="text" disabled={!selectedMatchTeams.length} onClick={()=> setSelectedMatchTeams([])}>Tøm</Button>
        </Stack>
        <Paper variant="outlined" sx={{ p:1, display:'flex', flexWrap:'wrap', gap:1 }}>
          {candidateTeams.map(team => {
            const selected = selectedMatchTeams.includes(team);
            return (
              <Chip key={team}
                label={`${team} (${teamCounts[team]||0})`}
                color={selected ? 'primary':'default'}
                variant={selected ? 'filled':'outlined'}
                onClick={()=> setSelectedMatchTeams(prev => selected ? prev.filter(t=>t!==team) : [...prev, team])}
                sx={{ cursor:'pointer' }}
              />
            );
          })}
          {candidateTeams.length === 0 && <Typography variant="caption" color="text.secondary">{t('dashboard.clarifyModal.noTeamsDetected') || 'No team tokens detected.'}</Typography>}
        </Paper>
        {/* Removed individual event type confirmation list for simplicity */}
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setClarifyOpen(false)}>{t('dashboard.clarifyModal.cancel')}</Button>
        <Button variant="contained" onClick={()=>{
          applyImportClarification({ matchTeams: selectedMatchTeams, discardEventIds: Array.from(discardIds) });
          setClarifyOpen(false);
        }}>{t('dashboard.clarifyModal.applySelections')}</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
