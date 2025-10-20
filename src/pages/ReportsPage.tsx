import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../state/usePlayersStore';
import { useMemo, useState } from 'react';
import { Paper, Typography, Box, ToggleButtonGroup, ToggleButton, Tooltip as MuiTooltip } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList } from 'recharts';

interface RateDatum {
  id: string;
  name: string;
  raw: number; // underlying count (matches attended or training attendance %)
  value: number; // rate per week or percentage
  deviation: number; // difference from median
  weeks?: number;
  total?: number; // total trainings invited for attendance percentage context
}

function computeMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
}

type RateUnit = 'week' | 'month' | 'sixMonths' | 'year';

function getUnitDays(unit: RateUnit): number {
  switch (unit) {
    case 'week': return 7;
    case 'month': return 30.4375; // average month
    case 'sixMonths': return 30.4375 * 6; // approx half-year
    case 'year': return 365;
    default: return 7;
  }
}

function MatchesMedianDeviationChart({ unit }: { unit: RateUnit }) {
  const { t } = useTranslation();
  const events = usePlayersStore(s => s.events);
  const attendance = usePlayersStore(s => s.attendance);
  const players = usePlayersStore(s => s.players);

  const data: RateDatum[] = useMemo(() => {
    if (!events.length || !players.length) return [];
    const matchEvents = events.filter(e => e.type === 'match' && e.date);
    if (!matchEvents.length) return [];
    const minDate = new Date(Math.min(...matchEvents.map(e => new Date(e.date!).getTime())));
    const maxDate = new Date(Math.max(...matchEvents.map(e => new Date(e.date!).getTime())));
    const diffDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);
    const unitSpan = diffDays / getUnitDays(unit); // number of selected units in range
    const weeks = diffDays / 7; // keep original weeks for caption context
    const matchIds = new Set(matchEvents.map(e => e.id));
    const attendedMatchesByPlayer: Record<string, number> = {};
    attendance.forEach(a => {
      if (a.status === 'attended' && matchIds.has(a.eventId)) {
        attendedMatchesByPlayer[a.playerId] = (attendedMatchesByPlayer[a.playerId] || 0) + 1;
      }
    });
    const interim = players.map(p => {
      const matches = attendedMatchesByPlayer[p.id] || 0;
      const rate = matches / Math.max(1, unitSpan);
      return { id: p.id, name: p.name, raw: matches, value: +rate.toFixed(2), weeks };
    });
    const median = computeMedian(interim.map(d => d.value));
    return interim.map(d => ({ ...d, deviation: +(d.value - median).toFixed(2) }))
      .sort((a,b) => b.value - a.value);
  }, [events, attendance, players, unit]);

  if (!data.length) return null;
  const median = computeMedian(data.map(d => d.value));
  const totalMatches = data.reduce((sum,d) => sum + d.raw, 0);
  const weeksValue = data[0]?.weeks || 0;

  return (
    <Paper sx={{ p:2, mb:3 }}>
  <Typography variant="h6" gutterBottom>{t('reportsPage.matchesMedianTitle')}</Typography>
  <Typography variant="body2" sx={{ mb:1 }}>{t('reportsPage.matchesMedianSubtitle', { median })}</Typography>
  <Typography variant="caption" sx={{ mb:2, display:'block' }}>{t(`reportsPage.rateUnitLabel.${unit}`)}</Typography>
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 40, left: 140, bottom: 10 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 'dataMax']} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, name: any) => {
            if (name === 'value') return [value, t(`reportsPage.rateLabelUnit.${unit}`)];
            return [value, name];
          }} labelFormatter={(label) => label} />
          <ReferenceLine x={median} stroke="#1976d2" strokeDasharray="3 3" label={{ value: t('reportsPage.medianLabel'), position: 'top', fill: '#1976d2', fontSize: 12 }} />
          <Bar dataKey="value" name={t(`reportsPage.rateLabelUnit.${unit}`)} shape={(props: any) => {
            const { x, y, width, height, payload } = props;
            const dev = payload.deviation;
            // palette logic: high positive -> green, slight positive -> teal, near zero -> blue, slight negative -> amber, strong negative -> deep orange
            let fill = '#1976d2'; // baseline blue
            if (dev >= 0.4) fill = '#2e7d32'; // strong positive
            else if (dev >= 0.15) fill = '#00897b'; // moderate positive (teal)
            else if (dev <= -0.4) fill = '#d84315'; // strong negative
            else if (dev < -0.15) fill = '#ef6c00'; // moderate negative
            return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
          }}>
            <LabelList dataKey="deviation" position="right" formatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" sx={{ display:'block', mt:1 }}>
        {t('reportsPage.matchesLabel')}: {totalMatches} · {t('reportsPage.rangeSpanLabel', { weeks: weeksValue.toFixed(1) })} · {t('reportsPage.medianLabel')}: {median.toFixed(2)}
      </Typography>
    </Paper>
  );
}

function TrainingAttendanceChart() {
  const { t } = useTranslation();
  const events = usePlayersStore(s => s.events);
  const attendance = usePlayersStore(s => s.attendance);
  const players = usePlayersStore(s => s.players);

  const data: RateDatum[] = useMemo(() => {
    if (!events.length || !players.length) return [];
    const trainingEvents = events.filter(e => e.type === 'training');
    if (!trainingEvents.length) return [];
    const trainingIds = new Set(trainingEvents.map(e => e.id));
    // Count invited training occurrences per player (attendance record exists regardless of status?)
    const invitedCounts: Record<string, number> = {};
    const attendedCounts: Record<string, number> = {};
    attendance.forEach(a => {
      if (trainingIds.has(a.eventId)) {
        invitedCounts[a.playerId] = (invitedCounts[a.playerId] || 0) + 1;
        if (a.status === 'attended') {
          attendedCounts[a.playerId] = (attendedCounts[a.playerId] || 0) + 1;
        }
      }
    });
    const interim = players.map(p => {
      const invited = invitedCounts[p.id] || 0;
      const attended = attendedCounts[p.id] || 0;
      const pct = invited ? (attended / invited) * 100 : 0;
      return { id: p.id, name: p.name, raw: attended, value: +pct.toFixed(1), total: invited };
    });
    const median = computeMedian(interim.map(d => d.value));
    return interim.map(d => ({ ...d, deviation: +(d.value - median).toFixed(1) }))
      .sort((a,b) => b.value - a.value);
  }, [events, attendance, players]);

  if (!data.length) return null;
  const median = computeMedian(data.map(d => d.value));
  const totalTrainingsAttended = data.reduce((sum,d) => sum + d.raw, 0);
  const totalTrainingsInvited = data.reduce((sum,d) => sum + (d.total || 0), 0);

  return (
    <Paper sx={{ p:2, mb:3 }}>
      <Typography variant="h6" gutterBottom>{t('reportsPage.trainingAttendanceTitle')}</Typography>
      <Typography variant="body2" sx={{ mb:2 }}>{t('reportsPage.trainingAttendanceSubtitle', { median })}</Typography>
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 50, left: 160, bottom: 10 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, name: any) => {
            if (name === 'value') return [`${value}%`, t('reportsPage.attendancePctLabel')];
            return [value, name];
          }} />
          <ReferenceLine x={median} stroke="#1976d2" strokeDasharray="3 3" label={{ value: t('reportsPage.medianLabel'), position: 'top', fill: '#1976d2', fontSize: 12 }} />
          <Bar dataKey="value" name={t('reportsPage.attendancePctLabel')} shape={(props: any) => {
            const { x, y, width, height, payload } = props;
            const dev = payload.deviation;
            let fill = '#1976d2';
            if (dev >= 8) fill = '#2e7d32'; // big positive attendance gap
            else if (dev >= 3) fill = '#00897b';
            else if (dev <= -8) fill = '#d84315';
            else if (dev < -3) fill = '#ef6c00';
            return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
          }}>
            <LabelList dataKey="deviation" position="right" formatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" sx={{ display:'block', mt:1 }}>
        {t('reportsPage.attendedLabel')}: {totalTrainingsAttended} / {totalTrainingsInvited} · {t('reportsPage.medianLabel')}: {median.toFixed(1)}%
      </Typography>
    </Paper>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const importMode = usePlayersStore(s => s.importMode);
  const [unit, setUnit] = useState<RateUnit>('week');
  return (
    <Box>
      {importMode === 'match' && (
        <Paper sx={{ p: 2, mb: 3, borderColor: 'warning.main' }} variant="outlined">
          <Typography variant="subtitle2" color="warning.main">{t('reportsPage.matchModeWarning') || 'Reports are only available in Season mode. Switch to Season import to view charts.'}</Typography>
        </Paper>
      )}
      <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
        <ToggleButtonGroup size="small" value={unit} exclusive onChange={(_, val) => { if (val) setUnit(val); }}>
          <ToggleButton value="week">{t('reportsPage.unit.week')}</ToggleButton>
          <ToggleButton value="month">{t('reportsPage.unit.month')}</ToggleButton>
          <ToggleButton value="sixMonths">{t('reportsPage.unit.sixMonths')}</ToggleButton>
          <ToggleButton value="year">{t('reportsPage.unit.year')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <MatchesMedianDeviationChart unit={unit} />
      <TrainingAttendanceChart />
      <Typography variant="body2" color="text.secondary" sx={{ mt:2 }}>{t('reportsPage.placeholder')}</Typography>
    </Box>
  );
}
