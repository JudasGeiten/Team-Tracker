import { Player, GeneratedTeam, TeamGenerationResult } from '../../types/domain';
import { nanoid } from 'nanoid';

interface Options {
  players: Player[];
  mode: 'mixed' | 'singleGroup';
  target: { teamSize?: number; teamCount?: number };
  weighting: boolean;
  groupId?: string; // for singleGroup mode
}

export function generateTeams(opts: Options): TeamGenerationResult {
  let pool = opts.players;
  if (opts.mode === 'singleGroup' && opts.groupId) {
    pool = pool.filter(p => p.groupId === opts.groupId);
  }

  // Determine desired number of teams
  let teamsCount = 0;
  if (opts.target.teamCount) teamsCount = opts.target.teamCount;
  else if (opts.target.teamSize) teamsCount = Math.ceil(pool.length / opts.target.teamSize);
  else teamsCount = 2;

  // If nothing or trivial, early return
  if (pool.length === 0 || teamsCount <= 0) return { teams: [], waitList: [] };
  const hardCapPerTeam = opts.target.teamSize; // if provided acts as max size
  const totalCapacity = hardCapPerTeam ? hardCapPerTeam * teamsCount : undefined;

  // Group players by groupId (undefined grouped under '__none')
  const groupsMap = pool.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.groupId || '__none';
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

  // STEP 1: Ensure coverage – for each group that has at least teamsCount players, assign one unique player to each team
  // We skip the '__none' pseudo group for coverage requirement.
  const usedIds = new Set<string>();
  Object.entries(groupsMap).forEach(([gid, playersInGroup]) => {
    if (gid === '__none') return; // ignore ungrouped for coverage constraint
    if (playersInGroup.length >= teamsCount) {
      // Shuffle (weighted) within group to choose fair representatives
      const shuffled = weightedShuffle(playersInGroup);
      for (let t = 0; t < teamsCount; t++) {
        const rep = shuffled[t];
        if (!rep) break; // safety
        teams[t].playerIds.push(rep.id);
        usedIds.add(rep.id);
      }
    }
  });

  // STEP 2: Fill remaining slots with remaining players using weighted shuffle
  const remaining = pool.filter(p => !usedIds.has(p.id));

  // Strategy for balance:
  // 1. Split remaining by group (excluding '__none'). For each group, weighted-shuffle its members.
  // 2. Distribute each group's players round-robin across teams (always pick next team with lowest count for that group, tie -> fewest total players).
  // 3. Finally add ungrouped players with existing size balancing logic.

  const groupCountsPerTeam: Record<string, number[]> = {}; // groupId -> counts per team index
  const byGroupRemaining = remaining.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.groupId || '__none';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Initialize counts with already assigned representatives
  teams.forEach((team, ti) => {
    team.playerIds.forEach(pid => {
      const player = pool.find(p => p.id === pid);
      const gid = player?.groupId || '__none';
      if (!groupCountsPerTeam[gid]) groupCountsPerTeam[gid] = Array(teamsCount).fill(0);
      groupCountsPerTeam[gid][ti]++;
    });
  });

  const realGroupKeys = Object.keys(byGroupRemaining).filter(k => k !== '__none');
  realGroupKeys.forEach(gid => {
    const plist = byGroupRemaining[gid];
    if (!plist.length) return;
    const shuffled = weightedShuffle(plist);
    if (!groupCountsPerTeam[gid]) groupCountsPerTeam[gid] = Array(teamsCount).fill(0);
    shuffled.forEach(p => {
      // choose team with smallest count for this group; tie-breaker: fewest total players
      let bestIndex = 0;
      let bestScore = Infinity;
      for (let t = 0; t < teamsCount; t++) {
        const groupCount = groupCountsPerTeam[gid][t];
        const teamSizeNow = teams[t].playerIds.length;
        const score = groupCount * 1000 + teamSizeNow; // prioritize lower groupCount primarily
        if (score < bestScore) { bestScore = score; bestIndex = t; }
      }
      teams[bestIndex].playerIds.push(p.id);
      groupCountsPerTeam[gid][bestIndex]++;
    });
    // mark consumed so we don't add again
    delete byGroupRemaining[gid];
  });

  // Ungrouped players last (or players with '__none')
  const ungrouped = byGroupRemaining['__none'] || [];
  const ungroupedShuffled = weightedShuffle(ungrouped);

  function pushBalanced(p: Player) {
    if (opts.target.teamSize) {
      const targetSize = opts.target.teamSize;
      const underTarget = teams.filter(t => t.playerIds.length < targetSize);
      let team: GeneratedTeam;
      if (underTarget.length) team = underTarget.sort((a,b) => a.playerIds.length - b.playerIds.length)[0];
      else team = teams.sort((a,b) => a.playerIds.length - b.playerIds.length)[0];
      team.playerIds.push(p.id);
    } else {
      const team = teams.sort((a,b) => a.playerIds.length - b.playerIds.length)[0];
      team.playerIds.push(p.id);
    }
  }
  const waitList: string[] = [];
  ungroupedShuffled.forEach(p => {
    // If we have a total capacity and it's reached, push to waitList
    if (totalCapacity !== undefined) {
      const assignedCount = teams.reduce((s,t)=>s + t.playerIds.length, 0);
      if (assignedCount >= totalCapacity) { waitList.push(p.id); return; }
    }
    pushBalanced(p);
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
