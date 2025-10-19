import { create } from 'zustand';
import { GeneratedTeam } from '../types/domain';

interface TeamsState {
  teams: GeneratedTeam[];
  waitList: string[];
  setTeams: (teams: GeneratedTeam[], waitList?: string[]) => void;
  clear: () => void;
}

export const useTeamsStore = create<TeamsState>(set => ({
  teams: [],
  waitList: [],
  setTeams: (teams, waitList = []) => set({ teams, waitList }),
  clear: () => set({ teams: [], waitList: [] })
}));
