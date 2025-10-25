import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayersStore } from '../../state/usePlayersStore';
import { Paper, Typography, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList } from 'recharts';

export type RateUnit = 'week' | 'month' | 'sixMonths' | 'year';

interface RateDatum {
  id: string;
  name: string;
  raw: number; // underlying count (matches attended OR trainings attended)
  value: number; // rate per selected unit (matches) OR percentage (trainings)
  deviation: number; // difference from median
  weeks?: number; // span in weeks (for matches)
  total?: number; // total training invitations (for trainings)
}

function computeMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
}

function getUnitDays(unit: RateUnit): number {
  switch (unit) {
    case 'week': return 7;
    case 'month': return 30.4375;
    case 'sixMonths': return 30.4375 * 6;
    case 'year': return 365;
    default: return 7;
  }
}

export default function UnifiedDeviationChart({ unit }: { unit: RateUnit }) {
  const { t } = useTranslation();
  const events = usePlayersStore(s => s.events);
  const attendance = usePlayersStore(s => s.attendance);
  const players = usePlayersStore(s => s.players);
  const [mode, setMode] = useState<'match' | 'training'>('match');
  const [viewMode, setViewMode] = useState<'top' | 'bottom' | 'all'>('top'); // viewing scope
  const [search, setSearch] = useState(''); // name substring filter
  const TOP_COUNT = 25; // slice size

  const {
    matchData,
    trainingData,
    matchMedian,
    trainingMedian,
    matchWeeks,
    totalMatches,
    totalTrainingsAttended,
    totalTrainingsInvited
  } = useMemo(() => {
    // MATCH DATA
    let matchData: RateDatum[] = [];
    let matchMedian = 0;
    let matchWeeks = 0;
    let totalMatches = 0;
    const matchEvents = events.filter(e => e.type === 'match' && e.date);
    if (matchEvents.length && players.length) {
      const minDate = new Date(Math.min(...matchEvents.map(e => new Date(e.date!).getTime())));
      const maxDate = new Date(Math.max(...matchEvents.map(e => new Date(e.date!).getTime())));
      const diffDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);
      const unitSpan = diffDays / getUnitDays(unit);
      matchWeeks = diffDays / 7;
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
        return { id: p.id, name: p.name, raw: matches, value: +rate.toFixed(2) };
      });
      matchMedian = computeMedian(interim.map(d => d.value));
      matchData = interim.map(d => ({ ...d, deviation: +(d.value - matchMedian).toFixed(2), weeks: matchWeeks }))
        .sort((a,b) => b.value - a.value);
      totalMatches = interim.reduce((s,d) => s + d.raw, 0);
    }

    // TRAINING DATA
    let trainingData: RateDatum[] = [];
    let trainingMedian = 0;
    let totalTrainingsAttended = 0;
    let totalTrainingsInvited = 0;
    const trainingEvents = events.filter(e => e.type === 'training');
    if (trainingEvents.length && players.length) {
      const trainingIds = new Set(trainingEvents.map(e => e.id));
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
      trainingMedian = computeMedian(interim.map(d => d.value));
      trainingData = interim.map(d => ({ ...d, deviation: +(d.value - trainingMedian).toFixed(1) }))
        .sort((a,b) => b.value - a.value);
      totalTrainingsAttended = interim.reduce((sum,d) => sum + d.raw, 0);
      totalTrainingsInvited = interim.reduce((sum,d) => sum + (d.total || 0), 0);
    }

    return {
      matchData,
      trainingData,
      matchMedian,
      trainingMedian,
      matchWeeks,
      totalMatches,
      totalTrainingsAttended,
      totalTrainingsInvited
    };
  }, [events, attendance, players, unit]);

  const isMatch = mode === 'match';
  let workingData = isMatch ? matchData : trainingData;

  // Search filter
  if (search.trim()) {
    const needle = search.toLowerCase();
    workingData = workingData.filter(d => d.name.toLowerCase().includes(needle));
  }

  // Slice to top N unless showAll
  let sliced: typeof workingData;
  if (viewMode === 'all') {
    sliced = workingData;
  } else if (viewMode === 'top') {
    sliced = workingData.slice(0, TOP_COUNT);
  } else { // bottom
    sliced = workingData.slice(-TOP_COUNT);
  }
  const median = computeMedian(sliced.map(d => d.value));
  const data = sliced.map(d => ({ ...d, deviation: +(d.value - median).toFixed(isMatch ? 2 : 1) }));

  if (!workingData.length) {
    // If selected mode has no data but the other does, auto-switch
    if (isMatch && trainingData.length) {
      // Switch to training display
      setMode('training');
    } else if (!isMatch && matchData.length) {
      setMode('match');
    }
    if (!matchData.length && !trainingData.length) return null;
  }

  return (
  <Paper sx={{ p:2, mb:3 }}>
      <Box sx={{ display:'flex', flexDirection:'column', gap:1, mb:2 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Typography variant="h6" sx={{ pr:2 }}>
            {isMatch ? t('reportsPage.matchesMedianTitle') : t('reportsPage.trainingAttendanceTitle')}
          </Typography>
          <ToggleButtonGroup size="small" value={mode} exclusive onChange={(_, val)=> { if (val) setMode(val); }}>
            <ToggleButton value="match">{t('reportsPage.toggle.matches') || 'Kamper'}</ToggleButton>
            <ToggleButton value="training">{t('reportsPage.toggle.trainings') || 'Treninger'}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', alignItems:'center' }}>
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, val)=> { if (val) setViewMode(val); }}>
            <ToggleButton value="top">{t('reportsPage.viewScope.top', { count: TOP_COUNT }) || `Topp ${TOP_COUNT}`}</ToggleButton>
            <ToggleButton value="bottom">{t('reportsPage.viewScope.bottom', { count: TOP_COUNT }) || `Bunn ${TOP_COUNT}`}</ToggleButton>
            <ToggleButton value="all">{t('reportsPage.viewScope.all', { count: workingData.length }) || `Alle (${workingData.length})`}</ToggleButton>
          </ToggleButtonGroup>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('reportsPage.searchPlayersPlaceholder') || 'Søk spiller'}
            style={{
              fontSize:12,
              padding:'4px 8px',
              border:'1px solid rgba(0,0,0,0.23)',
              borderRadius:4,
              minWidth:160
            }}
          />
        </Box>
      </Box>
      <Typography variant="body2" sx={{ mb:1 }}>
        {isMatch ? t('reportsPage.matchesMedianSubtitle', { median }) : t('reportsPage.trainingAttendanceSubtitle', { median })}
      </Typography>
      {isMatch && (
        <Typography variant="caption" sx={{ mb:2, display:'block' }}>{t(`reportsPage.rateUnitLabel.${unit}`)}</Typography>
      )}
  <ResponsiveContainer width="100%" height={viewMode === 'all' ? Math.max(600, data.length * 26) : Math.min(600, Math.max(160, data.length * 26))}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: isMatch ? 40 : 50, left: isMatch ? 140 : 160, bottom: 10 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            domain={isMatch ? [0, 'dataMax'] : [0, 100]}
          />
          <YAxis dataKey="name" type="category" width={isMatch ? 120 : 140} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, name: any) => {
            if (name === 'value') {
              if (isMatch) return [value, t(`reportsPage.rateLabelUnit.${unit}`)];
              return [`${value}%`, t('reportsPage.attendancePctLabel')];
            }
            return [value, name];
          }} />
          <ReferenceLine x={median} stroke="#1976d2" strokeDasharray="3 3" label={{ value: t('reportsPage.medianLabel'), position: 'top', fill: '#1976d2', fontSize: 12 }} />
          <Bar dataKey="value" name={isMatch ? t(`reportsPage.rateLabelUnit.${unit}`) : t('reportsPage.attendancePctLabel')} shape={(props: any) => {
            const { x, y, width, height, payload } = props;
            const dev = payload.deviation;
            let fill = '#1976d2';
            if (isMatch) {
              // match deviation thresholds
              if (dev >= 0.4) fill = '#2e7d32';
              else if (dev >= 0.15) fill = '#00897b';
              else if (dev <= -0.4) fill = '#d84315';
              else if (dev < -0.15) fill = '#ef6c00';
            } else {
              // training deviation thresholds (pct points)
              if (dev >= 8) fill = '#2e7d32';
              else if (dev >= 3) fill = '#00897b';
              else if (dev <= -8) fill = '#d84315';
              else if (dev < -3) fill = '#ef6c00';
            }
            return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
          }}>
            <LabelList dataKey="deviation" position="right" formatter={(v: number) => (v > 0 ? `+${v}` : `${v}`)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" sx={{ display:'block', mt:1 }}>
        {isMatch
          ? `${t('reportsPage.matchesLabel')}: ${totalMatches} · ${t('reportsPage.rangeSpanLabel', { weeks: matchWeeks.toFixed(1) })} · ${t('reportsPage.medianLabel')}: ${median.toFixed(2)} · ${viewMode === 'all' ? (t('reportsPage.viewScope.all') || 'Alle') : viewMode === 'top' ? (t('reportsPage.viewScope.top', { count: TOP_COUNT }) || `Topp ${TOP_COUNT}`) : (t('reportsPage.viewScope.bottom', { count: TOP_COUNT }) || `Bunn ${TOP_COUNT}`)}`
          : `${t('reportsPage.attendedLabel')}: ${totalTrainingsAttended} / ${totalTrainingsInvited} · ${t('reportsPage.medianLabel')}: ${median.toFixed(1)}% · ${viewMode === 'all' ? (t('reportsPage.viewScope.all') || 'Alle') : viewMode === 'top' ? (t('reportsPage.viewScope.top', { count: TOP_COUNT }) || `Topp ${TOP_COUNT}`) : (t('reportsPage.viewScope.bottom', { count: TOP_COUNT }) || `Bunn ${TOP_COUNT}`)}`}
      </Typography>
      {search && (
        <Typography variant="caption" color="text.secondary" sx={{ mt:0.5, display:'block' }}>
          {t('reportsPage.filteredLabel', { count: data.length }) || `Filtrert: ${data.length}`}
        </Typography>
      )}
    </Paper>
  );
}
