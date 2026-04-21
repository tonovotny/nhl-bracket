import { buildRound1Matchups, allSlots, type TeamSeed } from "./seed";

export type PicksMap = Record<string, number>; // slotId -> teamId
export type GamesMap = Record<string, number>; // slotId -> predicted games (4-7)

export type PlayerPicks = {
  userId: number;
  userName: string;
  picks: PicksMap;
  games: GamesMap;
};

// Compact display tag for a player name: first word uppercased, 2 chars.
export function playerAcronym(name: string): string {
  const first = (name || "").trim().split(/\s+/)[0] ?? "";
  return first.slice(0, 2).toUpperCase() || "?";
}

// Series info passed from DB to client
export type SeriesInfo = {
  slotId: string;
  round: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  winnerTeamId: number | null;
  homeTeamWins: number;
  awayTeamWins: number;
  gamesPlayed: number | null;
  status: string; // "pending" | "active" | "complete"
};

function getTeamById(teams: TeamSeed[], id: number): TeamSeed | undefined {
  return teams.find((t) => t.id === id);
}

// Fixed bracket paths: R2 pairs within same division side
// R2_1: Winner of R1_1 vs Winner of R1_2 (best division winner's side)
// R2_2: Winner of R1_3 vs Winner of R1_4 (other division's side)
// CF: Winner of R2_1 vs Winner of R2_2
const BRACKET_PATHS: Record<string, [string, string]> = {
  W_R2_1: ["W_R1_1", "W_R1_2"],
  W_R2_2: ["W_R1_3", "W_R1_4"],
  E_R2_1: ["E_R1_1", "E_R1_2"],
  E_R2_2: ["E_R1_3", "E_R1_4"],
  W_CF: ["W_R2_1", "W_R2_2"],
  E_CF: ["E_R2_1", "E_R2_2"],
  SCF: ["W_CF", "E_CF"],
};

function getWinnerOfSlot(
  teams: TeamSeed[],
  slotId: string,
  seriesMap: Record<string, SeriesInfo>,
): TeamSeed | null {
  const s = seriesMap[slotId];
  if (s?.winnerTeamId) {
    return getTeamById(teams, s.winnerTeamId) ?? null;
  }
  return null;
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

  // Round 2+: follow fixed bracket paths (no reseeding)
  const feeders = BRACKET_PATHS[slotId];
  if (feeders) {
    const team1 = getWinnerOfSlot(teams, feeders[0], seriesMap);
    const team2 = getWinnerOfSlot(teams, feeders[1], seriesMap);
    return [team1, team2];
  }

  return [null, null];
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
