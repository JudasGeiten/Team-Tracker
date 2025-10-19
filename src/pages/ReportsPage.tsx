import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../state/usePlayersStore';
import { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

interface MatchesWeekDatum {
  id: string;
  name: string;
  matches: number;
  rate: number; // matches per week
  weeks: number; // total weeks in range
}

function MatchesPerWeekChart() {
  const { t } = useTranslation();
  const events = usePlayersStore(s => s.events);
  const attendance = usePlayersStore(s => s.attendance);
  const players = usePlayersStore(s => s.players);

  const data: MatchesWeekDatum[] = useMemo(() => {
    if (!events.length || !players.length) return [];
    const matchEvents = events.filter(e => e.type === 'match');
    const datedMatchEvents = matchEvents.filter(e => e.date);
    if (!datedMatchEvents.length) return [];
    const minDate = new Date(Math.min(...datedMatchEvents.map(e => new Date(e.date!).getTime())));
    const maxDate = new Date(Math.max(...datedMatchEvents.map(e => new Date(e.date!).getTime())));
    const diffDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);
    const weeks = Math.max(1, diffDays / 7);
    const matchIds = new Set(matchEvents.map(e => e.id));
    const attendedMatchesByPlayer: Record<string, number> = {};
    attendance.forEach(a => {
      if (a.status === 'attended' && matchIds.has(a.eventId)) {
        attendedMatchesByPlayer[a.playerId] = (attendedMatchesByPlayer[a.playerId] || 0) + 1;
      }
    });
    return players.map(p => {
      const matches = attendedMatchesByPlayer[p.id] || 0;
      const rate = matches / weeks;
      return { id: p.id, name: p.name, matches, rate: +rate.toFixed(2), weeks: +weeks.toFixed(1) };
    }).sort((a,b) => b.rate - a.rate);
  }, [events, attendance, players]);

  if (!data.length) return null;
  const totalMatches = data.reduce((sum,d) => sum + d.matches, 0);
  const weeksValue = data[0]?.weeks || 0;

  return (
    <Paper sx={{ p:2, mb:3 }}>
      <Typography variant="h6" gutterBottom>{t('reportsPage.matchesPerWeekTitle')}</Typography>
      <Typography variant="body2" sx={{ mb:2 }}>{t('reportsPage.matchesPerWeekSubtitle')}</Typography>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 'dataMax']} />
          <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, name: any) => {
            if (name === 'rate') return [value, t('reportsPage.rateLabel')];
            if (name === 'matches') return [value, t('reportsPage.matchesLabel')];
            return [value, name];
          }} />
          <ReferenceLine x={1} stroke="#2e7d32" strokeDasharray="4 4" label={{ value: '1', position: 'top', fill: '#2e7d32', fontSize: 12 }} />
          <Bar dataKey="rate" name={t('reportsPage.rateLabel')} shape={(props: any) => {
            const { x, y, width, height, payload } = props;
            const color = payload.rate >= 1 ? '#2e7d32' : '#ed6c02';
            return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={color} />;
          }} />
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" sx={{ display:'block', mt:1 }}>
        {t('reportsPage.matchesLabel')}: {totalMatches} · {t('reportsPage.weeksLabel')}: {weeksValue}
      </Typography>
    </Paper>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  return (
    <Box>
      <MatchesPerWeekChart />
      <Typography variant="body2" color="text.secondary" sx={{ mt:2 }}>{t('reportsPage.placeholder')}</Typography>
    </Box>
  );
}
