import { allTeams, round1Matchups, bracketTopology, allSlots, type TeamSeed } from "./seed";

export type PicksMap = Record<string, number>; // slotId -> teamId

export function getTeamById(id: number): TeamSeed | undefined {
  return allTeams.find((t) => t.id === id);
}

export function getTeamsInSlot(slotId: string, picks: PicksMap): [TeamSeed | null, TeamSeed | null] {
  // Round 1: teams are fixed from matchups
  const r1 = round1Matchups.find((m) => m.slotId === slotId);
  if (r1) {
    return [getTeamById(r1.home) ?? null, getTeamById(r1.away) ?? null];
  }

  // Round 2+: teams come from whoever was picked in the feeder slots
  const feeders = bracketTopology[slotId];
  if (!feeders) return [null, null];

  const team1Id = picks[feeders[0]];
  const team2Id = picks[feeders[1]];

  return [
    team1Id ? getTeamById(team1Id) ?? null : null,
    team2Id ? getTeamById(team2Id) ?? null : null,
  ];
}

// When a pick changes, clear any downstream picks that depended on the old winner
export function clearDownstreamPicks(slotId: string, picks: PicksMap): PicksMap {
  const newPicks = { ...picks };

  // Find all slots that are fed by this slot
  for (const [downstream, feeders] of Object.entries(bracketTopology)) {
    if (feeders.includes(slotId)) {
      // If the downstream pick was one of the teams from this slot's old pick,
      // and that team is no longer advancing, clear it
      const downstreamPick = newPicks[downstream];
      if (downstreamPick !== undefined) {
        // Check if the downstream pick is still valid
        const [t1, t2] = getTeamsInSlot(downstream, newPicks);
        if ((!t1 || t1.id !== downstreamPick) && (!t2 || t2.id !== downstreamPick)) {
          delete newPicks[downstream];
          // Recursively clear further downstream
          const furtherCleared = clearDownstreamPicks(downstream, newPicks);
          Object.assign(newPicks, furtherCleared);
          // Remove keys that were deleted
          for (const key of Object.keys(newPicks)) {
            if (!(key in furtherCleared) && key !== slotId && Object.keys(bracketTopology).some(d => {
              const f = bracketTopology[d];
              return f.includes(key);
            })) {
              // keep it
            }
          }
        }
      }
    }
  }

  return newPicks;
}

// Simpler approach: clear all downstream picks from a slot
export function clearAllDownstream(slotId: string, picks: PicksMap): PicksMap {
  const newPicks = { ...picks };

  for (const [downstream, feeders] of Object.entries(bracketTopology)) {
    if (feeders.includes(slotId)) {
      delete newPicks[downstream];
      // Recurse
      const further = clearAllDownstream(downstream, newPicks);
      for (const key of Object.keys(newPicks)) {
        if (!(key in further) && key !== downstream) continue;
      }
      Object.keys(further).forEach(k => {
        if (further[k] !== undefined) newPicks[k] = further[k];
      });
      // Delete keys removed in recursion
      for (const [dk] of Object.entries(bracketTopology)) {
        if (!(dk in further) && dk in newPicks && dk !== slotId) {
          // Only delete if it's truly downstream
        }
      }
    }
  }

  return newPicks;
}

// Get all slot IDs that are downstream of a given slot
function getDownstreamSlots(slotId: string): string[] {
  const result: string[] = [];
  for (const [downstream, feeders] of Object.entries(bracketTopology)) {
    if (feeders.includes(slotId)) {
      result.push(downstream);
      result.push(...getDownstreamSlots(downstream));
    }
  }
  return result;
}

// Make a pick and clear any invalidated downstream picks
export function makePick(slotId: string, teamId: number, currentPicks: PicksMap): PicksMap {
  const newPicks = { ...currentPicks };
  const oldPick = newPicks[slotId];
  newPicks[slotId] = teamId;

  // If pick changed, clear downstream
  if (oldPick !== undefined && oldPick !== teamId) {
    const downstream = getDownstreamSlots(slotId);
    for (const ds of downstream) {
      delete newPicks[ds];
    }
  }

  return newPicks;
}

export function getPointsForRound(round: number): number {
  switch (round) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 4;
    case 4: return 8;
    default: return 0;
  }
}

export function countPicks(picks: PicksMap): number {
  return Object.keys(picks).length;
}

export const TOTAL_PICKS = allSlots.length; // 15

export { allTeams, round1Matchups, bracketTopology, allSlots };
