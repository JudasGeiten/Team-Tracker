import { useState, useMemo } from 'react';
import { usePlayersStore } from '../state/usePlayersStore';
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Toolbar, List, ListItem, ListItemText, TextField, Select, MenuItem } from '@mui/material';
import { Player, Event, AttendanceRecord } from '../types/domain';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

export default function PlayersPage() {
  const { players, groups, events, attendance, removePlayer, addGroup, removeGroup, renameGroup, assignGroup } = usePlayersStore() as any;
  const [search, setSearch] = useState('');
  const [detailsPlayerId, setDetailsPlayerId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | 'ALL'>('ALL');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter((p: any) => {
      if (filterGroup !== 'ALL' && p.groupId !== filterGroup) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, filterGroup, search]);

  function openManageGroups() { setGroupDialogOpen(true); }
  function closeManageGroups() { setGroupDialogOpen(false); setEditingGroupId(null); setNewGroupName(''); }
  function handleAddGroup() { if (!newGroupName.trim()) return; addGroup(newGroupName.trim()); setNewGroupName(''); }
  function handleRenameGroup(id: string, current: string) { setEditingGroupId(id); setNewGroupName(current); }
  function saveRename() { if (editingGroupId && newGroupName.trim()) { renameGroup(editingGroupId, newGroupName.trim()); setEditingGroupId(null); setNewGroupName(''); } }

  return (
    <Stack spacing={2}>
      <Toolbar disableGutters sx={{ gap:2, flexWrap:'wrap' }}>
        <Select size="small" value={filterGroup} onChange={e=>setFilterGroup(e.target.value as any)}>
          <MenuItem value="ALL">All Groups</MenuItem>
          {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </Select>
        <TextField size="small" placeholder="Search players" value={search} onChange={e=>setSearch(e.target.value)} />
        <Button variant="outlined" onClick={openManageGroups}>Manage Groups</Button>
      </Toolbar>
      <Paper sx={{ width: '100%', overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Group</TableCell>
              <TableCell align="right">Invited</TableCell>
              <TableCell align="right">Attended</TableCell>
              <TableCell align="right">Absent</TableCell>
              <TableCell align="right">Attendance %</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map((p: Player) => {
              const invited = p.invitedTotal || 0;
              const attended = p.attendedTotal || 0;
              const absent = invited - attended;
              const pct = invited ? ((attended / invited) * 100).toFixed(1) : '0.0';
              return (
                <TableRow key={p.id} hover>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>
                    <Select size="small" value={p.groupId || ''} displayEmpty onChange={e => assignGroup(p.id, e.target.value || null)}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {groups.map((g:any)=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell align="right">{invited}</TableCell>
                  <TableCell align="right">{attended}</TableCell>
                  <TableCell align="right">{absent}</TableCell>
                  <TableCell align="right">{pct}%</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={()=>setDetailsPlayerId(p.id)}>Details</Button>
                        <IconButton size="small" color="error" onClick={()=>{
                          if (confirm(`Remove player ${p.name}? This cannot be undone.`)) removePlayer(p.id);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                </TableRow>
              );
            })}
            {filteredPlayers.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="body2" color="text.secondary">No players</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      

      {/* Group Management Dialog */}
      <Dialog open={groupDialogOpen} onClose={closeManageGroups} fullWidth maxWidth="sm">
        <DialogTitle>Groups</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField label={editingGroupId ? 'Rename group' : 'New group'} size="small" fullWidth value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              {editingGroupId ? (
                <Button onClick={saveRename} variant="contained">Save</Button>
              ) : (
                <Button onClick={handleAddGroup} variant="contained">Add</Button>
              )}
              {editingGroupId && <Button onClick={()=>{ setEditingGroupId(null); setNewGroupName(''); }}>Cancel</Button>}
            </Stack>
            <Box>
              {groups.map((g:any) => (
                <Stack key={g.id} direction="row" alignItems="center" spacing={1} sx={{ mb:1 }}>
                  <Box sx={{ flexGrow:1 }}>{g.name}</Box>
                  <Button size="small" onClick={() => handleRenameGroup(g.id, g.name)}>Rename</Button>
                  <IconButton size="small" onClick={() => removeGroup(g.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
              {groups.length === 0 && <Typography variant="body2" color="text.secondary">No groups yet.</Typography>}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManageGroups}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Player Details Modal */}
      <PlayerDetailsDialog
        open={!!detailsPlayerId}
        onClose={() => setDetailsPlayerId(null)}
        playerId={detailsPlayerId}
        players={players}
        events={events}
        attendance={attendance}
      />
    </Stack>
  );
}

// hierarchy helpers removed

interface PlayerDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  playerId: string | null;
  players: Player[];
  events: Event[];
  attendance: AttendanceRecord[];
}

function PlayerDetailsDialog({ open, onClose, playerId, players, events, attendance }: PlayerDetailsDialogProps) {
  const player = players.find((p: Player) => p.id === playerId) || null;
  const eventById: Record<string, Event> = useMemo(() => Object.fromEntries(events.map((e: Event) => [e.id, e])), [events]);
  const playerAttendance = useMemo(() => attendance.filter((a: AttendanceRecord) => a.playerId === playerId), [attendance, playerId]);
  const invitedEvents = playerAttendance
    .filter((a: AttendanceRecord) => a.status === 'attended' || a.status === 'absent')
    .map((a: AttendanceRecord) => eventById[a.eventId])
    .filter((e: Event | undefined): e is Event => !!e);
  const attendedEvents = playerAttendance
    .filter((a: AttendanceRecord) => a.status === 'attended')
    .map((a: AttendanceRecord) => eventById[a.eventId])
    .filter((e: Event | undefined): e is Event => !!e);
  const absentEvents = playerAttendance
    .filter((a: AttendanceRecord) => a.status === 'absent')
    .map((a: AttendanceRecord) => eventById[a.eventId])
    .filter((e: Event | undefined): e is Event => !!e);
  const invitedCount = invitedEvents.length;
  const attendedCount = attendedEvents.length;
  const absentCount = absentEvents.length;
  const attendancePct = invitedCount ? ((attendedCount / invitedCount) * 100).toFixed(1) : '0.0';

  const attendedTrainings = attendedEvents.filter((e: Event) => e.type === 'training');
  const attendedMatches = attendedEvents.filter((e: Event) => e.type === 'match');
  // Sort lists chronologically by date (ISO strings) leaving undated events at the end
  const sortByDate = (list: Event[]) => {
    return [...list].sort((a,b) => {
      if (!a.date && !b.date) return a.name.localeCompare(b.name);
      if (!a.date) return 1; // a without date goes after b
      if (!b.date) return -1; // b without date goes after a
      return a.date.localeCompare(b.date);
    });
  };
  const trainingsSorted = sortByDate(attendedTrainings);
  const matchesSorted = sortByDate(attendedMatches);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Player Details{player ? ` – ${player.name}` : ''}</DialogTitle>
      <DialogContent dividers>
        {!player && <Typography variant="body2" color="text.secondary">No player selected.</Typography>}
        {player && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1">Summary</Typography>
              <Typography variant="body2" color="text.secondary">
                Invited: {invitedCount} | Attended: {attendedCount} | Absent: {absentCount} | Attendance: {attendancePct}%
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box flex={1}>
                <Typography variant="subtitle1">Trainings Attended ({attendedTrainings.length})</Typography>
                <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius:1 }}>
                  {trainingsSorted.map(ev => (
                    <ListItem key={ev.id}>
                      <ListItemText primary={ev.name} secondary={ev.date ? ev.date.split('T')[0] : ''} />
                    </ListItem>
                  ))}
                  {trainingsSorted.length === 0 && <ListItem><ListItemText primary="No trainings attended" /></ListItem>}
                </List>
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle1">Matches Attended ({attendedMatches.length})</Typography>
                <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius:1 }}>
                  {matchesSorted.map(ev => (
                    <ListItem key={ev.id}>
                      <ListItemText primary={ev.name} secondary={ev.date ? ev.date.split('T')[0] : ''} />
                    </ListItem>
                  ))}
                  {matchesSorted.length === 0 && <ListItem><ListItemText primary="No matches attended" /></ListItem>}
                </List>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
