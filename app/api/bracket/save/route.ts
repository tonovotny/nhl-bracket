import { NextResponse } from "next/server";
import { db, migrationsRan } from "@/lib/db";
import { brackets, picks, leagues, series } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSlotsForRound } from "@/lib/bracket-data";
import { auth } from "@/lib/auth";

const DEFAULT_LEAGUE_CODE = "NHL2026";

export async function POST(request: Request) {
  const body = await request.json();
  const { picksData, gamesData, round, unlocked } = body as {
    picksData: Record<string, number>;
    gamesData?: Record<string, number>;
    round: number;
    unlocked?: boolean;
  };

  await migrationsRan;

  if (!picksData || !round) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = { id: session.user.id };

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, DEFAULT_LEAGUE_CODE))
    .get();

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Validate round is open: all series in this round must be "pending"
  // (unless the unlock override is set — used by /bracket/unlock for late picks)
  if (!unlocked) {
    const roundSeries = await db.select().from(series).where(eq(series.round, round)).all();
    const allPending = roundSeries.every((s) => s.status === "pending");
    if (!allPending) {
      return NextResponse.json({ error: "This round is locked — already in progress" }, { status: 403 });
    }
  }

  // Round 1 also honors the league lock time — once past, no more submissions
  // even if the NHL API hasn't yet reported a game result.
  if (round === 1 && Date.now() >= new Date(league.lockTime).getTime()) {
    return NextResponse.json({ error: "Round 1 lock time has passed" }, { status: 403 });
  }

  let bracket = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.userId, user.id), eq(brackets.leagueId, league.id)))
    .get();

  if (!bracket) {
    bracket = await db
      .insert(brackets)
      .values({ userId: user.id, leagueId: league.id })
      .returning()
      .get();
  }

  // Only delete and rewrite picks for this round's slots
  const roundSlots = getSlotsForRound(round);
  for (const slotId of roundSlots) {
    await db.delete(picks).where(
      and(eq(picks.bracketId, bracket.id), eq(picks.slotId, slotId))
    ).run();
  }

  for (const [slotId, teamId] of Object.entries(picksData)) {
    if (!roundSlots.includes(slotId)) continue;
    await db.insert(picks).values({
      bracketId: bracket.id,
      slotId,
      predictedWinnerTeamId: teamId,
      predictedGames: gamesData?.[slotId] ?? null,
    }).run();
  }

  return NextResponse.json({ saved: true, round });
}
