import { useMemo, useState } from 'react';
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
      <Box sx={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" angle={-35} textAnchor="end" height={60} interval={0} style={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={40} />
            <Tooltip formatter={(v:any,_n:any,ctx:any)=>[v, players.find(p=>p.id===_n)?.name || _n]} />
            <Legend wrapperStyle={{ fontSize: 12, maxHeight: 60 }} />
            {visiblePlayers.map(m => (
              <Line key={m.id} type="monotone" dataKey={m.id} name={m.name} stroke={m.color} strokeWidth={selectedPlayerId? 3:1.5} dot={false} activeDot={{ r:5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt:1, display:'block' }}>
        {selectedPlayerId ? 'Viser valgt spiller' : viewMode === 'all' ? 'Viser alle spillere' : viewMode === 'top' ? `Viser topp ${TOP_COUNT}` : `Viser bunn ${TOP_COUNT}`} · Data: {mode === 'attended' ? 'Antall oppmøtte' : 'Antall inviterte'} per uke
      </Typography>
    </Paper>
  );
}
