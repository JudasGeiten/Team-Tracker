import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../state/usePlayersStore';
import { useTeamsStore } from '../state/useTeamsStore';
import { generateTeams } from '../lib/team/generateTeams';
import { Box, Paper, Stack, Typography, TextField, Button, Divider, Alert, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
  const { players, groups, importMode, matchImport } = usePlayersStore() as any;
  const { teams, setTeams, waitList, swapPlayers, renameTeam } = useTeamsStore() as any;
  const mode: 'mixed' = 'mixed';
  const [teamSize, setTeamSize] = useState(8);
  const [teamCount, setTeamCount] = useState(2);
  // Fairness weighting temporarily removed
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  // Drag state
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [dragOriginTeamId, setDragOriginTeamId] = useState<string | null>(null);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const { t } = useTranslation();
  
  // Touch drag state
  const [touchDragPlayerId, setTouchDragPlayerId] = useState<string | null>(null);
  const [touchDragOrigin, setTouchDragOrigin] = useState<string | null>(null);

  const eligiblePlayers = useMemo(()=> {
    if (importMode === 'match' && matchImport?.players?.length) {
      const rosterByName: Record<string, any> = Object.fromEntries(players.map((p:any)=> [p.name.trim().toLowerCase(), p]));
      return matchImport.players
        .filter((p:any)=> p.status==='attending')
        .map((mp:any)=> {
          const roster = rosterByName[mp.name.trim().toLowerCase()];
          return {
            id: roster?.id || `temp-${mp.id}`, // ensure unique temp id if not in roster
            name: mp.name,
            groupId: mp.groupId ?? roster?.groupId ?? null,
            attendedTotal: roster?.attendedTotal || 0,
            invitedTotal: roster?.invitedTotal || 0
          };
        });
    }
    return players;
  }, [players, importMode, matchImport]);

  function actuallyGenerate() {
    setError(null);
    if (!eligiblePlayers.length) { setError('No eligible players.'); return; }
    if (!teamSize || teamSize < 1) { setError('Team size must be >= 1'); return; }
    if (!teamCount || teamCount < 1) { setError('Team count must be >= 1'); return; }
    const pool = eligiblePlayers.map((p: any) => ({
      ...p,
      // Provide safe numeric defaults required by generator (attendedTotal used for weighting)
      attendedTotal: p.attendedTotal || 0
    }));
    const result = generateTeams({
      players: pool,
      mode: 'mixed',
  weighting: false,
      target: { teamSize, teamCount }
    });
    setTeams(result.teams, result.waitList);
  }

  function handleGenerate() {
    if (teams.length > 0) {
      setRegenDialogOpen(true);
    } else {
      actuallyGenerate();
    }
  }

  function movePlayer(pid: string, targetTeamId: string | 'wait') {
    if (!pid) return;
    const currentTeams = teams.map((t:any)=> ({ ...t, playerIds: t.playerIds.filter((id:string)=> id !== pid) }));
    let newWait = waitList.filter((id:string)=> id !== pid);
    if (targetTeamId === 'wait') {
      newWait = [...newWait, pid];
    } else {
      const idx = currentTeams.findIndex((t:any)=> t.id === targetTeamId);
      if (idx >= 0) currentTeams[idx].playerIds = [...currentTeams[idx].playerIds, pid];
    }
    setTeams(currentTeams, newWait);
  }

  function onDragStart(e: React.DragEvent, pid: string, originTeamId: string | 'wait') {
    if (!editMode) return;
    setDragPlayerId(pid);
    setDragOriginTeamId(originTeamId === 'wait' ? null : originTeamId);
    e.dataTransfer.setData('text/player-id', pid);
  }
  function onDragEnd() {
    setDragPlayerId(null);
    setDragOriginTeamId(null);
  }

  // Touch handlers for drag and drop
  const handleTouchStartPlayer = (e: React.TouchEvent, pid: string, origin: string | 'wait') => {
    if (!editMode) return;
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
    setTouchDragPlayerId(pid);
    setTouchDragOrigin(origin);
  };

  const handleTouchEndPlayer = (e: React.TouchEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setTouchDragPlayerId(null);
    setTouchDragOrigin(null);
  };

  const handleTouchMovePlayer = (e: React.TouchEvent) => {
    if (!touchDragPlayerId) return;
    // Prevent scrolling while dragging
    e.preventDefault();
  };

  const handleTouchDropTeam = (targetTeamId: string | 'wait') => {
    if (!touchDragPlayerId) return;
    movePlayer(touchDragPlayerId, targetTeamId);
    setTouchDragPlayerId(null);
    setTouchDragOrigin(null);
  };

  return (
    <>
    <Stack spacing={3}>
      <Paper sx={{ p:2 }}>
  <Typography variant="h6" gutterBottom>{t('teamsPage.generationTitle')}</Typography>
        <Stack spacing={2}>
          {/* Mode selection removed (groups deprecated) */}

          <Box>
            <Typography variant="subtitle2" gutterBottom>{t('teamsPage.targets')}</Typography>
            <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
              <TextField type="number" size="small" label={t('teamsPage.teamSize')} value={teamSize} onChange={e=>setTeamSize(Number(e.target.value))} sx={{ mt:1, width:140 }} />
              <TextField type="number" size="small" label={t('teamsPage.teamCount')} value={teamCount} onChange={e=>setTeamCount(Number(e.target.value))} sx={{ mt:1, width:140 }} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:1 }}>{t('teamsPage.capacityHint')}</Typography>
          </Box>

            {/* Fairness weighting removed */}

          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Button variant="contained" onClick={handleGenerate}>
              {teams.length === 0 ? t('teamsPage.generateBtn') : t('teamsPage.regenerate')}
            </Button>
            {teams.length > 0 && (
              <Button size="small" variant={editMode ? 'contained':'outlined'} onClick={()=> setEditMode(m=>!m)}>
                {editMode ? 'Avslutt redigering' : 'Rediger lag'}
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">{t('teamsPage.eligible')}: {eligiblePlayers.length}{importMode==='match' ? ` (match mode)` : ''}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>

      {teams.length > 0 && (
        <Paper sx={{ p:2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" gutterBottom>{t('teamsPage.generatedTitle')}</Typography>
            <Button onClick={handleGenerate} size="small">{t('teamsPage.regenerate')}</Button>
          </Box>
          <Grid container spacing={2}>
            {teams.map((team: { id: string; name: string; playerIds: string[] }) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={team.id}>
                <Paper
                  variant="outlined"
                  data-team-drop-zone={team.id}
                  sx={{ p:1, borderColor: dragPlayerId && dragOriginTeamId !== team.id ? 'primary.light' : undefined }}
                  onDragOver={(e)=> { if (dragPlayerId && editMode) e.preventDefault(); }}
                  onDrop={(e)=> { const pid = e.dataTransfer.getData('text/player-id'); if (pid) movePlayer(pid, team.id); }}
                  onTouchEnd={(e)=> {
                    if (touchDragPlayerId && editMode) {
                      handleTouchDropTeam(team.id);
                    }
                  }}
                >
                  {editMode ? (
                    <TextField
                      variant="standard"
                      value={team.name}
                      onChange={e => renameTeam(team.id, e.target.value)}
                      onBlur={e => renameTeam(team.id, e.target.value.trim() || team.name)}
                      inputProps={{ 'aria-label': 'team name', style:{ fontSize:'0.95rem', fontWeight:600 } }}
                      sx={{ mb:1, width:'100%' }}
                    />
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight:600 }}>{team.name} ({team.playerIds.length})</Typography>
                      {team.playerIds.length > teamSize && (
                        <Tooltip title={`Team exceeds requested size (${teamSize}).`}>
                          <WarningAmberIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                  {(() => {
                    // group players by groupId for this team
                    const grouped: Record<string, any[]> = {};
                    team.playerIds.forEach((pid: string) => {
                      const pl = eligiblePlayers.find((p: any)=>p.id===pid) || players.find((p: any)=>p.id===pid); if (!pl) return;
                      const key = pl.groupId || '__none';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(pl);
                    });
                    const ordered = Object.entries(grouped).sort((a,b)=> a[0].localeCompare(b[0]));
                    return (
                      <Stack spacing={1}>
                        {ordered.map(([gid, plist]: [string, any[]]) => {
                          const gName = gid === '__none' ? 'No Group' : (groups.find((g:any)=>g.id===gid)?.name || 'Group');
                          const color = groupColor(gName);
                          return (
                            <Box key={gid} sx={{ background: color, borderRadius:1, px:1, py:0.75 }}>
                              <Typography variant="caption" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', opacity:0.85 }}>{gName}</Typography>
                              <Stack component="ul" sx={{ listStyle:'none', p:0, m:0, mt:0.5 }} spacing={0.25}>
                                {plist.map((pl: any) => {
                                  return (
                                    <li key={pl.id}>
                                      <Box
                                        draggable={editMode}
                                        onDragStart={(e)=> onDragStart(e, pl.id, team.id)}
                                        onDragEnd={onDragEnd}
                                        onTouchStart={(e)=> handleTouchStartPlayer(e, pl.id, team.id)}
                                        onTouchEnd={handleTouchEndPlayer}
                                        onTouchMove={handleTouchMovePlayer}
                                        sx={{
                                          cursor: editMode ? 'grab':'default',
                                          px:0.5,
                                          py:0.25,
                                          borderRadius:0.5,
                                          transition:'background .25s',
                                          background: (dragPlayerId === pl.id || touchDragPlayerId === pl.id) ? 'rgba(25,87,144,0.25)' : 'transparent'
                                        }}
                                      >
                                        <Typography variant="body2" component="span">{pl.name}</Typography>
                                      </Box>
                                    </li>
                                  );
                                })}
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
            <Box mt={3}
              data-team-drop-zone="wait"
              onDragOver={(e)=> { if (dragPlayerId && editMode) e.preventDefault(); }}
              onDrop={(e)=> { const pid = e.dataTransfer.getData('text/player-id'); if (pid) movePlayer(pid,'wait'); }}
              onTouchEnd={(e)=> {
                if (touchDragPlayerId && editMode) {
                  handleTouchDropTeam('wait');
                }
              }}
            >
              <Divider sx={{ mb:1 }}>{t('teamsPage.waitList')} ({waitList.length})</Divider>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {waitList.map((pid: string) => {
                  const pl = eligiblePlayers.find((p:any)=>p.id===pid) || players.find((p:any)=>p.id===pid);
                  if (!pl) return null;
                  return (
                    <Paper
                      key={pid}
                      draggable={editMode}
                      onDragStart={(e)=> onDragStart(e, pid, 'wait')}
                      onDragEnd={onDragEnd}
                      onTouchStart={(e)=> handleTouchStartPlayer(e, pid, 'wait')}
                      onTouchEnd={handleTouchEndPlayer}
                      onTouchMove={handleTouchMovePlayer}
                      variant="outlined"
                      sx={{ px:1, py:0.5, cursor: editMode ? 'grab':'default',
                        background: (dragPlayerId === pid || touchDragPlayerId === pid) ? 'rgba(25,87,144,0.25)' : 'transparent',
                        transition:'background .25s'
                      }}
                    >
                      <Typography variant="body2">{pl.name}</Typography>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
    <Dialog open={regenDialogOpen} onClose={()=>setRegenDialogOpen(false)}>
      <DialogTitle>{t('teamsPage.confirmTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{t('teamsPage.confirmBody')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={()=>setRegenDialogOpen(false)}>{t('teamsPage.confirmCancel')}</Button>
        <Button variant="contained" color="warning" onClick={()=>{ setRegenDialogOpen(false); actuallyGenerate(); }}>{t('teamsPage.confirmOk')}</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
