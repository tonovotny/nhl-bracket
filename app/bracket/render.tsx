import { db, migrationsRan } from "@/lib/db";
import { leagues, leagueMembers, users, brackets, picks, series } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { calculateLeaderboard } from "@/lib/scoring";
import { fetchPlayoffTeams } from "@/lib/nhl-api";
import { syncSeriesResults } from "@/lib/sync-series";
import { teams as teamsTable } from "@/lib/schema";
import type { SeriesInfo } from "@/lib/bracket-data";
import BracketClient from "./BracketClient";

const DEFAULT_LEAGUE_CODE = "NHL2026";

export async function renderBracketPage(unlocked: boolean) {
  await migrationsRan;

  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const currentUser = { id: session.user.id, name: session.user.name };

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, DEFAULT_LEAGUE_CODE))
    .get();

  if (!league) {
    redirect("/");
  }

  const members = await db
    .select({ userId: leagueMembers.userId, userName: users.name })
    .from(leagueMembers)
    .innerJoin(users, eq(users.id, leagueMembers.userId))
    .where(eq(leagueMembers.leagueId, league.id))
    .all();

  await syncSeriesResults().catch(() => {});

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

  const leagueBrackets = await db
    .select({ id: brackets.id, userId: brackets.userId, userName: users.name })
    .from(brackets)
    .innerJoin(users, eq(users.id, brackets.userId))
    .where(eq(brackets.leagueId, league.id))
    .all();

  const bracketIds = leagueBrackets.map((b) => b.id);
  const allBracketPicks = bracketIds.length
    ? await db.select().from(picks).where(inArray(picks.bracketId, bracketIds)).all()
    : [];

  const picksByBracket = new Map<number, typeof allBracketPicks>();
  for (const p of allBracketPicks) {
    const list = picksByBracket.get(p.bracketId) ?? [];
    list.push(p);
    picksByBracket.set(p.bracketId, list);
  }

  const playerPicks = leagueBrackets.map((b) => {
    const ps: Record<string, number> = {};
    const gs: Record<string, number> = {};
    for (const p of picksByBracket.get(b.id) ?? []) {
      ps[p.slotId] = p.predictedWinnerTeamId;
      if (p.predictedGames) gs[p.slotId] = p.predictedGames;
    }
    return { userId: b.userId, userName: b.userName, picks: ps, games: gs };
  });

  const mine = playerPicks.find((p) => p.userId === currentUser.id);
  if (mine) {
    userPicks = mine.picks;
    userGames = mine.games;
  }

  const [leaderboard, apiTeams, allTeamRows] = await Promise.all([
    calculateLeaderboard(league.id),
    fetchPlayoffTeams().catch(() => [] as Awaited<ReturnType<typeof fetchPlayoffTeams>>),
    db.select().from(teamsTable).all(),
  ]);

  // Build teams from DB (stable IDs), enriched with API data (divisionRank, wildcardRank)
  const apiDataByAbbrev = new Map(apiTeams.map((t) => [t.abbreviation, t]));
  const teams = allTeamRows.map((row) => {
    const api = apiDataByAbbrev.get(row.abbreviation);
    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      seed: api?.seed ?? row.seed,
      conference: row.conference,
      division: row.division ?? undefined,
      divisionRank: api?.divisionRank,
      wildcardRank: api?.wildcardRank,
    };
  });

  return (
    <BracketClient
      currentUser={{ id: currentUser.id, name: currentUser.name }}
      members={members}
      teams={teams}
      seriesData={seriesData}
      userPicks={userPicks}
      userGames={userGames}
      playerPicks={playerPicks}
      leaderboard={leaderboard}
      lockTime={league.lockTime}
      unlocked={unlocked}
    />
  );
}
