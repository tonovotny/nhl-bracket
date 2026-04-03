import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, brackets, picks, leagues } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { TOTAL_PICKS } from "@/lib/bracket-data";

export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode } = body;

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

  if (new Date() > new Date(league.lockTime)) {
    return NextResponse.json({ error: "Brackets are locked" }, { status: 403 });
  }

  const bracket = await db
    .select()
    .from(brackets)
    .where(and(eq(brackets.userId, user.id), eq(brackets.leagueId, league.id)))
    .get();

  if (!bracket) {
    return NextResponse.json({ error: "No bracket found" }, { status: 404 });
  }

  const bracketPicks = await db.select().from(picks).where(eq(picks.bracketId, bracket.id)).all();
  if (bracketPicks.length < TOTAL_PICKS) {
    return NextResponse.json(
      { error: `Need ${TOTAL_PICKS} picks, only have ${bracketPicks.length}` },
      { status: 400 }
    );
  }

  await db.update(brackets)
    .set({ submittedAt: new Date().toISOString() })
    .where(eq(brackets.id, bracket.id))
    .run();

  return NextResponse.json({ submitted: true });
}
