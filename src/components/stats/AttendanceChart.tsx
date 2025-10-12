import { useMemo, useState } from 'react';
import { usePlayersStore } from '../../state/usePlayersStore';
import { Paper, ToggleButtonGroup, ToggleButton, Box, Typography, Stack } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function AttendanceChart() {
  const { players } = usePlayersStore();
  const [mode, setMode] = useState<'abs' | 'pct'>('abs');

  const data = useMemo(() => {
    return players.map(p => ({
      name: p.name,
      matches: p.matchesAttended || 0,
      trainings: p.trainingsAttended || 0,
      matchesPct: p.invitedTotal ? (p.matchesAttended! / p.invitedTotal) * 100 : 0,
      trainingsPct: p.invitedTotal ? (p.trainingsAttended! / p.invitedTotal) * 100 : 0
    }));
  }, [players]);

  const hasData = data.length > 0;
  const rowHeight = 22;
  const chartHeight = Math.max(data.length * rowHeight, 400); // each chart height

  const valueKeyMatches = mode === 'abs' ? 'matches' : 'matchesPct';
  const valueKeyTrainings = mode === 'abs' ? 'trainings' : 'trainingsPct';

  const valueFormatter = (v: any) => mode === 'pct' ? (v as number).toFixed(1) + '%' : v;
  const axisFormatter = (v: any) => mode === 'pct' ? v + '%' : v;

  return (
    <Paper sx={{ p:2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Attendance Overview</Typography>
        <ToggleButtonGroup size="small" value={mode} exclusive onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="abs">Absolute</ToggleButton>
          <ToggleButton value="pct">Percent</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {!hasData && <Typography variant="body2" color="text.secondary">No data. Import a file first.</Typography>}
      {hasData && (
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>Matches {mode === 'pct' ? '(%)' : ''}</Typography>
            <Box sx={{ width:'100%', height: chartHeight, overflowY:'auto', border:'1px solid', borderColor:'divider', borderRadius:1 }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 180 }}>
                  <XAxis type="number" tickFormatter={axisFormatter} />
                  <YAxis type="category" dataKey="name" width={170} interval={0} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any, key) => [valueFormatter(val), key]} />
                  <Legend />
                  {mode === 'abs' ? (
                    <Bar dataKey={valueKeyMatches} fill="#1976d2" name="Matches" />
                  ) : (
                    <Bar dataKey={valueKeyMatches} fill="#1976d2" name="Matches %" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle1" gutterBottom>Trainings {mode === 'pct' ? '(%)' : ''}</Typography>
            <Box sx={{ width:'100%', height: chartHeight, overflowY:'auto', border:'1px solid', borderColor:'divider', borderRadius:1 }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 180 }}>
                  <XAxis type="number" tickFormatter={axisFormatter} />
                  <YAxis type="category" dataKey="name" width={170} interval={0} style={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any, key) => [valueFormatter(val), key]} />
                  <Legend />
                  {mode === 'abs' ? (
                    <Bar dataKey={valueKeyTrainings} fill="#9c27b0" name="Trainings" />
                  ) : (
                    <Bar dataKey={valueKeyTrainings} fill="#9c27b0" name="Trainings %" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
