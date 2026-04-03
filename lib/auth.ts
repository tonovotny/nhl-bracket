import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function getOrCreateUser(name: string): Promise<{ id: number; name: string; token: string }> {
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db
    .insert(users)
    .values({ name, token, createdAt: now })
    .returning()
    .get();

  return result;
}

export async function getCurrentUser(): Promise<{ id: number; name: string; token: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;

  const user = await db.select().from(users).where(eq(users.token, token)).get();
  return user ?? null;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
