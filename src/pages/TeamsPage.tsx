import { useState, useMemo } from 'react';
import { usePlayersStore } from '../state/usePlayersStore';
import { useTeamsStore } from '../state/useTeamsStore';
import { generateTeams } from '../lib/team/generateTeams';
import { Box, Paper, Stack, Typography, RadioGroup, FormControlLabel, Radio, Select, MenuItem, TextField, Button, Checkbox, Divider, Alert, Grid, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// Generate a soft pastel color based on a string (group name) for consistent coloring
function groupColor(seed: string): string {
  if (seed === 'No Group') return 'rgba(128,128,128,0.12)';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360; // hue
  const s = 55; // saturation
  const l = 82; // lightness
  return `hsl(${h} ${s}% ${l}%)`;
}

export default function TeamsPage() {
  const { players, groups } = usePlayersStore();
  const { teams, setTeams } = useTeamsStore();
  const [mode, setMode] = useState<'mixed' | 'singleGroup'>('mixed');
  const [groupId, setGroupId] = useState('');
  const [targetType, setTargetType] = useState<'teamSize' | 'teamCount'>('teamSize');
  const [teamSize, setTeamSize] = useState(8);
  const [teamCount, setTeamCount] = useState(2);
  const [weighting, setWeighting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eligiblePlayers = useMemo(() => {
    if (mode === 'singleGroup' && groupId) return players.filter(p => p.groupId === groupId);
    return players;
  }, [players, mode, groupId]);

  function handleGenerate() {
    setError(null);
    if (!eligiblePlayers.length) { setError('No eligible players.'); return; }
    if (targetType === 'teamSize' && (!teamSize || teamSize < 1)) { setError('Team size must be >= 1'); return; }
    if (targetType === 'teamCount' && (!teamCount || teamCount < 2)) { setError('Team count must be >= 2'); return; }
    const teams = generateTeams({
      players: players,
      mode,
      groupId: mode === 'singleGroup' ? groupId || undefined : undefined,
      weighting,
      target: targetType === 'teamSize' ? { teamSize } : { teamCount }
    });
    setTeams(teams);
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Team Generation</Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Mode</Typography>
            <RadioGroup row value={mode} onChange={e => setMode(e.target.value as any)}>
              <FormControlLabel value="mixed" control={<Radio />} label="Mixed (all groups)" />
              <FormControlLabel value="singleGroup" control={<Radio />} label="Single Group" />
            </RadioGroup>
            {mode === 'singleGroup' && (
              <Select size="small" value={groupId} onChange={e=>setGroupId(e.target.value)} displayEmpty sx={{ mt:1, minWidth:200 }}>
                <MenuItem value=""><em>Select group</em></MenuItem>
                {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>Target</Typography>
            <RadioGroup row value={targetType} onChange={e => setTargetType(e.target.value as any)}>
              <FormControlLabel value="teamSize" control={<Radio />} label="Team Size" />
              <FormControlLabel value="teamCount" control={<Radio />} label="Team Count" />
            </RadioGroup>
            {targetType === 'teamSize' ? (
              <TextField type="number" size="small" label="Team Size" value={teamSize} onChange={e=>setTeamSize(Number(e.target.value))} sx={{ mt:1, width:140 }} />
            ) : (
              <TextField type="number" size="small" label="Team Count" value={teamCount} onChange={e=>setTeamCount(Number(e.target.value))} sx={{ mt:1, width:140 }} />
            )}
          </Box>

            <FormControlLabel control={<Checkbox checked={weighting} onChange={e=>setWeighting(e.target.checked)} />} label="Fairness weighting (prioritize lower attendance)" />

          <Box>
            <Button variant="contained" onClick={handleGenerate}>Generate Teams</Button>
            {teams.length > 0 && (
              <IconButton sx={{ ml:1 }} onClick={handleGenerate} title="Regenerate with same settings"><RefreshIcon /></IconButton>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">Eligible players: {eligiblePlayers.length}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>

      {teams.length > 0 && (
        <Paper sx={{ p:2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" gutterBottom>Generated Teams</Typography>
            <Button onClick={handleGenerate} size="small" startIcon={<RefreshIcon />}>Regenerate</Button>
          </Box>
          <Grid container spacing={2}>
            {teams.map(team => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={team.id}>
                <Paper variant="outlined" sx={{ p:1 }}>
                  <Typography variant="subtitle1" gutterBottom>{team.name}</Typography>
                  {(() => {
                    // Build grouping map
                    const groupMap: Record<string, { groupName: string; players: typeof players }> = {};
                    const unknownGroupKey = '__none';
                    team.playerIds.forEach(pid => {
                      const pl = players.find(p=>p.id===pid);
                      if (!pl) return;
                      const gId = pl.groupId || unknownGroupKey;
                      if (!groupMap[gId]) {
                        const gName = pl.groupId ? (groups.find(g=>g.id===pl.groupId)?.name || 'Unknown group') : 'No Group';
                        groupMap[gId] = { groupName: gName, players: [] as any };
                      }
                      groupMap[gId].players.push(pl);
                    });
                    const orderedGroups = Object.values(groupMap).sort((a,b) => a.groupName.localeCompare(b.groupName));
                    return (
                      <Stack spacing={1}>
                        {orderedGroups.map(gr => {
                          const bg = groupColor(gr.groupName);
                          return (
                            <Box key={gr.groupName} sx={{ background: bg, borderRadius: 1, px: 1, py: 0.75 }}>
                              <Typography variant="caption" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', opacity:0.8 }}>{gr.groupName}</Typography>
                              <Stack component="ul" sx={{ listStyle:'none', p:0, mt:0.5, mb:0 }} spacing={0.25}>
                                {gr.players.map(pl => (
                                  <li key={pl.id}>
                                    <Typography variant="body2">{pl.name}</Typography>
                                  </li>
                                ))}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    );
                  })()}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Stack>
  );
}
