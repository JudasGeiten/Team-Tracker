import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../state/usePlayersStore';
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Toolbar, List, ListItem, ListItemText, TextField, Select, MenuItem, useMediaQuery, Chip, Checkbox } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Player, Event, AttendanceRecord } from '../types/domain';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PlayersPage() {
  const { players, groups, events, attendance, removePlayer, addGroup, removeGroup, renameGroup, assignGroup, importMode, matchImport, setMatchPlayerGroup } = usePlayersStore() as any;
  const [search, setSearch] = useState('');
  const [detailsPlayerId, setDetailsPlayerId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | 'ALL'>('ALL');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showDeclined, setShowDeclined] = useState(false); // match mode: include declined players when true
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const matchModePlayers = useMemo(() => {
    if (importMode !== 'match' || !matchImport?.players?.length) return [] as Player[];
    const rosterByName = Object.fromEntries(players.map((p: Player) => [p.name.trim().toLowerCase(), p]));
    // Use roster player object when present (keeps attendance aggregates & group), otherwise create a temp player carrying its own groupId from matchImport
    return matchImport.players.map((mp: any) => {
      const roster = rosterByName[mp.name.trim().toLowerCase()];
      if (roster) {
        // Ensure roster reflects match import group if roster has no group yet.
        if (!roster.groupId && mp.groupId) roster.groupId = mp.groupId; // mutating local reference (roster array element already referenced in state)
        return roster;
      }
      return { id: `temp-${mp.id}`, name: mp.name, groupId: mp.groupId ?? null } as any;
    });
  }, [importMode, matchImport, players]);
  const basePlayers = importMode === 'match' ? matchModePlayers : players;
  const filteredPlayers = useMemo(() => basePlayers.filter((p: any) => {
    if (filterGroup !== 'ALL' && p.groupId !== filterGroup) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [basePlayers, filterGroup, search]);

  function openManageGroups() { setGroupDialogOpen(true); }
  function closeManageGroups() { setGroupDialogOpen(false); setEditingGroupId(null); setNewGroupName(''); }
  function handleAddGroup() { if (!newGroupName.trim()) return; addGroup(newGroupName.trim()); setNewGroupName(''); }
  function handleRenameGroup(id: string, current: string) { setEditingGroupId(id); setNewGroupName(current); }
  function saveRename() { if (editingGroupId && newGroupName.trim()) { renameGroup(editingGroupId, newGroupName.trim()); setEditingGroupId(null); setNewGroupName(''); } }

  const eventById: Record<string, Event> = useMemo(() => Object.fromEntries(events.map((e: Event) => [e.id, e])), [events]);
  const attendanceByPlayerType = useMemo(() => {
    if (importMode === 'match') return {} as any;
    const acc: Record<string, { match: { invited: number; attended: number }; training: { invited: number; attended: number } }> = {};
    filteredPlayers.forEach((p: Player) => { acc[p.id] = { match: { invited: 0, attended: 0 }, training: { invited: 0, attended: 0 } }; });
    attendance.forEach((a: AttendanceRecord) => {
      const bucket = acc[a.playerId]; if (!bucket) return;
      const ev = eventById[a.eventId]; if (!ev) return;
      if (a.status === 'attended' || a.status === 'absent') bucket[ev.type].invited++;
      if (a.status === 'attended') bucket[ev.type].attended++;
    });
    return acc;
  }, [attendance, eventById, filteredPlayers, importMode]);

  const trainingHeaderBg = alpha(theme.palette.success.main, 0.15);
  const matchHeaderBg = alpha(theme.palette.warning.main, 0.2);
  const trainingCellBg = alpha(theme.palette.success.main, 0.06);
  const matchCellBg = alpha(theme.palette.warning.main, 0.07);

  return (
    <Stack spacing={2}>
      <Toolbar disableGutters sx={{ gap:2, flexWrap:'wrap' }}>
  <Select size="small" value={filterGroup} onChange={(e: any)=>setFilterGroup(e.target.value as any)}>
          <MenuItem value="ALL">{t('playersPage.filterAll')}</MenuItem>
          {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </Select>
        <TextField size="small" placeholder={t('playersPage.searchPlaceholder')} value={search} onChange={e=>setSearch(e.target.value)} />
        <Button variant="outlined" onClick={openManageGroups}>{t('playersPage.manageGroups')}</Button>
      </Toolbar>

      {importMode === 'match' ? (
        <Paper variant="outlined" sx={{ p:2 }}>
          <Typography variant="h6" gutterBottom>{t('playersPage.matchModeTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>{t('playersPage.matchModeSubtitle')}</Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb:1 }}>
            <Checkbox size="small" checked={showDeclined} onChange={(e: any)=>setShowDeclined(e.target.checked)} />
            <Typography variant="body2">{t('playersPage.matchShowDeclinedLabel')}</Typography>
          </Stack>
          <Stack spacing={1}>
            {filteredPlayers
              .filter((p: Player) => {
                if (importMode !== 'match') return true;
                if (!showDeclined) {
                  const statusObj = matchImport?.players.find((mp:any)=> mp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
                  return statusObj?.status === 'attending';
                }
                return true;
              })
              .map((p: Player) => {
              const statusObj = matchImport?.players.find((mp:any)=> mp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
              const status = statusObj?.status;
              const statusColor = status === 'attending' ? 'success' : 'default';
              return (
                <Paper key={p.id} variant="outlined" sx={{ p:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2">{p.name}</Typography>
                    {status && (
                      <Chip
                        size="small"
                        color={statusColor as any}
                        label={( () => {
                          const key = `playersPage.matchStatus.${status}`;
                          const translated = t(key);
                          return translated === key ? (status === 'attending' ? t('playersPage.matchStatus.attending') : t('playersPage.matchStatus.declined')) : translated;
                        })()}
                        sx={{ mt:0.5 }}
                      />
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Select size="small" value={p.groupId || ''} displayEmpty onChange={e => {
                      if (p.id.startsWith('temp-')) {
                        // ephemeral player: assign in matchImport only
                        const original = matchImport?.players.find((mp:any)=> mp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
                        if (original) setMatchPlayerGroup(original.id, e.target.value || null);
                      } else {
                        // roster player: assign both roster & matchImport copy
                        assignGroup(p.id, e.target.value || null);
                        const original = matchImport?.players.find((mp:any)=> mp.name.trim().toLowerCase() === p.name.trim().toLowerCase());
                        if (original) setMatchPlayerGroup(original.id, e.target.value || null);
                      }
                    }} disabled={false}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                    </Select>
                    {!p.id.startsWith('temp-') && (
                      <IconButton size="small" color="error" onClick={()=>{ if (confirm(t('playersPage.removeConfirm', { name: p.name }))) removePlayer(p.id); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Paper>
              );
            })}
            {filteredPlayers.length === 0 && <Typography variant="body2" color="text.secondary">{t('playersPage.noPlayers')}</Typography>}
          </Stack>
        </Paper>
      ) : (
        <>
          {!isMobile && (
            <Paper sx={{ width: '100%', overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2} sx={{ fontWeight:'bold' }}>{t('playersPage.table.name')}</TableCell>
                    <TableCell rowSpan={2} sx={{ fontWeight:'bold' }}>{t('playersPage.table.group')}</TableCell>
                    <TableCell align="center" colSpan={4} sx={{ backgroundColor: trainingHeaderBg, fontWeight:'bold', borderLeft: '2px solid', borderColor: trainingHeaderBg }}>{t('playersPage.table.trainingsGroup')}</TableCell>
                    <TableCell align="center" colSpan={4} sx={{ backgroundColor: matchHeaderBg, fontWeight:'bold', borderLeft: '2px solid', borderColor: matchHeaderBg }}>{t('playersPage.table.matchesGroup')}</TableCell>
                    <TableCell rowSpan={2} align="right" sx={{ fontWeight:'bold' }}>{t('playersPage.table.actions')}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="right" sx={{ backgroundColor: trainingHeaderBg }}>{t('playersPage.table.invited')}</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: trainingHeaderBg }}>{t('playersPage.table.attended')}</TableCell>
                    {!isMobile && <TableCell align="right" sx={{ backgroundColor: trainingHeaderBg }}>{t('playersPage.table.absent')}</TableCell>}
                    {!isMobile && <TableCell align="right" sx={{ backgroundColor: trainingHeaderBg }}>{t('playersPage.table.attendancePct')}</TableCell>}
                    <TableCell align="right" sx={{ backgroundColor: matchHeaderBg }}>{t('playersPage.table.invited')}</TableCell>
                    <TableCell align="right" sx={{ backgroundColor: matchHeaderBg }}>{t('playersPage.table.attended')}</TableCell>
                    {!isMobile && <TableCell align="right" sx={{ backgroundColor: matchHeaderBg }}>{t('playersPage.table.absent')}</TableCell>}
                    {!isMobile && <TableCell align="right" sx={{ backgroundColor: matchHeaderBg }}>{t('playersPage.table.attendancePct')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlayers.map((p: Player) => {
                    const stats = attendanceByPlayerType[p.id];
                    const trInv = stats?.training.invited || 0;
                    const trAtt = stats?.training.attended || 0;
                    const trAbs = trInv - trAtt;
                    const trPct = trInv ? ((trAtt / trInv) * 100).toFixed(1) : '0.0';
                    const mInv = stats?.match.invited || 0;
                    const mAtt = stats?.match.attended || 0;
                    const mAbs = mInv - mAtt;
                    const mPct = mInv ? ((mAtt / mInv) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          <Select size="small" value={p.groupId || ''} displayEmpty onChange={e => assignGroup(p.id, e.target.value || null)}>
                            <MenuItem value=""><em>None</em></MenuItem>
                            {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                          </Select>
                        </TableCell>
                        <TableCell align="right" sx={{ backgroundColor: trainingCellBg }}>{trInv}</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: trainingCellBg }}>{trAtt}</TableCell>
                        {!isMobile && <TableCell align="right" sx={{ backgroundColor: trainingCellBg }}>{trAbs}</TableCell>}
                        {!isMobile && <TableCell align="right" sx={{ backgroundColor: trainingCellBg }}>{trPct}%</TableCell>}
                        <TableCell align="right" sx={{ backgroundColor: matchCellBg }}>{mInv}</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: matchCellBg }}>{mAtt}</TableCell>
                        {!isMobile && <TableCell align="right" sx={{ backgroundColor: matchCellBg }}>{mAbs}</TableCell>}
                        {!isMobile && <TableCell align="right" sx={{ backgroundColor: matchCellBg }}>{mPct}%</TableCell>}
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={()=>setDetailsPlayerId(p.id)}>{t('playersPage.details')}</Button>
                            <IconButton size="small" color="error" onClick={()=>{ if (confirm(t('playersPage.removeConfirm', { name: p.name }))) removePlayer(p.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPlayers.length === 0 && (
                    <TableRow><TableCell colSpan={11}><Typography variant="body2" color="text.secondary">{t('playersPage.noPlayers')}</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          )}
          {isMobile && (
            <Stack spacing={1}>
              {filteredPlayers.map((p: Player) => {
                const stats = attendanceByPlayerType[p.id];
                const trInv = stats?.training.invited || 0; const trAtt = stats?.training.attended || 0; const trPct = trInv ? ((trAtt / trInv) * 100).toFixed(1) : '0.0';
                const mInv = stats?.match.invited || 0; const mAtt = stats?.match.attended || 0; const mPct = mInv ? ((mAtt / mInv) * 100).toFixed(1) : '0.0';
                return (
                  <Paper key={p.id} variant="outlined" sx={{ p:1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Box>
                        <Typography variant="subtitle2" noWrap>{p.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt:0.5, flexWrap:'wrap' }}>
                          <Chip size="small" label={`${t('playersPage.table.trainingsGroup')}: ${trInv}/${trAtt} (${trPct}%)`} sx={{ backgroundColor: trainingCellBg }} />
                          <Chip size="small" label={`${t('playersPage.table.matchesGroup')}: ${mInv}/${mAtt} (${mPct}%)`} sx={{ backgroundColor: matchCellBg }} />
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Select size="small" value={p.groupId || ''} displayEmpty onChange={e => assignGroup(p.id, e.target.value || null)}>
                          <MenuItem value=""><em>—</em></MenuItem>
                          {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                        </Select>
                        <Button size="small" onClick={()=>setDetailsPlayerId(p.id)}>{t('playersPage.details')}</Button>
                        <IconButton size="small" color="error" onClick={()=>{ if (confirm(t('playersPage.removeConfirm', { name: p.name }))) removePlayer(p.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
              {filteredPlayers.length === 0 && <Typography variant="body2" color="text.secondary">{t('playersPage.noPlayers')}</Typography>}
            </Stack>
          )}
        </>
      )}

      <Dialog open={groupDialogOpen} onClose={closeManageGroups} fullWidth maxWidth="sm">
        <DialogTitle>{t('playersPage.groupsDialog.title')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField label={editingGroupId ? t('playersPage.groupsDialog.renameGroup') : t('playersPage.groupsDialog.newGroup')} size="small" fullWidth value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              {editingGroupId ? (
                <Button onClick={saveRename} variant="contained">{t('playersPage.groupsDialog.save')}</Button>
              ) : (
                <Button onClick={handleAddGroup} variant="contained">{t('playersPage.groupsDialog.add')}</Button>
              )}
              {editingGroupId && <Button onClick={()=>{ setEditingGroupId(null); setNewGroupName(''); }}>{t('playersPage.groupsDialog.cancel')}</Button>}
            </Stack>
            <Box>
              {groups.map((g:any) => (
                <Stack key={g.id} direction="row" alignItems="center" spacing={1} sx={{ mb:1 }}>
                  <Box sx={{ flexGrow:1 }}>{g.name}</Box>
                  <Button size="small" onClick={() => handleRenameGroup(g.id, g.name)}>{t('playersPage.groupsDialog.renameGroup')}</Button>
                  <IconButton size="small" onClick={() => removeGroup(g.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
              {groups.length === 0 && <Typography variant="body2" color="text.secondary">{t('playersPage.groupsDialog.noneYet')}</Typography>}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManageGroups}>{t('playersPage.playerDetails.close')}</Button>
        </DialogActions>
      </Dialog>

      {importMode !== 'match' && (
        <PlayerDetailsDialog
          open={!!detailsPlayerId}
          onClose={() => setDetailsPlayerId(null)}
          playerId={detailsPlayerId}
          players={players}
          events={events}
          attendance={attendance}
        />
      )}
    </Stack>
  );
}

interface PlayerDetailsDialogProps { open: boolean; onClose: () => void; playerId: string | null; players: Player[]; events: Event[]; attendance: AttendanceRecord[]; }
function PlayerDetailsDialog({ open, onClose, playerId, players, events, attendance }: PlayerDetailsDialogProps) {
  const { t } = useTranslation();
  const [trainingFilter, setTrainingFilter] = useState<'all'|'attended'|'absent'>('all');
  const [matchFilter, setMatchFilter] = useState<'all'|'attended'|'absent'>('all');
  const player = players.find(p => p.id === playerId) || null;
  const eventById: Record<string, Event> = useMemo(() => Object.fromEntries(events.map(e => [e.id, e])), [events]);
  const playerAttendance = useMemo(() => attendance.filter(a => a.playerId === playerId), [attendance, playerId]);
  const invitedEvents = playerAttendance.filter(a => a.status === 'attended' || a.status === 'absent').map(a => eventById[a.eventId]).filter((e): e is Event => !!e);
  const attendedEvents = playerAttendance.filter(a => a.status === 'attended').map(a => eventById[a.eventId]).filter((e): e is Event => !!e);
  const absentEvents = playerAttendance.filter(a => a.status === 'absent').map(a => eventById[a.eventId]).filter((e): e is Event => !!e);
  const invitedCount = invitedEvents.length;
  const attendedCount = attendedEvents.length;
  const absentCount = absentEvents.length;
  const attendancePct = invitedCount ? ((attendedCount / invitedCount) * 100).toFixed(1) : '0.0';
  const trainingsSorted = [...invitedEvents.filter(e => e.type==='training')].sort((a,b)=> (a.date||'').localeCompare(b.date||''));
  const matchesSorted = [...invitedEvents.filter(e => e.type==='match')].sort((a,b)=> (a.date||'').localeCompare(b.date||''));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('playersPage.playerDetails.title')}{player ? ` – ${player.name}` : ''}</DialogTitle>
      <DialogContent dividers>
        {!player && <Typography variant="body2" color="text.secondary">No player selected.</Typography>}
        {player && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1">{t('playersPage.playerDetails.summary')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('playersPage.playerDetails.invited')}: {invitedCount} | {t('playersPage.playerDetails.attended')}: {attendedCount} | {t('playersPage.playerDetails.absent')}: {absentCount} | {t('playersPage.playerDetails.attendance')}: {attendancePct}%</Typography>
            </Box>
            <Stack direction={{ xs:'column', md:'row' }} spacing={3}>
              <Box flex={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:1 }}>
                  <Typography variant="subtitle1">{t('playersPage.playerDetails.trainingsAttended')} ({trainingsSorted.length})</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={t('playersPage.playerDetails.filterAll')} color={trainingFilter==='all'?'primary':'default'} onClick={()=>setTrainingFilter('all')} />
                    <Chip size="small" label={t('playersPage.playerDetails.filterAttended')} color={trainingFilter==='attended'?'primary':'default'} onClick={()=>setTrainingFilter('attended')} />
                    <Chip size="small" label={t('playersPage.playerDetails.filterAbsent')} color={trainingFilter==='absent'?'primary':'default'} onClick={()=>setTrainingFilter('absent')} />
                  </Stack>
                </Stack>
                <List dense sx={{ maxHeight:420, overflow:'auto', border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                  {trainingsSorted.filter(ev => {
                    const rec = playerAttendance.find(a => a.eventId===ev.id);
                    const status = rec?.status === 'attended' ? 'attended' : rec?.status === 'absent' ? 'absent' : 'unknown';
                    if (trainingFilter==='all') return true;
                    if (trainingFilter==='attended') return status==='attended';
                    if (trainingFilter==='absent') return status==='absent';
                    return true;
                  }).map(ev => {
                    const rec = playerAttendance.find(a => a.eventId===ev.id);
                    const status = rec?.status === 'attended' ? 'attended' : rec?.status === 'absent' ? 'absent' : 'unknown';
                    return (
                      <ListItem key={ev.id}>
                        <ListItemText primary={ev.name} secondary={ev.date ? ev.date.split('T')[0] : ''} />
                        <Box sx={{ ml:2 }}>
                          {status==='attended' && <Chip size="small" color="success" label={t('playersPage.playerDetails.attended')} />}
                          {status==='absent' && <Chip size="small" color="error" label={t('playersPage.playerDetails.absent')} />}
                          {status==='unknown' && <Chip size="small" variant="outlined" label="?" />}
                        </Box>
                      </ListItem>
                    );
                  })}
                  {trainingsSorted.length===0 && <ListItem><ListItemText primary={t('playersPage.playerDetails.noTrainings')} /></ListItem>}
                </List>
              </Box>
              <Box flex={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb:1 }}>
                  <Typography variant="subtitle1">{t('playersPage.playerDetails.matchesAttended')} ({matchesSorted.length})</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={t('playersPage.playerDetails.filterAll')} color={matchFilter==='all'?'primary':'default'} onClick={()=>setMatchFilter('all')} />
                    <Chip size="small" label={t('playersPage.playerDetails.filterAttended')} color={matchFilter==='attended'?'primary':'default'} onClick={()=>setMatchFilter('attended')} />
                    <Chip size="small" label={t('playersPage.playerDetails.filterAbsent')} color={matchFilter==='absent'?'primary':'default'} onClick={()=>setMatchFilter('absent')} />
                  </Stack>
                </Stack>
                <List dense sx={{ maxHeight:420, overflow:'auto', border:'1px solid', borderColor:'divider', borderRadius:1 }}>
                  {matchesSorted.filter(ev => {
                    const rec = playerAttendance.find(a => a.eventId===ev.id);
                    const status = rec?.status === 'attended' ? 'attended' : rec?.status === 'absent' ? 'absent' : 'unknown';
                    if (matchFilter==='all') return true;
                    if (matchFilter==='attended') return status==='attended';
                    if (matchFilter==='absent') return status==='absent';
                    return true;
                  }).map(ev => {
                    const rec = playerAttendance.find(a => a.eventId===ev.id);
                    const status = rec?.status === 'attended' ? 'attended' : rec?.status === 'absent' ? 'absent' : 'unknown';
                    return (
                      <ListItem key={ev.id}>
                        <ListItemText primary={ev.name} secondary={ev.date ? ev.date.split('T')[0] : ''} />
                        <Box sx={{ ml:2 }}>
                          {status==='attended' && <Chip size="small" color="success" label={t('playersPage.playerDetails.attended')} />}
                          {status==='absent' && <Chip size="small" color="error" label={t('playersPage.playerDetails.absent')} />}
                          {status==='unknown' && <Chip size="small" variant="outlined" label="?" />}
                        </Box>
                      </ListItem>
                    );
                  })}
                  {matchesSorted.length===0 && <ListItem><ListItemText primary={t('playersPage.playerDetails.noMatches')} /></ListItem>}
                </List>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('playersPage.playerDetails.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
