import { useMemo, useState, useRef } from 'react';
import { usePlayersStore } from '../../state/usePlayersStore';
import { Paper, Typography, Box, Autocomplete, TextField, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface WeeklyDatum {
  week: string; // label
  weekIndex: number;
  [playerId: string]: any; // dynamic counts per player
}

interface PlayerLineMeta {
  id: string;
  name: string;
  color: string;
}

function getWeekKey(d: Date): { key: string; indexKey: string } {
  // Monday as first day of week
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  const year = date.getUTCFullYear();
  // ISO week number
  const jan4 = new Date(Date.UTC(year,0,4));
  const weekNo = Math.round(((date.getTime() - jan4.getTime())/86400000 + ((jan4.getUTCDay() + 6)%7))/7) + 1;
  const key = `${year}-W${String(weekNo).padStart(2,'0')}`;
  return { key, indexKey: key };
}

function generateColor(i: number): string {
  const palette = [
    '#1976d2','#d32f2f','#2e7d32','#ed6c02','#6a1b9a','#00838f','#5d4037','#c2185b','#455a64','#9e9d24'
  ];
  return palette[i % palette.length];
}

export default function WeeklyPlayerLines() {
  const events = usePlayersStore(s => s.events);
  const attendance = usePlayersStore(s => s.attendance);
  const players = usePlayersStore(s => s.players);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'attended' | 'invited'>('attended');
  const [type, setType] = useState<'match' | 'training'>('match');
  const [viewMode, setViewMode] = useState<'top' | 'bottom' | 'all'>('top');
  const TOP_COUNT = 25;

  const { data, playerMeta, totals } = useMemo(() => {
  const filteredEvents = events.filter(e => e.type === type && e.date);
    if (!filteredEvents.length || !players.length) return { data: [] as WeeklyDatum[], playerMeta: [] as PlayerLineMeta[] };
    // Map eventId -> week
    const eventWeek: Record<string,string> = {};
    filteredEvents.forEach(ev => {
      if (!ev.date) return; const { key } = getWeekKey(new Date(ev.date));
      eventWeek[ev.id] = key;
    });
    // Build week set
    const weekSet = new Set<string>();
    Object.values(eventWeek).forEach(k => weekSet.add(k));
    const weeksSorted = Array.from(weekSet).sort();
    // Initialize structure
    const base: WeeklyDatum[] = weeksSorted.map((w,i) => ({ week: w, weekIndex: i }));
    const byWeek: Record<string, WeeklyDatum> = Object.fromEntries(base.map(r => [r.week, r]));

    // Build attendance mapping
  const isMatch = type === 'match';
  const counts: Record<string, Record<string, number>> = {}; // playerId -> week -> count
    attendance.forEach(a => {
      const evWeek = eventWeek[a.eventId];
      if (!evWeek) return; // not this type
      if (mode === 'attended') {
        if (a.status !== 'attended') return;
      } else {
        // invited = attended or absent (not_invited should not count)
        if (!(a.status === 'attended' || a.status === 'absent')) return;
      }
      if (!counts[a.playerId]) counts[a.playerId] = {};
      counts[a.playerId][evWeek] = (counts[a.playerId][evWeek] || 0) + 1;
    });

    // Populate rows
    players.forEach((p, idx) => {
      weeksSorted.forEach(w => {
        const row = byWeek[w];
        row[p.id] = counts[p.id]?.[w] || 0;
      });
    });

    // totals per player across all weeks
    const totals: Record<string, number> = {};
    players.forEach(p => {
      totals[p.id] = weeksSorted.reduce((sum,w) => sum + (counts[p.id]?.[w] || 0), 0);
    });
    const playerMeta: PlayerLineMeta[] = players.map((p,i) => ({ id: p.id, name: p.name, color: generateColor(i) }));
    return { data: base, playerMeta, totals };
  }, [events, attendance, players, type, mode]);

  if (!data.length) return null;

  let orderedPlayers = [...playerMeta];
  // Guard totals object (empty when no data)
  const safeTotals = totals || {};
  // sort by total descending for top/bottom logic
  orderedPlayers.sort((a,b) => (safeTotals[b.id] || 0) - (safeTotals[a.id] || 0));
  if (viewMode === 'top') {
    orderedPlayers = orderedPlayers.slice(0, TOP_COUNT);
  } else if (viewMode === 'bottom') {
    orderedPlayers = orderedPlayers.slice(-TOP_COUNT);
  }
  const visiblePlayers = selectedPlayerId ? orderedPlayers.filter(m => m.id === selectedPlayerId) : orderedPlayers;

  // Hover side panel state
  const [hoverInfo, setHoverInfo] = useState<{ week: string; rows: { name: string; value: number; color: string }[] } | null>(null);
  const lastLabelRef = useRef<string | null>(null);

  const dynamicHeight = Math.min(600, Math.max(360, visiblePlayers.length * 26));

  return (
    <Paper sx={{ p:2, mb:3 }}>
      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs:'stretch', sm:'center' }} sx={{ mb:2 }}>
        <Typography variant="h6" sx={{ flex:1 }}>
          {type === 'match' ? 'Kamper per uke' : 'Treninger per uke'}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <ToggleButtonGroup size="small" exclusive value={type} onChange={(_, val)=> { if (val) setType(val); }}>
            <ToggleButton value="match">Kamper</ToggleButton>
            <ToggleButton value="training">Treninger</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(_, val)=> { if (val) setViewMode(val); }}>
            <ToggleButton value="top">Topp {TOP_COUNT}</ToggleButton>
            <ToggleButton value="bottom">Bunn {TOP_COUNT}</ToggleButton>
            <ToggleButton value="all">Alle ({playerMeta.length})</ToggleButton>
          </ToggleButtonGroup>
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            value={selectedPlayerId ? playerMeta.find(p => p.id === selectedPlayerId) || null : null}
            onChange={(_, val) => setSelectedPlayerId(val ? val.id : null)}
            options={playerMeta}
            getOptionLabel={(o) => o.name}
            renderInput={(params) => <TextField {...params} label="Spiller" placeholder="Filtrer spiller" />}
            isOptionEqualToValue={(o,v) => o.id === v.id}
            clearOnBlur={false}
          />
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, val)=> { if (val) setMode(val); }}>
            <ToggleButton value="attended">Møtt</ToggleButton>
            <ToggleButton value="invited">Invitert</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      <Box sx={{ width: '100%', display:'flex', gap:2 }}>
        <Box sx={{ flex:1, minWidth:0, height: dynamicHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              onMouseMove={(st: any) => {
                if (st && st.isTooltipActive && st.activeLabel && st.activePayload) {
                  if (lastLabelRef.current === st.activeLabel && hoverInfo) return; // reduce re-renders
                  lastLabelRef.current = st.activeLabel;
                  const rows = st.activePayload
                    .filter((p: any) => selectedPlayerId ? p.dataKey === selectedPlayerId : true)
                    .map((p: any) => ({
                      name: p.name,
                      value: p.value,
                      color: p.color || '#1976d2'
                    }))
                    .sort((a: any, b: any) => b.value - a.value);
                  setHoverInfo({ week: st.activeLabel, rows });
                }
              }}
              onMouseLeave={() => { setHoverInfo(null); lastLabelRef.current = null; }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" angle={-35} textAnchor="end" height={60} interval={0} style={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={40} />
              {/* Hidden tooltip to enable activePayload without overlay */}
              <Tooltip content={<span />} />
              <Legend wrapperStyle={{ fontSize: 12, maxHeight: 60 }} />
              {visiblePlayers.map(m => (
                <Line key={m.id} type="monotone" dataKey={m.id} name={m.name} stroke={m.color} strokeWidth={selectedPlayerId? 3:1.5} dot={false} activeDot={{ r:4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Box sx={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', border:'1px solid', borderColor:'divider', borderRadius:1, p:1, bgcolor:'background.paper', height: dynamicHeight, overflow:'auto' }}>
          <Typography variant="subtitle2" sx={{ mb:1 }}>
            {hoverInfo ? `Uke: ${hoverInfo.week}` : 'Hold musepekeren over en uke'}
          </Typography>
          {hoverInfo && hoverInfo.rows.map(r => (
            <Box key={r.name} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', py:0.5, borderBottom:'1px dashed', borderColor:'divider' }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:0 }}>
                <span style={{ width:10, height:10, background:r.color, display:'inline-block', borderRadius:2 }} />
                <Typography variant="caption" noWrap>{r.name}</Typography>
              </Box>
              <Typography variant="caption" fontWeight={600}>{r.value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt:1, display:'block' }}>
        {selectedPlayerId ? 'Viser valgt spiller' : viewMode === 'all' ? 'Viser alle spillere' : viewMode === 'top' ? `Viser topp ${TOP_COUNT}` : `Viser bunn ${TOP_COUNT}`} · Data: {mode === 'attended' ? 'Antall oppmøtte' : 'Antall inviterte'} per uke
      </Typography>
    </Paper>
  );
}
