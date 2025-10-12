import { Player, GeneratedTeam } from '../../types/domain';
import { nanoid } from 'nanoid';

interface Options {
  players: Player[];
  mode: 'mixed' | 'singleGroup';
  target: { teamSize?: number; teamCount?: number };
  weighting: boolean;
  groupId?: string; // for singleGroup mode
}

export function generateTeams(opts: Options): GeneratedTeam[] {
  let pool = opts.players;
  if (opts.mode === 'singleGroup' && opts.groupId) {
    pool = pool.filter(p => p.groupId === opts.groupId);
  }

  // weight: inverse of attendedTotal for fairness
  const weighted = pool.map(p => ({
    player: p,
    weight: opts.weighting ? 1 / ((p.attendedTotal || 0) + 1) : 1
  }));

  // Weighted shuffle
  const result: Player[] = [];
  const arr = [...weighted];
  while (arr.length) {
    const total = arr.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < arr.length; idx++) {
      r -= arr[idx].weight;
      if (r <= 0) break;
    }
    result.push(arr[idx].player);
    arr.splice(idx, 1);
  }

  let teamsCount = 0;
  if (opts.target.teamCount) teamsCount = opts.target.teamCount;
  else if (opts.target.teamSize) teamsCount = Math.ceil(result.length / opts.target.teamSize);
  else teamsCount = 2;

  const teams: GeneratedTeam[] = Array.from({ length: teamsCount }, (_, i) => ({ id: nanoid(), name: `Team ${i + 1}`, playerIds: [] }));
  result.forEach((p, i) => {
    teams[i % teamsCount].playerIds.push(p.id);
  });
  return teams;
}
