import { useState, useMemo } from 'react';
import { usePlayersStore } from '../state/usePlayersStore';
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Toolbar } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PlayersPage() {
  const { players, groups, addGroup, removeGroup, renameGroup, assignGroup } = usePlayersStore();
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [parentId, setParentId] = useState<string | ''>('');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      if (filterGroup !== 'ALL' && p.groupId !== filterGroup) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, filterGroup, search]);

  function openManageGroups() { setGroupDialogOpen(true); }
  function closeManageGroups() { setGroupDialogOpen(false); setEditingGroupId(null); setNewGroupName(''); }
  function handleAddGroup() { if (!newGroupName.trim()) return; addGroup(newGroupName.trim(), parentId || null); setNewGroupName(''); setParentId(''); }
  function handleRenameGroup(id: string, current: string) { setEditingGroupId(id); setNewGroupName(current); }
  function saveRename() { if (editingGroupId && newGroupName.trim()) { renameGroup(editingGroupId, newGroupName.trim()); setEditingGroupId(null); setNewGroupName(''); } }

  return (
    <Stack spacing={2}>
      <Toolbar disableGutters sx={{ gap:2 }}>
        <Select size="small" value={filterGroup} onChange={e => setFilterGroup(e.target.value as any)}>
          <MenuItem value="ALL">All Groups</MenuItem>
          {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </Select>
        <TextField size="small" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
        <Button onClick={openManageGroups} variant="outlined">Manage Groups</Button>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.map(p => {
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
                      {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell align="right">{invited}</TableCell>
                  <TableCell align="right">{attended}</TableCell>
                  <TableCell align="right">{absent}</TableCell>
                  <TableCell align="right">{pct}%</TableCell>
                </TableRow>
              );
            })}
            {filteredPlayers.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No players</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={groupDialogOpen} onClose={closeManageGroups} fullWidth maxWidth="sm">
        <DialogTitle>Groups</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField label={editingGroupId ? 'Rename group' : 'New group'} size="small" fullWidth value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              {!editingGroupId && (
                <Select size="small" value={parentId} displayEmpty onChange={e => setParentId(e.target.value as any)} sx={{ minWidth:140 }}>
                  <MenuItem value=""><em>No parent</em></MenuItem>
                  {groups.filter(g=> !editingGroupId || g.id !== editingGroupId).map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                </Select>
              )}
              {editingGroupId ? (
                <Button onClick={saveRename} variant="contained">Save</Button>
              ) : (
                <Button onClick={handleAddGroup} variant="contained">Add</Button>
              )}
            </Stack>
            <Box>
              {groups.map(g => (
                <Stack key={g.id} direction="row" alignItems="center" spacing={1} sx={{ mb:1, pl: hierarchyDepth(g, groups)*1 }}>
                  <Box sx={{ flexGrow:1 }}>{renderGroupPath(g, groups)}</Box>
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
    </Stack>
  );
}

function hierarchyDepth(g:any, groups:any[]): number {
  let d=0; let cur=g; while (cur.parentId){ cur = groups.find(x=>x.id===cur.parentId); if(!cur) break; d++; }
  return d;
}
function renderGroupPath(g:any, groups:any[]): string {
  const parts=[g.name]; let cur=g; while (cur.parentId){ cur = groups.find(x=>x.id===cur.parentId); if(!cur) break; parts.unshift(cur.name); }
  return parts.join(' / ');
}
