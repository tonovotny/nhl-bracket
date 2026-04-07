import { db, migrationsRan } from "@/lib/db";
import { leagues, leagueMembers, users, brackets, picks, series } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { calculateLeaderboard } from "@/lib/scoring";
import { fetchPlayoffTeams, fetchPlayoffSeriesWins } from "@/lib/nhl-api";
import { teams as teamsTable } from "@/lib/schema";
import type { SeriesInfo } from "@/lib/bracket-data";
import BracketClient from "./BracketClient";

const DEFAULT_LEAGUE_CODE = "NHL2026";

export default async function BracketPage() {
  await migrationsRan;

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, DEFAULT_LEAGUE_CODE))
    .get();

  if (!league) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  let currentUser = null;
  if (token) {
    currentUser = (await db.select().from(users).where(eq(users.token, token)).get()) ?? null;
  }

  if (!currentUser) {
    redirect("/");
  }

  const members = await db
    .select({ userId: leagueMembers.userId, userName: users.name })
    .from(leagueMembers)
    .innerJoin(users, eq(users.id, leagueMembers.userId))
    .where(eq(leagueMembers.leagueId, league.id))
    .all();

  const allSeries = await db.select().from(series).all();
  const seriesData: SeriesInfo[] = allSeries.map((s) => ({
    slotId: s.slotId,
    round: s.round,
    homeTeamId: s.homeTeamId,
    awayTeamId: s.awayTeamId,
    winnerTeamId: s.winnerTeamId,
    homeTeamWins: s.homeTeamWins,
    awayTeamWins: s.awayTeamWins,
    gamesPlayed: s.gamesPlayed,
    status: s.status,
  }));

  let userPicks: Record<string, number> = {};
  let userGames: Record<string, number> = {};
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

  const [leaderboard, teams, seriesWins, allTeamRows] = await Promise.all([
    calculateLeaderboard(league.id),
    fetchPlayoffTeams(),
    fetchPlayoffSeriesWins(),
    db.select({ id: teamsTable.id, abbreviation: teamsTable.abbreviation }).from(teamsTable).all(),
  ]);

  const teamAbbrevById: Record<number, string> = {};
  for (const t of allTeamRows) {
    teamAbbrevById[t.id] = t.abbreviation;
  }

  for (const s of seriesData) {
    if (!s.homeTeamId || !s.awayTeamId) continue;
    const homeAbbrev = teamAbbrevById[s.homeTeamId];
    const awayAbbrev = teamAbbrevById[s.awayTeamId];
    if (!homeAbbrev || !awayAbbrev) continue;
    const key = [homeAbbrev, awayAbbrev].sort().join("-");
    const wins = seriesWins[key];
    if (wins) {
      s.homeTeamWins = wins[homeAbbrev] ?? 0;
      s.awayTeamWins = wins[awayAbbrev] ?? 0;
    }
  }

  return (
    <BracketClient
      currentUser={{ id: currentUser.id, name: currentUser.name }}
      members={members}
      teams={teams}
      seriesData={seriesData}
      userPicks={userPicks}
      userGames={userGames}
      leaderboard={leaderboard}
    />
  );
}
