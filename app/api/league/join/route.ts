import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leagues, leagueMembers, brackets } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const { inviteCode } = body;

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode.toUpperCase()))
    .get();

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const existing = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, session.user.id)))
    .get();

  if (!existing) {
    await db.insert(leagueMembers).values({ leagueId: league.id, userId: session.user.id }).run();
    await db.insert(brackets).values({ userId: session.user.id, leagueId: league.id }).run();
  }

  return NextResponse.json({ inviteCode: league.inviteCode, leagueName: league.name });
}
