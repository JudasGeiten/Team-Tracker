import { create } from 'zustand';
import { GeneratedTeam } from '../types/domain';

interface TeamsState {
  teams: GeneratedTeam[];
  setTeams: (teams: GeneratedTeam[]) => void;
}

export const useTeamsStore = create<TeamsState>(set => ({
  teams: [],
  setTeams: (teams) => set({ teams })
}));
