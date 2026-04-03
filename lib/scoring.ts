import { db } from "./db";
import { picks, series, brackets } from "./schema";
import { eq } from "drizzle-orm";

export type LeaderboardEntry = {
  userId: number;
  userName: string;
  score: number;
  correctPicks: number;
  exactPicks: number;
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
    let exactPicks = 0;

    for (const pick of bracketPicks) {
      const s = seriesMap.get(pick.slotId);
      if (s && s.winnerTeamId === pick.predictedWinnerTeamId) {
        correctPicks++;
        // Exact result (winner + games): 3x bonus
        if (pick.predictedGames && s.gamesPlayed && pick.predictedGames === s.gamesPlayed) {
          score += 3;
          exactPicks++;
        } else {
          score += 1;
        }
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
      exactPicks,
      totalPicks: bracketPicks.length,
    });
  }

  entries.sort((a, b) => b.score - a.score || b.correctPicks - a.correctPicks);

  return entries;
}
