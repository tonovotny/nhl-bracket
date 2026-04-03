import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { leagues, users, leagueMembers, brackets } from "@/lib/schema";
import { generateInviteCode } from "@/lib/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { leagueName, userName } = body;

  if (!leagueName || !userName) {
    return NextResponse.json({ error: "League name and your name are required" }, { status: 400 });
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

  const inviteCode = generateInviteCode();
  const lockTime = "2026-04-14T19:00:00-04:00";

  const league = await db
    .insert(leagues)
    .values({
      name: leagueName,
      inviteCode,
      createdBy: user.id,
      lockTime,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();

  await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id }).run();
  await db.insert(brackets).values({ userId: user.id, leagueId: league.id }).run();

  return NextResponse.json({ inviteCode: league.inviteCode, leagueId: league.id });
}
