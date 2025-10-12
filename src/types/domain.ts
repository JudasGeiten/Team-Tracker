export interface Event {
  id: string;
  name: string;
  type: 'training' | 'match';
  index: number; // column index reference
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
  parentId?: string | null; // new: allow nesting
}

export interface TeamGenerationSettings {
  mode: 'mixed' | 'singleGroup';
  teamSize?: number; // mutually exclusive with teamCount
  teamCount?: number;
  weighting: boolean;
}

export interface GeneratedTeam {
  id: string;
  name: string;
  playerIds: string[];
}
