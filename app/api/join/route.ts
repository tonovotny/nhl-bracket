import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { leagues, users, leagueMembers, brackets } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const DEFAULT_LEAGUE_CODE = "NHL2026";

async function getOrCreateDefaultLeague() {
  let league = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, DEFAULT_LEAGUE_CODE))
    .get();

  if (!league) {
    league = await db
      .insert(leagues)
      .values({
        name: "NHL Playoffs 2026",
        inviteCode: DEFAULT_LEAGUE_CODE,
        createdBy: null,
        lockTime: "2026-04-14T19:00:00-04:00",
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  return league;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userName } = body;

  if (!userName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const league = await getOrCreateDefaultLeague();

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

  return NextResponse.json({ ok: true });
}
