export interface Event {
  id: string;
  name: string;
  type: 'training' | 'match';
  index: number; // column index reference
  date?: string; // ISO string parsed from name if recognizable
  needsTypeConfirmation?: boolean; // set true if classification was uncertain on import
}

export type AttendanceStatus = 'attended' | 'absent' | 'not_invited';

export interface AttendanceRecord {
  playerId: string;
  eventId: string;
  status: AttendanceStatus;
}

export interface Player {
  id: string;
  name: string;
  invitedTotal?: number;
  attendedTotal?: number;
  attendedPct?: number;
  excusedAbsentPct?: number;
  latePct?: number;
  groupId?: string | null;
  matchesAttended?: number; // derived
  trainingsAttended?: number; // derived
}
export interface Group {
  id: string;
  name: string;
  color?: string;
}

export interface TeamGenerationSettings {
  mode: 'mixed';
  teamSize?: number; // can now be combined with teamCount (size is a hard cap per team)
  teamCount?: number; // when both provided: total capacity = teamSize * teamCount, overflow -> wait list
  weighting: boolean;
}

export interface GeneratedTeam {
  id: string;
  name: string;
  playerIds: string[];
}

export interface TeamGenerationResult {
  teams: GeneratedTeam[];
  waitList: string[]; // playerIds that did not fit into any team capacity
}
