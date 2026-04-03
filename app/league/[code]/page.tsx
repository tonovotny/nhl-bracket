import { db, migrationsRan } from "@/lib/db";
import { leagues, leagueMembers, users, brackets, picks, series } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { calculateLeaderboard } from "@/lib/scoring";
import { fetchPlayoffTeams } from "@/lib/nhl-api";
import type { SeriesInfo } from "@/lib/bracket-data";
import LeagueClient from "./LeagueClient";

type Params = Promise<{ code: string }>;

export default async function LeaguePage({ params }: { params: Params }) {
  const { code } = await params;
  await migrationsRan;

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, code.toUpperCase()))
    .get();

  if (!league) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  let currentUser = null;
  if (token) {
    currentUser = (await db.select().from(users).where(eq(users.token, token)).get()) ?? null;
  }

  const members = await db
    .select({ userId: leagueMembers.userId, userName: users.name })
    .from(leagueMembers)
    .innerJoin(users, eq(users.id, leagueMembers.userId))
    .where(eq(leagueMembers.leagueId, league.id))
    .all();

  // Fetch series data for bracket state
  const allSeries = await db.select().from(series).all();
  const seriesData: SeriesInfo[] = allSeries.map((s) => ({
    slotId: s.slotId,
    round: s.round,
    homeTeamId: s.homeTeamId,
    awayTeamId: s.awayTeamId,
    winnerTeamId: s.winnerTeamId,
    gamesPlayed: s.gamesPlayed,
    status: s.status,
  }));

  let userPicks: Record<string, number> = {};
  let userGames: Record<string, number> = {};
  if (currentUser) {
    const bracket = await db
      .select()
      .from(brackets)
      .where(and(eq(brackets.userId, currentUser.id), eq(brackets.leagueId, league.id)))
      .get();

    if (bracket) {
      const bracketPicks = await db.select().from(picks).where(eq(picks.bracketId, bracket.id)).all();
      for (const p of bracketPicks) {
        userPicks[p.slotId] = p.predictedWinnerTeamId;
        if (p.predictedGames) {
          userGames[p.slotId] = p.predictedGames;
        }
      }
    }
  }

  const [leaderboard, teams] = await Promise.all([
    calculateLeaderboard(league.id),
    fetchPlayoffTeams(),
  ]);

  return (
    <LeagueClient
      league={{ name: league.name, inviteCode: league.inviteCode }}
      currentUser={currentUser ? { id: currentUser.id, name: currentUser.name } : null}
      members={members}
      teams={teams}
      seriesData={seriesData}
      userPicks={userPicks}
      userGames={userGames}
      leaderboard={leaderboard}
    />
  );
}
