import { db } from "./db";
import { picks, series, brackets } from "./schema";
import { eq, and } from "drizzle-orm";

export function getPointsForRound(round: number): number {
  switch (round) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 4;
    case 4: return 8;
    default: return 0;
  }
}

export type LeaderboardEntry = {
  userId: number;
  userName: string;
  score: number;
  correctPicks: number;
  totalPicks: number;
};

export async function calculateLeaderboard(leagueId: number): Promise<LeaderboardEntry[]> {
  const completedSeries = await db
    .select()
    .from(series)
    .where(eq(series.status, "complete"))
    .all();

  const seriesMap = new Map(completedSeries.map((s) => [s.slotId, s]));

  const allBrackets = await db
    .select()
    .from(brackets)
    .where(eq(brackets.leagueId, leagueId))
    .all();

  const leagueBrackets = allBrackets.filter((b) => b.submittedAt !== null);

  const entries: LeaderboardEntry[] = [];

  for (const bracket of leagueBrackets) {
    const bracketPicks = await db
      .select()
      .from(picks)
      .where(eq(picks.bracketId, bracket.id))
      .all();

    let score = 0;
    let correctPicks = 0;

    for (const pick of bracketPicks) {
      const s = seriesMap.get(pick.slotId);
      if (s && s.winnerTeamId === pick.predictedWinnerTeamId) {
        const round = s.round;
        score += getPointsForRound(round);
        correctPicks++;
      }
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, bracket.userId),
    });

    entries.push({
      userId: bracket.userId,
      userName: user?.name ?? "Unknown",
      score,
      correctPicks,
      totalPicks: bracketPicks.length,
    });
  }

  entries.sort((a, b) => b.score - a.score || b.correctPicks - a.correctPicks);

  return entries;
}
