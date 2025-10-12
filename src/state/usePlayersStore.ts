import { create } from 'zustand';
import { Player, Group, Event, AttendanceRecord } from '../types/domain';
import { nanoid } from 'nanoid';

interface PlayersState {
  players: Player[];
  groups: Group[];
  events: Event[];
  attendance: AttendanceRecord[];
  importDebug?: any;
  setData: (p: Partial<Pick<PlayersState, 'players' | 'groups' | 'events' | 'attendance' | 'importDebug'>>) => void;
  assignGroup: (playerId: string, groupId: string | null) => void;
  loadImport: (data: { players: Player[]; events: Event[]; attendance: AttendanceRecord[]; debug?: any }) => void;
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
  assignGroup: (playerId, groupId) => set(state => ({
    players: state.players.map(pl => pl.id === playerId ? { ...pl, groupId } : pl)
  })),
  loadImport: ({ players, events, attendance, debug }) => set({ players, events, attendance, importDebug: debug }),
  addGroup: (name) => set(state => ({ groups: [...state.groups, { id: nanoid(), name }] })),
  removeGroup: (groupId) => set(state => ({
    groups: state.groups.filter(g => g.id !== groupId),
    players: state.players.map(p => p.groupId === groupId ? { ...p, groupId: null } : p)
  })),
  renameGroup: (groupId, name) => set(state => ({ groups: state.groups.map(g => g.id === groupId ? { ...g, name } : g) })),
  
}));

export function createGroup(name: string): Group { return { id: nanoid(), name }; }
