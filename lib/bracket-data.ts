import { allTeams, round1Matchups, allSlots, type TeamSeed } from "./seed";

export type PicksMap = Record<string, number>; // slotId -> teamId

export function getTeamById(id: number): TeamSeed | undefined {
  return allTeams.find((t) => t.id === id);
}

// Get the Round 1 winners for a conference, sorted by seed (best first)
function getR1Winners(conference: string, picks: PicksMap): TeamSeed[] {
  const r1Slots = round1Matchups
    .filter((m) => m.slotId.startsWith(conference))
    .map((m) => m.slotId);

  const winners: TeamSeed[] = [];
  for (const slot of r1Slots) {
    const teamId = picks[slot];
    if (teamId) {
      const team = getTeamById(teamId);
      if (team) winners.push(team);
    }
  }

  // Sort by seed (lowest seed number = best)
  return winners.sort((a, b) => a.seed - b.seed);
}

// Get the Round 2 winners for a conference, sorted by seed
function getR2Winners(conference: string, picks: PicksMap): TeamSeed[] {
  const r2Slots = [`${conference}_R2_1`, `${conference}_R2_2`];
  const winners: TeamSeed[] = [];
  for (const slot of r2Slots) {
    const teamId = picks[slot];
    if (teamId) {
      const team = getTeamById(teamId);
      if (team) winners.push(team);
    }
  }
  return winners.sort((a, b) => a.seed - b.seed);
}

// Reseed: pair highest seed vs lowest seed
// Returns array of [higher seed, lower seed] pairs
function reseed(teams: TeamSeed[]): [TeamSeed, TeamSeed][] {
  if (teams.length < 2) return [];
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  const pairs: [TeamSeed, TeamSeed][] = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    pairs.push([sorted[lo], sorted[hi]]);
    lo++;
    hi--;
  }
  return pairs;
}

// Get the two teams that should appear in a given slot based on reseeding
export function getTeamsInSlot(slotId: string, picks: PicksMap): [TeamSeed | null, TeamSeed | null] {
  // Round 1: teams are fixed from matchups
  const r1 = round1Matchups.find((m) => m.slotId === slotId);
  if (r1) {
    return [getTeamById(r1.home) ?? null, getTeamById(r1.away) ?? null];
  }

  // Round 2: reseed R1 winners within the conference
  if (slotId.includes("_R2_")) {
    const conference = slotId[0]; // "W" or "E"
    const slotIndex = parseInt(slotId.slice(-1)) - 1; // 0 or 1
    const r1Winners = getR1Winners(conference, picks);

    if (r1Winners.length < 4) return [null, null]; // need all 4 R1 picks

    const pairs = reseed(r1Winners);
    if (slotIndex < pairs.length) {
      return [pairs[slotIndex][0], pairs[slotIndex][1]];
    }
    return [null, null];
  }

  // Conference Finals: reseed R2 winners
  if (slotId === "W_CF" || slotId === "E_CF") {
    const conference = slotId[0];
    const r2Winners = getR2Winners(conference, picks);

    if (r2Winners.length < 2) return [null, null];

    const sorted = [...r2Winners].sort((a, b) => a.seed - b.seed);
    return [sorted[0], sorted[1]];
  }

  // Stanley Cup Finals: W_CF winner vs E_CF winner
  if (slotId === "SCF") {
    const wWinnerId = picks["W_CF"];
    const eWinnerId = picks["E_CF"];
    return [
      wWinnerId ? getTeamById(wWinnerId) ?? null : null,
      eWinnerId ? getTeamById(eWinnerId) ?? null : null,
    ];
  }

  return [null, null];
}

// Figure out which round a slot belongs to
function getRound(slotId: string): number {
  if (slotId.includes("_R1_")) return 1;
  if (slotId.includes("_R2_")) return 2;
  if (slotId.endsWith("_CF")) return 3;
  if (slotId === "SCF") return 4;
  return 0;
}

// Get all slots from later rounds that might be affected by a pick change
function getLaterRoundSlots(round: number, conference?: string): string[] {
  return allSlots
    .filter((s) => {
      if (s.round <= round) return false;
      // SCF is always affected
      if (s.slotId === "SCF") return true;
      // Conference-specific slots
      if (conference && !s.slotId.startsWith(conference) && s.slotId !== "SCF") return false;
      return true;
    })
    .map((s) => s.slotId);
}

// Make a pick and clear any invalidated downstream picks
export function makePick(slotId: string, teamId: number, currentPicks: PicksMap): PicksMap {
  const newPicks = { ...currentPicks };
  const oldPick = newPicks[slotId];
  newPicks[slotId] = teamId;

  // If pick changed, clear all later round picks in this conference
  // because reseeding means ANY later matchup could change
  if (oldPick !== undefined && oldPick !== teamId) {
    const round = getRound(slotId);
    const conference = slotId[0]; // "W" or "E"
    const toClear = getLaterRoundSlots(round, conference);
    for (const s of toClear) {
      delete newPicks[s];
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

export { allTeams, round1Matchups, allSlots };
