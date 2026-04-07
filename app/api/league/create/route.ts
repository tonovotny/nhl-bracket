import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leagues, leagueMembers, brackets } from "@/lib/schema";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const { leagueName } = body;

  if (!leagueName) {
    return NextResponse.json({ error: "League name is required" }, { status: 400 });
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let inviteCode = "";
  for (let i = 0; i < 6; i++) {
    inviteCode += chars[Math.floor(Math.random() * chars.length)];
  }

  const league = await db
    .insert(leagues)
    .values({
      name: leagueName,
      inviteCode,
      createdBy: session.user.id,
      lockTime: "2026-04-14T19:00:00-04:00",
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();

  await db.insert(leagueMembers).values({ leagueId: league.id, userId: session.user.id }).run();
  await db.insert(brackets).values({ userId: session.user.id, leagueId: league.id }).run();

  return NextResponse.json({ inviteCode: league.inviteCode, leagueId: league.id });
}
