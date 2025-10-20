import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Paper, Stack, List, ListItem, ListItemText, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, Chip, Tooltip } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { parseImport } from '../lib/excel/parseImport';
import { parseMatchImport } from '../lib/excel/parseMatchImport';
import { usePlayersStore } from '../state/usePlayersStore';

type ImportMode = 'season' | 'match';

export default function DashboardPage() {
  const { players, events, attendance, importDebug, loadImport, applyImportClarification, pendingImportEvents, discardedEvents, reclassifyEvent, discardEventById, restoreDiscardedEvent, clearImportedData } = usePlayersStore() as any;
  const matchImport = usePlayersStore((s:any)=> s.matchImport);
  const importMode = usePlayersStore((s:any)=> s.importMode);
  const setImportMode = usePlayersStore((s:any)=> s.setImportMode);
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clarifyOpen, setClarifyOpen] = useState(false);
  // local mirror removed; use global importMode.
  const [candidateTeams, setCandidateTeams] = useState<string[]>([]);
  const [selectedMatchTeams, setSelectedMatchTeams] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [discardIds, setDiscardIds] = useState<Set<string>>(new Set()); // manual discards during clarification
  const [dragTarget, setDragTarget] = useState<string | null>(null); // 'training' | 'match' | 'discard'
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null);
    try {
  if (importMode === 'season') {
        const res = await parseImport(file);
        loadImport(res);
        console.log('Import debug', res.debug);
        // Build candidate team tokens and counts
        const tokenCounts: Record<string, number> = {};
        const dashRegex = /\s*[\-–—]\s*/;
        res.events.forEach(ev => {
          if (/trening/i.test(ev.name)) return;
          if (dashRegex.test(ev.name)) {
            const sides = ev.name.split(dashRegex).map(s => s.trim()).filter(Boolean);
            sides.forEach(side => {
              const norm = side.replace(/\*/g,'').trim();
              if (!norm) return;
              tokenCounts[norm] = (tokenCounts[norm] || 0) + 1;
            });
          }
        });
        let finalTokens = Object.keys(tokenCounts);
        finalTokens.sort((a,b)=> a.localeCompare(b, 'nb', { sensitivity: 'base' }));
        setCandidateTeams(finalTokens);
        setTeamCounts(tokenCounts);
        setSelectedMatchTeams([]);
        setDiscardIds(new Set());
        setClarifyOpen(true);
  } else {
        const res = await parseMatchImport(file);
        usePlayersStore.getState().loadMatchImport(res);
        console.log('Match import debug', res.debug);
      }
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
        {/* Title logic: show mode name if data imported, otherwise onboarding question */}
        {(players.length || events.length || matchImport?.players?.length) > 0 ? (
          <Typography variant="h6" gutterBottom>{importMode==='season' ? t('dashboard.mode.season') : t('dashboard.mode.match')}</Typography>
        ) : (
          <Typography variant="h6" gutterBottom>Hva ønsker du å gjøre?</Typography>
        )}

        {!(players.length || events.length || matchImport?.players?.length) && (
          <Stack spacing={2} mb={3} direction={{ xs:'column', md:'row' }} alignItems={{ xs:'stretch', md:'flex-start' }}>
            <Paper
              variant="outlined"
              sx={{
                p:2,
                cursor:'pointer',
                borderWidth: importMode==='match'?2:1,
                borderColor: importMode==='match'? 'primary.main' : 'divider',
                boxShadow: importMode==='match'? 3:0,
                transition:'all .2s',
                '&:hover':{ bgcolor:'action.hover' },
                flex:1,
                minWidth: 0
              }}
              onClick={()=> setImportMode('match')}
            >
              <Typography variant="subtitle1" gutterBottom>Sett opp lag for kommende turnering</Typography>
              <Typography variant="body2" color="text.secondary">Planlegg lag for én kamp eller turnering ved å importere tilgjengelighetslisten.</Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                p:2,
                cursor:'pointer',
                borderWidth: importMode==='season'?2:1,
                borderColor: importMode==='season'? 'primary.main' : 'divider',
                boxShadow: importMode==='season'? 3:0,
                transition:'all .2s',
                '&:hover':{ bgcolor:'action.hover' },
                flex:1,
                minWidth: 0
              }}
              onClick={()=> setImportMode('season')}
            >
              <Typography variant="subtitle1" gutterBottom>Se hvordan sesongen går så langt</Typography>
              <Typography variant="body2" color="text.secondary">Importer full oppmøtehistorikk for å analysere trenings- og kampdeltagelse.</Typography>
            </Paper>
          </Stack>
        )}

        {/* Mode selector chips removed per latest requirement */}

        {/* Instructions shown after a mode is chosen but before any file imported */}
        {!(players.length || events.length || matchImport?.players?.length) && importMode && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>Fremgangsmåte</Typography>
            {importMode === 'season' && (
              <Box component="ol" sx={{ pl:3, m:0 }}>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step1')}</Typography>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step2')}</Typography>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step3')}</Typography>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step4')}</Typography>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step5')}</Typography>
                <Typography component="li" variant="body2" color="text.secondary">{t('dashboard.instructions.step6')}</Typography>
              </Box>
            )}
            {importMode === 'match' && (
              <Box component="ol" sx={{ pl:3, m:0 }}>
                <Typography component="li" variant="body2" color="text.secondary">Gå til arrangementet i Spond</Typography>
                <Typography component="li" variant="body2" color="text.secondary">Trykk på menyknappen med tre prikker (… ) til høyre.</Typography>
                <Typography component="li" variant="body2" color="text.secondary">Velg "Eksporter deltagerliste"</Typography>
                <Typography component="li" variant="body2" color="text.secondary">Last opp filen her</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Import button always available once a mode chosen */}
        {importMode && (
          <Button variant="contained" component="label" disabled={loading}>
            {loading ? 'Importerer…' : 'Velg fil'}
            <input hidden type="file" accept='.xlsx,.xls' onChange={onFile} />
          </Button>
        )}
        {(players.length || events.length || matchImport?.players?.length) > 0 && (
          <Button sx={{ ml:2 }} color="secondary" variant="outlined" onClick={()=> setResetConfirmOpen(true)}>
            Nullstill data
          </Button>
        )}
        {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}

  {importMode==='season' && players.length > 0 && !pendingImportEvents && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>{t('dashboard.summaryTitle')}</Typography>
            {/* Season compact chip rail summary */}
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ width:'max-content', py:0.5 }}>
                <Tooltip title={t('dashboard.players')}>
                  <Chip size="small" icon={<GroupIcon />} label={players.length} color="primary" variant="filled" />
                </Tooltip>
                <Tooltip title={t('dashboard.events')}>
                  <Chip size="small" icon={<EventIcon />} label={events.length} variant="outlined" />
                </Tooltip>
                <Tooltip title={t('dashboard.matches')}>
                  <Chip size="small" icon={<EventIcon />} label={events.filter((e: any)=>e.type==='match').length} color="success" variant="filled" />
                </Tooltip>
                <Tooltip title={t('dashboard.trainings')}>
                  <Chip size="small" icon={<EventIcon />} label={events.filter((e: any)=>e.type==='training').length} color="secondary" variant="filled" />
                </Tooltip>
                <Tooltip title={t('dashboard.firstEventDate')}>
                  <Chip size="small" icon={<AccessTimeIcon />} label={firstEventDate || '—'} variant="outlined" />
                </Tooltip>
                <Tooltip title={t('dashboard.lastEventDate')}>
                  <Chip size="small" icon={<AccessTimeIcon />} label={lastEventDate || '—'} variant="outlined" />
                </Tooltip>
              </Stack>
            </Box>
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
        {importMode==='match' && matchImport?.players?.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>{t('dashboard.summaryTitleMatch') || 'Match Summary'}</Typography>
            {/* Enhanced compact summary: scrollable single line chip rail */}
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ width:'max-content', py:0.5 }}>
                <Chip size="small" icon={<EventIcon />} label={`${matchImport.meta.name || '—'}`} variant="outlined" />
                <Chip size="small" icon={<AccessTimeIcon />} label={`${matchImport.meta.dateTimeRaw || '—'}`} variant="outlined" />
                <Chip size="small" icon={<PlaceIcon />} label={`${matchImport.meta.location || '—'}`} variant="outlined" />
                <Tooltip title={t('dashboard.matchImport.totalPlayers')}>
                  <Chip size="small" icon={<GroupIcon />} label={matchImport.players.length} color="primary" variant="filled" />
                </Tooltip>
                <Tooltip title={t('dashboard.matchImport.attending')}>
                  <Chip
                    size="small"
                    icon={<CheckCircleIcon />}
                    label={matchImport.players.filter((p:any)=> p.status==='attending').length}
                    color="success"
                    variant="filled"
                  />
                </Tooltip>
                <Tooltip title={t('dashboard.matchImport.declined')}
                >
                  <Chip
                    size="small"
                    icon={<CancelIcon />}
                    label={matchImport.players.filter((p:any)=> p.status==='declined').length}
                    color="error"
                    variant="filled"
                  />
                </Tooltip>
              </Stack>
            </Box>
            <Stack direction={{ xs:'column', md:'row' }} spacing={2} mt={2} alignItems="stretch">
              {['attending','declined'].map(col => (
                <Box flex={1} key={col}>
                  <Typography variant="subtitle2" gutterBottom>{t(`dashboard.matchImport.columns.${col}`) || col}</Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p:1, maxHeight:480, overflow:'auto', transition:'border-color .15s, background-color .15s' }}
                    onDragOver={(e)=> e.preventDefault()}
                    onDragEnter={(e)=> { e.currentTarget.style.borderColor = '#1976d2'; e.currentTarget.style.backgroundColor = 'var(--mui-palette-action-hover)'; }}
                    onDragLeave={(e)=> { if (e.currentTarget === e.target) { e.currentTarget.style.borderColor=''; e.currentTarget.style.backgroundColor=''; } }}
                    onDrop={(e)=> {
                      const pid = e.dataTransfer.getData('text/match-player-id');
                      if (pid) {
                        usePlayersStore.setState(state => {
                          if (!state.matchImport) return {} as any;
                          const players = state.matchImport.players.map(p => p.id === pid ? { ...p, status: col as any } : p);
                          return { matchImport: { ...state.matchImport, players } };
                        });
                      }
                      e.currentTarget.style.borderColor='';
                      e.currentTarget.style.backgroundColor='';
                    }}
                  >
                    <List dense>
                      {matchImport.players.filter((p:any)=> p.status===col).map((pl:any)=>(
                        <ListItem
                          key={pl.id}
                          draggable
                          className="fade-item"
                          onDragStart={(e)=> e.dataTransfer.setData('text/match-player-id', pl.id)}
                          secondaryAction={<DragIndicatorIcon fontSize="small" sx={{ cursor:'grab', color:'text.disabled' }} />}
                        >
                          <ListItemText primary={pl.name} />
                        </ListItem>
                      ))}
                      {matchImport.players.filter((p:any)=> p.status===col).length === 0 && <ListItem><ListItemText primary="—" /></ListItem>}
                    </List>
                  </Paper>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
    {/* Reset confirmation dialog */}
    <Dialog open={resetConfirmOpen} onClose={()=> setResetConfirmOpen(false)}>
      <DialogTitle>Nullstill data?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">Alle importerte data vil bli slettet. Dette kan ikke angres.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=> setResetConfirmOpen(false)}>Avbryt</Button>
        <Button color="error" variant="contained" onClick={()=> { clearImportedData(); setResetConfirmOpen(false); }}>Nullstill</Button>
      </DialogActions>
    </Dialog>
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
