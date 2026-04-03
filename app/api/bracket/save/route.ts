import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, migrationsRan } from "@/lib/db";
import { users, brackets, picks, leagues } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode, picksData, gamesData } = body as {
    inviteCode: string;
    picksData: Record<string, number>;
    gamesData?: Record<string, number>;
  };

  await migrationsRan;

  if (!inviteCode || !picksData) {
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

  const lockTime = new Date(league.lockTime);
  if (new Date() > lockTime) {
    return NextResponse.json({ error: "Brackets are locked" }, { status: 403 });
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

  await db.delete(picks).where(eq(picks.bracketId, bracket.id)).run();

  for (const [slotId, teamId] of Object.entries(picksData)) {
    await db.insert(picks).values({
      bracketId: bracket.id,
      slotId,
      predictedWinnerTeamId: teamId,
      predictedGames: gamesData?.[slotId] ?? null,
    }).run();
  }

  return NextResponse.json({ saved: true, pickCount: Object.keys(picksData).length });
}
