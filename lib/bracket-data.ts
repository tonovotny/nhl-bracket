import { buildRound1Matchups, allSlots, type TeamSeed } from "./seed";

export type PicksMap = Record<string, number>; // slotId -> teamId
export type GamesMap = Record<string, number>; // slotId -> predicted games (4-7)

// Series info passed from DB to client
export type SeriesInfo = {
  slotId: string;
  round: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  winnerTeamId: number | null;
  gamesPlayed: number | null;
  status: string; // "pending" | "active" | "complete"
};

function getTeamById(teams: TeamSeed[], id: number): TeamSeed | undefined {
  return teams.find((t) => t.id === id);
}

// Reseed: pair highest seed vs lowest seed
function reseed(teamsList: TeamSeed[]): [TeamSeed, TeamSeed][] {
  if (teamsList.length < 2) return [];
  const sorted = [...teamsList].sort((a, b) => a.seed - b.seed);
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

// Get the two teams in a slot, using actual series data when available
export function getTeamsInSlot(
  teams: TeamSeed[],
  slotId: string,
  seriesMap: Record<string, SeriesInfo>,
): [TeamSeed | null, TeamSeed | null] {
  // If the series has teams assigned in DB, use those
  const s = seriesMap[slotId];
  if (s?.homeTeamId && s?.awayTeamId) {
    return [getTeamById(teams, s.homeTeamId) ?? null, getTeamById(teams, s.awayTeamId) ?? null];
  }

  // Round 1: teams are fixed from standings
  const matchups = buildRound1Matchups(teams);
  const r1 = matchups.find((m) => m.slotId === slotId);
  if (r1) {
    return [getTeamById(teams, r1.home) ?? null, getTeamById(teams, r1.away) ?? null];
  }

  // Round 2+: derive from actual results of previous round via reseeding
  if (slotId.includes("_R2_")) {
    const conference = slotId[0];
    const slotIndex = parseInt(slotId.slice(-1)) - 1;
    const r1Winners = getConferenceWinners(teams, conference, 1, seriesMap);
    if (r1Winners.length < 4) return [null, null];
    const pairs = reseed(r1Winners);
    return slotIndex < pairs.length ? [pairs[slotIndex][0], pairs[slotIndex][1]] : [null, null];
  }

  if (slotId === "W_CF" || slotId === "E_CF") {
    const conference = slotId[0];
    const r2Winners = getConferenceWinners(teams, conference, 2, seriesMap);
    if (r2Winners.length < 2) return [null, null];
    const sorted = [...r2Winners].sort((a, b) => a.seed - b.seed);
    return [sorted[0], sorted[1]];
  }

  if (slotId === "SCF") {
    const wSeries = seriesMap["W_CF"];
    const eSeries = seriesMap["E_CF"];
    return [
      wSeries?.winnerTeamId ? getTeamById(teams, wSeries.winnerTeamId) ?? null : null,
      eSeries?.winnerTeamId ? getTeamById(teams, eSeries.winnerTeamId) ?? null : null,
    ];
  }

  return [null, null];
}

// Get actual winners from completed series in a round+conference
function getConferenceWinners(
  teams: TeamSeed[],
  conference: string,
  round: number,
  seriesMap: Record<string, SeriesInfo>,
): TeamSeed[] {
  const winners: TeamSeed[] = [];
  for (const s of Object.values(seriesMap)) {
    if (s.round === round && s.slotId.startsWith(conference) && s.status === "complete" && s.winnerTeamId) {
      const team = getTeamById(teams, s.winnerTeamId);
      if (team) winners.push(team);
    }
  }
  return winners.sort((a, b) => a.seed - b.seed);
}

// Determine which round is open for betting
// Returns 0 if no round is open
export function getOpenRound(seriesMap: Record<string, SeriesInfo>): number {
  for (let round = 1; round <= 4; round++) {
    const roundSeries = Object.values(seriesMap).filter((s) => s.round === round);
    const allPending = roundSeries.every((s) => s.status === "pending");
    const hasTeams = roundSeries.some((s) => s.homeTeamId && s.awayTeamId);

    // Round is open if all series are pending and at least one has teams assigned
    // (R1 always has teams from standings)
    if (allPending && (hasTeams || round === 1)) {
      return round;
    }

    // If any series in this round is active or there's a mix, this round is locked
    // Check if this round is fully complete to move to next
    const allComplete = roundSeries.every((s) => s.status === "complete");
    if (!allComplete) return 0; // round in progress, no betting available
  }
  return 0; // all rounds complete
}

// Get slot IDs for a specific round
export function getSlotsForRound(round: number): string[] {
  return allSlots.filter((s) => s.round === round).map((s) => s.slotId);
}

// Make a pick (only within current round, no cascading needed)
export function makePick(
  slotId: string,
  teamId: number,
  currentPicks: PicksMap,
  currentGames: GamesMap,
): { picks: PicksMap; games: GamesMap } {
  const newPicks = { ...currentPicks };
  const newGames = { ...currentGames };
  const oldPick = newPicks[slotId];
  newPicks[slotId] = teamId;

  // If winner changed, clear the games prediction for this slot
  if (oldPick !== undefined && oldPick !== teamId) {
    delete newGames[slotId];
  }

  return { picks: newPicks, games: newGames };
}

export function countPicksForRound(picks: PicksMap, round: number): number {
  const roundSlots = getSlotsForRound(round);
  return roundSlots.filter((s) => picks[s] !== undefined).length;
}

export function totalSlotsForRound(round: number): number {
  return getSlotsForRound(round).length;
}

export { allSlots };
export type { TeamSeed };
