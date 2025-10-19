import { useState, useMemo } from 'react';
import { usePlayersStore } from '../state/usePlayersStore';
import { useTeamsStore } from '../state/useTeamsStore';
import { generateTeams } from '../lib/team/generateTeams';
import { Box, Paper, Stack, Typography, TextField, Button, Checkbox, Divider, Alert, Grid, IconButton } from '@mui/material';
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
  const { players, groups } = usePlayersStore() as any;
  const { teams, setTeams, waitList } = useTeamsStore();
  const mode: 'mixed' = 'mixed';
  const [teamSize, setTeamSize] = useState(8);
  const [teamCount, setTeamCount] = useState(2);
  const [weighting, setWeighting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eligiblePlayers = players;

  function handleGenerate() {
    setError(null);
    if (!eligiblePlayers.length) { setError('No eligible players.'); return; }
    if (!teamSize || teamSize < 1) { setError('Team size must be >= 1'); return; }
    if (!teamCount || teamCount < 1) { setError('Team count must be >= 1'); return; }
    const result = generateTeams({
      players: players,
      mode: 'mixed',
      weighting,
      target: { teamSize, teamCount }
    });
    setTeams(result.teams, result.waitList);
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Team Generation</Typography>
        <Stack spacing={2}>
          {/* Mode selection removed (groups deprecated) */}

          <Box>
            <Typography variant="subtitle2" gutterBottom>Targets</Typography>
            <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
              <TextField type="number" size="small" label="Team Size" value={teamSize} onChange={e=>setTeamSize(Number(e.target.value))} sx={{ mt:1, width:140 }} />
              <TextField type="number" size="small" label="Team Count" value={teamCount} onChange={e=>setTeamCount(Number(e.target.value))} sx={{ mt:1, width:140 }} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:1 }}>Capacity = size * count. Overflow players go to the wait list.</Typography>
          </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Checkbox checked={weighting} onChange={e=>setWeighting(e.target.checked)} />
              <Typography variant="body2">Fairness weighting (prioritize lower attendance)</Typography>
            </Box>

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
                    // group players by groupId for this team
                    const grouped: Record<string, any[]> = {};
                    team.playerIds.forEach((pid: string) => {
                      const pl = players.find((p: any)=>p.id===pid); if (!pl) return;
                      const key = pl.groupId || '__none';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(pl);
                    });
                    const ordered = Object.entries(grouped).sort((a,b)=> a[0].localeCompare(b[0]));
                    return (
                      <Stack spacing={1}>
                        {ordered.map(([gid, plist]) => {
                          const gName = gid === '__none' ? 'No Group' : (groups.find((g:any)=>g.id===gid)?.name || 'Group');
                          const color = groupColor(gName);
                          return (
                            <Box key={gid} sx={{ background: color, borderRadius:1, px:1, py:0.75 }}>
                              <Typography variant="caption" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', opacity:0.85 }}>{gName}</Typography>
                              <Stack component="ul" sx={{ listStyle:'none', p:0, m:0, mt:0.5 }} spacing={0.25}>
                                {plist.map((pl: any) => (
                                  <li key={pl.id}><Typography variant="body2">{pl.name}</Typography></li>
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
          {waitList.length > 0 && (
            <Box mt={3}>
              <Divider sx={{ mb:1 }}>Wait List ({waitList.length})</Divider>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {waitList.map((pid: string) => {
                  const pl = players.find((p:any)=>p.id===pid); return <Paper key={pid} variant="outlined" sx={{ px:1, py:0.5 }}><Typography variant="body2">{pl?.name || 'Unknown'}</Typography></Paper>;
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
}
