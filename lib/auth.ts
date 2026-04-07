import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import crypto from "crypto";
import { db } from "./db";
import { users, leagues, leagueMembers, brackets } from "./schema";
import { eq, and } from "drizzle-orm";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      if (account && profile) {
        const googleId = profile.sub!;
        let user = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .get();

        if (!user) {
          user = await db
            .insert(users)
            .values({
              name: profile.name ?? profile.email ?? "Player",
              email: profile.email ?? null,
              image: (profile.picture as string) ?? null,
              googleId,
              token: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            })
            .returning()
            .get();

          // Auto-join the default league
          const league = await getOrCreateDefaultLeague();
          const existing = await db
            .select()
            .from(leagueMembers)
            .where(
              and(
                eq(leagueMembers.leagueId, league.id),
                eq(leagueMembers.userId, user.id)
              )
            )
            .get();

          if (!existing) {
            await db
              .insert(leagueMembers)
              .values({ leagueId: league.id, userId: user.id })
              .run();
            await db
              .insert(brackets)
              .values({ userId: user.id, leagueId: league.id })
              .run();
          }
        }

        token.userId = user.id;
        token.userName = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as number,
          name: token.userName as string,
        },
      };
    },
  },
});
