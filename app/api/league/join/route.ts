import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { leagues, users, leagueMembers, brackets } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { inviteCode, userName } = body;

  if (!inviteCode || !userName) {
    return NextResponse.json({ error: "Invite code and your name are required" }, { status: 400 });
  }

  const league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode.toUpperCase()))
    .get();

  if (!league) {
    return NextResponse.json({ error: "League not found. Check the invite code." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get("user_token")?.value;
  let user;

  if (existingToken) {
    user = await db.select().from(users).where(eq(users.token, existingToken)).get();
  }

  if (!user) {
    const token = crypto.randomUUID();
    user = await db
      .insert(users)
      .values({ name: userName, token, createdAt: new Date().toISOString() })
      .returning()
      .get();

    cookieStore.set("user_token", user.token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
  }

  const existing = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, user.id)))
    .get();

  if (!existing) {
    await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id }).run();
    await db.insert(brackets).values({ userId: user.id, leagueId: league.id }).run();
  }

  return NextResponse.json({ inviteCode: league.inviteCode, leagueName: league.name });
}
