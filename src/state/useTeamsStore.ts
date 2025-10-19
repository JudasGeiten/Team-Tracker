import { create } from 'zustand';
import { GeneratedTeam } from '../types/domain';

interface TeamsState {
  teams: GeneratedTeam[];
  waitList: string[];
  setTeams: (teams: GeneratedTeam[], waitList?: string[]) => void;
  clear: () => void;
  swapPlayers: (a: string, b: string) => void;
  renameTeam: (teamId: string, name: string) => void;
}

export const useTeamsStore = create<TeamsState>(set => ({
  teams: [],
  waitList: [],
  setTeams: (teams, waitList = []) => set({ teams, waitList }),
  clear: () => set({ teams: [], waitList: [] }),
  swapPlayers: (a, b) => set(state => {
    if (a === b) return {};
    const teamsCopy = state.teams.map(t => ({ ...t, playerIds: [...t.playerIds] }));
    const waitCopy = [...state.waitList];
    // locate a
    let locA: { kind: 'team' | 'wait'; index: number; pos: number } | null = null;
    let locB: { kind: 'team' | 'wait'; index: number; pos: number } | null = null;
    teamsCopy.forEach((team, ti) => {
      team.playerIds.forEach((pid, pi) => {
        if (pid === a) locA = { kind: 'team', index: ti, pos: pi };
        if (pid === b) locB = { kind: 'team', index: ti, pos: pi };
      });
    });
    if (!locA) {
      const idx = waitCopy.indexOf(a);
      if (idx !== -1) locA = { kind: 'wait', index: 0, pos: idx };
    }
    if (!locB) {
      const idx = waitCopy.indexOf(b);
      if (idx !== -1) locB = { kind: 'wait', index: 0, pos: idx };
    }
    if (!locA || !locB) return {};
    // perform swap
    if (locA.kind === 'team') {
      if (locB.kind === 'team') {
        teamsCopy[locA.index].playerIds[locA.pos] = b;
        teamsCopy[locB.index].playerIds[locB.pos] = a;
      } else {
        // b in waitlist
        teamsCopy[locA.index].playerIds[locA.pos] = b;
        waitCopy[locB.pos] = a;
      }
    } else {
      if (locB.kind === 'team') {
        waitCopy[locA.pos] = b;
        teamsCopy[locB.index].playerIds[locB.pos] = a;
      } else {
        // both in waitlist
        waitCopy[locA.pos] = b;
        waitCopy[locB.pos] = a;
      }
    }
    return { teams: teamsCopy, waitList: waitCopy };
  }),
  renameTeam: (teamId, name) => set(state => ({
    teams: state.teams.map(t => t.id === teamId ? { ...t, name } : t)
  }))
}));
