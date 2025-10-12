import { useState, useMemo } from 'react';
import { usePlayersStore } from '../state/usePlayersStore';
import { Box, Stack, Paper, Typography, TextField, Button, Select, MenuItem, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function GroupsPage() {
  const { groups, players, addGroup, removeGroup, renameGroup, updateGroupParent } = usePlayersStore() as any;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | ''>('');
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleGroups = useMemo(() => {
    return groups.filter((g:any) => !filter || g.name.toLowerCase().includes(filter.toLowerCase()));
  }, [groups, filter]);

  function submit() {
    if (!name.trim()) return;
    addGroup(name.trim(), parentId || null);
    setName(''); setParentId('');
  }

  function startEdit(g:any) { setEditingId(g.id); setName(g.name); setParentId(g.parentId || ''); }
  function saveEdit() { if (editingId && name.trim()) { renameGroup(editingId, name.trim()); updateGroupParent(editingId, parentId || null); setEditingId(null); setName(''); setParentId(''); } }

  function renderPath(g:any) {
    const parts=[g.name]; let cur=g; while(cur.parentId){ cur=groups.find((x:any)=>x.id===cur.parentId); if(!cur) break; parts.unshift(cur.name); }
    return parts.join(' / ');
  }

  function groupPlayerCount(groupId:string) {
    return players.filter((p:any)=>p.groupId===groupId).length;
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>{editingId ? 'Edit Group' : 'Add Group'}</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Name" value={name} onChange={e=>setName(e.target.value)} size="small" />
          <Select size="small" value={parentId} displayEmpty onChange={e=>setParentId(e.target.value as any)} sx={{ minWidth:160 }}>
            <MenuItem value=""><em>No parent</em></MenuItem>
            {groups.filter((g:any)=> g.id!==editingId).map((g:any)=> <MenuItem key={g.id} value={g.id}>{renderPath(g)}</MenuItem>)}
          </Select>
          {editingId ? <Button variant="contained" onClick={saveEdit}>Save</Button> : <Button variant="contained" onClick={submit}>Add</Button>}
          {editingId && <Button onClick={()=>{ setEditingId(null); setName(''); setParentId(''); }}>Cancel</Button>}
        </Stack>
      </Paper>

      <Paper sx={{ p:2 }}>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2} alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ flexGrow:1 }}>Groups</Typography>
          <TextField size="small" placeholder="Filter" value={filter} onChange={e=>setFilter(e.target.value)} />
        </Stack>
        <Divider sx={{ mb:2 }} />
        <Stack spacing={1}>
          {visibleGroups.map((g:any) => (
            <Paper key={g.id} variant="outlined" sx={{ p:1, display:'flex', alignItems:'center', gap:1 }}>
              <Box sx={{ flexGrow:1 }}>
                <Typography variant="subtitle2">{renderPath(g)}</Typography>
                <Typography variant="caption" color="text.secondary">Players: {groupPlayerCount(g.id)}</Typography>
              </Box>
              <Button size="small" onClick={()=>startEdit(g)}>Edit</Button>
              <IconButton size="small" onClick={()=>removeGroup(g.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Paper>
          ))}
          {visibleGroups.length === 0 && <Typography variant="body2" color="text.secondary">No groups.</Typography>}
        </Stack>
      </Paper>
    </Stack>
  );
}
