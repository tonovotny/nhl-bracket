import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, migrationsRan } from "@/lib/db";
import { users, brackets, picks, leagues, series } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSlotsForRound } from "@/lib/bracket-data";

export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode, picksData, gamesData, round } = body as {
    inviteCode: string;
    picksData: Record<string, number>;
    gamesData?: Record<string, number>;
    round: number;
  };

  await migrationsRan;

  if (!inviteCode || !picksData || !round) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.token, token)).get();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode.toUpperCase()))
    .get();

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Validate round is open: all series in this round must be "pending"
  const roundSeries = await db.select().from(series).where(eq(series.round, round)).all();
  const allPending = roundSeries.every((s) => s.status === "pending");
  if (!allPending) {
    return NextResponse.json({ error: "This round is locked" }, { status: 403 });
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
    // Only save picks for slots in this round
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
