import { create } from 'zustand';
import { Player, Event, AttendanceRecord, Group } from '../types/domain';
import { nanoid } from 'nanoid';

interface PlayersState {
  players: Player[];
  groups: Group[];
  events: Event[];
  attendance: AttendanceRecord[];
  importDebug?: any;
  pendingImportEvents?: Event[];
  discardedEventIds?: string[];
  discardedEvents?: Event[];
  setData: (p: Partial<Pick<PlayersState, 'players' | 'groups' | 'events' | 'attendance' | 'importDebug'>>) => void;
  loadImport: (data: { players: Player[]; events: Event[]; attendance: AttendanceRecord[]; debug?: any }) => void;
  updateEventType: (eventId: string, type: 'training' | 'match') => void;
  discardEvent: (eventId: string) => void;
  removePlayer: (playerId: string) => void;
  assignGroup: (playerId: string, groupId: string | null) => void;
  addGroup: (name: string) => void;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  applyImportClarification: (config: { matchTeams: string[]; discardEventIds: string[] }) => void;
  reclassifyEvent: (eventId: string, newType: 'match' | 'training') => void;
  discardEventById: (eventId: string) => void;
  restoreDiscardedEvent: (eventId: string, type: 'match' | 'training' | 'training') => void;
}

export const usePlayersStore = create<PlayersState>((set) => ({
  players: [],
  groups: [],
  events: [],
  attendance: [],
  importDebug: undefined,
  pendingImportEvents: undefined,
  discardedEventIds: [],
  discardedEvents: [],
  setData: (p) => set(p as any),
  loadImport: ({ players, events, attendance, debug }) => set({ players, events, attendance, importDebug: debug, pendingImportEvents: events }),
  updateEventType: (eventId, type) => set(state => {
    const events = state.events.map(e => e.id === eventId ? { ...e, type, needsTypeConfirmation: false } : e);
    // Recompute derived counts for players (matches/trainingsAttended, invited/attended totals unaffected by type change)
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    state.attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const att = attendedByPlayer[p.id];
      return { ...p, matchesAttended: att?.matchAtt || 0, trainingsAttended: att?.trainingAtt || 0 };
    });
    return { events, players };
  }),
  discardEvent: (eventId) => set(state => {
    const events = state.events.filter(e => e.id !== eventId);
    const attendance = state.attendance.filter(a => a.eventId !== eventId);
    // Recompute invited/attended totals and attended match/training counts since removal changes aggregates
    const attendanceByPlayer = attendance.reduce<Record<string, { invited: number; attended: number }>>((acc, rec) => {
      if (!acc[rec.playerId]) acc[rec.playerId] = { invited: 0, attended: 0 };
      if (rec.status === 'attended' || rec.status === 'absent') acc[rec.playerId].invited++;
      if (rec.status === 'attended') acc[rec.playerId].attended++;
      return acc;
    }, {});
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const agg = attendanceByPlayer[p.id];
      const att = attendedByPlayer[p.id];
      return {
        ...p,
        invitedTotal: agg?.invited || 0,
        attendedTotal: agg?.attended || 0,
        attendedPct: agg && agg.invited ? +((agg.attended / agg.invited) * 100).toFixed(1) : 0,
        matchesAttended: att?.matchAtt || 0,
        trainingsAttended: att?.trainingAtt || 0
      };
    });
    return { events, attendance, players };
  }),
  removePlayer: (playerId) => set(state => {
    const players = state.players.filter(p => p.id !== playerId);
    const attendance = state.attendance.filter(a => a.playerId !== playerId);
    // Recompute invited/attended totals for remaining players (we can reuse existing counts if stored, but safe to recompute)
    const attendanceByPlayer = attendance.reduce<Record<string, { invited: number; attended: number }>>((acc, rec) => {
      if (!acc[rec.playerId]) acc[rec.playerId] = { invited: 0, attended: 0 };
      if (rec.status === 'attended' || rec.status === 'absent') acc[rec.playerId].invited++;
      if (rec.status === 'attended') acc[rec.playerId].attended++;
      return acc;
    }, {});
    const eventById = Object.fromEntries(state.events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const updatedPlayers = players.map(p => {
      const agg = attendanceByPlayer[p.id];
      const attd = attendedByPlayer[p.id];
      return {
        ...p,
        invitedTotal: agg?.invited || 0,
        attendedTotal: agg?.attended || 0,
        attendedPct: agg && agg.invited ? +((agg.attended / agg.invited) * 100).toFixed(1) : 0,
        matchesAttended: attd?.matchAtt || 0,
        trainingsAttended: attd?.trainingAtt || 0
      };
    });
    return { players: updatedPlayers, attendance };
  }),
  assignGroup: (playerId, groupId) => set(state => ({
    players: state.players.map(pl => pl.id === playerId ? { ...pl, groupId } : pl)
  })),
  addGroup: (name) => set(state => ({ groups: [...state.groups, { id: nanoid(), name }] })),
  removeGroup: (groupId) => set(state => ({
    groups: state.groups.filter(g => g.id !== groupId),
    players: state.players.map(p => p.groupId === groupId ? { ...p, groupId: null } : p)
  })),
  renameGroup: (groupId, name) => set(state => ({ groups: state.groups.map(g => g.id === groupId ? { ...g, name } : g) })),
  applyImportClarification: ({ matchTeams, discardEventIds }) => set(state => {
    const baseEvents = state.pendingImportEvents || state.events;
    const matchTeamSet = new Set(matchTeams.map(t => t.toLowerCase()));
    // Determine automatic discards: ambiguous events not training and not matching selected match team tokens
    const autoDiscard: Event[] = [];
    const manualDiscardIds = new Set(discardEventIds);
    const classified: Event[] = [];
    const dashRegex = /\s*[\-–—]\s*/;
    baseEvents.forEach(ev => {
      if (manualDiscardIds.has(ev.id)) return; // manual discard
      if (ev.needsTypeConfirmation) {
        const rawName = ev.name.replace(/\*/g,'').trim();
        const sides = dashRegex.test(rawName) ? rawName.split(dashRegex).map(s => s.trim()).filter(Boolean) : [];
        const normalizedSides = sides.map(s => s.toLowerCase());
        const exactMatch = normalizedSides.some(s => matchTeamSet.has(s));
        if (exactMatch) {
          classified.push({ ...ev, type: 'match', needsTypeConfirmation: false });
        } else if (/trening/i.test(ev.name)) {
          classified.push({ ...ev, type: 'training', needsTypeConfirmation: false });
        } else {
          autoDiscard.push({ ...ev, needsTypeConfirmation: false });
        }
      } else {
        classified.push(ev);
      }
    });
    const discardedEvents = [
      ...autoDiscard,
      ...baseEvents.filter(e => manualDiscardIds.has(e.id))
    ];
    const events: Event[] = classified; // only keep classified (match/training) events
    // Filter attendance to remove discarded events from aggregates
    const discardedIdsSet = new Set(discardedEvents.map(e => e.id));
    const attendance = state.attendance.filter(a => !discardedIdsSet.has(a.eventId));
    const attendanceByPlayer = attendance.reduce<Record<string, { invited: number; attended: number }>>((acc, rec) => {
      if (!acc[rec.playerId]) acc[rec.playerId] = { invited: 0, attended: 0 };
      if (rec.status === 'attended' || rec.status === 'absent') acc[rec.playerId].invited++;
      if (rec.status === 'attended') acc[rec.playerId].attended++;
      return acc;
    }, {});
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const agg = attendanceByPlayer[p.id];
      const att = attendedByPlayer[p.id];
      return {
        ...p,
        invitedTotal: agg?.invited || 0,
        attendedTotal: agg?.attended || 0,
        attendedPct: agg && agg.invited ? +((agg.attended / agg.invited) * 100).toFixed(1) : 0,
        matchesAttended: att?.matchAtt || 0,
        trainingsAttended: att?.trainingAtt || 0
      };
    });
    return { events, attendance, players, pendingImportEvents: undefined, discardedEventIds: Array.from(manualDiscardIds), discardedEvents };
  }),
  reclassifyEvent: (eventId, newType) => set(state => {
    // Move from discarded if present
    let discardedEvents = state.discardedEvents || [];
    let event = state.events.find(e => e.id === eventId) || discardedEvents.find(e => e.id === eventId);
    if (!event) return {} as any;
    // If it was discarded, remove from discarded list and add to events
    const wasDiscarded = discardedEvents.some(e => e.id === eventId);
    if (wasDiscarded) {
      discardedEvents = discardedEvents.filter(e => e.id !== eventId);
      state.events.push({ ...event, type: newType, needsTypeConfirmation: false });
    }
    const events = state.events.map(e => e.id === eventId ? { ...e, type: newType, needsTypeConfirmation: false } : e);
    // Recompute player attended counts
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    state.attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const att = attendedByPlayer[p.id];
      return { ...p, matchesAttended: att?.matchAtt || 0, trainingsAttended: att?.trainingAtt || 0 };
    });
    return { events, players, discardedEvents };
  }),
  discardEventById: (eventId) => set(state => {
    const events = state.events.filter(e => e.id !== eventId);
    const target = state.events.find(e => e.id === eventId);
    const discardedEvents = target ? [...(state.discardedEvents||[]), target] : state.discardedEvents;
    // Remove attendance linked to event
    const attendance = state.attendance.filter(a => a.eventId !== eventId);
    // Recompute players aggregates (similar logic as earlier)
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const att = attendedByPlayer[p.id];
      return { ...p, matchesAttended: att?.matchAtt || 0, trainingsAttended: att?.trainingAtt || 0 };
    });
    return { events, attendance, players, discardedEvents };
  }),
  restoreDiscardedEvent: (eventId, type) => set(state => {
    const discardedEvents = (state.discardedEvents||[]).filter(e => e.id !== eventId);
    const disc = (state.discardedEvents||[]).find(e => e.id === eventId);
    if (!disc) return {} as any;
    const events = [...state.events, { ...disc, type, needsTypeConfirmation: false }];
    // Player aggregates recompute
    const eventById = Object.fromEntries(events.map(e => [e.id, e]));
    const attendedByPlayer: Record<string, { matchAtt: number; trainingAtt: number }> = {};
    state.attendance.forEach(a => {
      if (a.status !== 'attended') return;
      const ev = eventById[a.eventId];
      if (!ev) return;
      if (!attendedByPlayer[a.playerId]) attendedByPlayer[a.playerId] = { matchAtt:0, trainingAtt:0 };
      if (ev.type === 'match') attendedByPlayer[a.playerId].matchAtt++; else attendedByPlayer[a.playerId].trainingAtt++;
    });
    const players = state.players.map(p => {
      const att = attendedByPlayer[p.id];
      return { ...p, matchesAttended: att?.matchAtt || 0, trainingsAttended: att?.trainingAtt || 0 };
    });
    return { events, players, discardedEvents };
  })
  
}));

// group utilities removed
