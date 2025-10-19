import { create } from 'zustand';
import { Player, Event, AttendanceRecord, Group } from '../types/domain';
import { nanoid } from 'nanoid';

interface PlayersState {
  players: Player[];
  groups: Group[];
  events: Event[];
  attendance: AttendanceRecord[];
  importDebug?: any;
  setData: (p: Partial<Pick<PlayersState, 'players' | 'groups' | 'events' | 'attendance' | 'importDebug'>>) => void;
  loadImport: (data: { players: Player[]; events: Event[]; attendance: AttendanceRecord[]; debug?: any }) => void;
  updateEventType: (eventId: string, type: 'training' | 'match') => void;
  discardEvent: (eventId: string) => void;
  removePlayer: (playerId: string) => void;
  assignGroup: (playerId: string, groupId: string | null) => void;
  addGroup: (name: string) => void;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
}

export const usePlayersStore = create<PlayersState>((set) => ({
  players: [],
  groups: [],
  events: [],
  attendance: [],
  importDebug: undefined,
  setData: (p) => set(p as any),
  loadImport: ({ players, events, attendance, debug }) => set({ players, events, attendance, importDebug: debug }),
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
  
}));

// group utilities removed
