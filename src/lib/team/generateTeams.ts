import { Player, GeneratedTeam, TeamGenerationResult } from '../../types/domain';
import { nanoid } from 'nanoid';

interface Options {
  players: Player[];
  mode: 'mixed';
  target: { teamSize?: number; teamCount?: number };
  weighting: boolean;
}

export function generateTeams(opts: Options): TeamGenerationResult {
  const pool = opts.players;

  // Determine desired number of teams
  let teamsCount = 0;
  if (opts.target.teamCount) teamsCount = opts.target.teamCount;
  else if (opts.target.teamSize) teamsCount = Math.ceil(pool.length / opts.target.teamSize);
  else teamsCount = 2;

  // If nothing or trivial, early return
  if (pool.length === 0 || teamsCount <= 0) return { teams: [], waitList: [] };
  const hardCapPerTeam = opts.target.teamSize; // if provided acts as max size
  const totalCapacity = hardCapPerTeam ? hardCapPerTeam * teamsCount : undefined;

  // Build groups map (empty string for no group)
  const groupsMap = pool.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.groupId || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Weighted helper
  function weightedShuffle(players: Player[]): Player[] {
    const weighted = players.map(p => ({
      player: p,
      // New rule: higher attendance => higher selection probability
      weight: opts.weighting ? ((p.attendedTotal || 0) + 1) : 1
    }));
    const out: Player[] = [];
    const arr = [...weighted];
    while (arr.length) {
      const total = arr.reduce((s, x) => s + x.weight, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < arr.length; idx++) {
        r -= arr[idx].weight;
        if (r <= 0) break;
      }
      out.push(arr[idx].player);
      arr.splice(idx, 1);
    }
    return out;
  }

  // Pre-create teams
  const teams: GeneratedTeam[] = Array.from({ length: teamsCount }, (_, i) => ({ id: nanoid(), name: `Team ${i + 1}`, playerIds: [] }));

  // Distribute per group to keep counts balanced across teams
  const waitList: string[] = [];
  const targetSize = hardCapPerTeam;

  Object.values(groupsMap).forEach(groupPlayers => {
    const shuffled = weightedShuffle(groupPlayers);
    shuffled.forEach(p => {
      if (totalCapacity !== undefined) {
        const assignedCount = teams.reduce((s,t)=>s + t.playerIds.length, 0);
        if (assignedCount >= totalCapacity) { waitList.push(p.id); return; }
      }
      // choose team where this group's presence is minimal; tie -> fewest total players
      let bestIndex = -1;
      let bestScore = Infinity;
      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        if (targetSize && t.playerIds.length >= targetSize) continue;
        const groupCountInTeam = t.playerIds.reduce((c,pid)=>{
          const pl = pool.find(pp=>pp.id===pid); return c + (pl?.groupId === p.groupId ? 1 : 0);
        },0);
        const totalInTeam = t.playerIds.length;
        const score = groupCountInTeam * 1000 + totalInTeam;
        if (score < bestScore) { bestScore = score; bestIndex = i; }
      }
      if (bestIndex === -1) {
        // All teams at capacity; push to wait list if capacity enforced
        if (totalCapacity !== undefined) { waitList.push(p.id); }
        else {
          // fallback: smallest team
          teams.sort((a,b)=>a.playerIds.length - b.playerIds.length)[0].playerIds.push(p.id);
        }
        return;
      }
      teams[bestIndex].playerIds.push(p.id);
    });
  });

  // If after full distribution we still exceed capacity (shouldn't) trim excess to waitList
  if (totalCapacity !== undefined) {
    let assignedCount = teams.reduce((s,t)=>s + t.playerIds.length, 0);
    if (assignedCount > totalCapacity) {
      // remove from largest teams until fits
      while (assignedCount > totalCapacity) {
        const largest = teams.sort((a,b)=>b.playerIds.length - a.playerIds.length)[0];
        const removed = largest.playerIds.pop();
        if (!removed) break;
        waitList.push(removed);
        assignedCount--;
      }
    }
  }
  return { teams, waitList };
}
